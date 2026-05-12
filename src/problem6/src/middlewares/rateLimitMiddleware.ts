import type { Request, Response, NextFunction } from 'express'
import { Redis } from '@/config/redis'
import { env } from '@/config/env'
import { MainError } from '@/errors/mainError'
import { ERROR } from '@/utils/enum'
import type { AuthRequest } from '@/middlewares/userMiddleware'

const WINDOW_SEC = 60

function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  }
  return req.socket.remoteAddress || 'unknown'
}

function windowBucket(): number {
  return Math.floor(Date.now() / (WINDOW_SEC * 1000))
}

async function incrUnderCap(key: string, max: number): Promise<boolean> {
  const r = Redis.init()
  const n = await r.incr(key)
  if (n === 1) {
    await r.expire(key, WINDOW_SEC + 5)
  }
  return n <= max
}

class RateLimitMiddleware {
  /** Before auth — by client IP for POST /scoreboard/update. */
  byIpForUpdate = (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      try {
        if (!env.rateLimit.enabled) {
          next()
          return
        }
        const ip = clientIp(req)
        const key = `rl:ip:${ip}:w:${windowBucket()}`
        const ok = await incrUnderCap(key, env.rateLimit.maxPerIpPerWindow)
        if (!ok) {
          next(new MainError('Too many requests', ERROR.TOO_MANY_REQUESTS))
          return
        }
        next()
      } catch (e) {
        next(e)
      }
    })()
  }

  /** After JWT — per subject for score updates. */
  bySubForUpdate = (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      try {
        if (!env.rateLimit.enabled) {
          next()
          return
        }
        const sub = (req as AuthRequest).user?.sub
        if (!sub) {
          next()
          return
        }
        const key = `rl:sub:${sub}:w:${windowBucket()}`
        const ok = await incrUnderCap(key, env.rateLimit.maxPerSubPerWindow)
        if (!ok) {
          next(new MainError('Too many score updates, slow down', ERROR.TOO_MANY_REQUESTS))
          return
        }
        next()
      } catch (e) {
        next(e)
      }
    })()
  }
}

export default new RateLimitMiddleware()
