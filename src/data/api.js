/**
 * CampusFind Frontend API Client
 * Connects every UI action to the live /api/* relational database endpoints
 * with automatic JWT Bearer token attachment.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const TOKEN_STORAGE_KEY = 'campusfind_jwt_token';
export const USER_STORAGE_KEY = 'campus_lf_auth_user';

export function getStoredToken() {
  try {
    return (
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
      ''
    );
  } catch {
    return '';
  }
}

export function setStoredAuth(user, token, remember = true) {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    if (!user || !token) return;
    const store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_STORAGE_KEY, token);
    store.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors
  }
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
}

export const api = {
  // Bootstrap all portal state from SQL database
  bootstrap: () => request('/bootstrap'),

  // Auth & Profile
  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  facultyLogin: (payload) =>
    request('/auth/faculty-login', { method: 'POST', body: JSON.stringify(payload) }),
  adminLogin: (payload) =>
    request('/auth/admin-login', { method: 'POST', body: JSON.stringify(payload) }),
  getFacultyDashboard: () => request('/faculty/dashboard'),
  getStudentDashboard: () => request('/student/dashboard'),
  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  updateProfile: (payload) =>
    request('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  changePassword: (payload) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),

  // Items
  getItems: () => request('/items'),
  getItemById: (id) => request(`/items/${encodeURIComponent(id)}`),
  createItem: (payload) =>
    request('/items', { method: 'POST', body: JSON.stringify(payload) }),
  updateItem: (id, updates) =>
    request(`/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteItem: (id) =>
    request(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // AI Matching & Evaluation
  getAllMatches: () => request('/matches'),
  findMatches: (itemId, _allItems, options = {}) =>
    request('/match', {
      method: 'POST',
      body: JSON.stringify({ itemId, ...options }),
    }),
  submitMatchFeedback: (matchId, payload) =>
    request(`/matches/${encodeURIComponent(matchId)}/feedback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getEvaluation: () => request('/evaluation'),

  // Claims
  getClaims: () => request('/claims'),
  createClaim: (payload) =>
    request('/claims', { method: 'POST', body: JSON.stringify(payload) }),
  reviewClaim: (id, payload) =>
    request(`/claims/${encodeURIComponent(id)}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Handover
  completeHandover: (payload) =>
    request('/handovers/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateHandover: (id, payload) =>
    request(`/handovers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) =>
    request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request('/notifications/read-all', { method: 'POST' }),

  // Admin: Users, Config & Locations
  getUsers: () => request('/users'),
  updateUser: (id, payload) =>
    request(`/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateMatchingConfig: (payload) =>
    request('/admin/matching-config', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  addLocation: (payload) =>
    request('/locations', { method: 'POST', body: JSON.stringify(payload) }),
};

export default api;
