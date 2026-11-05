const CompensationTypeModel = require('../../models/master/compensation-type.model');

const ALLOWED_KINDS = ['MONEY', 'LEAVE'];

function createValidationError(errors) {
  const err = new Error('Validation failed');
  err.statusCode = 400;
  err.errors = errors;
  return err;
}

function normalizeIsActive(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return 1;

  const numberValue = Number(value);

  if (![0, 1].includes(numberValue)) {
    return value;
  }

  return numberValue;
}

function validatePayload(payload, isUpdate = false) {
  const errors = {};

  if (!isUpdate || payload.code !== undefined) {
    if (!payload.code || String(payload.code).trim() === '') {
      errors.code = 'Code is required';
    }
  }

  if (!isUpdate || payload.name !== undefined) {
    if (!payload.name || String(payload.name).trim() === '') {
      errors.name = 'Name is required';
    }
  }

  if (!isUpdate || payload.compensation_kind !== undefined) {
    if (!payload.compensation_kind || !ALLOWED_KINDS.includes(payload.compensation_kind)) {
      errors.compensation_kind = 'Compensation kind must be MONEY or LEAVE';
    }
  }

  if (payload.is_active !== undefined) {
    const isActive = normalizeIsActive(payload.is_active);

    if (![0, 1].includes(isActive)) {
      errors.is_active = 'is_active must be 0 or 1';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw createValidationError(errors);
  }
}

function buildPayload(payload) {
  return {
    code: payload.code !== undefined ? String(payload.code).trim() : undefined,
    name: payload.name !== undefined ? String(payload.name).trim() : undefined,
    compensation_kind: payload.compensation_kind,
    description: payload.description !== undefined
      ? (String(payload.description).trim() || null)
      : undefined,
    is_active: normalizeIsActive(payload.is_active),
  };
}

async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const filters = {
    search: query.search || null,
    compensation_kind: query.compensation_kind || null,
    is_active: query.is_active !== undefined ? query.is_active : null,
    page,
    limit,
    offset,
  };

  const [data, total] = await Promise.all([
    CompensationTypeModel.findAll(filters),
    CompensationTypeModel.countAll(filters),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getById(id) {
  return CompensationTypeModel.findById(id);
}

async function create(payload) {
  validatePayload(payload);
  const data = buildPayload(payload);

  try {
    const id = await CompensationTypeModel.create(data);
    return CompensationTypeModel.findById(id);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const duplicateKind = String(err.message || '').includes('uq_compensation_kind');
      throw createValidationError(
        duplicateKind
          ? { compensation_kind: 'Only one master row is allowed for each compensation kind' }
          : { code: 'Code already exists' }
      );
    }

    throw err;
  }
}

async function update(id, payload) {
  const existing = await CompensationTypeModel.findById(id);

  if (!existing) {
    return null;
  }

  validatePayload(payload, true);
  const data = buildPayload(payload);

  try {
    await CompensationTypeModel.update(id, data);
    return CompensationTypeModel.findById(id);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const duplicateKind = String(err.message || '').includes('uq_compensation_kind');
      throw createValidationError(
        duplicateKind
          ? { compensation_kind: 'Only one master row is allowed for each compensation kind' }
          : { code: 'Code already exists' }
      );
    }

    throw err;
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
};
