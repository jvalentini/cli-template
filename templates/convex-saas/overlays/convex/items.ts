import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { auth } from './auth'

export const list = query({
  args: {
    completed: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id('items'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      completed: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.completed !== undefined) {
      return await ctx.db
        .query('items')
        .withIndex('by_completed', (q) => q.eq('completed', args.completed))
        .order('desc')
        .collect()
    }
    return await ctx.db.query('items').withIndex('by_created').order('desc').collect()
  },
})

export const get = query({
  args: { id: v.id('items') },
  returns: v.union(
    v.object({
      _id: v.id('items'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      completed: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id('items'),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) {
      throw new Error('Authentication required')
    }

    return await ctx.db.insert('items', {
      name: args.name,
      description: args.description,
      completed: false,
      createdAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('items'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({
      _id: v.id('items'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      completed: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) {
      throw new Error('Authentication required')
    }

    const { id, ...updates } = args
    const existing = await ctx.db.get(id)
    if (!existing) {
      throw new Error('Item not found')
    }

    const filtered = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined))

    await ctx.db.patch(id, {
      ...filtered,
      updatedAt: Date.now(),
    })

    return await ctx.db.get(id)
  },
})

export const remove = mutation({
  args: { id: v.id('items') },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx)
    if (!userId) {
      throw new Error('Authentication required')
    }

    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Item not found')
    }
    await ctx.db.delete(args.id)
    return { success: true }
  },
})
