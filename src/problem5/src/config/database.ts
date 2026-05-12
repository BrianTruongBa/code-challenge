import { AsyncLocalStorage } from 'node:async_hooks'
import mysql, { Pool, PoolConnection } from 'mysql2/promise'
import { env } from './env'

const pool: Pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 100,
  namedPlaceholders: true,
})

/**
 * When `withTransaction()` runs, the checkout connection is stored here for the
 * duration of the async chain — same idea as tradeit-backend’s `httpContext` +
 * `takeConnection()`, without tying DB access to Express.
 */
const txConnection = new AsyncLocalStorage<PoolConnection>()

/** Pool (default) or the active transaction connection for this async context */
export function getDb(): Pool | PoolConnection {
  return txConnection.getStore() ?? pool
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  return txConnection.run(conn, async () => {
    try {
      const result = await fn()
      await conn.commit()
      return result
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  })
}
