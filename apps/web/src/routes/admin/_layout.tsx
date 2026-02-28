import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getValidToken, clearToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { useRouter } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/_layout')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return // SSR: skip, client handles redirect
    const token = getValidToken()
    if (!token) throw redirect({ to: '/login' })
  },
  component: AdminLayout,
})

function AdminLayout() {
  const router = useRouter()

  function handleLogout() {
    clearToken()
    router.navigate({ to: '/login' })
  }

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
