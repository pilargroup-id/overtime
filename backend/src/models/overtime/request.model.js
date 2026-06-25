const { db } = require('../../config/database.config');

function getExecutor(conn) {
  return conn || db;
}

function buildWhere(filters = {}, authUser = null) {
  const where = [];
  const params = [];

  // My Requests scope only for this endpoint
  if (authUser?.id) {
    where.push('(submitted_by = ? OR employee_id = ?)');
    params.push(authUser.id, authUser.id);
  }

  if (filters.search) {
    where.push(`(
      request_number LIKE ?
      OR employee_name_snapshot LIKE ?
      OR employee_internal_id_snapshot LIKE ?
      OR task_description LIKE ?
      OR result_description LIKE ?
    )`);

    params.push(
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`
    );
  }

  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }

  if (filters.talenta_status) {
    where.push('talenta_status = ?');
    params.push(filters.talenta_status);
  }

  if (filters.work_date_from) {
    where.push('work_date >= ?');
    params.push(filters.work_date_from);
  }

  if (filters.work_date_to) {
    where.push('work_date <= ?');
    params.push(filters.work_date_to);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

async function findAll(filters = {}, authUser = null) {
  const where = buildWhere(filters, authUser);

  const [rows] = await db.query(
    `SELECT
       id,
       sequence_year,
       sequence_number,
       request_number,
       source_type,
       submitted_by,
       employee_id,
       employee_internal_id_snapshot,
       employee_name_snapshot,
       employee_job_position_snapshot,
       employee_job_level_name_snapshot,
       employee_job_level_value_snapshot,
       employee_employment_type_code_snapshot,
       company_id,
       company_code_snapshot,
       company_name_snapshot,
       department_id,
       department_code_snapshot,
       department_name_snapshot,
       department_class_snapshot,
       day_type,
       request_date,
       work_date,
       start_time,
       end_date,
       end_time,
       total_minutes,
       task_description,
       result_description,
       compensation_type_id,
       status,
       approval_type,
       current_approver_id,
       talenta_status,
       talenta_processed_by,
       talenta_processed_at,
       submitted_at,
       approved_at,
       rejected_at,
       canceled_at,
       created_at,
       updated_at
     FROM requests
     ${where.clause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...where.params, Number(filters.limit), Number(filters.offset)]
  );

  return rows;
}

async function countAll(filters = {}, authUser = null) {
  const where = buildWhere(filters, authUser);

  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM requests
     ${where.clause}`,
    where.params
  );

  return Number(rows[0]?.total || 0);
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT
       r.*,
       ct.code AS compensation_code,
       ct.name AS compensation_name,
       ct.compensation_kind,
       ct.amount AS compensation_amount,
       ct.leave_days AS compensation_leave_days
     FROM requests r
     INNER JOIN compensation_types ct ON ct.id = r.compensation_type_id
     WHERE r.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function create(data, conn = null) {
  const executor = getExecutor(conn);

  const [result] = await executor.query(
    `INSERT INTO requests (
       sequence_year,
       sequence_number,
       request_number,
       source_type,
       submitted_by,
       employee_id,
       employee_internal_id_snapshot,
       employee_name_snapshot,
       employee_job_position_snapshot,
       employee_job_level_id_snapshot,
       employee_job_level_name_snapshot,
       employee_job_level_value_snapshot,
       employee_employment_type_code_snapshot,
       company_id,
       company_code_snapshot,
       company_name_snapshot,
       department_id,
       department_code_snapshot,
       department_name_snapshot,
       department_class_snapshot,
       day_type,
       request_date,
       work_date,
       start_time,
       end_date,
       end_time,
       total_minutes,
       task_description,
       result_description,
       compensation_type_id,
       status,
       approval_type,
       current_approver_id,
       talenta_status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.sequence_year,
      data.sequence_number,
      data.request_number,
      data.source_type,
      data.submitted_by,
      data.employee_id,
      data.employee_internal_id_snapshot,
      data.employee_name_snapshot,
      data.employee_job_position_snapshot,
      data.employee_job_level_id_snapshot,
      data.employee_job_level_name_snapshot,
      data.employee_job_level_value_snapshot,
      data.employee_employment_type_code_snapshot,
      data.company_id,
      data.company_code_snapshot,
      data.company_name_snapshot,
      data.department_id,
      data.department_code_snapshot,
      data.department_name_snapshot,
      data.department_class_snapshot,
      data.day_type,
      data.request_date,
      data.work_date,
      data.start_time,
      data.end_date,
      data.end_time,
      data.total_minutes,
      data.task_description,
      data.result_description,
      data.compensation_type_id,
      'SUBMITTED',
      data.approval_type,
      data.current_approver_id,
      'PENDING',
    ]
  );

  return result.insertId;
}

async function cancel(id, actorId, conn = null) {
  const executor = getExecutor(conn);

  await executor.query(
    `UPDATE requests
     SET
       status = 'CANCELED',
       canceled_at = CURRENT_TIMESTAMP,
       current_approver_id = NULL
     WHERE id = ?
       AND status = 'SUBMITTED'
       AND (submitted_by = ? OR employee_id = ?)`,
    [id, actorId, actorId]
  );
}

async function markApproved(id, conn = null) {
  const executor = getExecutor(conn);

  await executor.query(
    `UPDATE requests
     SET
       status = 'APPROVED',
       approved_at = CURRENT_TIMESTAMP,
       current_approver_id = NULL
     WHERE id = ?
       AND status = 'SUBMITTED'`,
    [id]
  );
}

async function markRejected(id, conn = null) {
  const executor = getExecutor(conn);

  await executor.query(
    `UPDATE requests
     SET
       status = 'REJECTED',
       rejected_at = CURRENT_TIMESTAMP,
       current_approver_id = NULL
     WHERE id = ?
       AND status = 'SUBMITTED'`,
    [id]
  );
}

module.exports = {
  findAll,
  countAll,
  findById,
  create,
  cancel,
  markApproved,
  markRejected,
};