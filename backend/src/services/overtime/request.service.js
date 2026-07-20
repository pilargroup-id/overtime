const { db } = require('../../config/database.config');

const UserModel = require('../../models/user.model');
const RequestModel = require('../../models/overtime/request.model');
const ApprovalModel = require('../../models/overtime/approval.model');
const LogModel = require('../../models/overtime/log.model');
const UserPermissionModel = require('../../models/master/user-permission.model');
const ApprovalRuleModel = require('../../models/master/approval-rule.model');
const CompensationTypeModel = require('../../models/master/compensation-type.model');

const NumberSequenceService = require('./number-sequence.service');

const ALLOWED_DAY_TYPES = ['WORKDAY', 'HOLIDAY', 'WEEKEND', 'NATIONAL_HOLIDAY'];
const MAX_BACKDATE_MONTHS = 2;

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

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function normalizeTime(value) {
  if (!value) return null;

  const raw = String(value).trim();

  if (/^\d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }

  return raw;
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function isValidTimeString(value) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(String(value));
}

function addDays(dateString, days) {
  const [year, month, day] = String(dateString).split('-').map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

function subtractMonths(date, months) {
  const cloned = new Date(date.getTime());
  cloned.setMonth(cloned.getMonth() - months);
  return cloned;
}

function buildDateTime(dateString, timeString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const [hour, minute, second = 0] = String(timeString).split(':').map(Number);

  return new Date(year, month - 1, day, hour, minute, second);
}

function calculateTotalMinutes(workDate, startTime, endDate, endTime) {
  const start = buildDateTime(workDate, startTime);
  const end = buildDateTime(endDate, endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const diffMs = end.getTime() - start.getTime();

  if (diffMs <= 0) {
    return null;
  }

  return Math.round(diffMs / 60000);
}

function validateBulkPayload(payload = {}) {
  const errors = {};
  const hasItems = Array.isArray(payload.items) && payload.items.length > 0;

  if (!hasItems && (!Array.isArray(payload.employee_ids) || payload.employee_ids.length === 0)) {
    errors.employee_ids = 'employee_ids must be a non-empty array';
  }

  if (Array.isArray(payload.employee_ids)) {
    const invalidEmployeeIds = payload.employee_ids.filter((id) => !id || typeof id !== 'string');

    if (invalidEmployeeIds.length > 0) {
      errors.employee_ids = 'employee_ids must contain valid user ids only';
    }
  }

  if (payload.items !== undefined && !Array.isArray(payload.items)) {
    errors.items = 'items must be an array';
  }

  if (hasItems) {
    const invalidItems = payload.items.filter(
      (item) => !item || !item.employee_id || typeof item.employee_id !== 'string'
    );

    if (invalidItems.length > 0) {
      errors.items = 'items must contain valid employee_id values';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw createValidationError(errors);
  }
}

function normalizeBulkItems(payload = {}) {
  const useGeneralDescriptions = Boolean(payload.apply_general_to_all);

  if (Array.isArray(payload.items) && payload.items.length > 0) {
    const itemsByEmployeeId = new Map();

    payload.items.forEach((item) => {
      if (!itemsByEmployeeId.has(item.employee_id)) {
        itemsByEmployeeId.set(item.employee_id, {
          employee_id: item.employee_id,
          task_description: useGeneralDescriptions
            ? payload.task_description
            : item.task_description,
          result_description: useGeneralDescriptions
            ? payload.result_description
            : item.result_description,
        });
      }
    });

    return [...itemsByEmployeeId.values()];
  }

  return [...new Set(payload.employee_ids)].map((employeeId) => ({
    employee_id: employeeId,
    task_description: payload.task_description,
    result_description: payload.result_description,
  }));
}

function validatePayload(payload) {
  const errors = {};

  if (payload.day_type === undefined || !ALLOWED_DAY_TYPES.includes(payload.day_type)) {
    errors.day_type = 'day_type must be WORKDAY, HOLIDAY, WEEKEND, or NATIONAL_HOLIDAY';
  }

  if (!payload.work_date || !isValidDateString(payload.work_date)) {
    errors.work_date = 'work_date is required and must use YYYY-MM-DD format';
  }

  const startTime = normalizeTime(payload.start_time);
  const endTime = normalizeTime(payload.end_time);

  if (!startTime || !isValidTimeString(startTime)) {
    errors.start_time = 'start_time is required and must use HH:mm or HH:mm:ss format';
  }

  if (!endTime || !isValidTimeString(endTime)) {
    errors.end_time = 'end_time is required and must use HH:mm or HH:mm:ss format';
  }

  if (!payload.task_description || String(payload.task_description).trim() === '') {
    errors.task_description = 'task_description is required';
  }

  if (!payload.result_description || String(payload.result_description).trim() === '') {
    errors.result_description = 'result_description is required';
  }

  if (!payload.compensation_type_id) {
    errors.compensation_type_id = 'compensation_type_id is required';
  }

  if (Object.keys(errors).length > 0) {
    throw createValidationError(errors);
  }
}

function validateBackdate(workDate) {
  const today = new Date();
  const minDate = subtractMonths(today, MAX_BACKDATE_MONTHS);
  const target = new Date(`${workDate}T00:00:00`);

  if (target < new Date(minDate.toISOString().slice(0, 10))) {
    throw createValidationError({
      work_date: `work_date cannot be more than ${MAX_BACKDATE_MONTHS} months before today`,
    });
  }
}

function resolveEndDate(payload) {
  const workDate = normalizeDate(payload.work_date);
  const startTime = normalizeTime(payload.start_time);
  const endTime = normalizeTime(payload.end_time);

  if (payload.end_date) {
    return normalizeDate(payload.end_date);
  }

  if (endTime < startTime) {
    return addDays(workDate, 1);
  }

  return workDate;
}

function userHasPermission(permissions, permissionType) {
  return permissions.some((item) => item.permission_type === permissionType);
}

function isScopeMatch(permission, employee) {
  if (permission.scope_type === 'GLOBAL') {
    return true;
  }

  if (permission.scope_type === 'COMPANY') {
    return permission.company_id && permission.company_id === employee.company_id;
  }

  if (permission.scope_type === 'DEPARTMENT') {
    return Number(permission.department_id) === Number(employee.department_id);
  }

  return false;
}

async function assertCanSubmitForEmployee(authUser, employee) {
  if (authUser.id === employee.id) {
    return 'SELF';
  }

  const permissions = await UserPermissionModel.findActiveByUserId(authUser.id);

  const hasRequestCreateAll = permissions.some(
    (item) => item.permission_type === 'REQUEST_CREATE_ALL' && isScopeMatch(item, employee)
  );

  if (hasRequestCreateAll) {
    return 'ALL_INPUT';
  }

  const hasRequestCreateScoped = permissions.some(
    (item) => item.permission_type === 'REQUEST_CREATE_SCOPED' && isScopeMatch(item, employee)
  );

  if (hasRequestCreateScoped) {
    return 'SCOPED_INPUT';
  }

  throw createForbiddenError('You are not allowed to submit overtime request for this employee');
}

async function resolveApprovalRule(employee) {
  const rule = await ApprovalRuleModel.findMatchingRule({
    jobLevelValue: employee.job_level_value,
    departmentId: employee.department_id,
  });

  if (!rule) {
    throw createValidationError({
      approval_rule: 'Approval rule not found for this employee',
    });
  }

  return rule;
}

async function resolveApprover(rule, employee) {
  if (rule.approver_scope_type === 'SAME_DEPARTMENT') {
    const approver = await UserModel.findActiveUsersByDepartmentAndJobLevelName(
      employee.department_id,
      rule.approver_job_level_name
    );

    if (!approver) {
      throw createValidationError({
        approver: `Approver ${rule.approver_job_level_name} not found in employee department`,
      });
    }

    return approver;
  }

  if (rule.approver_scope_type === 'SPECIFIC_DEPARTMENT') {
    const approver = await UserModel.findActiveUsersByDepartmentAndJobLevelName(
      rule.approver_department_id,
      rule.approver_job_level_name
    );

    if (!approver) {
      throw createValidationError({
        approver: `Approver ${rule.approver_job_level_name} not found in specific department`,
      });
    }

    return approver;
  }

  const approvers = await UserModel.findActiveUsersByJobLevelName(rule.approver_job_level_name);

  if (!approvers.length) {
    throw createValidationError({
      approver: `Approver ${rule.approver_job_level_name} not found`,
    });
  }

  if (approvers.length > 1) {
    throw createValidationError({
      approver: `Multiple active users found for job level ${rule.approver_job_level_name}`,
    });
  }

  return approvers[0];
}

function buildRequestData({
  payload,
  authUser,
  employee,
  sourceType,
  rule,
  approver,
  numberData,
  totalMinutes,
  endDate,
}) {
  return {
    sequence_year: numberData.sequence_year,
    sequence_number: numberData.sequence_number,
    request_number: numberData.request_number,

    source_type: sourceType,

    submitted_by: authUser.id,
    employee_id: employee.id,

    employee_internal_id_snapshot: employee.internal_id,
    employee_name_snapshot: employee.name,
    employee_job_position_snapshot: employee.job_position,
    employee_job_level_id_snapshot: employee.job_level_id,
    employee_job_level_name_snapshot: employee.job_level,
    employee_job_level_value_snapshot: employee.job_level_value,
    employee_employment_type_code_snapshot: employee.employment_type_code,

    company_id: employee.company_id,
    company_code_snapshot: employee.company_code,
    company_name_snapshot: employee.company,

    department_id: employee.department_id,
    department_code_snapshot: employee.department_code,
    department_name_snapshot: employee.department,
    department_class_snapshot: employee.department_class,

    day_type: payload.day_type,
    request_date: new Date().toISOString().slice(0, 10),
    work_date: normalizeDate(payload.work_date),
    start_time: normalizeTime(payload.start_time),
    end_date: endDate,
    end_time: normalizeTime(payload.end_time),
    total_minutes: totalMinutes,

    task_description: String(payload.task_description).trim(),
    result_description:
      payload.result_description && String(payload.result_description).trim() !== ''
        ? String(payload.result_description).trim()
        : null,

    compensation_type_id: payload.compensation_type_id,

    approval_type: rule.approval_type,
    current_approver_id: approver.id,
  };
}

function buildApprovalData(requestId, approver) {
  return {
    request_id: requestId,
    approval_level: 1,
    approver_id: approver.id,
    approver_name_snapshot: approver.name,
    approver_job_position_snapshot: approver.job_position,
    approver_job_level_name_snapshot: approver.job_level,
    approver_job_level_value_snapshot: approver.job_level_value,
  };
}

async function attachSubmitterSnapshots(rows = []) {
  const submitterIds = rows
    .map((row) => row.submitted_by)
    .filter((id) => id !== null && id !== undefined && String(id).trim() !== '');

  if (submitterIds.length === 0) {
    return rows;
  }

  const submitters = await UserModel.findUsersByIds(submitterIds);
  const submitterMap = new Map(submitters.map((submitter) => [String(submitter.id), submitter]));

  return rows.map((row) => {
    const submitter = submitterMap.get(String(row.submitted_by));

    if (!submitter) {
      return row;
    }

    return {
      ...row,
      submitted_by_name: submitter.name,
      submitted_by_username: submitter.username,
      submitted_by_email: submitter.email,
    };
  });
}

async function list(query, authUser) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;

  const filters = {
    search: query.search || null,
    status: query.status || null,
    talenta_status: query.talenta_status || null,
    work_date_from: query.work_date_from || null,
    work_date_to: query.work_date_to || null,
    page,
    limit,
    offset,
  };

  const [data, total] = await Promise.all([
    RequestModel.findAll(filters, authUser),
    RequestModel.countAll(filters, authUser),
  ]);
  const rows = await attachSubmitterSnapshots(data);

  return {
    data: rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getById(id, authUser) {
  const request = await RequestModel.findById(id);

  if (!request) {
    return null;
  }

  const isOwner =
    request.submitted_by === authUser.id ||
    request.employee_id === authUser.id;

  if (!isOwner) {
    throw createForbiddenError('You are not allowed to view this overtime request');
  }

  return request;
}

async function getEligibleEmployees(query = {}, authUser) {
  const permissions = await UserPermissionModel.findActiveByUserId(authUser.id);

  const search = query.search || null;
  const limit = Number(query.limit) || 20;

  const hasCreateAll = permissions.some(
    (item) =>
      item.permission_type === 'REQUEST_CREATE_ALL' &&
      item.scope_type === 'GLOBAL'
  );

  if (hasCreateAll) {
    return UserModel.findActiveUsersForOvertimeOptions({
      search,
      limit,
      allUsers: true,
    });
  }

  const scopedPermissions = permissions.filter(
    (item) => item.permission_type === 'REQUEST_CREATE_SCOPED'
  );

  const departmentIds = scopedPermissions
    .filter((item) => item.scope_type === 'DEPARTMENT' && item.department_id)
    .map((item) => item.department_id);

  const companyIds = scopedPermissions
    .filter((item) => item.scope_type === 'COMPANY' && item.company_id)
    .map((item) => item.company_id);

  return UserModel.findActiveUsersForOvertimeOptions({
    search,
    limit,
    userIds: [authUser.id],
    departmentIds: [...new Set(departmentIds)],
    companyIds: [...new Set(companyIds)],
    allUsers: false,
  });
}

async function create(payload, authUser) {
  validatePayload(payload);

  const employeeId = payload.employee_id || authUser.id;
  const employee = await UserModel.findFullProfileById(employeeId);

  if (!employee) {
    throw createValidationError({ employee_id: 'Employee not found' });
  }

  if (Number(employee.is_active) !== 1) {
    throw createValidationError({ employee_id: 'Employee is inactive' });
  }

  if (!employee.department_id) {
    throw createValidationError({ department_id: 'Employee primary department not found' });
  }

  if (!employee.company_id) {
    throw createValidationError({ company_id: 'Employee primary company not found' });
  }

  validateBackdate(normalizeDate(payload.work_date));

  const endDate = resolveEndDate(payload);

  if (!isValidDateString(endDate)) {
    throw createValidationError({ end_date: 'end_date must use YYYY-MM-DD format' });
  }

  const totalMinutes = calculateTotalMinutes(
    normalizeDate(payload.work_date),
    normalizeTime(payload.start_time),
    endDate,
    normalizeTime(payload.end_time)
  );

  if (!totalMinutes) {
    throw createValidationError({
      time_range: 'End datetime must be greater than start datetime',
    });
  }

  const compensationType = await CompensationTypeModel.findById(payload.compensation_type_id);

  if (!compensationType || Number(compensationType.is_active) !== 1) {
    throw createValidationError({
      compensation_type_id: 'Active compensation type not found',
    });
  }

  const sourceType = await assertCanSubmitForEmployee(authUser, employee);
  const rule = await resolveApprovalRule(employee);
  const approver = await resolveApprover(rule, employee);

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const sequenceYear = Number(normalizeDate(payload.work_date).slice(0, 4));

    const numberData = await NumberSequenceService.generateRequestNumber(
      {
        sequenceYear,
        departmentCode: employee.department_code,
      },
      conn
    );

    const requestData = buildRequestData({
      payload,
      authUser,
      employee,
      sourceType,
      rule,
      approver,
      numberData,
      totalMinutes,
      endDate,
    });

    const requestId = await RequestModel.create(requestData, conn);

    await ApprovalModel.create(
      buildApprovalData(requestId, approver),
      conn
    );

    await LogModel.create(
      {
        request_id: requestId,
        actor_id: authUser.id,
        actor_name_snapshot: authUser.name,
        action: 'SUBMITTED',
        from_status: null,
        to_status: 'SUBMITTED',
        note: null,
      },
      conn
    );

    await conn.commit();

    return RequestModel.findById(requestId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function bulkCreate(payload = {}, authUser) {
  validateBulkPayload(payload);

  const bulkItems = normalizeBulkItems(payload);

  const successItems = [];
  const failedItems = [];

  for (const item of bulkItems) {
    try {
      const result = await create(
        {
          ...payload,
          ...item,
          employee_id: item.employee_id,
          employee_ids: undefined,
          items: undefined,
        },
        authUser
      );

      successItems.push({
        employee_id: item.employee_id,
        request_id: result.id,
        request_number: result.request_number,
        source_type: result.source_type,
        status: result.status,
        current_approver_id: result.current_approver_id,
        approval_type: result.approval_type,
      });
    } catch (err) {
      failedItems.push({
        employee_id: item.employee_id,
        message: err.message || 'Failed to create overtime request',
        errors: err.errors || null,
      });
    }
  }

  return {
    total: bulkItems.length,
    success_count: successItems.length,
    failed_count: failedItems.length,
    success_items: successItems,
    failed_items: failedItems,
  };
}

async function cancel(id, payload, authUser) {
  const request = await RequestModel.findById(id);

  if (!request) {
    return null;
  }

  const isOwner =
    request.submitted_by === authUser.id ||
    request.employee_id === authUser.id;

  if (!isOwner) {
    throw createForbiddenError('You are not allowed to cancel this overtime request');
  }

  if (request.status !== 'SUBMITTED') {
    throw createValidationError({
      status: 'Only SUBMITTED request can be canceled',
    });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await RequestModel.cancel(id, authUser.id, conn);
    await ApprovalModel.cancelPendingByRequestId(id, conn);

    await LogModel.create(
      {
        request_id: id,
        actor_id: authUser.id,
        actor_name_snapshot: authUser.name,
        action: 'CANCELED',
        from_status: request.status,
        to_status: 'CANCELED',
        note: payload?.note || null,
      },
      conn
    );

    await conn.commit();

    return RequestModel.findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  list,
  getById,
  getEligibleEmployees,
  create,
  bulkCreate,
  cancel,
};
