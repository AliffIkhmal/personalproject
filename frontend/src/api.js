const API_BASE = '/api';

async function request(url, options = {}) {
  const config = {
    credentials: 'include',
    headers: {},
    ...options,
  };

  if (config.body && !(config.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(`${API_BASE}${url}`, config);
  const data = await res.json();

  if (res.status === 401) {
    // Don't redirect if already on the login page (e.g. wrong credentials)
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw { status: res.status, ...data };
  }

  if (!res.ok) {
    throw { status: res.status, ...data };
  }

  return data;
}

const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  patch: (url, body) => request(url, { method: 'PATCH', body }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: (url, formData) => request(url, { method: 'POST', body: formData }),
};

export default api;
