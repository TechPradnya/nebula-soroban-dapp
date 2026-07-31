const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

class ApiClientError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getToken() {
  return localStorage.getItem('nebula_token');
}

async function request(path, { method = 'GET', body, auth = false, params, timeoutMs = 15000 } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiClientError('Request timed out — check your connection and try again.', 0);
    }
    throw new ApiClientError('Could not reach the server. Check your connection.', 0);
  } finally {
    clearTimeout(timeout);
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    if (res.status === 401 && auth) {
      // Session expired or token invalidated server-side. Clear it and let
      // AuthContext react (redirect to /login) rather than every caller
      // having to special-case a 401 individually.
      localStorage.removeItem('nebula_token');
      window.dispatchEvent(new CustomEvent('nebula:unauthorized'));
    }
    throw new ApiClientError(payload?.message || 'Request failed', res.status, payload?.details);
  }

  return payload;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { ApiClientError, getToken };
