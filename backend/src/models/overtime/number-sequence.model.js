async function getOrCreateSequenceForUpdate(sequenceYear, conn) {
  const [rows] = await conn.query(
    `SELECT id, sequence_year, last_number
     FROM number_sequences
     WHERE sequence_year = ?
     FOR UPDATE`,
    [sequenceYear]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  await conn.query(
    `INSERT INTO number_sequences (sequence_year, last_number)
     VALUES (?, 0)`,
    [sequenceYear]
  );

  const [createdRows] = await conn.query(
    `SELECT id, sequence_year, last_number
     FROM number_sequences
     WHERE sequence_year = ?
     FOR UPDATE`,
    [sequenceYear]
  );

  return createdRows[0];
}

async function updateLastNumber(sequenceYear, lastNumber, conn) {
  await conn.query(
    `UPDATE number_sequences
     SET last_number = ?
     WHERE sequence_year = ?`,
    [lastNumber, sequenceYear]
  );
}

module.exports = {
  getOrCreateSequenceForUpdate,
  updateLastNumber,
};