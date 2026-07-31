const DirectoryService = require('../services/directory.service');
const UserPermissionModel = require('./master/user-permission.model');

function normalizeIds(ids = []) {
  return [...new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean))];
}

function selectPrimaryRow(rows = []) {
  return rows.find((row) => Number(row.is_primary) === 1) || rows[0] || null;
}

function groupUserRows(rows = []) {
  const grouped = new Map();

  rows.forEach((row) => {
    const id = String(row.id);

    if (!grouped.has(id)) {
      grouped.set(id, []);
    }

    grouped.get(id).push(row);
  });

  return grouped;
}

function mapBaseUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    internal_id: row.internal_id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    name: row.name,
    job_position: row.job_position,
    job_level_id: row.job_level_id,
    job_level: row.job_level,
    job_level_value:
      row.job_level_value === null || row.job_level_value === undefined
        ? null
        : Number(row.job_level_value),
    employment_type_code: row.employment_type_code,
    is_active: row.is_active,
  };
}

async function getAllUserRows(active = 1) {
  return DirectoryService.fetchUsers({ active });
}

async function getCompanyMap(active = 'all') {
  const companies = await DirectoryService.fetchCompanies({ active });
  return new Map(companies.map((company) => [String(company.id), company]));
}

async function findByUsername(username) {
  if (!username) return null;

  const rows = await DirectoryService.fetchUsers({ active: 'all', search: username });
  const exactRows = rows.filter((row) => row.username === username);
  return mapBaseUser(selectPrimaryRow(exactRows));
}

async function findById(id) {
  if (!id) return null;

  const rows = await getAllUserRows('all');
  const userRows = rows.filter((row) => String(row.id) === String(id));
  return mapBaseUser(selectPrimaryRow(userRows));
}

async function findUsersByIds(ids = []) {
  const normalizedIds = normalizeIds(ids);

  if (normalizedIds.length === 0) return [];

  const rows = await getAllUserRows('all');
  const grouped = groupUserRows(
    rows.filter((row) => normalizedIds.includes(String(row.id)))
  );

  return normalizedIds
    .map((id) => mapBaseUser(selectPrimaryRow(grouped.get(id) || [])))
    .filter(Boolean)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

async function findDepartmentsByIds(ids = []) {
  const normalizedIds = normalizeIds(ids);

  if (normalizedIds.length === 0) return [];

  const departments = await DirectoryService.fetchDepartments({ active: 'all' });

  return departments
    .filter((department) => normalizedIds.includes(String(department.id)))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

async function findCompaniesByIds(ids = []) {
  const normalizedIds = normalizeIds(ids);

  if (normalizedIds.length === 0) return [];

  const companies = await DirectoryService.fetchCompanies({ active: 'all' });

  return companies
    .filter((company) => normalizedIds.includes(String(company.id)))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

async function findUserDepartments(userId) {
  const rows = await getAllUserRows('all');

  return rows
    .filter((row) => String(row.id) === String(userId) && row.department_id !== null)
    .map((row) => ({
      id: row.department_id,
      name: row.department_name,
      class: row.department_class,
      code: row.department_code,
      company_id: row.company_id,
      parent_id: null,
      is_primary: row.is_primary,
    }))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || String(a.name || '').localeCompare(String(b.name || '')));
}

async function findUserCompanies(userId) {
  const departments = await findUserDepartments(userId);
  const companyIds = normalizeIds(departments.map((department) => department.company_id));
  const companies = await findCompaniesByIds(companyIds);
  const primaryDepartment = departments.find((department) => Number(department.is_primary) === 1);

  return companies.map((company) => ({
    ...company,
    is_primary: primaryDepartment && String(primaryDepartment.company_id) === String(company.id) ? 1 : 0,
  }));
}

async function findUserProjects() {
  return [];
}

async function findFullProfileById(id) {
  const rows = await getAllUserRows('all');
  const userRows = rows.filter((row) => String(row.id) === String(id));
  const primaryRow = selectPrimaryRow(userRows);

  if (!primaryRow) return null;

  const [companies, permissions, companyMap] = await Promise.all([
    findUserCompanies(id),
    UserPermissionModel.findActiveByUserId(id),
    getCompanyMap('all'),
  ]);

  const departments = userRows
    .filter((row) => row.department_id !== null)
    .map((row) => ({
      id: row.department_id,
      name: row.department_name,
      class: row.department_class,
      code: row.department_code,
      company_id: row.company_id,
      parent_id: null,
      is_primary: row.is_primary,
    }));

  const primaryDepartment = selectPrimaryRow(
    departments.map((department) => ({ ...department, id: department.id }))
  ) || departments[0] || null;

  const primaryCompany =
    companies.find((company) => Number(company.is_primary) === 1) ||
    companies[0] ||
    companyMap.get(String(primaryRow.company_id)) ||
    null;

  return {
    ...mapBaseUser(primaryRow),
    token_version: null,
    departments,
    companies,
    projects: [],
    apps: [],
    permissions,
    department_id: primaryRow.department_id ?? primaryDepartment?.id ?? null,
    department: primaryRow.department_name ?? primaryDepartment?.name ?? null,
    department_class: primaryRow.department_class ?? primaryDepartment?.class ?? null,
    department_code: primaryRow.department_code ?? primaryDepartment?.code ?? null,
    company_id: primaryRow.company_id ?? primaryCompany?.id ?? null,
    company: primaryCompany?.name ?? null,
    company_code: primaryCompany?.code ?? null,
    cv: null,
  };
}

async function findActiveUsersByJobLevelName(jobLevelName) {
  const rows = await getAllUserRows(1);
  const grouped = groupUserRows(
    rows.filter((row) => row.job_level === jobLevelName)
  );

  return [...grouped.values()]
    .map((userRows) => mapBaseUser(selectPrimaryRow(userRows)))
    .filter(Boolean)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

async function findActiveUsersByDepartmentAndJobLevelName(departmentId, jobLevelName) {
  const rows = await DirectoryService.fetchUsers({
    active: 1,
    department_id: departmentId,
  });

  const grouped = groupUserRows(
    rows.filter((row) => row.job_level === jobLevelName)
  );

  const candidates = [...grouped.values()]
    .map((userRows) => selectPrimaryRow(userRows))
    .filter(Boolean)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || String(a.name || '').localeCompare(String(b.name || '')));

  return mapBaseUser(candidates[0] || null);
}

async function findActiveUsersForOvertimeOptions(filters = {}) {
  const {
    search = null,
    userIds = [],
    departmentIds = [],
    companyIds = [],
    allUsers = false,
    limit = 20,
  } = filters;

  const rows = await getAllUserRows(1);
  const companyMap = await getCompanyMap(1);
  const grouped = groupUserRows(rows);
  const normalizedUserIds = normalizeIds(userIds);
  const normalizedDepartmentIds = normalizeIds(departmentIds);
  const normalizedCompanyIds = normalizeIds(companyIds);
  const keyword = String(search || '').trim().toLowerCase();

  const result = [];

  for (const userRows of grouped.values()) {
    const primaryRow = selectPrimaryRow(userRows);
    if (!primaryRow) continue;

    if (!allUsers) {
      const userMatch = normalizedUserIds.includes(String(primaryRow.id));
      const departmentMatch = userRows.some((row) => normalizedDepartmentIds.includes(String(row.department_id)));
      const companyMatch = userRows.some((row) => normalizedCompanyIds.includes(String(row.company_id)));

      if (!userMatch && !departmentMatch && !companyMatch) continue;
    }

    if (keyword) {
      const haystack = [
        primaryRow.name,
        primaryRow.username,
        primaryRow.internal_id,
        primaryRow.email,
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ');

      if (!haystack.includes(keyword)) continue;
    }

    const company = companyMap.get(String(primaryRow.company_id));

    result.push({
      id: primaryRow.id,
      internal_id: primaryRow.internal_id,
      username: primaryRow.username,
      name: primaryRow.name,
      email: primaryRow.email,
      job_position: primaryRow.job_position,
      employment_type_code: primaryRow.employment_type_code,
      job_level_name: primaryRow.job_level,
      job_level_value:
        primaryRow.job_level_value === null || primaryRow.job_level_value === undefined
          ? null
          : Number(primaryRow.job_level_value),
      department_id: primaryRow.department_id,
      department_name: primaryRow.department_name,
      department_code: primaryRow.department_code,
      company_id: primaryRow.company_id,
      company_code: company?.code || null,
      company_name: company?.name || null,
    });
  }

  return result
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    .slice(0, Number(limit) || 20);
}

module.exports = {
  findByUsername,
  findById,
  findUsersByIds,
  findDepartmentsByIds,
  findCompaniesByIds,
  findUserDepartments,
  findUserCompanies,
  findUserProjects,
  findFullProfileById,
  findActiveUsersByJobLevelName,
  findActiveUsersByDepartmentAndJobLevelName,
  findActiveUsersForOvertimeOptions,
};
