import { useAuthActions } from '@convex-dev/auth/react'
import { convexQuery, useConvexAuth } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'
import templateConfig from '../../template.config'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const [step, setStep] = useState<'signIn' | { email: string }>('signIn')
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}))
  const navigate = useNavigate()

  useEffect(() => {
    if ((isLoading && !isAuthenticated) || !user) {
      return
    }
    if (!isLoading && isAuthenticated && !user.username) {
      navigate({ to: '/onboarding' })
      return
    }
    if (!isLoading && isAuthenticated) {
      navigate({ to: '/dashboard' })
      return
    }
  }, [user, isLoading, isAuthenticated, navigate])

  if (step === 'signIn') {
    return <LoginForm onSubmit={(email) => setStep({ email })} />
  }
  return <VerifyForm email={step.email} />
}

function LoginForm({ onSubmit }: { onSubmit: (email: string) => void }) {
  const { signIn } = useAuthActions()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email?.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await signIn('resend-otp', { email })
      onSubmit(email)
    } catch {
      setError('Failed to send verification code')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-96 flex-col items-center justify-center gap-6 p-8">
      <div className="mb-2 flex flex-col gap-2">
        <h3 className="text-center text-2xl font-medium">Continue to {templateConfig.brandName}</h3>
        <p className="text-center text-base font-normal text-gray-600">
          Welcome back! Please log in to continue.
        </p>
      </div>
      <form className="flex w-full flex-col items-start gap-4" onSubmit={handleSubmit}>
        <div className="flex w-full flex-col gap-1.5">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={error ? 'border-red-500' : ''}
          />
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Continue with Email'}
        </Button>
      </form>

      <div className="relative flex w-full items-center justify-center">
        <span className="absolute w-full border-b border-gray-300" />
        <span className="z-10 bg-white px-2 text-xs font-medium uppercase text-gray-500">
          Or continue with
        </span>
      </div>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => signIn('github', { redirectTo: '/login' })}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          role="img"
          aria-label="GitHub logo"
        >
          <title>GitHub</title>
          <path
            fill="currentColor"
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg>
        Github
      </Button>

      <p className="px-12 text-center text-sm font-normal leading-normal text-gray-500">
        By clicking continue, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}

function VerifyForm({ email }: { email: string }) {
  const { signIn } = useAuthActions()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 8) {
      setError('Code must be at least 8 characters')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await signIn('resend-otp', { email, code })
    } catch {
      setError('Invalid verification code')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-96 flex-col items-center justify-center gap-6 p-8">
      <div className="mb-2 flex flex-col gap-2">
        <p className="text-center text-2xl">Check your inbox!</p>
        <p className="text-center text-base font-normal text-gray-600">
          We've just emailed you a temporary password.
          <br />
          Please enter it below.
        </p>
      </div>
      <form className="flex w-full flex-col items-start gap-4" onSubmit={handleSubmit}>
        <div className="flex w-full flex-col gap-1.5">
          <label htmlFor="code" className="sr-only">
            Code
          </label>
          <Input
            id="code"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={error ? 'border-red-500' : ''}
          />
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Continue'}
        </Button>
      </form>

      <div className="flex w-full flex-col">
        <p className="text-center text-sm font-normal text-gray-500">Did not receive the code?</p>
        <Button onClick={() => signIn('resend-otp', { email })} variant="ghost" className="w-full">
          Request New Code
        </Button>
      </div>
    </div>
  )
}
