const axios = require('axios');
const config = require('../config');

const CACHE_TTL_MS = 60_000;
const cache = new Map();

function createHttpError(message, statusCode = 500, code = null, payload = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.payload = payload;
  return err;
}

function getAxiosErrorCode(err) {
  return err.response?.data?.code || err.code || null;
}

function getAxiosErrorMessage(err, fallbackMessage) {
  return err.response?.data?.message || err.message || fallbackMessage;
}

function buildCacheKey(resource, params = {}) {
  const orderedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});

  return `${resource}:${JSON.stringify(orderedParams)}`;
}

function normalizeDirectoryData(payload, resource) {
  const rows = payload?.data;

  if (!Array.isArray(rows)) {
    throw createHttpError(
      `Invalid directory ${resource} response from pilargroup`,
      500,
      'DIRECTORY_INVALID_RESPONSE'
    );
  }

  return rows;
}

async function fetchDirectoryResource(resource, options = {}) {
  const {
    params = {},
    token = null,
    forceRefresh = false,
  } = options;

  const cacheKey = buildCacheKey(resource, params);
  const cached = cache.get(cacheKey);

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `${config.pilargroup.url}/api/internal/directory/${resource}`;

  try {
    const response = await axios.get(url, {
      timeout: 10_000,
      params,
      headers: {
        Accept: 'application/json',
        'X-Internal-Secret': config.pilargroup.internalSyncSecret,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = normalizeDirectoryData(response.data, resource);

    cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return data;
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }

    throw createHttpError(
      getAxiosErrorMessage(err, `Failed to fetch directory ${resource}`),
      err.response?.status || 500,
      getAxiosErrorCode(err) || 'DIRECTORY_FETCH_FAILED',
      err.response?.data || null
    );
  }
}

function fetchUsers(params = {}, options = {}) {
  return fetchDirectoryResource('users', { ...options, params });
}

function fetchDepartments(params = {}, options = {}) {
  return fetchDirectoryResource('departments', { ...options, params });
}

function fetchCompanies(params = {}, options = {}) {
  return fetchDirectoryResource('companies', { ...options, params });
}

function clearDirectoryCache() {
  cache.clear();
}

module.exports = {
  fetchDirectoryResource,
  fetchUsers,
  fetchDepartments,
  fetchCompanies,
  clearDirectoryCache,
};
