type LogFields = Record<string, unknown>

function line(level: string, msg: string, fields?: LogFields): void {
  const payload: LogFields = {
    ts: new Date().toISOString(),
    level,
    msg,
    service: 'problem5-crud-api',
  }
  if (fields && Object.keys(fields).length > 0) {
    Object.assign(payload, fields)
  }
  console.log(JSON.stringify(payload))
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
