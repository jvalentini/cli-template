interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60000,
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const key = identifier

  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true }
  }

  if (existing.count >= config.maxRequests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  existing.count++
  return { allowed: true }
}

export function getRateLimitKey(userId: string | null, action: string): string {
  return userId ? `${action}:${userId}` : `${action}:anonymous`
}
