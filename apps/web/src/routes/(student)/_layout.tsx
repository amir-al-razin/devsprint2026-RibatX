import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getValidToken, getStudentId, getStudentName } from '@/lib/auth'

export const Route = createFileRoute('/(student)/_layout')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return // SSR: skip, client handles redirect
    const token = getValidToken()
    if (!token) throw redirect({ to: '/login' })
  },
  component: StudentLayout,
})

function StudentLayout() {
  const token = getValidToken()
  const name = token ? getStudentName(token) : null
  const studentId = token ? getStudentId(token) : null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">🍽️ IUT Cafeteria</span>
        {name && (
          <span className="text-sm text-muted-foreground">
            {name} <span className="text-xs opacity-50">({studentId})</span>
          </span>
        )}
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
