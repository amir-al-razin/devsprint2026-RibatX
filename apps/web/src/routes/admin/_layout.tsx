import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { getValidToken, isAdmin, clearToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/admin/_layout')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return // SSR: skip, client handles redirect
    const token = getValidToken()
    if (!token) throw redirect({ to: '/login' })
    if (!isAdmin(token)) throw redirect({ to: '/unauthorized' })
  },
  component: AdminLayout,
})

function AdminLayout() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  // Guards initial hard-load / refresh — beforeLoad only fires on client-side navigation
  useEffect(() => {
    const token = getValidToken()
    if (!token) {
      router.navigate({ to: '/login', replace: true })
    } else if (!isAdmin(token)) {
      router.navigate({ to: '/unauthorized', replace: true })
    } else {
      setChecking(false)
    }
  }, [router])

  function handleLogout() {
    clearToken()
    router.navigate({ to: '/login' })
  }

  if (checking) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">RibatX — Admin Dashboard</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Sign out
        </Button>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
