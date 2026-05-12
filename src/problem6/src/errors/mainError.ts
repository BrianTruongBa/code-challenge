export class MainError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = this.constructor.name
    this.status = status ?? 500
    Error.captureStackTrace(this, this.constructor)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
