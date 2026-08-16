export const RETRY = {
  maxAttempts: 3,
  baseDelayMs: 300,
  multiplier: 2,
};

export const TERMINAL_STATUSES = new Set([400, 401, 403, 404, 409, 422]);
export const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504]);
