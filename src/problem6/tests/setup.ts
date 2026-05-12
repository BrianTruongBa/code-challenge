import path from 'path'
import { config } from 'dotenv'
import { beforeAll } from 'vitest'
import { getBase, reqJson } from '@test/httpClient'

config({ path: path.join(__dirname, '..', '.env') })

/** Avoid flaky HTTP tests when hitting per-IP / per-sub limits. */
process.env.RATE_LIMIT_ENABLED = 'false'

beforeAll(async () => {
  const base = getBase()
  try {
    const r = await reqJson('GET', '/health')
    if (r.status !== 200) {
      throw new Error(
        `Problem6 API not reachable at ${base} (GET /health → ${r.status}). ` +
          `Start Postgres + Redis, apply src/sql/resources.sql, run \`npm run dev\`, then re-run tests.`,
      )
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Cannot reach API at ${base}: ${msg}. ` +
        `Start the server and ensure PORT matches PROBLEM6_BASE_URL.`
    )
  }
})
