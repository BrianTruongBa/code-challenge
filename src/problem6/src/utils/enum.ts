/** HTTP status codes used for API error responses (same pattern as problem5). */
export enum ERROR {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL = 500,
}
