import { useAuthActions } from '@convex-dev/auth/react'
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'

export const Route = createFileRoute('/_auth/dashboard/settings')({
  component: Settings,
})

function Settings() {
  const { data: user, isLoading } = useQuery(convexQuery(api.app.getCurrentUser, {}))
  const { signOut } = useAuthActions()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <main className="p-8 flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-2">Settings</h1>
        </div>
      </div>

      <div className="grid gap-8">
        <ProfileSection user={user} />
        <BillingSection user={user} />
        <DangerZone onSignOut={() => signOut()} />
      </div>
    </main>
  )
}

function ProfileSection({
  user,
}: {
  user: { username?: string; email?: string; image?: string } | null | undefined
}) {
  const [username, setUsername] = useState(user?.username || '')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const updateUsername = useMutation(api.app.updateUsername)

  const handleSaveUsername = async () => {
    if (!username.trim()) return
    setIsSaving(true)
    setMessage('')
    try {
      await updateUsername({ username: username.trim() })
      setMessage('Username updated successfully!')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update username')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Profile</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={user?.email || ''}
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <div className="flex gap-2">
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
            <Button onClick={handleSaveUsername} disabled={isSaving || !username.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
          {message && (
            <p
              className={`text-sm mt-1 ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function BillingSection({
  user,
}: {
  user: { subscription?: { planKey: string; status: string } } | null | undefined
}) {
  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Subscription</h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            Current Plan:{' '}
            <span className="text-blue-600 uppercase">{user?.subscription?.planKey || 'Free'}</span>
          </p>
          <p className="text-sm text-gray-500">Status: {user?.subscription?.status || 'Active'}</p>
        </div>
        <Link to="/dashboard/billing">
          <Button variant="outline">Manage Billing</Button>
        </Link>
      </div>
    </section>
  )
}

function DangerZone({ onSignOut }: { onSignOut: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteCurrentUser = useMutation(api.app.deleteCurrentUser)

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteCurrentUser({})
      onSignOut()
    } catch (error) {
      console.error('Failed to delete account:', error)
      setIsDeleting(false)
    }
  }

  return (
    <section className="bg-red-50 rounded-lg border border-red-200 p-6">
      <h2 className="text-xl font-semibold text-red-800 mb-4">Danger Zone</h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-red-800">Delete Account</p>
          <p className="text-sm text-red-600">
            Permanently delete your account and all associated data.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-red-500 text-red-500 hover:bg-red-100"
          onClick={handleDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Account'}
        </Button>
      </div>
    </section>
  )
}
