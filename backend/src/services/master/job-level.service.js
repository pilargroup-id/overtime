const DirectoryService = require('../directory.service');

function normalizeJobLevel(row = {}) {
  const id = row.job_level_id ?? row.job_level_value ?? row.job_level ?? row.job_level_name;
  const name = row.job_level ?? row.job_level_name ?? null;
  const rawValue = row.job_level_value;
  const parsedValue =
    rawValue === null || rawValue === undefined || rawValue === ''
      ? null
      : Number(rawValue);
  const value = Number.isFinite(parsedValue) ? parsedValue : null;

  if (!name && value === null) {
    return null;
  }

  return {
    id,
    name,
    value,
  };
}

function createJobLevelKey(jobLevel) {
  return [
    jobLevel.value === null ? '' : String(jobLevel.value),
    String(jobLevel.name ?? '').trim().toLowerCase(),
  ].join(':');
}

function matchesSearch(jobLevel, search) {
  if (!search) {
    return true;
  }

  return [jobLevel.name, jobLevel.value, jobLevel.id]
    .filter((value) => value !== null && value !== undefined)
    .join(' ')
    .toLowerCase()
    .includes(search);
}

function sortJobLevels(left, right) {
  if (left.value !== null && right.value !== null && left.value !== right.value) {
    return left.value - right.value;
  }

  return String(left.name || left.value || '').localeCompare(
    String(right.name || right.value || ''),
    'id-ID',
    { sensitivity: 'base' }
  );
}

async function getUniqueJobLevels(active = 'all') {
  const users = await DirectoryService.fetchUsers({ active });
  const jobLevelMap = new Map();

  users.forEach((user) => {
    const jobLevel = normalizeJobLevel(user);

    if (!jobLevel) {
      return;
    }

    const key = createJobLevelKey(jobLevel);

    if (!jobLevelMap.has(key)) {
      jobLevelMap.set(key, jobLevel);
    }
  });

  return [...jobLevelMap.values()].sort(sortJobLevels);
}

async function list(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 500, 1), 1000);
  const offset = (page - 1) * limit;
  const active = query.active ?? query.is_active ?? 'all';
  const search = String(query.search ?? '').trim().toLowerCase();
  const rows = (await getUniqueJobLevels(active)).filter((jobLevel) =>
    matchesSearch(jobLevel, search)
  );

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
  const rows = await getUniqueJobLevels('all');

  return (
    rows.find(
      (jobLevel) =>
        String(jobLevel.id) === String(id) ||
        String(jobLevel.value) === String(id) ||
        String(jobLevel.name) === String(id)
    ) || null
  );
}

module.exports = {
  list,
  getById,
};
