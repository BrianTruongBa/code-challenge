/** Base URL for black-box HTTP tests — no imports from `src/`. */
export function getBase(): string {
  return (process.env.PROBLEM5_BASE_URL ?? 'http://127.0.0.1:8001').replace(/\/$/, '')
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const base = getBase()
  const p = path.startsWith('/') ? path : `/${path}`
  const url = new URL(base + p)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) {
        url.searchParams.set(k, String(v))
      }
    }
  }
  return url.toString()
}

export async function reqJson(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  opts: { query?: Record<string, unknown>; body?: unknown } = {},
): Promise<{ status: number; body: unknown }> {
  const url = buildUrl(path, opts.query)
  const headers: Record<string, string> = { Accept: 'application/json' }
  const init: RequestInit = { method, headers }
  if (opts.body !== undefined && method !== 'GET') {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(opts.body)
  }
  const res = await fetch(url, init)
  const text = await res.text()
  if (!text) {
    return { status: res.status, body: null }
  }
  try {
    return { status: res.status, body: JSON.parse(text) as unknown }
  } catch {
    return { status: res.status, body: text }
  }
}
