const { db } = require('../../config/database.config');

function buildWhere(filters = {}) {
  const where = [];
  const params = [];

  if (filters.search) {
    where.push('(code LIKE ? OR name LIKE ? OR description LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.compensation_kind) {
    where.push('compensation_kind = ?');
    params.push(filters.compensation_kind);
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
       compensation_kind,
       amount,
       leave_days,
       description,
       is_active,
       created_at,
       updated_at
     FROM compensation_types
     ${where.clause}
     ORDER BY name ASC
     LIMIT ? OFFSET ?`,
    [...where.params, Number(filters.limit), Number(filters.offset)]
  );

  return rows;
}

async function countAll(filters = {}) {
  const where = buildWhere(filters);

  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM compensation_types
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
       compensation_kind,
       amount,
       leave_days,
       description,
       is_active,
       created_at,
       updated_at
     FROM compensation_types
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function create(data) {
  const [result] = await db.query(
    `INSERT INTO compensation_types (
       code,
       name,
       compensation_kind,
       amount,
       leave_days,
       description,
       is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.code,
      data.name,
      data.compensation_kind,
      data.amount,
      data.leave_days,
      data.description,
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
    `UPDATE compensation_types
     SET ${fields.join(', ')}
     WHERE id = ?`,
    params
  );
}

module.exports = {
  findAll,
  countAll,
  findById,
  create,
  update,
};