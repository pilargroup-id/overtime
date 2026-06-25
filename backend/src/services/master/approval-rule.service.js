const ApprovalRuleModel = require('../../models/master/approval-rule.model');

const ALLOWED_APPROVER_SCOPE_TYPES = [
  'SAME_DEPARTMENT',
  'GLOBAL',
  'SPECIFIC_DEPARTMENT',
];

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

function validateIntegerRange(payload, errors) {
  const min = Number(payload.requester_min_job_level_value);
  const max = Number(payload.requester_max_job_level_value);

  if (!Number.isInteger(min)) {
    errors.requester_min_job_level_value = 'Requester min job level value must be an integer';
  }

  if (!Number.isInteger(max)) {
    errors.requester_max_job_level_value = 'Requester max job level value must be an integer';
  }

  if (Number.isInteger(min) && Number.isInteger(max) && min > max) {
    errors.requester_max_job_level_value = 'Requester max job level value must be greater than or equal to min value';
  }
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

  if (
    !isUpdate ||
    payload.requester_min_job_level_value !== undefined ||
    payload.requester_max_job_level_value !== undefined
  ) {
    if (
      payload.requester_min_job_level_value === undefined ||
      payload.requester_max_job_level_value === undefined
    ) {
      errors.requester_job_level = 'Requester min and max job level values are required';
    } else {
      validateIntegerRange(payload, errors);
    }
  }

  if (!isUpdate || payload.approver_scope_type !== undefined) {
    if (
      !payload.approver_scope_type ||
      !ALLOWED_APPROVER_SCOPE_TYPES.includes(payload.approver_scope_type)
    ) {
      errors.approver_scope_type =
        'Approver scope type must be SAME_DEPARTMENT, GLOBAL, or SPECIFIC_DEPARTMENT';
    }
  }

  if (payload.approver_scope_type === 'SPECIFIC_DEPARTMENT') {
    if (!payload.approver_department_id && payload.approver_department_id !== 0) {
      errors.approver_department_id =
        'Approver department id is required when approver_scope_type is SPECIFIC_DEPARTMENT';
    }
  }

  if (!isUpdate || payload.approver_job_level_name !== undefined) {
    if (!payload.approver_job_level_name || String(payload.approver_job_level_name).trim() === '') {
      errors.approver_job_level_name = 'Approver job level name is required';
    }
  }

  if (!isUpdate || payload.approval_type !== undefined) {
    if (!payload.approval_type || String(payload.approval_type).trim() === '') {
      errors.approval_type = 'Approval type is required';
    }
  }

  if (payload.priority !== undefined && !Number.isInteger(Number(payload.priority))) {
    errors.priority = 'Priority must be an integer';
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
  let approverDepartmentId = normalizeNullable(payload.approver_department_id);

  if (
    payload.approver_scope_type === 'SAME_DEPARTMENT' ||
    payload.approver_scope_type === 'GLOBAL'
  ) {
    approverDepartmentId = null;
  }

  return {
    code                          : payload.code !== undefined ? String(payload.code).trim() : undefined,
    name                          : payload.name !== undefined ? String(payload.name).trim() : undefined,
    requester_min_job_level_value : payload.requester_min_job_level_value !== undefined
      ? Number(payload.requester_min_job_level_value)
      : undefined,
    requester_max_job_level_value : payload.requester_max_job_level_value !== undefined
      ? Number(payload.requester_max_job_level_value)
      : undefined,
    department_id                 : normalizeNullable(payload.department_id),
    approver_scope_type           : payload.approver_scope_type,
    approver_department_id        : approverDepartmentId,
    approver_job_level_name       : payload.approver_job_level_name !== undefined
      ? String(payload.approver_job_level_name).trim()
      : undefined,
    approval_type                 : payload.approval_type !== undefined
      ? String(payload.approval_type).trim()
      : undefined,
    priority                      : payload.priority !== undefined ? Number(payload.priority) : undefined,
    is_active                     : normalizeIsActive(payload.is_active),
  };
}

async function list(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const filters = {
    search              : query.search || null,
    department_id       : query.department_id || null,
    approver_scope_type : query.approver_scope_type || null,
    approver_job_level_name: query.approver_job_level_name || null,
    approval_type       : query.approval_type || null,
    is_active           : query.is_active !== undefined ? query.is_active : null,
    page,
    limit,
    offset,
  };

  const [data, total] = await Promise.all([
    ApprovalRuleModel.findAll(filters),
    ApprovalRuleModel.countAll(filters),
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
  return ApprovalRuleModel.findById(id);
}

async function create(payload) {
  validatePayload(payload);

  const data = buildPayload(payload);

  try {
    const id = await ApprovalRuleModel.create(data);
    return ApprovalRuleModel.findById(id);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw createValidationError({ code: 'Code already exists' });
    }

    throw err;
  }
}

async function update(id, payload) {
  const existing = await ApprovalRuleModel.findById(id);

  if (!existing) {
    return null;
  }

  validatePayload(payload, true);

  const data = buildPayload(payload);

  try {
    await ApprovalRuleModel.update(id, data);
    return ApprovalRuleModel.findById(id);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw createValidationError({ code: 'Code already exists' });
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