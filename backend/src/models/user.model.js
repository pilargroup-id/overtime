const { centralDb } = require('../config/database.config');
const UserPermissionModel = require('./master/user-permission.model');

async function findByUsername(username) {
  const [rows] = await centralDb.query(
    `SELECT
       cu.id,
       cu.internal_id,
       cu.username,
       cu.email,
       cu.phone,
       cu.name,
       cu.job_position,
       cu.employment_type_code,
       cu.is_active,
       cu.token_version,
       jl.name  AS job_level,
       jl.level AS job_level_value
     FROM central_users cu
     LEFT JOIN master_job_levels jl ON jl.id = cu.job_level_id
     WHERE cu.username = ?
     LIMIT 1`,
    [username]
  );

  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await centralDb.query(
    `SELECT
       cu.id,
       cu.internal_id,
       cu.username,
       cu.email,
       cu.phone,
       cu.name,
       cu.job_position,
       cu.job_level_id,
       cu.employment_type_code,
       cu.is_active,
       cu.token_version,
       jl.name  AS job_level,
       jl.level AS job_level_value
     FROM central_users cu
     LEFT JOIN master_job_levels jl ON jl.id = cu.job_level_id
     WHERE cu.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findUsersByIds(ids = []) {
  const normalizedIds = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];

  if (normalizedIds.length === 0) {
    return [];
  }

  const [rows] = await centralDb.query(
    `SELECT
       cu.id,
       cu.internal_id,
       cu.username,
       cu.email,
       cu.name
     FROM central_users cu
     WHERE cu.id IN (?)
     ORDER BY cu.name ASC`,
    [normalizedIds]
  );

  return rows;
}

async function findDepartmentsByIds(ids = []) {
  const normalizedIds = [...new Set(ids.filter((id) => id !== null && id !== undefined && id !== ''))];

  if (normalizedIds.length === 0) {
    return [];
  }

  const [rows] = await centralDb.query(
    `SELECT
       md.id,
       md.name,
       md.code,
       md.company_id
     FROM master_departments md
     WHERE md.id IN (?)
     ORDER BY md.name ASC`,
    [normalizedIds]
  );

  return rows;
}

async function findCompaniesByIds(ids = []) {
  const normalizedIds = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];

  if (normalizedIds.length === 0) {
    return [];
  }

  const [rows] = await centralDb.query(
    `SELECT
       mc.id,
       mc.code,
       mc.name
     FROM master_companies mc
     WHERE mc.id IN (?)
     ORDER BY mc.name ASC`,
    [normalizedIds]
  );

  return rows;
}

async function findUserDepartments(userId) {
  const [rows] = await centralDb.query(
    `SELECT
       md.id,
       md.name,
       md.class,
       md.code,
       md.company_id,
       md.parent_id,
       cud.is_primary
     FROM central_user_departments cud
     INNER JOIN master_departments md ON md.id = cud.department_id
     WHERE cud.user_id = ?
       AND md.is_active = 1
     ORDER BY cud.is_primary DESC, md.name ASC`,
    [userId]
  );

  return rows;
}

async function findUserCompanies(userId) {
  const [rows] = await centralDb.query(
    `SELECT
       mc.id,
       mc.code,
       mc.name,
       cuc.is_primary
     FROM central_user_companies cuc
     INNER JOIN master_companies mc ON mc.id = cuc.company_id
     WHERE cuc.user_id = ?
       AND mc.is_active = 1
     ORDER BY cuc.is_primary DESC, mc.name ASC`,
    [userId]
  );

  return rows;
}

async function findUserProjects(userId) {
  const [rows] = await centralDb.query(
    `SELECT
       mp.id,
       mp.name,
       mp.slug,
       mp.url,
       mp.description
     FROM central_user_projects cup
     INNER JOIN master_projects mp ON mp.id = cup.project_id
     WHERE cup.user_id = ?
       AND mp.is_active = 1
     ORDER BY mp.name ASC`,
    [userId]
  );

  return rows;
}

async function findFullProfileById(id) {
  const user = await findById(id);

  if (!user) {
    return null;
  }

  const [departments, companies, projects, permissions] = await Promise.all([
    findUserDepartments(id),
    findUserCompanies(id),
    findUserProjects(id),
    UserPermissionModel.findActiveByUserId(id),
  ]);

  const primaryDepartment =
    departments.find((item) => Number(item.is_primary) === 1) ||
    departments[0] ||
    null;

  const primaryCompany =
    companies.find((item) => Number(item.is_primary) === 1) ||
    companies[0] ||
    null;

  return {
    id: user.id,
    internal_id: user.internal_id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    job_position: user.job_position,
    employment_type_code: user.employment_type_code,

    job_level_id: user.job_level_id,
    job_level: user.job_level,
    job_level_value: user.job_level_value,

    is_active: user.is_active,
    token_version: user.token_version,

    departments,
    companies,
    projects,

    apps: projects.map((project) => project.slug),
    permissions,

    department_id: primaryDepartment?.id || null,
    department: primaryDepartment?.name || null,
    department_class: primaryDepartment?.class || null,
    department_code: primaryDepartment?.code || null,

    company_id: primaryCompany?.id || null,
    company: primaryCompany?.name || null,
    company_code: primaryCompany?.code || null,

    cv: user.token_version,
  };
}

async function findActiveUsersByJobLevelName(jobLevelName) {
  const [rows] = await centralDb.query(
    `SELECT
       cu.id,
       cu.internal_id,
       cu.username,
       cu.email,
       cu.phone,
       cu.name,
       cu.job_position,
       cu.job_level_id,
       cu.employment_type_code,
       cu.is_active,
       cu.token_version,
       jl.name  AS job_level,
       jl.level AS job_level_value
     FROM central_users cu
     INNER JOIN master_job_levels jl ON jl.id = cu.job_level_id
     WHERE cu.is_active = 1
       AND jl.name = ?
     ORDER BY cu.name ASC`,
    [jobLevelName]
  );

  return rows;
}

async function findActiveUsersByDepartmentAndJobLevelName(departmentId, jobLevelName) {
  const [rows] = await centralDb.query(
    `SELECT
       cu.id,
       cu.internal_id,
       cu.username,
       cu.email,
       cu.phone,
       cu.name,
       cu.job_position,
       cu.job_level_id,
       cu.employment_type_code,
       cu.is_active,
       cu.token_version,
       jl.name  AS job_level,
       jl.level AS job_level_value
     FROM central_users cu
     INNER JOIN master_job_levels jl ON jl.id = cu.job_level_id
     INNER JOIN central_user_departments cud ON cud.user_id = cu.id
     WHERE cu.is_active = 1
       AND cud.department_id = ?
       AND jl.name = ?
     ORDER BY cud.is_primary DESC, cu.name ASC
     LIMIT 1`,
    [departmentId, jobLevelName]
  );

  return rows[0] || null;
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

  const where = ['cu.is_active = 1'];
  const params = [];

  if (!allUsers) {
    const scopeConditions = [];

    if (userIds.length > 0) {
      scopeConditions.push('cu.id IN (?)');
      params.push(userIds);
    }

    if (departmentIds.length > 0) {
      scopeConditions.push('cud.department_id IN (?)');
      params.push(departmentIds);
    }

    if (companyIds.length > 0) {
      scopeConditions.push('cuc.company_id IN (?)');
      params.push(companyIds);
    }

    if (scopeConditions.length === 0) {
      where.push('cu.id = ?');
      params.push('__NO_USER__');
    } else {
      where.push(`(${scopeConditions.join(' OR ')})`);
    }
  }

  if (search) {
    where.push(`(
      cu.name LIKE ?
      OR cu.username LIKE ?
      OR cu.internal_id LIKE ?
      OR cu.email LIKE ?
    )`);

    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  params.push(Number(limit) || 20);

  const [rows] = await centralDb.query(
    `SELECT DISTINCT
       cu.id,
       cu.internal_id,
       cu.username,
       cu.name,
       cu.email,
       cu.job_position,
       cu.employment_type_code,
       mjl.name AS job_level_name,
       mjl.level AS job_level_value,
       md.id AS department_id,
       md.name AS department_name,
       md.code AS department_code,
       mc.id AS company_id,
       mc.code AS company_code,
       mc.name AS company_name
     FROM central_users cu
     LEFT JOIN master_job_levels mjl ON mjl.id = cu.job_level_id
     LEFT JOIN central_user_departments cud ON cud.user_id = cu.id AND cud.is_primary = 1
     LEFT JOIN master_departments md ON md.id = cud.department_id
     LEFT JOIN central_user_companies cuc ON cuc.user_id = cu.id AND cuc.is_primary = 1
     LEFT JOIN master_companies mc ON mc.id = cuc.company_id
     WHERE ${where.join(' AND ')}
     ORDER BY cu.name ASC
     LIMIT ?`,
    params
  );

  return rows;
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
