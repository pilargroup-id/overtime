const { db } = require('../../config/database.config');

const ApprovalModel = require('../../models/overtime/approval.model');
const RequestModel = require('../../models/overtime/request.model');
const LogModel = require('../../models/overtime/log.model');

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

async function list(query, authUser) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const filters = {
    search: query.search || null,
    status: query.status || null,
    request_status: query.request_status || null,
    department_id: query.department_id || null,
    employee_id: query.employee_id || null,
    work_date_from: query.work_date_from || null,
    work_date_to: query.work_date_to || null,
    page,
    limit,
    offset,
  };

  const [data, total] = await Promise.all([
    ApprovalModel.findAllForApprover(filters, authUser),
    ApprovalModel.countAllForApprover(filters, authUser),
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
  const approval = await ApprovalModel.findById(id);

  if (!approval) {
    return null;
  }

  if (approval.approver_id !== authUser.id) {
    throw createForbiddenError('You are not allowed to view this overtime approval');
  }

  return approval;
}

function assertCanAct(approval, authUser) {
  if (approval.approver_id !== authUser.id) {
    throw createForbiddenError('You are not allowed to process this overtime approval');
  }

  if (approval.status !== 'PENDING') {
    throw createValidationError({
      status: 'Only PENDING approval can be processed',
    });
  }

  if (approval.request_status !== 'SUBMITTED') {
    throw createValidationError({
      request_status: 'Only SUBMITTED request can be processed',
    });
  }
}

async function approve(id, payload, authUser) {
  const approval = await ApprovalModel.findById(id);

  if (!approval) {
    return null;
  }

  assertCanAct(approval, authUser);

  const note = payload?.note || null;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await ApprovalModel.approve(id, note, conn);
    await RequestModel.markApproved(approval.request_id, conn);

    await LogModel.create(
      {
        request_id: approval.request_id,
        actor_id: authUser.id,
        actor_name_snapshot: authUser.name,
        action: 'APPROVED',
        from_status: approval.request_status,
        to_status: 'APPROVED',
        note,
      },
      conn
    );

    await conn.commit();

    return ApprovalModel.findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function reject(id, payload, authUser) {
  const approval = await ApprovalModel.findById(id);

  if (!approval) {
    return null;
  }

  assertCanAct(approval, authUser);

  const note = payload?.note || null;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await ApprovalModel.reject(id, note, conn);
    await RequestModel.markRejected(approval.request_id, conn);

    await LogModel.create(
      {
        request_id: approval.request_id,
        actor_id: authUser.id,
        actor_name_snapshot: authUser.name,
        action: 'REJECTED',
        from_status: approval.request_status,
        to_status: 'REJECTED',
        note,
      },
      conn
    );

    await conn.commit();

    return ApprovalModel.findById(id);
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
  approve,
  reject,
};