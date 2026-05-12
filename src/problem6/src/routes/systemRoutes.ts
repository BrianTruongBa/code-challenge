import { Router } from 'express'
import { pool } from '@/config/database'
import { Redis } from '@/config/redis'

const router = Router()

router.get('/live', (_req, res) => {
  res.json({ status: 'ok' })
})

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    await Redis.init().ping()
    res.json({ status: 'ok', postgres: true, redis: true })
  } catch {
    res.status(503).json({ status: 'not_ready' })
  }
})

export default router
