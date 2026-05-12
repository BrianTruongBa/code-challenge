import { Request, Response, NextFunction } from 'express'
import { MainError } from '@/errors/mainError'
import { failResponse, printErr } from '@/utils/helpers'
import { ERROR } from '@/utils/enum'

class ErrorMiddleware {
  handle = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof MainError) {
      res.status(err.status).json(failResponse(err.message))
      return
    }

    printErr(`${req.method} ${req.url}`, err)
    res.status(ERROR.INTERNAL).json(failResponse('Internal server error'))
  }
}

export default new ErrorMiddleware()
