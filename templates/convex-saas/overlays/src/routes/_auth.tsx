import { useConvexAuth } from '@convex-dev/react-query'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!(isLoading || isAuthenticated)) {
      navigate({ to: '/login' })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return <Outlet />
}
