export interface IScore {
  id: string
  userId: string
  score: number
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface IJwtPayload {
  sub: string
  iat: number
  exp: number
}
