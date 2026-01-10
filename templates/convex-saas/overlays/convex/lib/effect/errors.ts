import { Data } from 'effect'

export class AuthenticationError extends Data.TaggedError('AuthenticationError')<{
  readonly message: string
}> {}

export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly resource: string
  readonly id?: string
}> {}

export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly message: string
  readonly field?: string
}> {}

export class StripeError extends Data.TaggedError('StripeError')<{
  readonly message: string
  readonly code?: string
}> {}

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  readonly message: string
  readonly operation: 'read' | 'write' | 'delete'
}> {}

export class RateLimitError extends Data.TaggedError('RateLimitError')<{
  readonly retryAfter: number
}> {}

export type AppError =
  | AuthenticationError
  | NotFoundError
  | ValidationError
  | StripeError
  | DatabaseError
  | RateLimitError

export function toHttpStatus(error: AppError): number {
  switch (error._tag) {
    case 'AuthenticationError':
      return 401
    case 'NotFoundError':
      return 404
    case 'ValidationError':
      return 400
    case 'StripeError':
      return 502
    case 'DatabaseError':
      return 500
    case 'RateLimitError':
      return 429
  }
}

export function toErrorResponse(error: AppError): { error: string; code: string } {
  switch (error._tag) {
    case 'AuthenticationError':
      return { error: error.message, code: 'AUTH_ERROR' }
    case 'NotFoundError':
      return { error: `${error.resource} not found`, code: 'NOT_FOUND' }
    case 'ValidationError':
      return { error: error.message, code: 'VALIDATION_ERROR' }
    case 'StripeError':
      return { error: error.message, code: error.code ?? 'STRIPE_ERROR' }
    case 'DatabaseError':
      return { error: error.message, code: 'DATABASE_ERROR' }
    case 'RateLimitError':
      return { error: `Rate limited. Retry after ${error.retryAfter}s`, code: 'RATE_LIMITED' }
  }
}
