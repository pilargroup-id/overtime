const ApprovalRuleModel = require('../../models/master/approval-rule.model');
const UserModel = require('../../models/user.model');

const ALLOWED_APPROVER_SCOPE_TYPES = [
  'SAME_DEPARTMENT',
  'GLOBAL',
  'SPECIFIC_DEPARTMENT',
  'SPECIFIC_USER',
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


function normalizeIntermediateFlag(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return 0;

  const numberValue = Number(value);
  return [0, 1].includes(numberValue) ? numberValue : value;
}

function normalizeNullable(value) {
  if (value === undefined) return undefined;
  if (value === '') return null;
  return value;
}

function validateJobLevelRange(payload, errors) {
  const min = Number(payload.requester_min_job_level_value);
  const max = Number(payload.requester_max_job_level_value);

  if (!Number.isFinite(min)) {
    errors.requester_min_job_level_value = 'Requester min job level value must be a number';
  }

  if (!Number.isFinite(max)) {
    errors.requester_max_job_level_value = 'Requester max job level value must be a number';
  }

  if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
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
      validateJobLevelRange(payload, errors);
    }
  }

  if (!isUpdate || payload.approver_scope_type !== undefined) {
    if (
      !payload.approver_scope_type ||
      !ALLOWED_APPROVER_SCOPE_TYPES.includes(payload.approver_scope_type)
    ) {
      errors.approver_scope_type =
        'Approver scope type must be SAME_DEPARTMENT, GLOBAL, SPECIFIC_DEPARTMENT, or SPECIFIC_USER';
    }
  }

  if (payload.approver_scope_type === 'SPECIFIC_DEPARTMENT') {
    if (!payload.approver_department_id && payload.approver_department_id !== 0) {
      errors.approver_department_id =
        'Approver department id is required when approver_scope_type is SPECIFIC_DEPARTMENT';
    }
  }

  if (payload.approver_scope_type === 'SPECIFIC_USER') {
    const approverUserId = payload.approver_user_id ?? payload.approver_job_level_name;

    if (!approverUserId || String(approverUserId).trim() === '') {
      errors.approver_user_id =
        'Approver user is required when approver_scope_type is SPECIFIC_USER';
    }
  }

  if (
    (!isUpdate || payload.approver_job_level_name !== undefined) &&
    payload.approver_scope_type !== 'SPECIFIC_USER'
  ) {
    if (!payload.approver_job_level_name || String(payload.approver_job_level_name).trim() === '') {
      errors.approver_job_level_name = 'Approver job level name is required';
    }
  }

  if (!isUpdate || payload.approval_type !== undefined) {
    if (!payload.approval_type || String(payload.approval_type).trim() === '') {
      errors.approval_type = 'Approval type is required';
    }
  }


  if (payload.use_intermediate_approver !== undefined) {
    const useIntermediate = normalizeIntermediateFlag(payload.use_intermediate_approver);

    if (![0, 1].includes(useIntermediate)) {
      errors.use_intermediate_approver = 'use_intermediate_approver must be 0 or 1';
    }
  }

  const useIntermediate = normalizeIntermediateFlag(payload.use_intermediate_approver);

  if (useIntermediate === 1) {
    const intermediateLevel = Number(payload.intermediate_job_level_value);

    if (!Number.isFinite(intermediateLevel)) {
      errors.intermediate_job_level_value =
        'intermediate_job_level_value must be a number when intermediate approval is enabled';
    }
  }

  if (payload.intermediate_job_level_value !== undefined && payload.intermediate_job_level_value !== null && payload.intermediate_job_level_value !== '') {
    if (!Number.isFinite(Number(payload.intermediate_job_level_value))) {
      errors.intermediate_job_level_value = 'intermediate_job_level_value must be a number';
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
  let approverTarget = payload.approver_job_level_name !== undefined
    ? String(payload.approver_job_level_name).trim()
    : undefined;

  if (
    payload.approver_scope_type === 'SAME_DEPARTMENT' ||
    payload.approver_scope_type === 'GLOBAL' ||
    payload.approver_scope_type === 'SPECIFIC_USER'
  ) {
    approverDepartmentId = null;
  }

  if (payload.approver_scope_type === 'SPECIFIC_USER') {
    const approverUserId = payload.approver_user_id ?? payload.approver_job_level_name;
    approverTarget = approverUserId !== undefined
      ? String(approverUserId).trim()
      : undefined;
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
    approver_job_level_name       : approverTarget,
    approval_type                 : payload.approval_type !== undefined
      ? String(payload.approval_type).trim()
      : undefined,
    use_intermediate_approver      : normalizeIntermediateFlag(payload.use_intermediate_approver),
    intermediate_job_level_value  : normalizeIntermediateFlag(payload.use_intermediate_approver) === 0
      ? null
      : payload.intermediate_job_level_value !== undefined
        ? Number(payload.intermediate_job_level_value)
        : undefined,
    priority                      : payload.priority !== undefined ? Number(payload.priority) : undefined,
    is_active                     : normalizeIsActive(payload.is_active),
  };
}

function createMapById(rows = []) {
  return new Map(rows.map((row) => [String(row.id), row]));
}

async function enrichWithApproverUsers(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return rows;
  }

  const approverUserIds = rows
    .filter((row) => row.approver_scope_type === 'SPECIFIC_USER')
    .map((row) => row.approver_job_level_name);

  if (approverUserIds.length === 0) {
    return rows;
  }

  const users = await UserModel.findUsersByIds(approverUserIds);
  const userMap = createMapById(users);

  return rows.map((row) => {
    if (row.approver_scope_type !== 'SPECIFIC_USER') {
      return row;
    }

    const approverUserId = row.approver_job_level_name;
    const approverUser = userMap.get(String(approverUserId));

    return {
      ...row,
      approver_user_id: approverUserId,
      approver_user_name: approverUser?.name || null,
      approver_user_username: approverUser?.username || null,
      approver_user_email: approverUser?.email || null,
      approver_user_internal_id: approverUser?.internal_id || null,
    };
  });
}


function createDepartmentOptionsFromUsers(users = []) {
  const departmentMap = new Map();

  users.forEach((user) => {
    const departments = Array.isArray(user.departments) ? user.departments : [];

    departments.forEach((department) => {
      if (department?.id === null || department?.id === undefined) return;

      const key = String(department.id);
      if (!departmentMap.has(key)) {
        departmentMap.set(key, {
          id: department.id,
          name: department.name ?? null,
          code: department.code ?? null,
          class: department.class ?? null,
          company_id: department.company_id ?? null,
        });
      }
    });
  });

  return [...departmentMap.values()].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );
}

function createJobLevelOptionsFromUsers(users = []) {
  const jobLevelMap = new Map();

  users.forEach((user) => {
    const name = user.job_level_name ?? user.job_level ?? null;
    const value = user.job_level_value;

    if (!name || value === null || value === undefined) return;

    const normalizedValue = Number(value);
    const key = `${normalizedValue}:${String(name)}`;

    if (!jobLevelMap.has(key)) {
      jobLevelMap.set(key, {
        name: String(name),
        value: normalizedValue,
      });
    }
  });

  return [...jobLevelMap.values()].sort(
    (a, b) => a.value - b.value || a.name.localeCompare(b.name)
  );
}

async function getOptions() {
  const users = await UserModel.findActiveUsersForOvertimeOptions({
    allUsers: true,
    limit: 10000,
  });

  return {
    users: users.map((user) => ({
      id: user.id,
      internal_id: user.internal_id,
      username: user.username,
      email: user.email,
      name: user.name,
      job_position: user.job_position,
      job_level_name: user.job_level_name,
      job_level_value: user.job_level_value,
      department_id: user.department_id,
      department_name: user.department_name,
      departments: user.departments || [],
    })),
    departments: createDepartmentOptionsFromUsers(users),
    job_levels: createJobLevelOptionsFromUsers(users),
  };
}

async function assertSpecificApproverUser(data) {
  if (data.approver_scope_type !== 'SPECIFIC_USER') {
    return;
  }

  const userId = data.approver_job_level_name;
  const user = await UserModel.findById(userId);

  if (!user || Number(user.is_active) !== 1) {
    throw createValidationError({
      approver_user_id: 'Active approver user not found in PilarGroup directory',
    });
  }
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
    use_intermediate_approver: query.use_intermediate_approver !== undefined ? query.use_intermediate_approver : null,
    is_active           : query.is_active !== undefined ? query.is_active : null,
    page,
    limit,
    offset,
  };

  const [data, total] = await Promise.all([
    ApprovalRuleModel.findAll(filters),
    ApprovalRuleModel.countAll(filters),
  ]);

  const enrichedData = await enrichWithApproverUsers(data);

  return {
    data: enrichedData,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getById(id) {
  const row = await ApprovalRuleModel.findById(id);
  const [enrichedRow = null] = await enrichWithApproverUsers(row ? [row] : []);

  return enrichedRow;
}

async function create(payload) {
  validatePayload(payload);

  const data = buildPayload(payload);
  await assertSpecificApproverUser(data);

  try {
    const id = await ApprovalRuleModel.create(data);
    return getById(id);
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

  const validationPayload = {
    ...existing,
    ...payload,
    approver_user_id:
      payload.approver_user_id ??
      (payload.approver_scope_type === 'SPECIFIC_USER'
        ? payload.approver_job_level_name
        : undefined),
  };

  validatePayload(validationPayload);

  const data = buildPayload(payload);
  const resultingScopeType = data.approver_scope_type ?? existing.approver_scope_type;
  const resultingApproverTarget =
    data.approver_job_level_name ?? existing.approver_job_level_name;

  await assertSpecificApproverUser({
    approver_scope_type: resultingScopeType,
    approver_job_level_name: resultingApproverTarget,
  });

  try {
    await ApprovalRuleModel.update(id, data);
    return getById(id);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw createValidationError({ code: 'Code already exists' });
    }

    throw err;
  }
}

module.exports = {
  getOptions,
  list,
  getById,
  create,
  update,
};
