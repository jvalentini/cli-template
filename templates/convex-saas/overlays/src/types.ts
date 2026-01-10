import type { Doc } from '../convex/_generated/dataModel'
import type { PlanKey } from '../convex/schema'

export type User = Doc<'users'> & {
  avatarUrl?: string
  subscription?: Doc<'subscriptions'> & {
    planKey: PlanKey
  }
}
