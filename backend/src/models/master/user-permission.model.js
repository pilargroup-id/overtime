const { db } = require('../../config/database.config');

function buildWhere(filters = {}) {
  const where = [];
  const params = [];

  if (filters.user_id) {
    where.push('user_id = ?');
    params.push(filters.user_id);
  }

  if (filters.permission_type) {
    where.push('permission_type = ?');
    params.push(filters.permission_type);
  }

  if (filters.scope_type) {
    where.push('scope_type = ?');
    params.push(filters.scope_type);
  }

  if (filters.company_id) {
    where.push('company_id = ?');
    params.push(filters.company_id);
  }

  if (filters.department_id) {
    where.push('department_id = ?');
    params.push(filters.department_id);
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
       user_id,
       permission_type,
       scope_type,
       company_id,
       department_id,
       granted_by,
       is_active,
       valid_from,
       valid_until,
       created_at,
       updated_at
     FROM user_permissions
     ${where.clause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...where.params, Number(filters.limit), Number(filters.offset)]
  );

  return rows;
}

async function countAll(filters = {}) {
  const where = buildWhere(filters);

  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM user_permissions
     ${where.clause}`,
    where.params
  );

  return Number(rows[0]?.total || 0);
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT
       id,
       user_id,
       permission_type,
       scope_type,
       company_id,
       department_id,
       granted_by,
       is_active,
       valid_from,
       valid_until,
       created_at,
       updated_at
     FROM user_permissions
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function create(data) {
  const [result] = await db.query(
    `INSERT INTO user_permissions (
       user_id,
       permission_type,
       scope_type,
       company_id,
       department_id,
       granted_by,
       is_active,
       valid_from,
       valid_until
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.user_id,
      data.permission_type,
      data.scope_type,
      data.company_id,
      data.department_id,
      data.granted_by,
      data.is_active ?? 1,
      data.valid_from,
      data.valid_until,
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
    `UPDATE user_permissions
     SET ${fields.join(', ')}
     WHERE id = ?`,
    params
  );
}

async function findActiveByUserId(userId) {
  const [rows] = await db.query(
    `SELECT
       id,
       user_id,
       permission_type,
       scope_type,
       company_id,
       department_id,
       granted_by,
       is_active,
       valid_from,
       valid_until,
       created_at,
       updated_at
     FROM user_permissions
     WHERE user_id = ?
       AND is_active = 1
       AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
       AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows;
}

async function hasActivePermission(userId, permissionType) {
  const [rows] = await db.query(
    `SELECT id
     FROM user_permissions
     WHERE user_id = ?
       AND permission_type = ?
       AND is_active = 1
       AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
       AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     LIMIT 1`,
    [userId, permissionType]
  );

  return rows.length > 0;
}

module.exports = {
  findAll,
  countAll,
  findById,
  create,
  update,
  findActiveByUserId,
  hasActivePermission,
};