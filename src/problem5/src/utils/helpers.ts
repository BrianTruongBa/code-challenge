import { log } from '@/utils/logger'

export const printErr = (context: string, err: unknown): void => {
  log.error(context, { err: err instanceof Error ? err.message : String(err) })
}

export const successResponse = <T>(data: T) => ({ success: true, data })

export const failResponse = (message: string) => ({ success: false, message })
