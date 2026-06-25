const { db } = require('../../config/database.config');

function buildWhere(filters = {}) {
  const where = [];
  const params = [];

  if (filters.search) {
    where.push('(code LIKE ? OR name LIKE ? OR approval_type LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.department_id) {
    where.push('department_id = ?');
    params.push(Number(filters.department_id));
  }

  if (filters.approver_scope_type) {
    where.push('approver_scope_type = ?');
    params.push(filters.approver_scope_type);
  }

  if (filters.approver_job_level_name) {
    where.push('approver_job_level_name = ?');
    params.push(filters.approver_job_level_name);
  }

  if (filters.approval_type) {
    where.push('approval_type = ?');
    params.push(filters.approval_type);
  }

  if (filters.is_active !== null && filters.is_active !== undefined && filters.is_active !== '') {
    where.push('is_active = ?');
    params.push(Number(filters.is_active));
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
       id,
       code,
       name,
       requester_min_job_level_value,
       requester_max_job_level_value,
       department_id,
       approver_scope_type,
       approver_department_id,
       approver_job_level_name,
       approval_type,
       priority,
       is_active,
       created_at,
       updated_at
     FROM approval_rules
     ${where.clause}
     ORDER BY priority ASC, id ASC
     LIMIT ? OFFSET ?`,
    [...where.params, Number(filters.limit), Number(filters.offset)]
  );

  return rows;
}

async function countAll(filters = {}) {
  const where = buildWhere(filters);

  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM approval_rules
     ${where.clause}`,
    where.params
  );

  return Number(rows[0]?.total || 0);
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT
       id,
       code,
       name,
       requester_min_job_level_value,
       requester_max_job_level_value,
       department_id,
       approver_scope_type,
       approver_department_id,
       approver_job_level_name,
       approval_type,
       priority,
       is_active,
       created_at,
       updated_at
     FROM approval_rules
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function create(data) {
  const [result] = await db.query(
    `INSERT INTO approval_rules (
       code,
       name,
       requester_min_job_level_value,
       requester_max_job_level_value,
       department_id,
       approver_scope_type,
       approver_department_id,
       approver_job_level_name,
       approval_type,
       priority,
       is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.code,
      data.name,
      data.requester_min_job_level_value,
      data.requester_max_job_level_value,
      data.department_id,
      data.approver_scope_type,
      data.approver_department_id,
      data.approver_job_level_name,
      data.approval_type,
      data.priority ?? 100,
      data.is_active ?? 1,
    ]
  );

  return result.insertId;
}

async function update(id, data) {
  const fields = [];
  const params = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  });

  if (fields.length === 0) {
    return;
  }

  params.push(id);

  await db.query(
    `UPDATE approval_rules
     SET ${fields.join(', ')}
     WHERE id = ?`,
    params
  );
}

async function findMatchingRule({ jobLevelValue, departmentId }) {
  const [rows] = await db.query(
    `SELECT
       id,
       code,
       name,
       requester_min_job_level_value,
       requester_max_job_level_value,
       department_id,
       approver_scope_type,
       approver_department_id,
       approver_job_level_name,
       approval_type,
       priority,
       is_active,
       created_at,
       updated_at
     FROM approval_rules
     WHERE is_active = 1
       AND ? BETWEEN requester_min_job_level_value AND requester_max_job_level_value
       AND (department_id = ? OR department_id IS NULL)
     ORDER BY
       CASE WHEN department_id IS NOT NULL THEN 0 ELSE 1 END ASC,
       priority ASC,
       id ASC
     LIMIT 1`,
    [Number(jobLevelValue), departmentId]
  );

  return rows[0] || null;
}

module.exports = {
  findAll,
  countAll,
  findById,
  create,
  update,
  findMatchingRule,
};