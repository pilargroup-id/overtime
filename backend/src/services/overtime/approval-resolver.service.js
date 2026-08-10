const UserModel = require('../../models/user.model');
const ApprovalRuleModel = require('../../models/master/approval-rule.model');

function createValidationError(errors) {
  const err = new Error('Validation failed');
  err.statusCode = 400;
  err.errors = errors;
  return err;
}

function getEmployeeDepartmentIds(employee = {}) {
  const ids = [];

  if (Array.isArray(employee.departments)) {
    employee.departments.forEach((department) => {
      if (department?.id !== null && department?.id !== undefined) {
        ids.push(String(department.id));
      }
    });
  }

  if (employee.department_id !== null && employee.department_id !== undefined) {
    ids.push(String(employee.department_id));
  }

  return [...new Set(ids)];
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

async function resolveFinalApprover(rule, employee) {
  let approvers = [];

  if (rule.approver_scope_type === 'SAME_DEPARTMENT') {
    approvers = await UserModel.findActiveUsersByDepartmentAndApproverTarget(
      employee.department_id,
      rule.approver_job_level_name
    );
  } else if (rule.approver_scope_type === 'SPECIFIC_DEPARTMENT') {
    approvers = await UserModel.findActiveUsersByDepartmentAndApproverTarget(
      rule.approver_department_id,
      rule.approver_job_level_name
    );
  } else {
    approvers = await UserModel.findActiveUsersByApproverTarget(
      rule.approver_job_level_name
    );
  }

  if (approvers.length === 0) {
    throw createValidationError({
      approver: `Final approver ${rule.approver_job_level_name} not found`,
    });
  }

  if (approvers.length > 1) {
    throw createValidationError({
      approver: `Multiple active final approvers found for ${rule.approver_job_level_name}`,
    });
  }

  return approvers[0];
}

async function resolveIntermediateApprover(rule, employee) {
  if (Number(rule.use_intermediate_approver) !== 1) {
    return null;
  }

  if (!Number.isInteger(Number(rule.intermediate_job_level_value))) {
    throw createValidationError({
      intermediate_job_level_value:
        'Approval rule enables intermediate approval but intermediate_job_level_value is not configured',
    });
  }

  if (Number(employee.job_level_value) >= Number(rule.intermediate_job_level_value)) {
    return null;
  }

  const departmentIds = getEmployeeDepartmentIds(employee);

  if (departmentIds.length === 0) {
    return null;
  }

  const candidates = await UserModel.findActiveUsersByJobLevelValueAndDepartmentIds(
    Number(rule.intermediate_job_level_value),
    departmentIds,
    employee.id
  );

  if (candidates.length === 0) {
    return null;
  }

  const primaryDepartmentId = employee.department_id === null || employee.department_id === undefined
    ? null
    : String(employee.department_id);

  const primaryDepartmentCandidates = primaryDepartmentId
    ? candidates.filter((candidate) =>
      (candidate.departments || []).some(
        (department) => String(department.id) === primaryDepartmentId
      )
    )
    : [];

  if (primaryDepartmentCandidates.length === 1) {
    return primaryDepartmentCandidates[0];
  }

  if (primaryDepartmentCandidates.length > 1) {
    throw createValidationError({
      intermediate_approver:
        `Multiple intermediate approvers found in the primary department for job level value ${rule.intermediate_job_level_value}`,
    });
  }

  if (candidates.length > 1) {
    throw createValidationError({
      intermediate_approver:
        `Multiple intermediate approvers found across employee departments for job level value ${rule.intermediate_job_level_value}`,
    });
  }

  return candidates[0];
}

async function resolveInitialApproval(employee) {
  const rule = await resolveApprovalRule(employee);
  const [finalApprover, intermediateApprover] = await Promise.all([
    resolveFinalApprover(rule, employee),
    resolveIntermediateApprover(rule, employee),
  ]);

  return {
    rule,
    finalApprover,
    intermediateApprover,
    initialApprover: intermediateApprover || finalApprover,
  };
}

module.exports = {
  getEmployeeDepartmentIds,
  resolveApprovalRule,
  resolveFinalApprover,
  resolveIntermediateApprover,
  resolveInitialApproval,
};
