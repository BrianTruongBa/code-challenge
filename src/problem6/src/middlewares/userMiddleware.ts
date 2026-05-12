import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '@/config/env'
import { failResponse } from '@/utils/helpers'
import { ERROR } from '@/utils/enum'
import { IJwtPayload } from '@/models/scoreInterface'

export type AuthRequest = Request & { user: IJwtPayload }

class UserMiddleware {
  loggedIn = (req: Request, res: Response, next: NextFunction): void => {
    const [type, token] = req.headers.authorization?.split(' ') ?? []

    if (type !== 'Bearer' || !token) {
      res.status(ERROR.UNAUTHORIZED).json(failResponse('Missing bearer token'))
      return
    }

    try {
      const payload = jwt.verify(token, env.jwt.secret) as IJwtPayload
      ;(req as AuthRequest).user = payload
      next()
    } catch {
      res.status(ERROR.UNAUTHORIZED).json(failResponse('Invalid or expired token'))
      return
    }
  }
}

export default new UserMiddleware()
