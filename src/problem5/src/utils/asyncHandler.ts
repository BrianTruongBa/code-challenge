import { Request, Response, NextFunction, RequestHandler } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { ParsedQs } from 'qs'

export const asyncHandler = <
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response,
    next: NextFunction,
  ) => Promise<void>,
): RequestHandler => {
  return (req, res, next) => {
    void fn(req as Request<P, ResBody, ReqBody, ReqQuery>, res, next).catch(next)
  }
}
