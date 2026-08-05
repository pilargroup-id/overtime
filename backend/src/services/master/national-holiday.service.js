const NationalHolidayModel = require('../../models/master/national-holiday.model');
const UserPermissionModel = require('../../models/master/user-permission.model');

function createValidationError(errors) {
  const err = new Error('Validation failed');
  err.statusCode = 400;
  err.errors = errors;
  return err;
}

function createForbiddenError(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

function normalizeIsActive(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return 1;

  const numberValue = Number(value);
  return [0, 1].includes(numberValue) ? numberValue : value;
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

async function assertCanManage(authUser) {
  const allowed = await UserPermissionModel.hasActivePermission(
    authUser?.id,
    'REPORT_MANAGE'
  );

  if (!allowed) {
    throw createForbiddenError('You are not allowed to manage national holidays');
  }
}

function validatePayload(payload, isUpdate = false) {
  const errors = {};

  if (!isUpdate || payload.holiday_date !== undefined) {
    if (!payload.holiday_date || !isValidDateString(payload.holiday_date)) {
      errors.holiday_date = 'Holiday date is required and must use YYYY-MM-DD format';
    }
  }

  if (!isUpdate || payload.name !== undefined) {
    if (!payload.name || String(payload.name).trim() === '') {
      errors.name = 'Name is required';
    }
  }

  if (!isUpdate || payload.multiplier !== undefined) {
    const multiplier = Number(payload.multiplier);

    if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 999.99) {
      errors.multiplier = 'Multiplier must be greater than 0 and at most 999.99';
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

function buildPayload(payload, authUser = null, isUpdate = false) {
  const actorId = authUser?.id || null;

  return {
    holiday_date: payload.holiday_date !== undefined ? String(payload.holiday_date).slice(0, 10) : undefined,
    name: payload.name !== undefined ? String(payload.name).trim() : undefined,
    multiplier: payload.multiplier !== undefined ? Number(payload.multiplier) : undefined,
    description: payload.description === undefined
      ? undefined
      : payload.description === null || String(payload.description).trim() === ''
        ? null
        : String(payload.description).trim(),
    is_active: normalizeIsActive(payload.is_active),
    ...(isUpdate
      ? { updated_by: actorId }
      : { created_by: actorId, updated_by: actorId }),
  };
}

async function list(query, authUser) {
  await assertCanManage(authUser);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const filters = {
    search: query.search || null,
    year: query.year || null,
    date_from: query.date_from || null,
    date_to: query.date_to || null,
    is_active: query.is_active !== undefined ? query.is_active : null,
    page,
    limit,
    offset,
  };

  const [data, total] = await Promise.all([
    NationalHolidayModel.findAll(filters),
    NationalHolidayModel.countAll(filters),
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

async function getById(id, authUser) {
  await assertCanManage(authUser);
  return NationalHolidayModel.findById(id);
}

async function create(payload, authUser) {
  await assertCanManage(authUser);
  validatePayload(payload);

  const data = buildPayload(payload, authUser, false);

  try {
    const id = await NationalHolidayModel.create(data);
    return NationalHolidayModel.findById(id);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw createValidationError({ holiday_date: 'Holiday date already exists' });
    }

    throw err;
  }
}

async function update(id, payload, authUser) {
  await assertCanManage(authUser);

  const existing = await NationalHolidayModel.findById(id);

  if (!existing) {
    return null;
  }

  validatePayload(payload, true);

  const data = buildPayload(payload, authUser, true);

  try {
    await NationalHolidayModel.update(id, data);
    return NationalHolidayModel.findById(id);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw createValidationError({ holiday_date: 'Holiday date already exists' });
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
