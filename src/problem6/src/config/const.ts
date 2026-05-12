export const TOP_SCORES_LIMIT = 10
export const SCORE_INCREMENT = 1
export const ACTION_TOKEN_MIN_LEN = 10
export const WS_NAMESPACE = '/scoreboard'
export const WS_EVENT_TOP_SCORES = 'top_scores'
export const CACHE_KEY_TOP_SCORES = 'scoreboard:top'
export const CACHE_TTL_SECONDS = 5

/** Stored JSON of `IScore` after successful POST /scoreboard/update */
export const IDEMPOTENCY_TTL_SECONDS = 86_400
export const IDEMPOTENCY_LOCK_SECONDS = 30
export const IDEMPOTENCY_KEY_MAX_LEN = 128
export const IDEMPOTENCY_WAIT_MS = 50
export const IDEMPOTENCY_WAIT_ROUNDS = 40
