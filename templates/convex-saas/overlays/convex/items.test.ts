import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

describe('items', () => {
  describe('list', () => {
    it('returns empty array when no items exist', async () => {
      const t = convexTest(schema)
      const items = await t.query(api.items.list, {})
      expect(items).toEqual([])
    })

    it('returns all items when no filter is provided', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('items', {
          name: 'Test Item 1',
          completed: false,
          createdAt: Date.now(),
        })
        await ctx.db.insert('items', {
          name: 'Test Item 2',
          completed: true,
          createdAt: Date.now() + 1,
        })
      })

      const items = await t.query(api.items.list, {})
      expect(items).toHaveLength(2)
    })

    it('filters by completed status', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('items', {
          name: 'Incomplete',
          completed: false,
          createdAt: Date.now(),
        })
        await ctx.db.insert('items', {
          name: 'Complete',
          completed: true,
          createdAt: Date.now() + 1,
        })
      })

      const completed = await t.query(api.items.list, { completed: true })
      expect(completed).toHaveLength(1)
      expect(completed[0]?.name).toBe('Complete')

      const incomplete = await t.query(api.items.list, { completed: false })
      expect(incomplete).toHaveLength(1)
      expect(incomplete[0]?.name).toBe('Incomplete')
    })
  })

  describe('get', () => {
    it('returns item by id', async () => {
      const t = convexTest(schema)

      let itemId: Id<'items'> | undefined
      await t.run(async (ctx) => {
        itemId = await ctx.db.insert('items', {
          name: 'Test Item',
          description: 'A test description',
          completed: false,
          createdAt: Date.now(),
        })
      })

      const item = await t.query(api.items.get, { id: itemId! })
      expect(item).toMatchObject({
        name: 'Test Item',
        description: 'A test description',
        completed: false,
      })
    })
  })

  describe('create', () => {
    it('requires authentication', async () => {
      const t = convexTest(schema)

      await expect(t.mutation(api.items.create, { name: 'Test Item' })).rejects.toThrow(
        'Authentication required',
      )
    })

    it('creates item when authenticated', async () => {
      const t = convexTest(schema)
      const asUser = t.withIdentity({ name: 'Test User' })

      const itemId = await asUser.mutation(api.items.create, {
        name: 'New Item',
        description: 'Description',
      })

      expect(itemId).toBeDefined()

      const item = await t.run(async (ctx) => {
        return await ctx.db.get(itemId)
      })

      expect(item).toMatchObject({
        name: 'New Item',
        description: 'Description',
        completed: false,
      })
    })
  })

  describe('update', () => {
    it('requires authentication', async () => {
      const t = convexTest(schema)

      let itemId: Id<'items'> | undefined
      await t.run(async (ctx) => {
        itemId = await ctx.db.insert('items', {
          name: 'Test',
          completed: false,
          createdAt: Date.now(),
        })
      })

      await expect(t.mutation(api.items.update, { id: itemId!, name: 'Updated' })).rejects.toThrow(
        'Authentication required',
      )
    })

    it('updates item when authenticated', async () => {
      const t = convexTest(schema)
      const asUser = t.withIdentity({ name: 'Test User' })

      let itemId: Id<'items'> | undefined
      await t.run(async (ctx) => {
        itemId = await ctx.db.insert('items', {
          name: 'Original',
          completed: false,
          createdAt: Date.now(),
        })
      })

      const updated = await asUser.mutation(api.items.update, {
        id: itemId!,
        name: 'Updated Name',
        completed: true,
      })

      expect(updated).toMatchObject({
        name: 'Updated Name',
        completed: true,
      })
      expect(updated?.updatedAt).toBeDefined()
    })

    it('throws for non-existent item', async () => {
      const t = convexTest(schema)
      const asUser = t.withIdentity({ name: 'Test User' })

      let deletedId: Id<'items'> | undefined
      await t.run(async (ctx) => {
        deletedId = await ctx.db.insert('items', {
          name: 'Test',
          completed: false,
          createdAt: Date.now(),
        })
        await ctx.db.delete(deletedId)
      })

      await expect(
        asUser.mutation(api.items.update, { id: deletedId!, name: 'Test' }),
      ).rejects.toThrow('Item not found')
    })
  })

  describe('remove', () => {
    it('requires authentication', async () => {
      const t = convexTest(schema)

      let itemId: Id<'items'> | undefined
      await t.run(async (ctx) => {
        itemId = await ctx.db.insert('items', {
          name: 'Test',
          completed: false,
          createdAt: Date.now(),
        })
      })

      await expect(t.mutation(api.items.remove, { id: itemId! })).rejects.toThrow(
        'Authentication required',
      )
    })

    it('deletes item when authenticated', async () => {
      const t = convexTest(schema)
      const asUser = t.withIdentity({ name: 'Test User' })

      let itemId: Id<'items'> | undefined
      await t.run(async (ctx) => {
        itemId = await ctx.db.insert('items', {
          name: 'To Delete',
          completed: false,
          createdAt: Date.now(),
        })
      })

      const result = await asUser.mutation(api.items.remove, { id: itemId! })
      expect(result).toEqual({ success: true })

      const deleted = await t.run(async (ctx) => {
        return await ctx.db.get(itemId!)
      })
      expect(deleted).toBeNull()
    })

    it('throws for non-existent item', async () => {
      const t = convexTest(schema)
      const asUser = t.withIdentity({ name: 'Test User' })

      let deletedId: Id<'items'> | undefined
      await t.run(async (ctx) => {
        deletedId = await ctx.db.insert('items', {
          name: 'Test',
          completed: false,
          createdAt: Date.now(),
        })
        await ctx.db.delete(deletedId)
      })

      await expect(asUser.mutation(api.items.remove, { id: deletedId! })).rejects.toThrow(
        'Item not found',
      )
    })
  })
})
