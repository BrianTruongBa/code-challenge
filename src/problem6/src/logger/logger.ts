type LogFields = Record<string, unknown>

const SERVICE = 'problem6-scoreboard'

/** JSON lines for production (Datadog log collection on stdout). Readable console locally. */
function useJsonLines(): boolean {
  const fmt = process.env.LOG_FORMAT?.trim().toLowerCase()
  if (fmt === 'json') {
    return true
  }
  if (fmt === 'console') {
    return false
  }
  return process.env.NODE_ENV === 'production'
}

function lineJson(level: string, msg: string, fields?: LogFields): void {
  const payload: LogFields = {
    ts: new Date().toISOString(),
    level,
    msg,
    service: SERVICE,
  }
  if (fields && Object.keys(fields).length > 0) {
    Object.assign(payload, fields)
  }
  console.log(JSON.stringify(payload))
}

function lineConsole(level: string, msg: string, fields?: LogFields): void {
  const ts = new Date().toISOString()
  const suffix = fields && Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : ''
  const line = `[${ts}] ${level.toUpperCase()} [${SERVICE}] ${msg}${suffix}`
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

function line(level: string, msg: string, fields?: LogFields): void {
  if (useJsonLines()) {
    lineJson(level, msg, fields)
  } else {
    lineConsole(level, msg, fields)
  }
}

export const log = {
  info(msg: string, fields?: LogFields): void {
    line('info', msg, fields)
  },
  warn(msg: string, fields?: LogFields): void {
    line('warn', msg, fields)
  },
  error(msg: string, fields?: LogFields): void {
    line('error', msg, fields)
  },
}
