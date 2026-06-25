const { db } = require('../../config/database.config');

const ReportModel = require('../../models/overtime/report.model');
const LogModel = require('../../models/overtime/log.model');
const UserPermissionModel = require('../../models/master/user-permission.model');

const ALLOWED_TALENTA_STATUS = ['PENDING', 'PROCESSED'];

function createValidationError(errors) {
  const err = new Error('Validation failed');
  err.statusCode = 400;
  err.errors = errors;
  return err;
}

function createForbiddenError(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

async function assertCanManageReport(authUser) {
  const allowed = await UserPermissionModel.hasActivePermission(
    authUser.id,
    'REPORT_MANAGE'
  );

  if (!allowed) {
    throw createForbiddenError('You are not allowed to access overtime reports');
  }
}

function validateTalentaStatus(payload = {}) {
  const errors = {};

  if (!payload.talenta_status || !ALLOWED_TALENTA_STATUS.includes(payload.talenta_status)) {
    errors.talenta_status = 'talenta_status must be PENDING or PROCESSED';
  }

  if (Object.keys(errors).length > 0) {
    throw createValidationError(errors);
  }
}

function validateBulkPayload(payload = {}) {
  const errors = {};

  if (!Array.isArray(payload.ids) || payload.ids.length === 0) {
    errors.ids = 'ids must be a non-empty array';
  }

  if (Array.isArray(payload.ids)) {
    const invalidIds = payload.ids.filter((id) => !Number.isInteger(Number(id)));

    if (invalidIds.length > 0) {
      errors.ids = 'ids must contain numeric request ids only';
    }
  }

  if (!payload.talenta_status || !ALLOWED_TALENTA_STATUS.includes(payload.talenta_status)) {
    errors.talenta_status = 'talenta_status must be PENDING or PROCESSED';
  }

  if (Object.keys(errors).length > 0) {
    throw createValidationError(errors);
  }
}

async function list(query, authUser) {
  await assertCanManageReport(authUser);

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const filters = {
    search: query.search || null,
    status: query.status || null,
    talenta_status: query.talenta_status || null,
    employment_type_code: query.employment_type_code || null,
    department_id: query.department_id || null,
    company_id: query.company_id || null,
    day_type: query.day_type || null,
    compensation_type_id: query.compensation_type_id || null,
    employee_id: query.employee_id || null,
    submitted_by: query.submitted_by || null,
    approver_id: query.approver_id || null,
    source_type: query.source_type || null,
    request_date_from: query.request_date_from || null,
    request_date_to: query.request_date_to || null,
    work_date_from: query.work_date_from || null,
    work_date_to: query.work_date_to || null,
    page,
    limit,
    offset,
  };

  const [data, total] = await Promise.all([
    ReportModel.findAll(filters),
    ReportModel.countAll(filters),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getById(id, authUser) {
  await assertCanManageReport(authUser);

  return ReportModel.findById(id);
}

async function updateTalentaStatus(id, payload = {}, authUser) {
  await assertCanManageReport(authUser);
  validateTalentaStatus(payload);

  const request = await ReportModel.findById(id);

  if (!request) {
    return null;
  }

  if (request.status !== 'APPROVED') {
    throw createValidationError({
      status: 'Only APPROVED request can be processed to Talenta',
    });
  }

  const fromTalentaStatus = request.talenta_status;
  const toTalentaStatus = payload.talenta_status;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await ReportModel.updateTalentaStatus(
      id,
      {
        talenta_status: toTalentaStatus,
        talenta_processed_by: authUser.id,
      },
      conn
    );

    await LogModel.create(
      {
        request_id: id,
        actor_id: authUser.id,
        actor_name_snapshot: authUser.name,
        action: toTalentaStatus === 'PROCESSED'
          ? 'TALENTA_MARKED_PROCESSED'
          : 'TALENTA_MARKED_PENDING',
        from_status: fromTalentaStatus,
        to_status: toTalentaStatus,
        note: payload.note || null,
      },
      conn
    );

    await conn.commit();

    return ReportModel.findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function bulkUpdateTalentaStatus(payload = {}, authUser) {
  await assertCanManageReport(authUser);
  validateBulkPayload(payload);

  const ids = [...new Set(payload.ids.map((id) => Number(id)))];
  const toTalentaStatus = payload.talenta_status;

  const requests = await ReportModel.findStatusesByIds(ids);

  if (requests.length !== ids.length) {
    const foundIds = requests.map((item) => Number(item.id));
    const missingIds = ids.filter((id) => !foundIds.includes(id));

    throw createValidationError({
      ids: `Some request ids were not found: ${missingIds.join(', ')}`,
    });
  }

  const notApprovedRequests = requests.filter((item) => item.status !== 'APPROVED');

  if (notApprovedRequests.length > 0) {
    throw createValidationError({
      status: `Only APPROVED requests can be processed to Talenta. Invalid request numbers: ${notApprovedRequests
        .map((item) => item.request_number)
        .join(', ')}`,
    });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await ReportModel.bulkUpdateTalentaStatus(
      ids,
      {
        talenta_status: toTalentaStatus,
        talenta_processed_by: authUser.id,
      },
      conn
    );

    for (const request of requests) {
      await LogModel.create(
        {
          request_id: request.id,
          actor_id: authUser.id,
          actor_name_snapshot: authUser.name,
          action: toTalentaStatus === 'PROCESSED'
            ? 'TALENTA_MARKED_PROCESSED'
            : 'TALENTA_MARKED_PENDING',
          from_status: request.talenta_status,
          to_status: toTalentaStatus,
          note: payload.note || null,
        },
        conn
      );
    }

    await conn.commit();

    return {
      updated_ids: ids,
      talenta_status: totalentaStatus,
      total_updated: ids.length,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  list,
  getById,
  updateTalentaStatus,
  bulkUpdateTalentaStatus,
};