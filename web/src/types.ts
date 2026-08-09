export interface ConnectionInfo {
  name: string;
  protocol: 'http' | 'https';
  host: string;
  managementPort: number;
  amqpPort: number;
  username: string;
  allowInsecureTls?: boolean;
}

export interface SessionInfo {
  authenticated: boolean;
  connection: ConnectionInfo;
  whoami?: any;
  expiresAt?: number;
}

export interface QueueInfo {
  name: string;
  vhost: string;
  type?: string;
  state?: string;
  durable?: boolean;
  auto_delete?: boolean;
  consumers?: number;
  messages?: number;
  messages_ready?: number;
  messages_unacknowledged?: number;
  message_stats?: any;
  arguments?: Record<string, unknown>;
}

export interface ExchangeInfo {
  name: string;
  vhost: string;
  type: string;
  durable: boolean;
  auto_delete: boolean;
  internal: boolean;
  arguments?: Record<string, unknown>;
}
