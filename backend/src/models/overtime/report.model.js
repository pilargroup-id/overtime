const { db } = require('../../config/database.config');

function getExecutor(conn) {
  return conn || db;
}

function buildWhere(filters = {}) {
  const where = [];
  const params = [];

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

  if (filters.status) {
    where.push('r.status = ?');
    params.push(filters.status);
  }

  if (filters.talenta_status) {
    where.push('r.talenta_status = ?');
    params.push(filters.talenta_status);
  }

  if (filters.employment_type_code) {
    where.push('r.employee_employment_type_code_snapshot = ?');
    params.push(filters.employment_type_code);
  }

  if (filters.department_id) {
    where.push('r.department_id = ?');
    params.push(Number(filters.department_id));
  }

  if (filters.company_id) {
    where.push('r.company_id = ?');
    params.push(filters.company_id);
  }

  if (filters.day_type) {
    where.push('r.day_type = ?');
    params.push(filters.day_type);
  }

  if (filters.compensation_type_id) {
    where.push('r.compensation_type_id = ?');
    params.push(Number(filters.compensation_type_id));
  }

  if (filters.employee_id) {
    where.push('r.employee_id = ?');
    params.push(filters.employee_id);
  }

  if (filters.submitted_by) {
    where.push('r.submitted_by = ?');
    params.push(filters.submitted_by);
  }

  if (filters.approver_id) {
    where.push('ra.approver_id = ?');
    params.push(filters.approver_id);
  }

  if (filters.source_type) {
    where.push('r.source_type = ?');
    params.push(filters.source_type);
  }

  if (filters.request_date_from) {
    where.push('r.request_date >= ?');
    params.push(filters.request_date_from);
  }

  if (filters.request_date_to) {
    where.push('r.request_date <= ?');
    params.push(filters.request_date_to);
  }

  if (filters.work_date_from) {
    where.push('r.work_date >= ?');
    params.push(filters.work_date_from);
  }

  if (filters.work_date_to) {
    where.push('r.work_date <= ?');
    params.push(filters.work_date_to);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

async function findAll(filters = {}) {
  const where = buildWhere(filters);

  const [rows] = await db.query(
    `SELECT
       r.id,
       r.sequence_year,
       r.sequence_number,
       r.request_number,
       r.source_type,
       r.submitted_by,
       r.employee_id,
       r.employee_internal_id_snapshot,
       r.employee_name_snapshot,
       r.employee_job_position_snapshot,
       r.employee_job_level_id_snapshot,
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
       r.status,
       r.approval_type,
       r.current_approver_id,
       r.talenta_status,
       r.talenta_processed_by,
       r.talenta_processed_at,
       r.submitted_at,
       r.approved_at,
       r.rejected_at,
       r.canceled_at,
       r.created_at,
       r.updated_at,

       ct.code AS compensation_code,
       ct.name AS compensation_name,
       ct.compensation_kind,
       ct.amount AS compensation_amount,
       ct.leave_days AS compensation_leave_days,

       ra.id AS approval_id,
       ra.approver_id,
       ra.approver_name_snapshot,
       ra.approver_job_position_snapshot,
       ra.approver_job_level_name_snapshot,
       ra.approver_job_level_value_snapshot,
       ra.status AS approval_status,
       ra.note AS approval_note,
       ra.acted_at AS approval_acted_at
     FROM requests r
     INNER JOIN compensation_types ct ON ct.id = r.compensation_type_id
     LEFT JOIN request_approvals ra ON ra.request_id = r.id
     ${where.clause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...where.params, Number(filters.limit), Number(filters.offset)]
  );

  return rows;
}

async function countAll(filters = {}) {
  const where = buildWhere(filters);

  const [rows] = await db.query(
    `SELECT COUNT(DISTINCT r.id) AS total
     FROM requests r
     LEFT JOIN request_approvals ra ON ra.request_id = r.id
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
       ct.leave_days AS compensation_leave_days,

       ra.id AS approval_id,
       ra.approval_level,
       ra.approver_id,
       ra.approver_name_snapshot,
       ra.approver_job_position_snapshot,
       ra.approver_job_level_name_snapshot,
       ra.approver_job_level_value_snapshot,
       ra.status AS approval_status,
       ra.note AS approval_note,
       ra.acted_at AS approval_acted_at
     FROM requests r
     INNER JOIN compensation_types ct ON ct.id = r.compensation_type_id
     LEFT JOIN request_approvals ra ON ra.request_id = r.id
     WHERE r.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function updateTalentaStatus(id, data, conn = null) {
  const executor = getExecutor(conn);

  await executor.query(
    `UPDATE requests
     SET
       talenta_status = ?,
       talenta_processed_by = ?,
       talenta_processed_at = CASE
         WHEN ? = 'PROCESSED' THEN CURRENT_TIMESTAMP
         ELSE NULL
       END
     WHERE id = ?`,
    [
      data.talenta_status,
      data.talenta_processed_by,
      data.talenta_status,
      id,
    ]
  );
}

async function bulkUpdaTetalentaStatus(ids, data, conn = null) {
  const executor = getExecutor(conn);

  await executor.query(
    `UPDATE requests
     SET
       talenta_status = ?,
       talenta_processed_by = ?,
       talenta_processed_at = CASE
         WHEN ? = 'PROCESSED' THEN CURRENT_TIMESTAMP
         ELSE NULL
       END
     WHERE id IN (?)`,
    [
      data.talenta_status,
      data.talenta_processed_by,
      data.talenta_status,
      ids,
    ]
  );
}

async function findStatusesByIds(ids, conn = null) {
  const executor = getExecutor(conn);

  const [rows] = await executor.query(
    `SELECT
       id,
       request_number,
       status,
       talenta_status
     FROM requests
     WHERE id IN (?)`,
    [ids]
  );

  return rows;
}

module.exports = {
  findAll,
  countAll,
  findById,
  updateTalentaStatus,
  bulkUpdaTetalentaStatus,
  findStatusesByIds,
};