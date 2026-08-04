const DirectoryService = require('../services/directory.service');
const UserPermissionModel = require('./master/user-permission.model');

function normalizeIds(ids = []) {
  return [...new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean))];
}

function uniqueById(items = []) {
  const map = new Map();

  items.forEach((item) => {
    if (item?.id === null || item?.id === undefined) return;
    const key = String(item.id);

    if (!map.has(key) || Number(item.is_primary) === 1) {
      map.set(key, item);
    }
  });

  return [...map.values()];
}

function normalizeDepartment(department = {}) {
  if (department.id === null || department.id === undefined) return null;

  return {
    id: department.id,
    name: department.name ?? department.department_name ?? null,
    class: department.class ?? department.department_class ?? null,
    code: department.code ?? department.department_code ?? null,
    company_id: department.company_id ?? null,
    parent_id: department.parent_id ?? null,
    is_active: department.is_active ?? 1,
    is_primary: Number(department.is_primary) === 1 ? 1 : 0,
  };
}

function normalizeCompany(company = {}) {
  if (company.id === null || company.id === undefined) return null;

  return {
    id: company.id,
    code: company.code ?? company.company_code ?? null,
    name: company.name ?? company.company_name ?? null,
    is_active: company.is_active ?? 1,
    is_primary: Number(company.is_primary) === 1 ? 1 : 0,
  };
}

function getDepartments(row = {}) {
  if (Array.isArray(row.departments)) {
    return uniqueById(row.departments.map(normalizeDepartment).filter(Boolean));
  }

  const legacy = normalizeDepartment({
    id: row.department_id,
    name: row.department_name,
    class: row.department_class,
    code: row.department_code,
    company_id: row.company_id,
    is_primary: row.is_primary,
  });

  return legacy ? [legacy] : [];
}

function getCompanies(row = {}) {
  if (Array.isArray(row.companies)) {
    return uniqueById(row.companies.map(normalizeCompany).filter(Boolean));
  }

  const legacy = normalizeCompany({
    id: row.company_id,
    code: row.company_code,
    name: row.company_name,
    is_primary: row.company_is_primary ?? row.is_primary,
  });

  return legacy ? [legacy] : [];
}

function selectPrimary(items = []) {
  return items.find((item) => Number(item.is_primary) === 1) || items[0] || null;
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
    job_level: row.job_level ?? row.job_level_name ?? null,
    job_level_value:
      row.job_level_value === null || row.job_level_value === undefined
        ? null
        : Number(row.job_level_value),
    employment_type_code: row.employment_type_code,
    is_active: row.is_active,
  };
}

function consolidateUsers(rows = []) {
  const grouped = new Map();

  rows.forEach((row) => {
    if (!row?.id) return;
    const id = String(row.id);

    if (!grouped.has(id)) {
      grouped.set(id, {
        ...row,
        departments: [],
        companies: [],
      });
    }

    const user = grouped.get(id);
    user.departments.push(...getDepartments(row));
    user.companies.push(...getCompanies(row));
  });

  return [...grouped.values()].map((user) => {
    const departments = uniqueById(user.departments);
    const companies = uniqueById(user.companies);
    const primaryDepartment = selectPrimary(departments);
    const primaryCompany = selectPrimary(companies);

    return {
      ...user,
      departments,
      companies,
      department_id: user.department_id ?? primaryDepartment?.id ?? null,
      department_name: user.department_name ?? primaryDepartment?.name ?? null,
      department_class: user.department_class ?? primaryDepartment?.class ?? null,
      department_code: user.department_code ?? primaryDepartment?.code ?? null,
      company_id: user.company_id ?? primaryCompany?.id ?? primaryDepartment?.company_id ?? null,
      company_code: user.company_code ?? primaryCompany?.code ?? null,
      company_name: user.company_name ?? primaryCompany?.name ?? null,
    };
  });
}

async function getAllUsers(active = 1, params = {}) {
  const rows = await DirectoryService.fetchUsers({ active, ...params });
  return consolidateUsers(rows);
}

async function getCompanyMap(active = 'all') {
  const companies = await DirectoryService.fetchCompanies({ active });
  return new Map(companies.map((company) => [String(company.id), company]));
}

async function findByUsername(username) {
  if (!username) return null;

  const users = await getAllUsers('all', { search: username });
  const user = users.find((item) => item.username === username);
  return mapBaseUser(user);
}

async function findById(id) {
  if (!id) return null;

  const users = await getAllUsers('all');
  return mapBaseUser(users.find((user) => String(user.id) === String(id)) || null);
}

async function findUsersByIds(ids = []) {
  const normalizedIds = normalizeIds(ids);
  if (normalizedIds.length === 0) return [];

  const users = await getAllUsers('all');

  return users
    .filter((user) => normalizedIds.includes(String(user.id)))
    .map(mapBaseUser)
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
  const users = await getAllUsers('all');
  const user = users.find((item) => String(item.id) === String(userId));

  return (user?.departments || [])
    .slice()
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || String(a.name || '').localeCompare(String(b.name || '')));
}

async function findUserCompanies(userId) {
  const users = await getAllUsers('all');
  const user = users.find((item) => String(item.id) === String(userId));

  if (user?.companies?.length) {
    return user.companies
      .slice()
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || String(a.name || '').localeCompare(String(b.name || '')));
  }

  const companyIds = normalizeIds((user?.departments || []).map((department) => department.company_id));
  const companies = await findCompaniesByIds(companyIds);
  const primaryDepartment = selectPrimary(user?.departments || []);

  return companies.map((company) => ({
    ...company,
    is_primary:
      primaryDepartment && String(primaryDepartment.company_id) === String(company.id) ? 1 : 0,
  }));
}

async function findUserProjects() {
  return [];
}

async function findFullProfileById(id) {
  const users = await getAllUsers('all');
  const user = users.find((item) => String(item.id) === String(id));
  if (!user) return null;

  const [permissions, companyMap] = await Promise.all([
    UserPermissionModel.findActiveByUserId(id),
    getCompanyMap('all'),
  ]);

  const departments = user.departments || [];
  let companies = user.companies || [];

  if (companies.length === 0) {
    const companyIds = normalizeIds(departments.map((department) => department.company_id));
    companies = companyIds
      .map((companyId) => companyMap.get(companyId))
      .filter(Boolean)
      .map((company) => ({ ...company, is_primary: 0 }));
  }

  const primaryDepartment = selectPrimary(departments);
  const primaryCompany = selectPrimary(companies) || companyMap.get(String(user.company_id)) || null;

  return {
    ...mapBaseUser(user),
    token_version: null,
    departments,
    companies,
    projects: [],
    apps: [],
    permissions,
    department_id: user.department_id ?? primaryDepartment?.id ?? null,
    department: user.department_name ?? primaryDepartment?.name ?? null,
    department_class: user.department_class ?? primaryDepartment?.class ?? null,
    department_code: user.department_code ?? primaryDepartment?.code ?? null,
    company_id: user.company_id ?? primaryCompany?.id ?? primaryDepartment?.company_id ?? null,
    company: user.company_name ?? primaryCompany?.name ?? null,
    company_code: user.company_code ?? primaryCompany?.code ?? null,
    cv: null,
  };
}

async function findActiveUsersByJobLevelName(jobLevelName) {
  const users = await getAllUsers(1);

  return users
    .filter((user) => (user.job_level ?? user.job_level_name) === jobLevelName)
    .map(mapBaseUser)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

async function findActiveUsersByDepartmentAndJobLevelName(departmentId, jobLevelName) {
  const users = await getAllUsers(1, { department_id: departmentId });

  const candidate = users
    .filter((user) => (user.job_level ?? user.job_level_name) === jobLevelName)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))[0];

  return mapBaseUser(candidate || null);
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

  const users = await getAllUsers(1);
  const companyMap = await getCompanyMap(1);
  const normalizedUserIds = normalizeIds(userIds);
  const normalizedDepartmentIds = normalizeIds(departmentIds);
  const normalizedCompanyIds = normalizeIds(companyIds);
  const keyword = String(search || '').trim().toLowerCase();

  const result = [];

  for (const user of users) {
    const departments = user.departments || [];
    let companies = user.companies || [];

    if (companies.length === 0) {
      companies = uniqueById(
        departments
          .map((department) => companyMap.get(String(department.company_id)))
          .filter(Boolean)
          .map((company) => ({ ...company, is_primary: 0 }))
      );
    }

    const primaryDepartment = selectPrimary(departments);
    const primaryCompany = selectPrimary(companies) || companyMap.get(String(user.company_id));

    if (!allUsers) {
      const userMatch = normalizedUserIds.includes(String(user.id));
      const departmentMatch = departments.some((department) =>
        normalizedDepartmentIds.includes(String(department.id))
      );
      const companyMatch = companies.some((company) =>
        normalizedCompanyIds.includes(String(company.id))
      );

      if (!userMatch && !departmentMatch && !companyMatch) continue;
    }

    if (keyword) {
      const haystack = [
        user.name,
        user.username,
        user.internal_id,
        user.email,
        ...departments.flatMap((department) => [department.name, department.class, department.code]),
        ...companies.flatMap((company) => [company.name, company.code]),
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ');

      if (!haystack.includes(keyword)) continue;
    }

    result.push({
      id: user.id,
      internal_id: user.internal_id,
      username: user.username,
      name: user.name,
      email: user.email,
      job_position: user.job_position,
      employment_type_code: user.employment_type_code,
      job_level_name: user.job_level ?? user.job_level_name ?? null,
      job_level_value:
        user.job_level_value === null || user.job_level_value === undefined
          ? null
          : Number(user.job_level_value),

      // Backward-compatible primary organization fields.
      department_id: user.department_id ?? primaryDepartment?.id ?? null,
      department_name: user.department_name ?? primaryDepartment?.name ?? null,
      department_code: user.department_code ?? primaryDepartment?.code ?? null,
      company_id: user.company_id ?? primaryCompany?.id ?? primaryDepartment?.company_id ?? null,
      company_code: user.company_code ?? primaryCompany?.code ?? null,
      company_name: user.company_name ?? primaryCompany?.name ?? null,

      // Complete organization memberships.
      departments,
      companies,
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
