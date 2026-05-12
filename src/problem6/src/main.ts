import '@/logger/tracer'
import http from 'http'
import express from 'express'
import { env } from '@/config/env'
import routes from '@/routes'
import scoreboardGateway from '@/gateway/scoreboardGateway'
import errorMiddleware from '@/middlewares/errorMiddleware'
import { Redis } from '@/config/redis'
import { log } from '@/logger'

const app = express()
const httpServer = http.createServer(app)

app.use(express.json())
app.use(routes)
app.use(errorMiddleware.handle)

const start = async () => {
  Redis.init()
  await Redis.init().ping()
  await scoreboardGateway.init(httpServer)
  httpServer.listen(env.port, () => {
    log.info('http_listen', { port: env.port, rest: '/api', ws: '/scoreboard' })
  })
}

start().catch(err => {
  log.error('bootstrap_failed', { err: err instanceof Error ? err.message : String(err) })
  process.exit(1)
})
