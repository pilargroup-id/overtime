const { db } = require('../../config/database.config');

const UserModel = require('../../models/user.model');
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

async function attachSubmitterSnapshots(rows = []) {
  const submitterIds = rows
    .map((row) => row.submitted_by)
    .filter((id) => id !== null && id !== undefined && String(id).trim() !== '');

  if (submitterIds.length === 0) {
    return rows;
  }

  const submitters = await UserModel.findUsersByIds(submitterIds);
  const submitterMap = new Map(submitters.map((submitter) => [String(submitter.id), submitter]));

  return rows.map((row) => {
    const submitter = submitterMap.get(String(row.submitted_by));

    if (!submitter) {
      return row;
    }

    return {
      ...row,
      submitted_by_name: submitter.name,
      submitted_by_username: submitter.username,
      submitted_by_email: submitter.email,
    };
  });
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
  const rows = await attachSubmitterSnapshots(data);

  return {
    data: rows,
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

function normalizeBulkIds(payload = {}) {
  const rawIds = Array.isArray(payload.ids)
    ? payload.ids
    : Array.isArray(payload.approval_ids)
      ? payload.approval_ids
      : [];
  const ids = [...new Set(rawIds.map((id) => String(id ?? '').trim()).filter(Boolean))];

  if (ids.length === 0) {
    throw createValidationError({
      ids: 'At least one approval id is required',
    });
  }

  if (ids.length > 100) {
    throw createValidationError({
      ids: 'Maximum 100 approvals can be processed at once',
    });
  }

  return ids;
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

async function bulkAct(payload, authUser, action) {
  const ids = normalizeBulkIds(payload);
  const note = payload?.note || null;
  const approvals = [];

  for (const id of ids) {
    const approval = await ApprovalModel.findById(id);

    if (!approval) {
      throw createValidationError({
        ids: `Overtime approval ${id} not found`,
      });
    }

    assertCanAct(approval, authUser);
    approvals.push(approval);
  }

  const conn = await db.getConnection();
  const isApprove = action === 'approve';
  const nextStatus = isApprove ? 'APPROVED' : 'REJECTED';

  try {
    await conn.beginTransaction();

    for (const approval of approvals) {
      if (isApprove) {
        await ApprovalModel.approve(approval.id, note, conn);
        await RequestModel.markApproved(approval.request_id, conn);
      } else {
        await ApprovalModel.reject(approval.id, note, conn);
        await RequestModel.markRejected(approval.request_id, conn);
      }

      await LogModel.create(
        {
          request_id: approval.request_id,
          actor_id: authUser.id,
          actor_name_snapshot: authUser.name,
          action: nextStatus,
          from_status: approval.request_status,
          to_status: nextStatus,
          note,
        },
        conn
      );
    }

    await conn.commit();

    const data = await Promise.all(ids.map((id) => ApprovalModel.findById(id)));

    return {
      count: data.filter(Boolean).length,
      data: data.filter(Boolean),
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function bulkApprove(payload, authUser) {
  return bulkAct(payload, authUser, 'approve');
}

async function bulkReject(payload, authUser) {
  return bulkAct(payload, authUser, 'reject');
}

module.exports = {
  list,
  getById,
  approve,
  reject,
  bulkApprove,
  bulkReject,
};
