import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CheckCircle, Loader2 } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Button } from '../../../components/ui/button'

export const Route = createFileRoute('/_auth/dashboard/checkout')({
  component: CheckoutSuccess,
})

function CheckoutSuccess() {
  const { data: user, isLoading } = useQuery(convexQuery(api.app.getCurrentUser, {}))

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <main className="p-8 flex flex-col items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Thank You!</h1>
        <p className="text-gray-600 mb-6">
          Your subscription to{' '}
          <span className="font-semibold uppercase">{user?.subscription?.planKey || 'Pro'}</span>{' '}
          has been activated successfully.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          You now have access to all premium features. We're excited to have you on board!
        </p>
        <Link to="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </main>
  )
}
