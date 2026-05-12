/**
 * Black-box Socket.IO tests against a running server (same stack as HTTP tests).
 * Namespace and event names must match `WS_NAMESPACE` / `WS_EVENT_TOP_SCORES` in app `src/config/const.ts`.
 */
import { randomUUID } from 'crypto'
import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { io, type Socket } from 'socket.io-client'
import { reqJson, getBase } from '@test/httpClient'

/** Contract with server `src/config/const.ts` — no imports from `src/`. */
const WS_NAMESPACE = '/scoreboard'
const WS_EVENT_TOP_SCORES = 'top_scores'
const ACTION_TOKEN_MIN_LEN = 10

function bearer(sub: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET must be set in .env for tests')
  }
  return jwt.sign({ sub }, secret, { expiresIn: '1h' })
}

function validActionToken(suffix = ''): string {
  return `${'x'.repeat(ACTION_TOKEN_MIN_LEN)}${suffix}`.slice(0, Math.max(ACTION_TOKEN_MIN_LEN, 12))
}

function asObj(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
}

function scoreboardUrl(): string {
  const base = getBase().replace(/\/$/, '')
  return `${base}${WS_NAMESPACE}`
}

async function connectScoreboard(opts?: {
  transports?: ('websocket' | 'polling')[]
}): Promise<Socket> {
  const url = scoreboardUrl()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`WS connect timeout (${url})`))
    }, 12_000)
    const socket = io(url, {
      reconnection: false,
      timeout: 10_000,
      transports: opts?.transports ?? ['websocket', 'polling'],
    })
    socket.on('connect', () => {
      clearTimeout(timer)
      resolve(socket)
    })
    socket.on('connect_error', err => {
      clearTimeout(timer)
      socket.disconnect()
      reject(err)
    })
  })
}

async function withSocket<T>(fn: (s: Socket) => Promise<T>): Promise<T> {
  const s = await connectScoreboard()
  try {
    return await fn(s)
  } finally {
    s.removeAllListeners()
    s.disconnect()
  }
}

function asRow(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
}

describe('Socket.IO /scoreboard', () => {
  it('connects to the scoreboard namespace', async () => {
    await withSocket(async s => {
      expect(s.connected).toBe(true)
      expect(s.nsp).toBe(WS_NAMESPACE)
    })
  })

  it('connects with websocket-only transport', async () => {
    const s = await connectScoreboard({ transports: ['websocket'] })
    try {
      expect(s.connected).toBe(true)
    } finally {
      s.removeAllListeners()
      s.disconnect()
    }
  })

  it('disconnect leaves socket inactive', async () => {
    const s = await connectScoreboard()
    expect(s.connected).toBe(true)
    s.disconnect()
    expect(s.connected).toBe(false)
  })

  it(`emits ${WS_EVENT_TOP_SCORES} after POST /api/scoreboard/update`, async () => {
    await withSocket(async s => {
      const first = new Promise<unknown>(resolve => {
        s.once(WS_EVENT_TOP_SCORES, resolve)
      })
      const sub = `ws-post-${Date.now()}`
      const post = await reqJson('POST', '/api/scoreboard/update', {
        auth: bearer(sub),
        body: { actionToken: validActionToken('-ws1') },
      })
      expect(post.status).toBe(200)
      const payload = await Promise.race([
        first,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('no top_scores within 15s')), 15_000),
        ),
      ])
      expect(Array.isArray(payload)).toBe(true)
    })
  })

  it(`${WS_EVENT_TOP_SCORES} payload rows are shaped as leaderboard entries; POST returns the caller row`, async () => {
    await withSocket(async s => {
      const p = new Promise<unknown[]>(resolve => {
        s.once(WS_EVENT_TOP_SCORES, (data: unknown) => resolve(data as unknown[]))
      })
      const sub = `ws-shape-${Date.now()}`
      const post = await reqJson('POST', '/api/scoreboard/update', {
        auth: bearer(sub),
        body: { actionToken: validActionToken('-ws2') },
      })
      expect(post.status).toBe(200)
      const me = asObj(asObj(post.body).data)
      expect(me.userId).toBe(sub)
      expect(typeof me.score).toBe('number')

      const rows = await Promise.race([
        p,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 15_000)),
      ])
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.length).toBeLessThanOrEqual(10)
      for (const row of rows) {
        const o = asRow(row)
        expect(typeof o.userId).toBe('string')
        expect(typeof o.score).toBe('number')
      }
    })
  })

  it('broadcast reaches two subscribers with equivalent payloads', async () => {
    const s1 = await connectScoreboard()
    const s2 = await connectScoreboard()
    try {
      const w1 = new Promise<unknown>(resolve => {
        s1.once(WS_EVENT_TOP_SCORES, resolve)
      })
      const w2 = new Promise<unknown>(resolve => {
        s2.once(WS_EVENT_TOP_SCORES, resolve)
      })
      await reqJson('POST', '/api/scoreboard/update', {
        auth: bearer(`ws-dual-${Date.now()}`),
        body: { actionToken: validActionToken('-ws3') },
      })
      const [a, b] = await Promise.all([
        Promise.race([w1, timeout(15_000, 's1')]),
        Promise.race([w2, timeout(15_000, 's2')]),
      ])
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    } finally {
      s1.removeAllListeners()
      s2.removeAllListeners()
      s1.disconnect()
      s2.disconnect()
    }
  })

  it('two sequential score updates emit two top_scores events', async () => {
    const s = await connectScoreboard()
    try {
      let count = 0
      s.on(WS_EVENT_TOP_SCORES, () => {
        count += 1
      })
      const sub = `ws-seq-${randomUUID().slice(0, 8)}`
      const auth = bearer(sub)
      const r1 = await reqJson('POST', '/api/scoreboard/update', {
        auth,
        body: { actionToken: validActionToken('-ws4a') },
      })
      const r2 = await reqJson('POST', '/api/scoreboard/update', {
        auth,
        body: { actionToken: validActionToken('-ws4b') },
      })
      expect(r1.status).toBe(200)
      expect(r2.status).toBe(200)
      await sleep(500)
      expect(count).toBeGreaterThanOrEqual(2)
    } finally {
      s.removeAllListeners()
      s.disconnect()
    }
  })

  it('default / namespace is not the scoreboard namespace', async () => {
    const base = getBase().replace(/\/$/, '')
    const s = await new Promise<Socket>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('connect timeout')), 12_000)
      const sock = io(base, { reconnection: false, timeout: 10_000 })
      sock.on('connect', () => {
        clearTimeout(timer)
        resolve(sock)
      })
      sock.on('connect_error', e => {
        clearTimeout(timer)
        reject(e)
      })
    })
    try {
      expect(s.nsp).toBe('/')
      expect(s.nsp).not.toBe(WS_NAMESPACE)
    } finally {
      s.removeAllListeners()
      s.disconnect()
    }
  })
})

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function timeout(ms: number, label: string): Promise<never> {
  return new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout`)), ms))
}
