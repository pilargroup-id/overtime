const { db } = require('../../config/database.config');

function getExecutor(conn) {
  return conn || db;
}

async function create(data, conn = null) {
  const executor = getExecutor(conn);

  const [result] = await executor.query(
    `INSERT INTO request_approvals (
       request_id,
       approval_level,
       approver_id,
       approver_name_snapshot,
       approver_job_position_snapshot,
       approver_job_level_name_snapshot,
       approver_job_level_value_snapshot,
       status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.request_id,
      data.approval_level || 1,
      data.approver_id,
      data.approver_name_snapshot,
      data.approver_job_position_snapshot,
      data.approver_job_level_name_snapshot,
      data.approver_job_level_value_snapshot,
      'PENDING',
    ]
  );

  return result.insertId;
}

async function cancelPendingByRequestId(requestId, conn = null) {
  const executor = getExecutor(conn);

  await executor.query(
    `UPDATE request_approvals
     SET status = 'CANCELED',
         note = 'Request canceled by requester',
         acted_at = CURRENT_TIMESTAMP
     WHERE request_id = ?
       AND status = 'PENDING'`,
    [requestId]
  );
}

async function findAllForApprover(filters = {}, authUser) {
  const where = ['ra.approver_id = ?'];
  const params = [authUser.id];

  if (filters.status) {
    where.push('ra.status = ?');
    params.push(filters.status);
  }

  if (filters.request_status) {
    where.push('r.status = ?');
    params.push(filters.request_status);
  }

  if (filters.department_id) {
    where.push('r.department_id = ?');
    params.push(Number(filters.department_id));
  }

  if (filters.employee_id) {
    where.push('r.employee_id = ?');
    params.push(filters.employee_id);
  }

  if (filters.work_date_from) {
    where.push('r.work_date >= ?');
    params.push(filters.work_date_from);
  }

  if (filters.work_date_to) {
    where.push('r.work_date <= ?');
    params.push(filters.work_date_to);
  }

  if (filters.search) {
    where.push(`(
      r.request_number LIKE ?
      OR r.employee_name_snapshot LIKE ?
      OR r.employee_internal_id_snapshot LIKE ?
      OR r.task_description LIKE ?
      OR r.result_description LIKE ?
    )`);

    params.push(
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`
    );
  }

  const [rows] = await db.query(
    `SELECT
       ra.id,
       ra.request_id,
       ra.approval_level,
       ra.approver_id,
       ra.approver_name_snapshot,
       ra.approver_job_position_snapshot,
       ra.approver_job_level_name_snapshot,
       ra.approver_job_level_value_snapshot,
       ra.status,
       ra.note,
       ra.acted_at,
       ra.created_at,
       ra.updated_at,

       r.request_number,
       r.source_type,
       r.submitted_by,
       r.employee_id,
       r.employee_internal_id_snapshot,
       r.employee_name_snapshot,
       r.employee_job_position_snapshot,
       r.employee_job_level_name_snapshot,
       r.employee_job_level_value_snapshot,
       r.employee_employment_type_code_snapshot,
       r.company_id,
       r.company_code_snapshot,
       r.company_name_snapshot,
       r.department_id,
       r.department_code_snapshot,
       r.department_name_snapshot,
       r.department_class_snapshot,
       r.day_type,
       r.request_date,
       r.work_date,
       r.start_time,
       r.end_date,
       r.end_time,
       r.total_minutes,
       r.task_description,
       r.result_description,
       r.compensation_type_id,
       r.status AS request_status,
       r.approval_type,
       r.current_approver_id,
       r.talenta_status,
       r.submitted_at,
       r.approved_at,
       r.rejected_at,
       r.canceled_at,

       ct.code AS compensation_code,
       ct.name AS compensation_name,
       ct.compensation_kind,
       ct.amount AS compensation_amount,
       ct.leave_days AS compensation_leave_days
     FROM request_approvals ra
     INNER JOIN requests r ON r.id = ra.request_id
     INNER JOIN compensation_types ct ON ct.id = r.compensation_type_id
     WHERE ${where.join(' AND ')}
     ORDER BY ra.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(filters.limit), Number(filters.offset)]
  );

  return rows;
}

async function countAllForApprover(filters = {}, authUser) {
  const where = ['ra.approver_id = ?'];
  const params = [authUser.id];

  if (filters.status) {
    where.push('ra.status = ?');
    params.push(filters.status);
  }

  if (filters.request_status) {
    where.push('r.status = ?');
    params.push(filters.request_status);
  }

  if (filters.department_id) {
    where.push('r.department_id = ?');
    params.push(Number(filters.department_id));
  }

  if (filters.employee_id) {
    where.push('r.employee_id = ?');
    params.push(filters.employee_id);
  }

  if (filters.work_date_from) {
    where.push('r.work_date >= ?');
    params.push(filters.work_date_from);
  }

  if (filters.work_date_to) {
    where.push('r.work_date <= ?');
    params.push(filters.work_date_to);
  }

  if (filters.search) {
    where.push(`(
      r.request_number LIKE ?
      OR r.employee_name_snapshot LIKE ?
      OR r.employee_internal_id_snapshot LIKE ?
      OR r.task_description LIKE ?
      OR r.result_description LIKE ?
    )`);

    params.push(
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`
    );
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM request_approvals ra
     INNER JOIN requests r ON r.id = ra.request_id
     WHERE ${where.join(' AND ')}`,
    params
  );

  return Number(rows[0]?.total || 0);
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT
       ra.*,

       r.request_number,
       r.source_type,
       r.submitted_by,
       r.employee_id,
       r.employee_internal_id_snapshot,
       r.employee_name_snapshot,
       r.employee_job_position_snapshot,
       r.employee_job_level_name_snapshot,
       r.employee_job_level_value_snapshot,
       r.employee_employment_type_code_snapshot,
       r.company_id,
       r.company_code_snapshot,
       r.company_name_snapshot,
       r.department_id,
       r.department_code_snapshot,
       r.department_name_snapshot,
       r.department_class_snapshot,
       r.day_type,
       r.request_date,
       r.work_date,
       r.start_time,
       r.end_date,
       r.end_time,
       r.total_minutes,
       r.task_description,
       r.result_description,
       r.compensation_type_id,
       r.status AS request_status,
       r.approval_type,
       r.current_approver_id,
       r.talenta_status,
       r.submitted_at,
       r.approved_at,
       r.rejected_at,
       r.canceled_at,

       ct.code AS compensation_code,
       ct.name AS compensation_name,
       ct.compensation_kind,
       ct.amount AS compensation_amount,
       ct.leave_days AS compensation_leave_days
     FROM request_approvals ra
     INNER JOIN requests r ON r.id = ra.request_id
     INNER JOIN compensation_types ct ON ct.id = r.compensation_type_id
     WHERE ra.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function approve(id, note = null, conn = null) {
  const executor = getExecutor(conn);

  await executor.query(
    `UPDATE request_approvals
     SET
       status = 'APPROVED',
       note = ?,
       acted_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND status = 'PENDING'`,
    [note, id]
  );
}

async function reject(id, note = null, conn = null) {
  const executor = getExecutor(conn);

  await executor.query(
    `UPDATE request_approvals
     SET
       status = 'REJECTED',
       note = ?,
       acted_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND status = 'PENDING'`,
    [note, id]
  );
}

module.exports = {
  create,
  cancelPendingByRequestId,
  findAllForApprover,
  countAllForApprover,
  findById,
  approve,
  reject,
};