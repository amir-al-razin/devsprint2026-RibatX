import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/_layout')({
  beforeLoad: () => {
    // TODO Day 6: Validate admin role claim in JWT
    // const token = sessionStorage.getItem('access_token')
    // if (!token || !isAdmin(token)) throw redirect({ to: '/login' })
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3">
        <span className="font-semibold text-sm">RibatX — Admin</span>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
