import { Request, Response, NextFunction } from 'express'
import { MainError } from '@/errors/mainError'
import { failResponse, printErr } from '@/utils/helpers'
import { ERROR } from '@/utils/enum'

function isMalformedJsonBody(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false
  }
  const e = err as { type?: string; status?: number; statusCode?: number }
  if (e.type === 'entity.parse.failed') {
    return true
  }
  const code = e.status ?? e.statusCode
  return err instanceof SyntaxError && code === 400
}

class ErrorMiddleware {
  handle = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof MainError) {
      res.status(err.status).json(failResponse(err.message))
      return
    }

    if (isMalformedJsonBody(err)) {
      res.status(ERROR.BAD_REQUEST).json(failResponse('Invalid JSON request body'))
      return
    }

    printErr(`${req.method} ${req.url}`, err)
    res.status(ERROR.INTERNAL).json(failResponse('Internal server error'))
  }
}

export default new ErrorMiddleware()
