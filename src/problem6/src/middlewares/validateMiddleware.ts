import { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'
import { failResponse } from '@/utils/helpers'
import { ERROR } from '@/utils/enum'

class ValidateMiddleware {
  private check =
    <T>(source: 'body' | 'query', schema: ZodSchema<T>) =>
    (req: Request, res: Response, next: NextFunction): void => {
      const result = schema.safeParse(req[source])
      if (!result.success) {
        const message = result.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ')
        res.status(ERROR.BAD_REQUEST).json(failResponse(message))
        return
      }
      if (source === 'body') {
        Object.assign(req, { body: result.data })
      } else {
        Object.assign(req, { query: result.data })
      }
      next()
    }

  body = (schema: ZodSchema<unknown>) => this.check('body', schema)
  query = (schema: ZodSchema<unknown>) => this.check('query', schema)
}

export default new ValidateMiddleware()
