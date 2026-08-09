export interface ConnectionConfig {
  name: string;
  protocol: 'http' | 'https';
  host: string;
  managementPort: number;
  amqpPort: number;
  username: string;
  password: string;
  allowInsecureTls: boolean;
}

export interface SessionRecord {
  id: string;
  createdAt: number;
  expiresAt: number;
  connection: ConnectionConfig;
  whoami?: unknown;
}
