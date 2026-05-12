import type { PoolClient } from 'pg'
import { execute } from '@/config/database'
import { IScore } from '@/models/scoreInterface'
import { TOP_SCORES_LIMIT, SCORE_INCREMENT } from '@/config/const'

/** `pg` returns BIGINT as string; normalize for JSON so clients see numbers. */
function normalizeScoreRow(row: IScore): IScore {
  return {
    ...row,
    score: Number(row.score),
    version: Number(row.version),
  }
}

class ScoreboardRepo {
  async getTopScores(): Promise<IScore[]> {
    const { rows } = await execute<IScore>(
      `SELECT id,
              user_id    AS "userId",
              score,
              version,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM   scores
       ORDER  BY score DESC
       LIMIT  $1`,
      [TOP_SCORES_LIMIT],
    )
    return rows.map(normalizeScoreRow)
  }

  async findByUserIdForUpdate(userId: string, client: PoolClient): Promise<IScore | null> {
    const { rows } = await client.query<IScore>(
      `SELECT id,
              user_id    AS "userId",
              score,
              version,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM   scores
       WHERE  user_id = $1
       FOR UPDATE`,
      [userId],
    )
    const first = rows[0]
    return first ? normalizeScoreRow(first) : null
  }

  async upsertScore(userId: string, client: PoolClient): Promise<IScore> {
    const { rows } = await client.query<IScore>(
      `INSERT INTO scores (user_id, score, version)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id)
       DO UPDATE SET
         score      = scores.score + $2,
         version    = scores.version + 1,
         updated_at = NOW()
       RETURNING id,
                 user_id    AS "userId",
                 score,
                 version,
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [userId, SCORE_INCREMENT],
    )
    const row = rows[0]
    if (!row) {
      throw new Error('upsertScore: expected RETURNING row')
    }
    return normalizeScoreRow(row)
  }
}

export default new ScoreboardRepo()
