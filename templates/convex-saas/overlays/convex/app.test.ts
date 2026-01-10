import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

describe('app', () => {
  describe('getCurrentUser', () => {
    it('returns null when not authenticated', async () => {
      const t = convexTest(schema)
      const user = await t.query(api.app.getCurrentUser, {})
      expect(user).toBeNull()
    })

    it('returns user data when authenticated with existing user', async () => {
      const t = convexTest(schema)

      let userId: Id<'users'> | undefined
      await t.run(async (ctx) => {
        userId = await ctx.db.insert('users', {
          email: 'test@example.com',
          username: 'testuser',
        })
      })

      const asUser = t.withIdentity({
        subject: userId!,
      })

      const user = await asUser.query(api.app.getCurrentUser, {})
      expect(user).toBeDefined()
      expect(user?.email).toBe('test@example.com')
    })
  })

  describe('getUserByUsername', () => {
    it('returns null for non-existent username', async () => {
      const t = convexTest(schema)
      const user = await t.query(api.app.getUserByUsername, { username: 'nonexistent' })
      expect(user).toBeNull()
    })

    it('returns user when found', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('users', {
          username: 'testuser',
          email: 'test@example.com',
        })
      })

      const user = await t.query(api.app.getUserByUsername, { username: 'testuser' })
      expect(user).toBeDefined()
      expect(user?.username).toBe('testuser')
    })
  })

  describe('updateUsername', () => {
    it('requires authentication', async () => {
      const t = convexTest(schema)

      await expect(t.mutation(api.app.updateUsername, { username: 'newname' })).rejects.toThrow()
    })

    it('updates username when authenticated', async () => {
      const t = convexTest(schema)

      let userId: Id<'users'> | undefined
      await t.run(async (ctx) => {
        userId = await ctx.db.insert('users', {
          email: 'test@example.com',
        })
      })

      const asUser = t.withIdentity({ subject: userId! })

      await asUser.mutation(api.app.updateUsername, { username: 'newusername' })

      const user = await asUser.query(api.app.getCurrentUser, {})
      expect(user?.username).toBe('newusername')
    })

    it('rejects duplicate usernames', async () => {
      const t = convexTest(schema)

      let userId: Id<'users'> | undefined
      await t.run(async (ctx) => {
        await ctx.db.insert('users', {
          username: 'existinguser',
          email: 'existing@example.com',
        })
        userId = await ctx.db.insert('users', {
          email: 'new@example.com',
        })
      })

      const asNewUser = t.withIdentity({ subject: userId! })

      await expect(
        asNewUser.mutation(api.app.updateUsername, { username: 'existinguser' }),
      ).rejects.toThrow('Username already exists')
    })
  })

  describe('getPlans', () => {
    it('returns all plans', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('plans', {
          key: 'free',
          stripeId: 'prod_free',
          name: 'Free',
          description: 'Free tier',
          prices: {
            month: {
              usd: { stripeId: 'price_free_monthly_usd', amount: 0 },
              eur: { stripeId: 'price_free_monthly_eur', amount: 0 },
            },
            year: {
              usd: { stripeId: 'price_free_yearly_usd', amount: 0 },
              eur: { stripeId: 'price_free_yearly_eur', amount: 0 },
            },
          },
        })
        await ctx.db.insert('plans', {
          key: 'pro',
          stripeId: 'prod_pro',
          name: 'Pro',
          description: 'Pro tier',
          prices: {
            month: {
              usd: { stripeId: 'price_pro_monthly_usd', amount: 999 },
              eur: { stripeId: 'price_pro_monthly_eur', amount: 899 },
            },
            year: {
              usd: { stripeId: 'price_pro_yearly_usd', amount: 9990 },
              eur: { stripeId: 'price_pro_yearly_eur', amount: 8990 },
            },
          },
        })
      })

      const plans = await t.query(api.app.getPlans, {})
      expect(plans).toHaveLength(2)
    })
  })

  describe('getPlanByKey', () => {
    it('returns plan by key', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('plans', {
          key: 'pro',
          stripeId: 'prod_pro',
          name: 'Pro',
          description: 'Pro tier',
          prices: {
            month: {
              usd: { stripeId: 'price_pro_monthly_usd', amount: 999 },
              eur: { stripeId: 'price_pro_monthly_eur', amount: 899 },
            },
            year: {
              usd: { stripeId: 'price_pro_yearly_usd', amount: 9990 },
              eur: { stripeId: 'price_pro_yearly_eur', amount: 8990 },
            },
          },
        })
      })

      const plan = await t.query(api.app.getPlanByKey, { key: 'pro' })
      expect(plan).toBeDefined()
      expect(plan?.name).toBe('Pro')
    })

    it('returns null for non-existent key', async () => {
      const t = convexTest(schema)
      const plan = await t.query(api.app.getPlanByKey, { key: 'enterprise' })
      expect(plan).toBeNull()
    })
  })
})
