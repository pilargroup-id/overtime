const DirectoryService = require('../directory.service');

function normalizeDepartment(department = {}) {
  const id = department.id ?? department.department_id;

  if (id === null || id === undefined) {
    return null;
  }

  return {
    id,
    name: department.name ?? department.department_name ?? null,
    code: department.code ?? department.department_code ?? null,
    class: department.class ?? department.department_class ?? null,
    company_id: department.company_id ?? null,
    parent_id: department.parent_id ?? null,
    is_active: department.is_active ?? 1,
  };
}

function matchesSearch(department, search) {
  if (!search) {
    return true;
  }

  const haystack = [
    department.id,
    department.name,
    department.code,
    department.class,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(' ')
    .toLowerCase();

  return haystack.includes(search);
}

function sortDepartments(left, right) {
  const leftLabel = String(left.name || left.code || left.id);
  const rightLabel = String(right.name || right.code || right.id);

  return leftLabel.localeCompare(rightLabel, 'id-ID', { sensitivity: 'base' });
}

async function list(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 500, 1), 1000);
  const offset = (page - 1) * limit;
  const active = query.active ?? query.is_active ?? 1;
  const search = String(query.search ?? '').trim().toLowerCase();

  const directoryRows = await DirectoryService.fetchDepartments({
    active,
  });

  const rows = directoryRows
    .map(normalizeDepartment)
    .filter(Boolean)
    .filter((department) => matchesSearch(department, search))
    .sort(sortDepartments);

  return {
    data: rows.slice(offset, offset + limit),
    meta: {
      page,
      limit,
      total: rows.length,
      totalPages: Math.ceil(rows.length / limit) || 1,
    },
  };
}

async function getById(id) {
  const directoryRows = await DirectoryService.fetchDepartments({ active: 'all' });
  const departments = directoryRows.map(normalizeDepartment).filter(Boolean);

  return departments.find((department) => String(department.id) === String(id)) || null;
}

module.exports = {
  list,
  getById,
};
