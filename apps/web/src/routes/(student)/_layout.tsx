import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import {
  getValidToken,
  getStudentId,
  getStudentName,
  clearToken,
} from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/(student)/_layout')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return // SSR: skip, client handles redirect
    const token = getValidToken()
    if (!token) throw redirect({ to: '/login' })
  },
  component: StudentLayout,
})

function StudentLayout() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  // Guards initial hard-load / refresh — beforeLoad only fires on client-side navigation
  useEffect(() => {
    const token = getValidToken()
    if (!token) {
      router.navigate({ to: '/login', replace: true })
    } else {
      setChecking(false)
    }
  }, [router])

  function handleLogout() {
    clearToken()
    router.navigate({ to: '/login' })
  }

  const token = getValidToken()
  const name = token ? getStudentName(token) : null
  const studentId = token ? getStudentId(token) : null

  if (checking) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">🍽️ IUT Cafeteria</span>
        <div className="flex items-center gap-3">
          {name && (
            <span className="text-sm text-muted-foreground">
              {name} <span className="text-xs opacity-50">({studentId})</span>
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
