import { withTransaction } from '@/config/database'
import { MainError } from '@/errors/mainError'
import { ReturnableError } from '@/errors/returnableError'
import { ERROR } from '@/utils/enum'
import { IScore } from '@/models/scoreInterface'
import {
  ACTION_TOKEN_MIN_LEN,
  IDEMPOTENCY_KEY_MAX_LEN,
  IDEMPOTENCY_LOCK_SECONDS,
  IDEMPOTENCY_TTL_SECONDS,
  IDEMPOTENCY_WAIT_MS,
  IDEMPOTENCY_WAIT_ROUNDS,
} from '@/config/const'
import scoreboardRepo from '@/repository/scoreboardRepo'
import scoreboardRedis from '@/redis/scoreboardRedis'
import scoreboardGateway from '@/gateway/scoreboardGateway'
import { Redis } from '@/config/redis'
import { log } from '@/logger'
import { sleep } from '@/utils/helpers'

function normalizeIdempotencyKey(raw: string | undefined): string | undefined {
  if (raw === undefined || typeof raw !== 'string') {
    return undefined
  }
  const t = raw.trim()
  if (!t) {
    return undefined
  }
  if (t.length > IDEMPOTENCY_KEY_MAX_LEN) {
    throw new ReturnableError(
      `Idempotency-Key must be at most ${IDEMPOTENCY_KEY_MAX_LEN} characters`,
    )
  }
  if (!/^[\w.-]+$/.test(t)) {
    throw new ReturnableError(
      'Idempotency-Key may only contain letters, digits, underscore, hyphen, dot',
    )
  }
  return t
}

function idemResultKey(userId: string, key: string): string {
  return `idem:upd:res:${userId}:${key}`
}

function idemLockKey(userId: string, key: string): string {
  return `idem:upd:lock:${userId}:${key}`
}

class ScoreboardService {
  async getTopScores(): Promise<IScore[]> {
    const cached = await scoreboardRedis.getTopScores()
    if (cached) {
      log.info('scoreboard_cache_hit', { key: 'top' })
      return cached
    }

    const scores = await scoreboardRepo.getTopScores()
    await scoreboardRedis.setTopScores(scores)
    log.info('scoreboard_cache_miss', { rows: scores.length })
    return scores
  }

  async incrementScore(
    userId: string,
    actionToken: string,
    opts?: { idempotencyKey?: string },
  ): Promise<IScore> {
    const idemKey = normalizeIdempotencyKey(opts?.idempotencyKey)
    const r = Redis.init()
    let lockHeldKey: string | null = null

    if (idemKey) {
      const resKey = idemResultKey(userId, idemKey)
      const cached = await r.get(resKey)
      if (cached) {
        log.info('idempotency_replay', { userId, idemKey })
        return JSON.parse(cached) as IScore
      }

      const lk = idemLockKey(userId, idemKey)
      const locked = await r.set(lk, '1', 'EX', IDEMPOTENCY_LOCK_SECONDS, 'NX')
      if (locked !== 'OK') {
        for (let i = 0; i < IDEMPOTENCY_WAIT_ROUNDS; i++) {
          await sleep(IDEMPOTENCY_WAIT_MS)
          const again = await r.get(resKey)
          if (again) {
            log.info('idempotency_replay_after_wait', { userId, idemKey, round: i })
            return JSON.parse(again) as IScore
          }
        }
        throw new MainError('Idempotency conflict: could not complete or replay', ERROR.CONFLICT)
      }
      lockHeldKey = lk
    }

    try {
      await this.verifyActionToken(actionToken, userId)

      const updated = await withTransaction(async client => {
        await scoreboardRepo.findByUserIdForUpdate(userId, client)
        return scoreboardRepo.upsertScore(userId, client)
      })

      await scoreboardRedis.invalidate()

      const top = await scoreboardRepo.getTopScores()
      scoreboardGateway.broadcastTopScores(top)

      if (idemKey) {
        const resKey = idemResultKey(userId, idemKey)
        await r.set(resKey, JSON.stringify(updated), 'EX', IDEMPOTENCY_TTL_SECONDS)
        log.info('idempotency_stored', { userId, idemKey })
      }

      return updated
    } finally {
      if (lockHeldKey) {
        await r.del(lockHeldKey)
      }
    }
  }

  /**
   * Production hardening (README): HMAC from action service, Redis replay for tokens.
   * Current: minimum-length token gate.
   */
  private async verifyActionToken(token: string, userId: string): Promise<void> {
    if (!userId) {
      throw new MainError('User not identified', ERROR.NOT_FOUND)
    }

    if (typeof token !== 'string' || token.length < ACTION_TOKEN_MIN_LEN) {
      throw new ReturnableError('actionToken is invalid')
    }
  }
}

export default new ScoreboardService()
