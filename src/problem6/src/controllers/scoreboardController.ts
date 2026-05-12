import { Request } from 'express'
import scoreboardService from '@/service/scoreboardService'
import { asyncHandler } from '@/utils/asyncHandler'
import type { AuthRequest } from '@/middlewares/userMiddleware'
import type { UpdateScoreDto } from '@/dto/updateScoreDto'
import { successResponse } from '@/utils/helpers'

class ScoreboardController {
  getTopScores = asyncHandler(async (_req, res) => {
    res.json(successResponse(await scoreboardService.getTopScores()))
  })

  updateScore = asyncHandler(async (req, res) => {
    const { sub: userId } = (req as AuthRequest).user
    const body = (req as Request<Record<string, never>, unknown, UpdateScoreDto>).body
    const idempotencyKey = req.get('Idempotency-Key') ?? undefined
    const score = await scoreboardService.incrementScore(userId, body.actionToken, {
      idempotencyKey,
    })
    res.json(successResponse(score))
  })
}

export default new ScoreboardController()
