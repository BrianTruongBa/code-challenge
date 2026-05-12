import IORedis from 'ioredis'
import { env } from '@/config/env'
import { log } from '@/logger'

export const Redis = {
  connection: null as IORedis | null,

  init(): IORedis {
    if (!this.connection) {
      this.connection = new IORedis({
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      })
      this.connection.on('connect', () => {
        log.info('redis_connected', {})
      })
      this.connection.on('error', err => {
        log.error('redis_client_error', { message: err.message })
      })
    }
    return this.connection
  },
}
