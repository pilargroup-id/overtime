const { db } = require('../../config/database.config');

const UserModel = require('../../models/user.model');
const ApprovalModel = require('../../models/overtime/approval.model');
const RequestModel = require('../../models/overtime/request.model');
const LogModel = require('../../models/overtime/log.model');
const ApprovalResolverService = require('./approval-resolver.service');

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
    request_id: query.request_id || null,
    department_id: query.department_id || null,
    day_type: query.day_type || null,
    compensation_type_id: query.compensation_type_id || null,
    employee_id: query.employee_id || null,
    submitted_by: query.submitted_by || null,
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

  if (String(approval.current_approver_id || '') !== String(authUser.id)) {
    throw createValidationError({
      approval_step: 'This approval is not the current approval step',
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


function buildEmployeeFromApproval(approval) {
  return {
    id: approval.employee_id,
    job_level_value: approval.employee_job_level_value_snapshot,
    department_id: approval.department_id,
    departments: approval.department_id === null || approval.department_id === undefined
      ? []
      : [{ id: approval.department_id, is_primary: 1 }],
  };
}

async function resolveApprovalTransition(approval) {
  const employee = buildEmployeeFromApproval(approval);
  const rule = await ApprovalResolverService.resolveApprovalRule(employee);
  const finalApprover = await ApprovalResolverService.resolveFinalApprover(rule, employee);

  const isConfiguredIntermediateStep =
    Number(rule.use_intermediate_approver) === 1 &&
    Number(approval.approval_level) === 1 &&
    Number(approval.approver_job_level_value_snapshot) === Number(rule.intermediate_job_level_value) &&
    String(approval.approver_id) !== String(finalApprover.id);

  return {
    rule,
    finalApprover,
    hasNextStep: isConfiguredIntermediateStep,
  };
}

async function applyApproveTransition(approval, transition, note, authUser, conn) {
  await ApprovalModel.approve(approval.id, note, conn);

  if (transition.hasNextStep) {
    const nextLevel = Number(approval.approval_level) + 1;
    const existingNextApproval = await ApprovalModel.findByRequestAndLevel(
      approval.request_id,
      nextLevel,
      conn
    );

    if (!existingNextApproval) {
      await ApprovalModel.create(
        {
          request_id: approval.request_id,
          approval_level: nextLevel,
          approver_id: transition.finalApprover.id,
          approver_name_snapshot: transition.finalApprover.name,
          approver_job_position_snapshot: transition.finalApprover.job_position,
          approver_job_level_name_snapshot: transition.finalApprover.job_level,
          approver_job_level_value_snapshot: transition.finalApprover.job_level_value,
        },
        conn
      );
    }

    await RequestModel.updateCurrentApprover(
      approval.request_id,
      transition.finalApprover.id,
      conn
    );

    await LogModel.create(
      {
        request_id: approval.request_id,
        actor_id: authUser.id,
        actor_name_snapshot: authUser.name,
        action: 'INTERMEDIATE_APPROVED',
        from_status: approval.request_status,
        to_status: 'SUBMITTED',
        note,
      },
      conn
    );

    return;
  }

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
}

async function approve(id, payload, authUser) {
  const approval = await ApprovalModel.findById(id);

  if (!approval) {
    return null;
  }

  assertCanAct(approval, authUser);

  const note = payload?.note || null;
  const transition = await resolveApprovalTransition(approval);

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await applyApproveTransition(approval, transition, note, authUser, conn);

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

  const isApprove = action === 'approve';
  const transitions = isApprove
    ? await Promise.all(approvals.map((approval) => resolveApprovalTransition(approval)))
    : [];

  const conn = await db.getConnection();
  const nextStatus = isApprove ? 'APPROVED' : 'REJECTED';

  try {
    await conn.beginTransaction();

    for (let index = 0; index < approvals.length; index += 1) {
      const approval = approvals[index];

      if (isApprove) {
        await applyApproveTransition(
          approval,
          transitions[index],
          note,
          authUser,
          conn
        );
      } else {
        await ApprovalModel.reject(approval.id, note, conn);
        await RequestModel.markRejected(approval.request_id, conn);

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
