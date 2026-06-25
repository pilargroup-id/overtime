const UserPermissionModel = require('../../models/master/user-permission.model');

const ALLOWED_PERMISSION_TYPES = [
  'REQUEST_CREATE_SCOPED',
  'REQUEST_CREATE_ALL',
  'REPORT_MANAGE',
];
const ALLOWED_SCOPE_TYPES = ['GLOBAL', 'COMPANY', 'DEPARTMENT'];

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

function normalizeNullable(value) {
  if (value === undefined) return undefined;
  if (value === '') return null;
  return value;
}

function validatePayload(payload, isUpdate = false) {
  const errors = {};

  if (!isUpdate || payload.user_id !== undefined) {
    if (!payload.user_id || String(payload.user_id).trim() === '') {
      errors.user_id = 'User id is required';
    }
  }

  if (!isUpdate || payload.permission_type !== undefined) {
    if (!payload.permission_type || !ALLOWED_PERMISSION_TYPES.includes(payload.permission_type)) {
      errors.permission_type = 'Permission type must be REQUEST_CREATE_SCOPED, REQUEST_CREATE_ALL, or REPORT_MANAGE';
    }
  }

  if (!isUpdate || payload.scope_type !== undefined) {
    if (!payload.scope_type || !ALLOWED_SCOPE_TYPES.includes(payload.scope_type)) {
      errors.scope_type = 'Scope type must be GLOBAL, COMPANY, or DEPARTMENT';
    }
  }

  if (payload.permission_type === 'REQUEST_CREATE_ALL' && payload.scope_type !== 'GLOBAL') {
  errors.scope_type = 'REQUEST_CREATE_ALL must use GLOBAL scope';
  }

  if (payload.permission_type === 'REPORT_MANAGE' && payload.scope_type !== 'GLOBAL') {
    errors.scope_type = 'REPORT_MANAGE must use GLOBAL scope';
  }

  if (
    payload.permission_type === 'REQUEST_CREATE_SCOPED' &&
    !['COMPANY', 'DEPARTMENT'].includes(payload.scope_type)
  ) {
    errors.scope_type = 'REQUEST_CREATE_SCOPED must use COMPANY or DEPARTMENT scope';
  }

  const scopeType = payload.scope_type;

  if (scopeType === 'COMPANY') {
    if (!payload.company_id || String(payload.company_id).trim() === '') {
      errors.company_id = 'Company id is required when scope_type is COMPANY';
    }
  }

  if (scopeType === 'DEPARTMENT') {
    if (!payload.department_id && payload.department_id !== 0) {
      errors.department_id = 'Department id is required when scope_type is DEPARTMENT';
    }
  }

  if (payload.is_active !== undefined) {
    const isActive = normalizeIsActive(payload.is_active);

    if (![0, 1].includes(isActive)) {
      errors.is_active = 'is_active must be 0 or 1';
    }
  }

  if (
    payload.valid_from &&
    payload.valid_until &&
    String(payload.valid_from) > String(payload.valid_until)
  ) {
    errors.valid_until = 'valid_until must be greater than or equal to valid_from';
  }

  if (Object.keys(errors).length > 0) {
    throw createValidationError(errors);
  }
}

function buildPayload(payload, authUser = null) {
  const scopeType = payload.scope_type;

  let companyId = normalizeNullable(payload.company_id);
  let departmentId = normalizeNullable(payload.department_id);

  if (scopeType === 'GLOBAL') {
    companyId = null;
    departmentId = null;
  }

  if (scopeType === 'COMPANY') {
    departmentId = null;
  }

  return {
    user_id         : payload.user_id !== undefined ? String(payload.user_id).trim() : undefined,
    permission_type : payload.permission_type,
    scope_type      : payload.scope_type,
    company_id      : companyId,
    department_id   : departmentId,
    granted_by      : payload.granted_by !== undefined
      ? normalizeNullable(payload.granted_by)
      : authUser?.id,
    is_active       : normalizeIsActive(payload.is_active),
    valid_from      : normalizeNullable(payload.valid_from),
    valid_until     : normalizeNullable(payload.valid_until),
  };
}

async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const filters = {
    user_id         : query.user_id || null,
    permission_type : query.permission_type || null,
    scope_type      : query.scope_type || null,
    company_id      : query.company_id || null,
    department_id   : query.department_id || null,
    is_active       : query.is_active !== undefined ? query.is_active : null,
    page,
    limit,
    offset,
  };

  const [data, total] = await Promise.all([
    UserPermissionModel.findAll(filters),
    UserPermissionModel.countAll(filters),
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
  return UserPermissionModel.findById(id);
}

async function create(payload, authUser) {
  validatePayload(payload);

  const data = buildPayload(payload, authUser);
  const id = await UserPermissionModel.create(data);

  return UserPermissionModel.findById(id);
}

async function update(id, payload) {
  const existing = await UserPermissionModel.findById(id);

  if (!existing) {
    return null;
  }

  validatePayload(payload, true);

  const data = buildPayload(payload);
  await UserPermissionModel.update(id, data);

  return UserPermissionModel.findById(id);
}

module.exports = {
  list,
  getById,
  create,
  update,
};