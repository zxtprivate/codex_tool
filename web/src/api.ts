export class ApiError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function parse(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('rmq-session-expired'));
  if (!res.ok) throw new ApiError(json.message || `请求失败（${res.status}）`, res.status, json.details);
  return json;
}

export async function getSession() {
  const res = await fetch('/api/session', { credentials: 'include' });
  if (res.status === 401) return null;
  return parse(res);
}

export async function login(payload: Record<string, unknown>) {
  const res = await fetch('/api/session/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parse(res);
}

export async function logout() {
  await fetch('/api/session/logout', { method: 'POST', credentials: 'include' });
}

export async function rmq<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch('/api/rmq/request', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, body, headers }),
  });
  const json = await parse(res);
  const data = json.data;
  if (data && !Array.isArray(data) && Array.isArray(data.items)) return data.items as T;
  return data as T;
}

export const enc = (v: string) => encodeURIComponent(v);
export const fmt = (n: unknown) => Number(n || 0).toLocaleString('zh-CN');
export const rate = (n: unknown) => `${Number(n || 0).toFixed(1)} /s`;
