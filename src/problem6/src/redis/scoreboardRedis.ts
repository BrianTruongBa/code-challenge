import { Redis } from '@/config/redis'
import { IScore } from '@/models/scoreInterface'
import { CACHE_KEY_TOP_SCORES, CACHE_TTL_SECONDS } from '@/config/const'

class ScoreboardRedis {
  async getTopScores(): Promise<IScore[] | null> {
    const raw = await Redis.init().get(CACHE_KEY_TOP_SCORES)
    return raw ? (JSON.parse(raw) as IScore[]) : null
  }

  async setTopScores(scores: IScore[]): Promise<void> {
    await Redis.init().setex(CACHE_KEY_TOP_SCORES, CACHE_TTL_SECONDS, JSON.stringify(scores))
  }

  async invalidate(): Promise<void> {
    await Redis.init().del(CACHE_KEY_TOP_SCORES)
  }
}

export default new ScoreboardRedis()
