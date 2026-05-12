import dotenv from 'dotenv'
import tracer from 'dd-trace'

dotenv.config()

/** v4.x reads `DD_TRACE_ENABLED` inside `init()`; default off when unset (local / CI). */
if (process.env.DD_TRACE_ENABLED === undefined || process.env.DD_TRACE_ENABLED === '') {
  process.env.DD_TRACE_ENABLED = 'false'
}

const traceEnabled = process.env.DD_TRACE_ENABLED === 'true' || process.env.DD_TRACE_ENABLED === '1'

const agentHost = process.env.DD_AGENT_HOST?.trim()
const agentPortRaw = process.env.DD_TRACE_AGENT_PORT?.trim()

tracer.init({
  logInjection: process.env.DD_LOGS_INJECTION === 'true' || process.env.DD_LOGS_INJECTION === '1',
  service: process.env.DD_SERVICE ?? 'problem6-scoreboard',
  env: process.env.DD_ENV,
  version: process.env.DD_VERSION,
  runtimeMetrics: traceEnabled,
  ...(agentHost ? { hostname: agentHost } : {}),
  ...(agentPortRaw ? { port: Number.parseInt(agentPortRaw, 10) || 8126 } : {}),
})
