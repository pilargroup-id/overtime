const DEFAULT_API_BASE_URL = '/api';
const DEFAULT_AUTH_TOKEN_STORAGE_KEY = 'overtime_auth_token';

const authTokenStorageKey =
  import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY || DEFAULT_AUTH_TOKEN_STORAGE_KEY;
const envAuthToken = import.meta.env.VITE_AUTH_TOKEN || '';

const normalizeBaseUrl = (url) => url.replace(/\/+$/, '');

const canUseLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

const getStoredAuthToken = () => {
  if (!canUseLocalStorage()) {
    return null;
  }

  return window.localStorage.getItem(authTokenStorageKey);
};

const getTokenFromUrl = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const readToken = (params) =>
    params.get('token') || params.get('access_token') || params.get('auth_token');

  const searchToken = readToken(new URLSearchParams(window.location.search));

  if (searchToken) {
    return searchToken;
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));

  return readToken(hashParams);
};

const removeTokenFromUrl = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  let hasTokenParam = false;

  ['token', 'access_token', 'auth_token'].forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      hasTokenParam = true;
    }
  });

  if (hasTokenParam) {
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
};

const setStoredAuthToken = (token) => {
  if (!canUseLocalStorage()) {
    return;
  }

  if (token) {
    window.localStorage.setItem(authTokenStorageKey, token);
    return;
  }

  window.localStorage.removeItem(authTokenStorageKey);
};

const initializeStoredAuthToken = () => {
  const urlToken = getTokenFromUrl();

  if (urlToken) {
    setStoredAuthToken(urlToken);
    removeTokenFromUrl();
    return urlToken;
  }

  const storedToken = getStoredAuthToken();

  if (storedToken) {
    return storedToken;
  }

  if (envAuthToken) {
    setStoredAuthToken(envAuthToken);
    return envAuthToken;
  }

  return null;
};

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, item);
        }
      });

      return;
    }

    searchParams.append(key, value);
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
};

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? null;
    this.data = options.data ?? null;
  }
}

let authToken = initializeStoredAuthToken();
let authTokenGetter = getStoredAuthToken;

const resolveToken = (tokenFromRequest) => {
  if (tokenFromRequest) {
    return tokenFromRequest;
  }

  if (typeof authTokenGetter === 'function') {
    return authTokenGetter();
  }

  return authToken;
};

const createResource = (path) => ({
  list: (params, options) => api.get(path, { ...options, params }),
  detail: (id, params, options) =>
    api.get(`${path}/${id}`, { ...options, params }),
  create: (data, options) => api.post(path, data, options),
  update: (id, data, options) => api.put(`${path}/${id}`, data, options),
  remove: (id, options) => api.delete(`${path}/${id}`, options),
});

const createReadOnlyResource = (path) => ({
  list: (params, options) => api.get(path, { ...options, params }),
  detail: (id, params, options) =>
    api.get(`${path}/${id}`, { ...options, params }),
});

const request = async (
  path,
  {
    method = 'GET',
    params,
    data,
    headers = {},
    token,
    signal,
    responseType = 'json',
  } = {},
) => {
  const baseUrl = normalizeBaseUrl(
    import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  );

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}${buildQueryString(params)}`;
  const resolvedToken = resolveToken(token);

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (data !== undefined && !(data instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (resolvedToken) {
    requestHeaders.Authorization = `Bearer ${resolvedToken}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
    signal,
  });

  let responseData = null;

  if (response.status !== 204) {
    if (responseType === 'text') {
      responseData = await response.text();
    } else {
      const rawText = await response.text();
      try {
        responseData = rawText ? JSON.parse(rawText) : null;
      } catch {
        responseData = rawText;
      }
    }
  }

  if (!response.ok) {
    const message =
      responseData?.message ||
      response.statusText ||
      'Terjadi kesalahan saat menghubungi server';

    throw new ApiError(message, {
      status: response.status,
      data: responseData,
    });
  }

  return responseData;
};

const api = {
  get baseUrl() {
    return normalizeBaseUrl(
      import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
    );
  },

  setToken(token) {
    authToken = token;
    setStoredAuthToken(token);
  },

  clearToken() {
    authToken = null;
    setStoredAuthToken(null);
  },

  setTokenGetter(getter) {
    authTokenGetter = getter;
  },

  request,

  get(path, options) {
    return request(path, { ...options, method: 'GET' });
  },

  post(path, data, options) {
    return request(path, { ...options, method: 'POST', data });
  },

  put(path, data, options) {
    return request(path, { ...options, method: 'PUT', data });
  },

  patch(path, data, options) {
    return request(path, { ...options, method: 'PATCH', data });
  },

  delete(path, options) {
    return request(path, { ...options, method: 'DELETE' });
  },

  auth: {
    me: (options) => api.get('/auth/me', options),
  },

  overtimeRequests: {
    ...createReadOnlyResource('/overtime/requests'),
    create: (data, options) => api.post('/overtime/requests', data, options),
    bulkCreate: (data, options) =>
      api.post('/overtime/requests/bulk', data, options),
    eligibleEmployees: (params, options) =>
      api.get('/overtime/requests/eligible-employees', { ...options, params }),
    cancel: (id, data = {}, options) =>
      api.put(`/overtime/requests/${id}/cancel`, data, options),
  },

  overtimeApprovals: {
    ...createReadOnlyResource('/overtime/approvals'),
    approve: (id, data = {}, options) =>
      api.put(`/overtime/approvals/${id}/approve`, data, options),
    reject: (id, data = {}, options) =>
      api.put(`/overtime/approvals/${id}/reject`, data, options),
  },

  overtimeReports: {
    ...createReadOnlyResource('/overtime/reports'),
    updateTalentaStatus: (id, data, options) =>
      api.put(`/overtime/reports/${id}/talenta-status`, data, options),
    bulkUpdateTalentaStatus: (data, options) =>
      api.put('/overtime/reports/talenta-status/bulk', data, options),
  },

  compensationTypes: createResource('/master/compensation-types'),
  userPermissions: createResource('/master/user-permissions'),
  approvalRules: createResource('/master/approval-rules'),
};

export default api;

