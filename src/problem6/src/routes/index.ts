import { Router } from 'express'
import systemRoutes from '@/routes/systemRoutes'
import scoreboard from '@/routes/scoreboardRoute'

const router = Router()

router.use(systemRoutes)
router.use('/api', scoreboard)

export default router
