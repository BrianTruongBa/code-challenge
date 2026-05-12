import { Pool, PoolClient, QueryResult } from 'pg'
import { env } from '@/config/env'
import { log } from '@/logger'

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', err => {
  log.error('db_pool_error', { err: err instanceof Error ? err.message : String(err) })
})

function pgErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code: unknown }).code)
  }
  return undefined
}

export async function execute<T extends object>(
  query: string,
  params?: unknown[],
  retryCount = 0,
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(query, params)
  } catch (err: unknown) {
    if (pgErrorCode(err) === '23505') {
      throw err
    }
    if (retryCount >= 2) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('db_query_failed', { msg, query })
      throw err
    }
    return execute<T>(query, params, retryCount + 1)
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export { pool }
