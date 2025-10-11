import type { SheetRecord } from './types';

const API_BASE = typeof window !== 'undefined' 
  ? ''  // Use empty base since backend routes already include /api
  : 'http://localhost:5000';  // Fallback for SSR

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
    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch {}
    const msg = body?.message || text || res.statusText;
    throw new Error(`${res.status} ${msg} @ ${url}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

// -------------------- Sheet CRUD API --------------------
export const listSheets = (businessId: string): Promise<SheetRecord[]> =>
  request(`/api/sheets/${businessId}`);

export const createSheet = (businessId: string, payload: Partial<SheetRecord>) =>
  request(`/api/sheets/${businessId}`, { method: 'POST', body: JSON.stringify(payload) });

export const updateSheet = (businessId: string, payload: Partial<SheetRecord> & { id: number }) =>
  request(`/api/sheets/${businessId}`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteSheet = (businessId: string, id: number) =>
  request(`/api/sheets/${businessId}`, { method: 'DELETE', body: JSON.stringify({ id }) });

// -------------------- BackMarket API via Backend --------------------
export async function fetchBMOrder(orderNo: string) {
  if (!orderNo || orderNo.length !== 8) throw new Error('Invalid BackMarket order number');

  // Call your backend proxy route
  const data = await request(`/api/bmOrders/${orderNo}`);
  return data;
}
