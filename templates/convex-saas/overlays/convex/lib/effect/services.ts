import { Context, Effect, Layer } from 'effect'
import type { MutationCtx, QueryCtx } from '../../_generated/server'
import { auth } from '../../auth'
import { AuthenticationError, NotFoundError } from './errors'

export class ConvexContext extends Context.Tag('ConvexContext')<
  ConvexContext,
  { readonly ctx: QueryCtx | MutationCtx }
>() {}

export const requireAuth = Effect.gen(function* () {
  const { ctx } = yield* ConvexContext
  const userId = yield* Effect.tryPromise({
    try: () => auth.getUserId(ctx),
    catch: () => new AuthenticationError({ message: 'Failed to verify authentication' }),
  })

  if (!userId) {
    return yield* Effect.fail(new AuthenticationError({ message: 'Authentication required' }))
  }

  return userId
})

export const getDocument = <T>(
  table: string,
  id: string,
): Effect.Effect<T, NotFoundError, ConvexContext> =>
  Effect.gen(function* () {
    const { ctx } = yield* ConvexContext

    const doc = yield* Effect.tryPromise({
      try: () => (ctx.db.get as (id: unknown) => Promise<T | null>)(id),
      catch: () => new NotFoundError({ resource: table, id }),
    })

    if (!doc) {
      return yield* Effect.fail(new NotFoundError({ resource: table, id }))
    }

    return doc
  })

export const makeConvexLayer = (ctx: QueryCtx | MutationCtx): Layer.Layer<ConvexContext> =>
  Layer.succeed(ConvexContext, { ctx })

export const runWithContext = <A, E>(
  ctx: QueryCtx | MutationCtx,
  effect: Effect.Effect<A, E, ConvexContext>,
): Promise<A> => {
  const layer = makeConvexLayer(ctx)
  return Effect.runPromise(Effect.provide(effect, layer))
}
