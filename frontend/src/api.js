// All backend calls go through /api (Vite proxy in development, nginx proxy in Docker).
const BASE = import.meta.env.VITE_API_BASE || '/api';

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('mb_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (token && res.status === 401) {
        localStorage.removeItem('mb_token');
        localStorage.removeItem('mb_user');
      }
    }
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export const dashboardPath = (role) =>
  ({ PATIENT: '/patient', HOSPITAL: '/hospital', INSURER: '/insurer', ADMIN: '/admin' }[role] || '/');

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatINR = (value) => inr.format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
