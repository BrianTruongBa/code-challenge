import { Server as HttpServer } from 'http'
import { Server, Namespace, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { env } from '@/config/env'
import { IScore } from '@/models/scoreInterface'
import { WS_NAMESPACE, WS_EVENT_TOP_SCORES } from '@/config/const'
import { Redis } from '@/config/redis'
import { log } from '@/logger'

class ScoreboardGateway {
  private ns: Namespace | null = null

  async init(httpServer: HttpServer): Promise<void> {
    const io = new Server(httpServer, {
      cors: {
        origin: env.socket.corsOrigin,
        methods: ['GET', 'POST', 'OPTIONS'],
      },
    })

    if (env.socket.redisAdapter) {
      const pubClient = Redis.init().duplicate()
      const subClient = Redis.init().duplicate()
      await Promise.all([pubClient.connect(), subClient.connect()])
      io.adapter(createAdapter(pubClient, subClient))
      log.info('socket_io_redis_adapter', { enabled: true })
    }

    this.ns = io.of(WS_NAMESPACE)
    this.ns.on('connection', (socket: Socket) => {
      log.info('ws_client_connected', { socketId: socket.id })
      socket.on('disconnect', () => {
        log.info('ws_client_disconnected', { socketId: socket.id })
      })
    })
  }

  broadcastTopScores(scores: IScore[]): void {
    this.ns?.emit(WS_EVENT_TOP_SCORES, scores)
    log.info('ws_broadcast_top_scores', {
      listeners: this.ns?.sockets.size ?? 0,
      rows: scores.length,
    })
  }
}

export default new ScoreboardGateway()
