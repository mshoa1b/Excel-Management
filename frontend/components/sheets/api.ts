import type { SheetRecord } from './types';

// Hardcoded base URL to your Express server:
const API_BASE = 'http://localhost:5000';

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new Error('401 Unauthorized @ ' + url);
    }
    let body: any = null;
    let text = '';
    try { text = await res.text(); body = JSON.parse(text); } catch { /* ignore */ }
    const msg = body?.message || body?.error || text || res.statusText || 'Request failed';
    throw new Error(`${res.status} ${msg} @ ${url}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return txt; }
}

export const listSheets = (businessId: string): Promise<SheetRecord[]> =>
  request(`/api/sheets/${businessId}`);

export const createSheet = (businessId: string, payload: Partial<SheetRecord>) =>
  request(`/api/sheets/${businessId}`, { method: 'POST', body: JSON.stringify(payload) });

export const updateSheet = (businessId: string, payload: Partial<SheetRecord> & { id: number }) =>
  request(`/api/sheets/${businessId}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteSheet = (businessId: string, id: number) =>
  request(`/api/sheets/${businessId}`, { method: 'DELETE', body: JSON.stringify({ id }) });
