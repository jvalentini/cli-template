import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingUsername,
})

function getLocaleCurrency(): 'usd' | 'eur' {
  const locale = navigator.language
  if (locale.includes('en-US') || locale.includes('en-CA')) {
    return 'usd'
  }
  if (
    locale.includes('de') ||
    locale.includes('fr') ||
    locale.includes('es') ||
    locale.includes('it')
  ) {
    return 'eur'
  }
  return 'usd'
}

export default function OnboardingUsername() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const { mutateAsync: completeOnboarding } = useMutation({
    mutationFn: useConvexMutation(api.app.completeOnboarding),
  })
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.username) {
      navigate({ to: '/dashboard' })
    }
  }, [user?.username, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }
    if (username.length > 20) {
      setError('Username must be at most 20 characters')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await completeOnboarding({
        username,
        currency: getLocaleCurrency(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-96 flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2">
        <span className="mb-2 select-none text-6xl">👋</span>
        <h3 className="text-center text-2xl font-medium">Welcome!</h3>
        <p className="text-center text-base font-normal text-gray-600">
          Let's get started by choosing a username.
        </p>
      </div>
      <form className="flex w-full flex-col items-start gap-4" onSubmit={handleSubmit}>
        <div className="flex w-full flex-col gap-1.5">
          <label htmlFor="username" className="sr-only">
            Username
          </label>
          <Input
            id="username"
            placeholder="Username"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={error ? 'border-red-500' : ''}
          />
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>

        <Button type="submit" size="sm" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Continue'}
        </Button>
      </form>

      <p className="px-6 text-center text-sm font-normal leading-normal text-gray-500">
        You can update your username at any time from your account settings.
      </p>
    </div>
  )
}
