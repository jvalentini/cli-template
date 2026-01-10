import { v } from 'convex/values'
import { ERRORS } from '../src/errors'
import { internal } from './_generated/api'
import { mutation, query } from './_generated/server'
import { auth } from './auth'
import { currencyValidator } from './schema'

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) return null

    const user = await ctx.db.get(userId)
    if (!user) return null

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .unique()

    if (!subscription) {
      return { ...user, avatarUrl: user.image, subscription: undefined }
    }

    const plan = await ctx.db.get(subscription.planId)

    return {
      ...user,
      avatarUrl: user.image,
      subscription: plan ? { ...subscription, planKey: plan.key } : undefined,
    }
  },
})

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('users')
      .withIndex('username', (q) => q.eq('username', args.username))
      .unique()
  },
})

export const updateUserImage = mutation({
  args: {
    imageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error(ERRORS.AUTH_SOMETHING_WENT_WRONG)

    const imageUrl = await ctx.storage.getUrl(args.imageId)
    await ctx.db.patch(userId, { imageId: args.imageId, image: imageUrl ?? undefined })
  },
})

export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error(ERRORS.AUTH_SOMETHING_WENT_WRONG)

    const existingUser = await ctx.db
      .query('users')
      .withIndex('username', (q) => q.eq('username', args.username))
      .unique()

    if (existingUser && existingUser._id !== userId) {
      throw new Error(ERRORS.ONBOARDING_USERNAME_ALREADY_EXISTS)
    }

    await ctx.db.patch(userId, { username: args.username })
  },
})

export const completeOnboarding = mutation({
  args: {
    username: v.string(),
    currency: currencyValidator,
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error(ERRORS.AUTH_SOMETHING_WENT_WRONG)

    const existingUser = await ctx.db
      .query('users')
      .withIndex('username', (q) => q.eq('username', args.username))
      .unique()

    if (existingUser && existingUser._id !== userId) {
      throw new Error(ERRORS.ONBOARDING_USERNAME_ALREADY_EXISTS)
    }

    await ctx.db.patch(userId, { username: args.username })

    await ctx.scheduler.runAfter(0, internal.stripe.PREAUTH_createStripeCustomer, {
      userId,
      currency: args.currency,
    })
  },
})

export const deleteCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) throw new Error(ERRORS.AUTH_SOMETHING_WENT_WRONG)

    const user = await ctx.db.get(userId)
    if (!user) throw new Error(ERRORS.AUTH_SOMETHING_WENT_WRONG)

    if (user.imageId) {
      await ctx.storage.delete(user.imageId)
    }

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .unique()

    if (subscription) {
      await ctx.db.delete(subscription._id)
    }

    await ctx.db.delete(userId)
  },
})

export const getPlans = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('plans').collect()
  },
})

export const getPlanByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('plans')
      .withIndex('key', (q) => q.eq('key', args.key as 'free' | 'pro'))
      .unique()
  },
})
