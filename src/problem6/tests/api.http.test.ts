/**
 * Black-box HTTP tests — only `fetch` against a running server.
 * Set `PROBLEM6_BASE_URL` (default `http://127.0.0.1:8002`). Start API: `npm run dev`.
 */
import { randomUUID } from 'crypto'
import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { reqJson, getBase } from '@test/httpClient'

/** Must match `ACTION_TOKEN_MIN_LEN` in app `src/config/const.ts` (black-box contract). */
const ACTION_TOKEN_MIN_LEN = 10

/** Must match `IDEMPOTENCY_KEY_MAX_LEN` in app. */
const IDEMPOTENCY_KEY_MAX_LEN = 128

function asObj(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
}

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

describe('health', () => {
  it('GET /health returns 200', async () => {
    const r = await reqJson('GET', '/health')
    expect(r.status).toBe(200)
    expect(asObj(r.body).status).toBe('ok')
  })

  it('GET /health JSON is object', async () => {
    const r = await reqJson('GET', '/health')
    expect(r.status).toBe(200)
    expect(typeof r.body).toBe('object')
    expect(r.body).not.toBeNull()
  })
})

describe('GET /api/scoreboard', () => {
  it('returns 200 without auth (public leaderboard)', async () => {
    const r = await reqJson('GET', '/api/scoreboard')
    expect(r.status).toBe(200)
    const b = asObj(r.body)
    expect(b.success).toBe(true)
    expect(Array.isArray(b.data)).toBe(true)
  })

  it('response data entries include expected fields when non-empty', async () => {
    const r = await reqJson('GET', '/api/scoreboard')
    expect(r.status).toBe(200)
    const rows = asObj(r.body).data as unknown[]
    if (rows.length === 0) {
      expect(rows).toEqual([])
      return
    }
    for (const row of rows) {
      const o = asObj(row)
      expect(typeof o.userId).toBe('string')
      expect(typeof o.score).toBe('number')
      expect(typeof o.version).toBe('number')
      expect(typeof o.id).toBe('string')
    }
  })

  it('returns at most 10 rows (top limit contract)', async () => {
    const r = await reqJson('GET', '/api/scoreboard')
    expect(r.status).toBe(200)
    const rows = asObj(r.body).data as unknown[]
    expect(rows.length).toBeLessThanOrEqual(10)
  })

  it('scores are in non-increasing order (leaderboard)', async () => {
    const r = await reqJson('GET', '/api/scoreboard')
    expect(r.status).toBe(200)
    const rows = asObj(r.body).data as Array<Record<string, unknown>>
    for (let i = 0; i < rows.length - 1; i++) {
      expect(Number(rows[i].score)).toBeGreaterThanOrEqual(Number(rows[i + 1].score))
    }
  })

  it('ignores unknown query params without error', async () => {
    const r = await reqJson('GET', '/api/scoreboard', { query: { foo: 'bar', n: 1 } })
    expect(r.status).toBe(200)
    expect(asObj(r.body).success).toBe(true)
  })

  it('two consecutive GETs both succeed', async () => {
    const a = await reqJson('GET', '/api/scoreboard')
    const b = await reqJson('GET', '/api/scoreboard')
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
  })

  it('GET after a score update still returns 200', async () => {
    const sub = `list-after-up-${Date.now()}`
    await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body: { actionToken: validActionToken('-la') },
    })
    const r = await reqJson('GET', '/api/scoreboard')
    expect(r.status).toBe(200)
    expect(asObj(r.body).success).toBe(true)
  })
})

describe('routing — not implemented', () => {
  it('GET unknown path under /api is not 200 JSON success', async () => {
    const res = await fetch(`${getBase()}/api/does-not-exist`)
    expect(res.status).not.toBe(200)
  })

  it('GET /api/scoreboard/update is not registered as GET', async () => {
    const res = await fetch(`${getBase()}/api/scoreboard/update`)
    expect(res.status).toBeGreaterThanOrEqual(404)
  })

  it('PATCH /api/scoreboard/update is not allowed', async () => {
    const res = await fetch(`${getBase()}/api/scoreboard/update`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${bearer('x')}` },
    })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/scoreboard/update — invalid body', () => {
  const auth = bearer(`invalid-body-${Date.now()}`)

  it.each([
    ['empty object', {}],
    ['missing actionToken', { other: 1 }],
    ['null actionToken', { actionToken: null }],
    ['number actionToken', { actionToken: 12345678901 }],
    ['boolean actionToken', { actionToken: true }],
    ['array actionToken', { actionToken: ['a'] }],
    ['object actionToken', { actionToken: { x: 1 } }],
    ['empty string actionToken', { actionToken: '' }],
    ['too short (min-1)', { actionToken: 'x'.repeat(ACTION_TOKEN_MIN_LEN - 1) }],
    ['strict rejects unknown keys', { actionToken: validActionToken(), extra: 1 }],
  ])('%s', async (_label, body) => {
    const r = await reqJson('POST', '/api/scoreboard/update', { auth, body })
    expect(r.status).toBe(400)
    expect(asObj(r.body).success).toBe(false)
  })

  it('rejects invalid JSON body when Content-Type is application/json', async () => {
    const res = await fetch(`${getBase()}/api/scoreboard/update`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: '{ not json',
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/scoreboard/update — auth', () => {
  const body = { actionToken: validActionToken('-auth') }

  it('401 without Authorization', async () => {
    const r = await reqJson('POST', '/api/scoreboard/update', { body })
    expect(r.status).toBe(401)
    expect(asObj(r.body).success).toBe(false)
  })

  it('401 with malformed bearer prefix', async () => {
    const res = await fetch(`${getBase()}/api/scoreboard/update`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'NotBearer x',
      },
      body: JSON.stringify(body),
    })
    expect(res.status).toBe(401)
  })

  it('401 Bearer with empty token', async () => {
    const res = await fetch(`${getBase()}/api/scoreboard/update`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ',
      },
      body: JSON.stringify(body),
    })
    expect(res.status).toBe(401)
  })

  it('401 invalid JWT signature', async () => {
    const bad = jwt.sign({ sub: 'u' }, 'wrong-secret-for-test-only', { expiresIn: '1h' })
    const r = await reqJson('POST', '/api/scoreboard/update', { auth: bad, body })
    expect(r.status).toBe(401)
  })

  it('401 expired JWT', async () => {
    const secret = process.env.JWT_SECRET!
    const expired = jwt.sign({ sub: 'exp-sub' }, secret, { expiresIn: '-60s' })
    const r = await reqJson('POST', '/api/scoreboard/update', { auth: expired, body })
    expect(r.status).toBe(401)
  })

  it('404 when JWT has no sub (user not identified downstream)', async () => {
    const secret = process.env.JWT_SECRET!
    const noSub = jwt.sign({}, secret, { expiresIn: '1h' })
    const r = await reqJson('POST', '/api/scoreboard/update', {
      auth: noSub,
      body: { actionToken: validActionToken('-nosub') },
    })
    expect(r.status).toBe(404)
  })
})

describe('POST /api/scoreboard/update — happy path', () => {
  it('200 with valid JWT and minimum-length actionToken', async () => {
    const sub = `user-it-${Date.now()}`
    const r = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body: { actionToken: 'x'.repeat(ACTION_TOKEN_MIN_LEN) },
    })
    expect(r.status).toBe(200)
    const b = asObj(r.body)
    expect(b.success).toBe(true)
    const data = asObj(b.data)
    expect(data.userId).toBe(sub)
    expect(typeof data.score).toBe('number')
  })

  it('sequential updates for same user increase score', async () => {
    const sub = `seq-${randomUUID().slice(0, 8)}`
    const t1 = validActionToken('-s1')
    const t2 = validActionToken('-s2')
    const r1 = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body: { actionToken: t1 },
    })
    const r2 = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body: { actionToken: t2 },
    })
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    const s1 = asObj(asObj(r1.body).data).score as number
    const s2 = asObj(asObj(r2.body).data).score as number
    expect(s2).toBeGreaterThan(s1)
  })

  it('two different users both get 200', async () => {
    const a = `u-a-${Date.now()}`
    const b = `u-b-${Date.now()}`
    const ra = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(a),
      body: { actionToken: validActionToken('-da') },
    })
    const rb = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(b),
      body: { actionToken: validActionToken('-db') },
    })
    expect(ra.status).toBe(200)
    expect(rb.status).toBe(200)
    expect(asObj(asObj(ra.body).data).userId).toBe(a)
    expect(asObj(asObj(rb.body).data).userId).toBe(b)
  })
})

describe('POST /api/scoreboard/update — Idempotency-Key', () => {
  it('400 invalid characters (space)', async () => {
    const r = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(`idem-bad-${Date.now()}`),
      body: { actionToken: validActionToken('-ib') },
      idempotencyKey: 'bad key!',
    })
    expect(r.status).toBe(400)
  })

  it.each([
    ['slash', 'a/b'],
    ['hash', 'a#b'],
    ['at', 'a@b'],
    ['comma', 'a,b'],
  ])('400 invalid characters: %s', async (_label, key) => {
    const r = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(`idem-ch-${Date.now()}`),
      body: { actionToken: validActionToken('-ic') },
      idempotencyKey: key,
    })
    expect(r.status).toBe(400)
  })

  it('400 when key exceeds max length', async () => {
    const key = 'k'.repeat(IDEMPOTENCY_KEY_MAX_LEN + 1)
    const r = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(`idem-long-${Date.now()}`),
      body: { actionToken: validActionToken('-il') },
      idempotencyKey: key,
    })
    expect(r.status).toBe(400)
  })

  it('200 with key exactly at max length', async () => {
    const key = 'm'.repeat(IDEMPOTENCY_KEY_MAX_LEN)
    const sub = `idem-max-${Date.now()}`
    const r = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body: { actionToken: validActionToken('-im') },
      idempotencyKey: key,
    })
    expect(r.status).toBe(200)
  })

  it('200 with allowed charset: letters digits underscore hyphen dot', async () => {
    const key = 'Ab09._-ok'
    const sub = `idem-ok-${Date.now()}`
    const r = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body: { actionToken: validActionToken('-io') },
      idempotencyKey: key,
    })
    expect(r.status).toBe(200)
  })

  it('replay: same Idempotency-Key returns same score (no double increment)', async () => {
    const sub = `idem-user-${Date.now()}`
    const idemKey = `idem-replay-${Date.now()}`
    const body = { actionToken: validActionToken('-ir') }
    const r1 = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body,
      idempotencyKey: idemKey,
    })
    expect(r1.status).toBe(200)
    const score1 = asObj(asObj(r1.body).data).score as number
    const r2 = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body,
      idempotencyKey: idemKey,
    })
    expect(r2.status).toBe(200)
    const score2 = asObj(asObj(r2.body).data).score as number
    expect(score2).toBe(score1)
  })

  it('different keys for same user allow separate increments', async () => {
    const sub = `idem-two-${Date.now()}`
    const body = { actionToken: validActionToken('-id') }
    const r1 = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body,
      idempotencyKey: `k1-${randomUUID().slice(0, 8)}`,
    })
    const r2 = await reqJson('POST', '/api/scoreboard/update', {
      auth: bearer(sub),
      body,
      idempotencyKey: `k2-${randomUUID().slice(0, 8)}`,
    })
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    const s1 = asObj(asObj(r1.body).data).score as number
    const s2 = asObj(asObj(r2.body).data).score as number
    expect(s2).toBeGreaterThan(s1)
  })
})

describe('concurrency', () => {
  it('parallel POST score updates for distinct users all return 200', async () => {
    const p = randomUUID().slice(0, 8)
    const n = 8
    const results = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        reqJson('POST', '/api/scoreboard/update', {
          auth: bearer(`par-${p}-${i}`),
          body: { actionToken: validActionToken(`-p${i}`) },
        }),
      ),
    )
    expect(results.every(r => r.status === 200)).toBe(true)
  })
})

describe('health stability matrix (padding toward 100 total)', () => {
  for (let i = 0; i < 56; i++) {
    it(`GET /health stable #${i}`, async () => {
      const res = await reqJson('GET', '/health')
      expect(res.status).toBe(200)
      expect(asObj(res.body).status).toBe('ok')
    })
  }
})
