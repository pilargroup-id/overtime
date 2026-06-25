const NumberSequenceModel = require('../../models/overtime/number-sequence.model');

function padSequence(number) {
  return String(number).padStart(5, '0');
}

async function generateRequestNumber({ sequenceYear, departmentCode }, conn) {
  const sequence = await NumberSequenceModel.getOrCreateSequenceForUpdate(sequenceYear, conn);

  const nextNumber = Number(sequence.last_number) + 1;
  await NumberSequenceModel.updateLastNumber(sequenceYear, nextNumber, conn);

  const yearShort = String(sequenceYear).slice(-2);
  const safeDepartmentCode = departmentCode || 'GEN';

  return {
    sequence_year: sequenceYear,
    sequence_number: nextNumber,
    request_number: `OVT-${safeDepartmentCode}-${yearShort}-${padSequence(nextNumber)}`,
  };
}

module.exports = {
  generateRequestNumber,
};