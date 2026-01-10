import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Button } from '../../../components/ui/button'

type Plan = {
  _id: Id<'plans'>
  key: string
  name: string
  description: string
  prices: {
    month: { usd: { amount: number }; eur: { amount: number } }
    year: { usd: { amount: number }; eur: { amount: number } }
  }
}

export const Route = createFileRoute('/_auth/dashboard/billing')({
  component: Billing,
})

function Billing() {
  const { data: user, isLoading: userLoading } = useQuery(convexQuery(api.app.getCurrentUser, {}))
  const { data: plans, isLoading: plansLoading } = useQuery(convexQuery(api.app.getPlans, {}))

  if (userLoading || plansLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const currentPlanKey = user?.subscription?.planKey || 'free'

  return (
    <main className="p-8 flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-2">Billing</h1>
        <p className="text-gray-600 mt-1">Manage your subscription and billing information.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {plans?.map((plan: Plan) => (
          <PlanCard key={plan._id} plan={plan} isCurrentPlan={plan.key === currentPlanKey} />
        ))}
      </div>

      {user?.subscription && <CustomerPortalSection customerId={user.customerId} />}
    </main>
  )
}

function PlanCard({ plan, isCurrentPlan }: { plan: Plan; isCurrentPlan: boolean }) {
  const [isLoading, setIsLoading] = useState(false)
  const [interval, setInterval] = useState<'month' | 'year'>('year')
  const createCheckout = useAction(api.stripe.createSubscriptionCheckout)

  const price = plan.prices[interval].usd.amount / 100
  const yearlyPrice = plan.prices.year.usd.amount / 100
  const monthlyEquivalent = yearlyPrice / 12

  const handleUpgrade = async () => {
    if (plan.key === 'free') return
    setIsLoading(true)
    try {
      const checkoutUrl = await createCheckout({
        planId: plan._id,
        planInterval: interval,
        currency: 'usd',
      })
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const features =
    plan.key === 'pro'
      ? [
          'Unlimited items',
          'Priority support',
          'Advanced analytics',
          'API access',
          'Team collaboration',
        ]
      : ['Up to 10 items', 'Basic support', 'Core features']

  return (
    <div
      className={`rounded-lg border-2 p-6 ${isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{plan.name}</h3>
          <p className="text-gray-600 text-sm">{plan.description}</p>
        </div>
        {isCurrentPlan && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Current</span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">${price}</span>
          <span className="text-gray-500">/{interval}</span>
        </div>
        {plan.key === 'pro' && interval === 'year' && (
          <p className="text-sm text-green-600">${monthlyEquivalent.toFixed(2)}/month (save 17%)</p>
        )}
      </div>

      {plan.key === 'pro' && !isCurrentPlan && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setInterval('month')}
            className={`flex-1 py-2 text-sm rounded ${interval === 'month' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval('year')}
            className={`flex-1 py-2 text-sm rounded ${interval === 'year' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
          >
            Yearly
          </button>
        </div>
      )}

      <ul className="space-y-2 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <Button disabled className="w-full">
          Current Plan
        </Button>
      ) : plan.key === 'free' ? (
        <Button variant="outline" disabled className="w-full">
          Downgrade via Portal
        </Button>
      ) : (
        <Button onClick={handleUpgrade} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upgrade to Pro'}
        </Button>
      )}
    </div>
  )
}

function CustomerPortalSection({ customerId }: { customerId?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const createPortal = useAction(api.stripe.createCustomerPortal)

  const handleOpenPortal = async () => {
    if (!customerId) return
    setIsLoading(true)
    try {
      const portalUrl = await createPortal({})
      if (portalUrl) {
        window.location.href = portalUrl
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-2">Manage Subscription</h2>
      <p className="text-gray-600 mb-4">
        Access the customer portal to update payment methods, view invoices, or cancel your
        subscription.
      </p>
      <Button onClick={handleOpenPortal} disabled={isLoading || !customerId} variant="outline">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open Customer Portal'}
      </Button>
    </section>
  )
}
