import dotenv from 'dotenv'

dotenv.config()

function required(key: string): string {
  const val = process.env[key]
  if (!val) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return val
}

/** Comma-separated origins for Socket.IO CORS; `*` allows any (dev only). */
function socketCorsOrigins(): string | string[] {
  const raw = process.env.SOCKET_CORS_ORIGIN?.trim()
  if (!raw || raw === '*') {
    return '*'
  }
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function boolEnv(key: string, defaultValue: boolean): boolean {
  const v = process.env[key]?.trim().toLowerCase()
  if (v === undefined || v === '') {
    return defaultValue
  }
  return v === '1' || v === 'true' || v === 'yes'
}

function intEnv(key: string, fallback: number): number {
  const v = process.env[key]
  if (v === undefined || v === '') {
    return fallback
  }
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export const env = {
  port: parseInt(process.env.PORT ?? '8002', 10),
  db: {
    host: required('DB_HOST'),
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: required('JWT_SECRET'),
  },
  socket: {
    corsOrigin: socketCorsOrigins(),
    /** Multi-instance Socket.IO via `@socket.io/redis-adapter` (extra Redis connections). */
    redisAdapter: boolEnv('SOCKET_IO_REDIS_ADAPTER', false),
  },
  rateLimit: {
    enabled: boolEnv('RATE_LIMIT_ENABLED', true),
    maxPerIpPerWindow: intEnv('RATE_LIMIT_IP_MAX', 300),
    maxPerSubPerWindow: intEnv('RATE_LIMIT_SUB_MAX', 60),
  },
}
