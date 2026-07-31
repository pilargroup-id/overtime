const { db } = require('../../config/database.config');

function buildWhere(filters = {}) {
  const where = [];
  const params = [];

  if (filters.search) {
    where.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.year) {
    where.push('YEAR(holiday_date) = ?');
    params.push(Number(filters.year));
  }

  if (filters.date_from) {
    where.push('holiday_date >= ?');
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    where.push('holiday_date <= ?');
    params.push(filters.date_to);
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
       holiday_date,
       name,
       multiplier,
       description,
       is_active,
       created_by,
       updated_by,
       created_at,
       updated_at
     FROM national_holidays
     ${where.clause}
     ORDER BY holiday_date ASC, id ASC
     LIMIT ? OFFSET ?`,
    [...where.params, Number(filters.limit), Number(filters.offset)]
  );

  return rows;
}

async function countAll(filters = {}) {
  const where = buildWhere(filters);

  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM national_holidays
     ${where.clause}`,
    where.params
  );

  return Number(rows[0]?.total || 0);
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT
       id,
       holiday_date,
       name,
       multiplier,
       description,
       is_active,
       created_by,
       updated_by,
       created_at,
       updated_at
     FROM national_holidays
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findActiveByDate(holidayDate) {
  const [rows] = await db.query(
    `SELECT
       id,
       holiday_date,
       name,
       multiplier,
       description,
       is_active
     FROM national_holidays
     WHERE holiday_date = ?
       AND is_active = 1
     LIMIT 1`,
    [holidayDate]
  );

  return rows[0] || null;
}

async function create(data) {
  const [result] = await db.query(
    `INSERT INTO national_holidays (
       holiday_date,
       name,
       multiplier,
       description,
       is_active,
       created_by,
       updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.holiday_date,
      data.name,
      data.multiplier,
      data.description,
      data.is_active ?? 1,
      data.created_by,
      data.updated_by,
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
    `UPDATE national_holidays
     SET ${fields.join(', ')}
     WHERE id = ?`,
    params
  );
}

module.exports = {
  findAll,
  countAll,
  findById,
  findActiveByDate,
  create,
  update,
};
