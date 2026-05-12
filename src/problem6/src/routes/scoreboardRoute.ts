import { Router } from 'express'
import scoreboardController from '@/controllers/scoreboardController'
import userMiddleware from '@/middlewares/userMiddleware'
import validateMiddleware from '@/middlewares/validateMiddleware'
import rateLimitMiddleware from '@/middlewares/rateLimitMiddleware'
import { updateScoreSchema } from '@/dto/updateScoreDto'

const router = Router()

router.get('/scoreboard', scoreboardController.getTopScores)
router.post('/scoreboard/update', [
  rateLimitMiddleware.byIpForUpdate,
  userMiddleware.loggedIn,
  rateLimitMiddleware.bySubForUpdate,
  validateMiddleware.body(updateScoreSchema),
  scoreboardController.updateScore,
])

export default router
