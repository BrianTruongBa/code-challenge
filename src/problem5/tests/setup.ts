import path from 'path'
import { config } from 'dotenv'
import { beforeAll } from 'vitest'
import { getBase, reqJson } from '@test/httpClient'

config({ path: path.join(__dirname, '..', '.env') })

beforeAll(async () => {
  const base = getBase()
  try {
    const r = await reqJson('GET', '/health')
    if (r.status !== 200) {
      throw new Error(
        `Problem5 API not reachable at ${base} (GET /health → ${r.status}). ` +
          `Start MySQL + run \`npm run dev\` in this folder, then re-run tests.`,
      )
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Cannot reach API at ${base}: ${msg}. ` +
        `Start the server (\`npm run dev\`) and ensure PORT matches PROBLEM5_BASE_URL.`,
      { cause: e },
    )
  }
})
