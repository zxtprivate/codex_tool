import { Agent, fetch } from 'undici';
import type { ConnectionConfig } from './types.js';

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

export class RabbitError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function baseUrl(c: ConnectionConfig) {
  return `${c.protocol}://${c.host}:${c.managementPort}`;
}

function validateApiPath(path: string, base: string) {
  if (!path.startsWith('/api/')) {
    throw new RabbitError('只允许访问 RabbitMQ /api/ 路径', 400);
  }
  const target = new URL(path, base);
  const origin = new URL(base).origin;
  if (target.origin !== origin || !target.pathname.startsWith('/api/')) {
    throw new RabbitError('RabbitMQ API 路径不合法', 400);
  }
  return target.toString();
}

export async function rabbitRequest(
  connection: ConnectionConfig,
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
) {
  const base = baseUrl(connection);
  const url = validateApiPath(path, base);
  const auth = Buffer.from(`${connection.username}:${connection.password}`, 'utf8').toString('base64');
  const dispatcher = connection.protocol === 'https' && connection.allowInsecureTls ? insecureAgent : undefined;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Basic ${auth}`,
    ...extraHeaders,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      dispatcher,
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new RabbitError(`无法连接 RabbitMQ：${error instanceof Error ? error.message : String(error)}`, 502);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'reason' in data
      ? String((data as { reason?: unknown }).reason)
      : `RabbitMQ 返回 HTTP ${response.status}`;
    throw new RabbitError(message, response.status, data);
  }

  return { status: response.status, data };
}
