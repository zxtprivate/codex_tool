import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response, type NextFunction } from 'express';
import { rabbitRequest, RabbitError } from './rabbit.js';
import type { ConnectionConfig, SessionRecord } from './types.js';

const app = express();
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const SESSION_COOKIE = 'rmq_cn_session';
const SESSION_TTL = 8 * 60 * 60 * 1000;
const sessions = new Map<string, SessionRecord>();

app.use(express.json({ limit: '2mb' }));

function cookies(req: Request) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map((x) => x.trim()).filter(Boolean).map((x) => {
    const i = x.indexOf('=');
    return [decodeURIComponent(x.slice(0, i)), decodeURIComponent(x.slice(i + 1))];
  }));
}

function setSessionCookie(res: Response, id: string) {
  const secure = process.env.COOKIE_SECURE === 'true';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL / 1000)}${secure ? '; Secure' : ''}`);
}

function clearSessionCookie(res: Response) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

function currentSession(req: Request) {
  const id = cookies(req)[SESSION_COOKIE];
  if (!id) return undefined;
  const s = sessions.get(id);
  if (!s) return undefined;
  if (s.expiresAt < Date.now()) {
    sessions.delete(id);
    return undefined;
  }
  return s;
}

function requireSession(req: Request, res: Response, next: NextFunction) {
  const s = currentSession(req);
  if (!s) return res.status(401).json({ message: '登录已失效，请重新连接 RabbitMQ' });
  res.locals.session = s;
  next();
}

function normalizeConnection(input: any): ConnectionConfig {
  const protocol = input?.protocol === 'https' ? 'https' : 'http';
  const host = String(input?.host || '').trim();
  const managementPort = Number(input?.managementPort);
  const amqpPort = Number(input?.amqpPort || 5672);
  const username = String(input?.username || '');
  const password = String(input?.password || '');
  const name = String(input?.name || host || 'RabbitMQ').trim();
  if (!host || host.includes('/') || host.includes('@')) throw new RabbitError('RabbitMQ 地址不合法', 400);
  if (!Number.isInteger(managementPort) || managementPort < 1 || managementPort > 65535) throw new RabbitError('Management 端口不合法', 400);
  if (!Number.isInteger(amqpPort) || amqpPort < 1 || amqpPort > 65535) throw new RabbitError('AMQP 端口不合法', 400);
  if (!username || !password) throw new RabbitError('请输入 RabbitMQ 用户名和密码', 400);
  return { name, protocol, host, managementPort, amqpPort, username, password, allowInsecureTls: Boolean(input?.allowInsecureTls) };
}

app.get('/api/session', async (req, res) => {
  const s = currentSession(req);
  if (!s) return res.status(401).json({ authenticated: false });
  res.json({
    authenticated: true,
    connection: {
      name: s.connection.name,
      protocol: s.connection.protocol,
      host: s.connection.host,
      managementPort: s.connection.managementPort,
      amqpPort: s.connection.amqpPort,
      username: s.connection.username,
      allowInsecureTls: s.connection.allowInsecureTls,
    },
    whoami: s.whoami,
    expiresAt: s.expiresAt,
  });
});

app.post('/api/session/login', async (req, res, next) => {
  try {
    const connection = normalizeConnection(req.body);
    const whoami = (await rabbitRequest(connection, 'GET', '/api/whoami')).data;
    const id = crypto.randomBytes(32).toString('hex');
    const record: SessionRecord = { id, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL, connection, whoami };
    sessions.set(id, record);
    setSessionCookie(res, id);
    res.json({
      authenticated: true,
      whoami,
      connection: {
        name: connection.name,
        protocol: connection.protocol,
        host: connection.host,
        managementPort: connection.managementPort,
        amqpPort: connection.amqpPort,
        username: connection.username,
        allowInsecureTls: connection.allowInsecureTls,
      },
    });
  } catch (e) { next(e); }
});

app.post('/api/session/logout', (req, res) => {
  const id = cookies(req)[SESSION_COOKIE];
  if (id) sessions.delete(id);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post('/api/rmq/request', requireSession, async (req, res, next) => {
  try {
    const { method = 'GET', path: apiPath, body, headers } = req.body || {};
    const allowedMethods = new Set(['GET', 'POST', 'PUT', 'DELETE']);
    const upper = String(method).toUpperCase();
    if (!allowedMethods.has(upper)) throw new RabbitError('不支持的请求方法', 400);
    if (typeof apiPath !== 'string') throw new RabbitError('缺少 API path', 400);
    const safeHeaders: Record<string, string> = {};
    if (headers && typeof headers['X-Reason'] === 'string') safeHeaders['X-Reason'] = headers['X-Reason'].slice(0, 200);
    const s = res.locals.session as SessionRecord;
    const result = await rabbitRequest(s.connection, upper, apiPath, body, safeHeaders);
    s.expiresAt = Date.now() + SESSION_TTL;
    setSessionCookie(res, s.id);
    res.status(result.status).json({ data: result.data });
  } catch (e) { next(e); }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, sessions: sessions.size }));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof RabbitError) return res.status(err.status >= 400 && err.status < 600 ? err.status : 500).json({ message: err.message, details: err.details });
  console.error(err);
  res.status(500).json({ message: err instanceof Error ? err.message : '服务器内部错误' });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, '../../web/dist');
app.use(express.static(webDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(webDist, 'index.html'));
});

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) if (s.expiresAt < now) sessions.delete(id);
}, 10 * 60 * 1000).unref();

app.listen(PORT, HOST, () => {
  console.log(`RabbitMQ 中文控制台: http://${HOST}:${PORT}`);
});
