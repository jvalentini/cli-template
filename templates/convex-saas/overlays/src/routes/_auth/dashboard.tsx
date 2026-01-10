import { useAuthActions } from '@convex-dev/auth/react'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '../../../convex/_generated/api'
import templateConfig from '../../../template.config'
import { Button } from '../../components/ui/button'

export const Route = createFileRoute('/_auth/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}))
  const { signOut } = useAuthActions()

  return (
    <main className="p-8 flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-4 items-center">
          <span className="text-gray-600">
            {user?.username || user?.email || 'User'}
            {user?.subscription && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full uppercase">
                {user.subscription.planKey}
              </span>
            )}
          </span>
          <Button variant="outline" onClick={() => signOut()}>
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Welcome"
          description={`You're logged in to ${templateConfig.brandName}. Start building something amazing!`}
        />
        <DashboardCard
          title="Settings"
          description="Update your profile, manage your subscription, and more."
          href="/dashboard/settings"
        />
        <DashboardCard
          title="Billing"
          description="Manage your subscription and payment methods."
          href="/dashboard/billing"
        />
      </div>
    </main>
  )
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href?: string
}) {
  const content = (
    <div className="p-6 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )

  if (href) {
    return <Link to={href}>{content}</Link>
  }

  return content
}
