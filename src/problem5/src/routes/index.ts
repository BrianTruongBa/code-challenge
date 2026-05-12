import { Router } from 'express'
import resource from '@/routes/resourceRoute'

const router = Router()

router.use('/api/resources', resource)

router.get('/health', (_, res) => res.json({ status: 'ok' }))

export default router
