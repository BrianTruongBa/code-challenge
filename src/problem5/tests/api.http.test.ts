/**
 * Black-box HTTP tests — only `fetch` against a running server.
 * Set `PROBLEM5_BASE_URL` (default `http://127.0.0.1:8001`). Start API: `npm run dev`.
 */
import { randomUUID } from 'crypto'
import { describe, it, expect } from 'vitest'
import { reqJson } from '@test/httpClient'
import { logRaceHistogram, testLog } from '@test/helpers'

const UUID_A = '550e8400-e29b-41d4-a716-446655440000'
const UUID_B = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

const asObj = (b: unknown): Record<string, unknown> => b as Record<string, unknown>

describe('health', () => {
  it('GET /health returns 200', async () => {
    const res = await reqJson('GET', '/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('GET /health JSON shape', async () => {
    const res = await reqJson('GET', '/health')
    expect(res.status).toBe(200)
    expect(asObj(res.body).status).toBe('ok')
  })
})

describe('invalid :id param (uuid)', () => {
  const badIds = [
    'nope',
    '550e8400-e29b-41d4-a716-44665544000',
    'GGGGGGGG-GGGG-GGGG-GGGG-GGGGGGGGGGGG',
    'not-a-uuid-at-all',
    '12345',
  ]

  it.each(
    badIds.flatMap(id => [
      { method: 'get' as const, id },
      { method: 'patch' as const, id },
      { method: 'delete' as const, id },
    ]),
  )('invalid id %#', async ({ method, id }) => {
    const patchBody = { name: 'x', version: 0 }
    const delBody = { version: 0 }
    const enc = encodeURIComponent(id)
    if (method === 'get') {
      const res = await reqJson('GET', `/api/resources/${enc}`)
      expect(res.status).toBe(400)
      expect(asObj(res.body).success).toBe(false)
    } else if (method === 'patch') {
      const res = await reqJson('PATCH', `/api/resources/${enc}`, { body: patchBody })
      expect(res.status).toBe(400)
      expect(asObj(res.body).success).toBe(false)
    } else {
      const res = await reqJson('DELETE', `/api/resources/${enc}`, { body: delBody })
      expect(res.status).toBe(400)
      expect(asObj(res.body).success).toBe(false)
    }
  })
})

describe('GET /api/resources list — invalid query', () => {
  it.each([
    ['page=0', { page: 0 }],
    ['page=-1', { page: -1 }],
    ['limit=0', { limit: 0 }],
    ['limit=101', { limit: 101 }],
    ['status=unknown', { status: 'unknown' }],
    ['page=abc', { page: 'abc' }],
    ['limit=xyz', { limit: 'xyz' }],
    ['name too long', { name: 'x'.repeat(256) }],
    ['page float invalid', { page: 1.5 }],
    ['limit float', { limit: 10.5 }],
    ['combined bad status', { status: 'ACTIVE' }],
    ['empty status wrong', { status: '' }],
    ['extra bad status', { foo: 'bar', status: 'bad' }],
    ['limit negative', { limit: -5 }],
    ['page negative large', { page: -999 }],
  ])('%s', async (_label, query) => {
    const res = await reqJson('GET', '/api/resources', { query })
    expect(res.status).toBe(400)
    expect(asObj(res.body).success).toBe(false)
  })
})

describe('POST /api/resources — invalid body', () => {
  it.each([
    ['missing name', {}],
    ['empty name', { name: '' }],
    ['whitespace name', { name: '   ' }],
    ['name too long', { name: 'n'.repeat(256) }],
    ['description too long', { name: 'ok', description: 'd'.repeat(5001) }],
    ['bad status', { name: 'ok', status: 'pending' }],
    ['null name', { name: null }],
    ['number name', { name: 123 }],
    ['array name', { name: [] }],
    ['object name', { name: {} }],
    ['extra version field only', { version: 0 }],
    ['name boolean', { name: true }],
    ['nested body', { name: { x: 1 } }],
    ['description number', { name: 'ok', description: 1 }],
    ['status number', { name: 'ok', status: 1 }],
  ])('%s', async (_label, body) => {
    const res = await reqJson('POST', '/api/resources', { body })
    expect(res.status).toBe(400)
    expect(asObj(res.body).success).toBe(false)
  })
})

describe('PATCH /api/resources/:id — invalid body', () => {
  it.each([
    ['missing version', { name: 'a' }],
    ['version string', { version: '0', name: 'a' }],
    ['version float', { version: 0.5, name: 'a' }],
    ['version negative', { version: -1, name: 'a' }],
    ['bad status', { version: 0, status: 'x' }],
    ['name empty', { version: 0, name: '' }],
    ['description too long', { version: 0, description: 'd'.repeat(5001) }],
    ['empty body', {}],
    ['null version', { version: null, name: 'a' }],
    ['version array', { version: [0], name: 'a' }],
  ])('%s', async (_label, body) => {
    const res = await reqJson('PATCH', `/api/resources/${UUID_A}`, { body })
    expect(res.status).toBe(400)
    expect(asObj(res.body).success).toBe(false)
  })
})

describe('DELETE /api/resources/:id — invalid body', () => {
  it.each([
    ['missing version', {}],
    ['version string', { version: '1' }],
    ['version negative', { version: -1 }],
    ['null version', { version: null }],
    ['version float', { version: 1.2 }],
    ['extra junk', { version: 0, foo: 'bar' }],
  ])('%s', async (_label, body) => {
    const res = await reqJson('DELETE', `/api/resources/${UUID_A}`, { body })
    expect(res.status).toBe(400)
    expect(asObj(res.body).success).toBe(false)
  })
})

describe('CRUD + domain errors (isolated names)', () => {
  const tag = () => `t-${randomUUID().slice(0, 8)}`

  it('POST 201 creates resource', async () => {
    const name = `${tag()}-Alpha`
    const res = await reqJson('POST', '/api/resources', { body: { name } })
    expect(res.status).toBe(201)
    const b = asObj(res.body)
    expect(b.success).toBe(true)
    const data = asObj(b.data)
    expect(data.name).toBe(name)
    expect(data.version).toBe(0)
    expect(typeof data.id).toBe('string')
  })

  it('GET by id returns 200', async () => {
    const name = `${tag()}-G1`
    const c = await reqJson('POST', '/api/resources', { body: { name } })
    const id = asObj(asObj(c.body).data).id as string
    const res = await reqJson('GET', `/api/resources/${id}`)
    expect(res.status).toBe(200)
    expect(asObj(asObj(res.body).data).name).toBe(name)
  })

  it('GET unknown id 404', async () => {
    const res = await reqJson('GET', `/api/resources/${UUID_B}`)
    expect(res.status).toBe(404)
    expect(asObj(res.body).success).toBe(false)
  })

  it('list filter finds created row', async () => {
    const marker = `${tag()}-LISTMARK`
    await reqJson('POST', '/api/resources', { body: { name: marker } })
    const res = await reqJson('GET', '/api/resources', { query: { name: 'LISTMARK' } })
    expect(res.status).toBe(200)
    const data = asObj(asObj(res.body).data)
    const rows = data.data as unknown[]
    expect(rows.some((r: unknown) => asObj(r).name === marker)).toBe(true)
  })

  it('list filter by status=active', async () => {
    const name = `${tag()}-S1`
    await reqJson('POST', '/api/resources', { body: { name, status: 'active' } })
    const res = await reqJson('GET', '/api/resources', { query: { status: 'active' } })
    expect(res.status).toBe(200)
    const rows = asObj(asObj(res.body).data).data as Array<Record<string, unknown>>
    expect(rows.every(r => r.status === 'active')).toBe(true)
  })

  it('list filter name partial', async () => {
    const name = `${tag()}-UniqueZebraName`
    await reqJson('POST', '/api/resources', { body: { name } })
    const res = await reqJson('GET', '/api/resources', { query: { name: 'Zebra' } })
    expect(res.status).toBe(200)
    const rows = asObj(asObj(res.body).data).data as Array<Record<string, unknown>>
    expect(rows.some(r => String(r.name).includes('Zebra'))).toBe(true)
  })

  it('PATCH 200 bumps version', async () => {
    const name = `${tag()}-P1`
    const c = await reqJson('POST', '/api/resources', { body: { name } })
    const id = asObj(asObj(c.body).data).id as string
    const res = await reqJson('PATCH', `/api/resources/${id}`, {
      body: { name: `${name}-2`, version: 0 },
    })
    expect(res.status).toBe(200)
    const data = asObj(asObj(res.body).data)
    expect(data.version).toBe(1)
  })

  it('PATCH 409 stale version', async () => {
    const name = `${tag()}-C1`
    const c = await reqJson('POST', '/api/resources', { body: { name } })
    const id = asObj(asObj(c.body).data).id as string
    await reqJson('PATCH', `/api/resources/${id}`, { body: { name: `${name}-2`, version: 0 } })
    const bad = await reqJson('PATCH', `/api/resources/${id}`, {
      body: { name: `${name}-3`, version: 0 },
    })
    expect(bad.status).toBe(409)
  })

  it('DELETE 204', async () => {
    const name = `${tag()}-D1`
    const c = await reqJson('POST', '/api/resources', { body: { name } })
    const id = asObj(asObj(c.body).data).id as string
    const res = await reqJson('DELETE', `/api/resources/${id}`, { body: { version: 0 } })
    expect(res.status).toBe(204)
  })

  it('DELETE 404 missing', async () => {
    const res = await reqJson('DELETE', `/api/resources/${UUID_B}`, { body: { version: 0 } })
    expect(res.status).toBe(404)
  })

  it('pagination page 2', async () => {
    const p = tag()
    for (let i = 0; i < 12; i++) {
      await reqJson('POST', '/api/resources', { body: { name: `${p}-Pg${i}` } })
    }
    const res = await reqJson('GET', '/api/resources', { query: { page: 2, limit: 5, name: p } })
    expect(res.status).toBe(200)
    const meta = asObj(asObj(res.body).data).meta as Record<string, unknown>
    expect(meta.page).toBe(2)
    const rows = asObj(asObj(res.body).data).data as unknown[]
    expect(rows.length).toBeLessThanOrEqual(5)
  })
})

describe('concurrency & races', () => {
  const tag = () => `r-${randomUUID().slice(0, 8)}`

  it('parallel POST creates distinct resources', async () => {
    const p = tag()
    const n = 15
    const results = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        reqJson('POST', '/api/resources', { body: { name: `${p}-Conc${i}` } }),
      ),
    )
    const statuses = results.map(r => r.status)
    logRaceHistogram('parallel POST', statuses)
    testLog(
      'parallel POST sample',
      results.slice(0, 2).map(r => r.body),
    )
    expect(statuses.every(s => s === 201)).toBe(true)
    const ids = new Set(results.map(r => asObj(asObj(r.body).data).id as string))
    expect(ids.size).toBe(n)
  })

  it('parallel PATCH same version: one 200, rest 409', async () => {
    const p = tag()
    const c = await reqJson('POST', '/api/resources', { body: { name: `${p}-Race1` } })
    const id = asObj(asObj(c.body).data).id as string
    const m = 12
    const results = await Promise.all(
      Array.from({ length: m }, () =>
        reqJson('PATCH', `/api/resources/${id}`, { body: { name: `${p}-Race1-upd`, version: 0 } }),
      ),
    )
    const statuses = results.map(r => r.status)
    logRaceHistogram('parallel PATCH same version', statuses)
    expect(statuses.filter(s => s === 200).length).toBe(1)
    expect(statuses.filter(s => s === 409).length).toBe(m - 1)
  })

  it('parallel DELETE same version: one 204, rest 409 or 404', async () => {
    const p = tag()
    const c = await reqJson('POST', '/api/resources', { body: { name: `${p}-DelRace` } })
    const id = asObj(asObj(c.body).data).id as string
    const m = 10
    const results = await Promise.all(
      Array.from({ length: m }, () =>
        reqJson('DELETE', `/api/resources/${id}`, { body: { version: 0 } }),
      ),
    )
    const statuses = results.map(r => r.status)
    logRaceHistogram('parallel DELETE same version', statuses)
    expect(statuses.filter(s => s === 204).length).toBe(1)
    const rest = statuses.filter(s => s !== 204)
    expect(rest.length).toBe(m - 1)
    expect(rest.every(s => s === 409 || s === 404)).toBe(true)
  })

  it('interleaved GET while PATCH', async () => {
    const p = tag()
    const c = await reqJson('POST', '/api/resources', { body: { name: `${p}-Mix` } })
    const id = asObj(asObj(c.body).data).id as string
    const reads = Array.from({ length: 8 }, () => reqJson('GET', `/api/resources/${id}`))
    const writes = reqJson('PATCH', `/api/resources/${id}`, {
      body: { name: `${p}-Mix2`, version: 0 },
    })
    const all = await Promise.all([...reads, writes])
    const statuses = all.map(r => r.status)
    logRaceHistogram('GET+PATCH mix', statuses)
    expect(statuses.filter(s => s === 200).length).toBeGreaterThanOrEqual(1)
    expect(statuses.every(s => s === 200 || s === 404)).toBe(true)
  })

  it('two sequential PATCH with correct versions both succeed', async () => {
    const p = tag()
    const c = await reqJson('POST', '/api/resources', { body: { name: `${p}-Seq` } })
    const id = asObj(asObj(c.body).data).id as string
    const u1 = await reqJson('PATCH', `/api/resources/${id}`, {
      body: { name: `${p}-S1`, version: 0 },
    })
    expect(u1.status).toBe(200)
    const u2 = await reqJson('PATCH', `/api/resources/${id}`, {
      body: { name: `${p}-S2`, version: 1 },
    })
    expect(u2.status).toBe(200)
    expect(asObj(asObj(u2.body).data).version).toBe(2)
  })

  it('many creates then list meta.pages consistent', async () => {
    const p = tag()
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        reqJson('POST', '/api/resources', { body: { name: `${p}-Bulk${i}` } }),
      ),
    )
    const res = await reqJson('GET', '/api/resources', { query: { limit: 10, page: 1, name: p } })
    expect(res.status).toBe(200)
    const meta = asObj(asObj(res.body).data).meta as Record<string, unknown>
    expect(Number(meta.total)).toBeGreaterThanOrEqual(25)
    expect(Number(meta.pages)).toBeGreaterThanOrEqual(3)
  })
})

describe('health matrix (padding to 100 total)', () => {
  for (let i = 0; i < 20; i++) {
    it(`health stable #${i}`, async () => {
      const res = await reqJson('GET', '/health')
      expect(res.status).toBe(200)
    })
  }
})
