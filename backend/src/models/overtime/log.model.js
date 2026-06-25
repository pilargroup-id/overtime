const { db } = require('../../config/database.config');

function getExecutor(conn) {
  return conn || db;
}

async function create(data, conn = null) {
  const executor = getExecutor(conn);

  const [result] = await executor.query(
    `INSERT INTO request_logs (
       request_id,
       actor_id,
       actor_name_snapshot,
       action,
       from_status,
       to_status,
       note
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.request_id,
      data.actor_id,
      data.actor_name_snapshot,
      data.action,
      data.from_status || null,
      data.to_status || null,
      data.note || null,
    ]
  );

  return result.insertId;
}

module.exports = {
  create,
};