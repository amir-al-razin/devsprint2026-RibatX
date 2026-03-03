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
  isAdmin,
} from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { LayoutDashboard } from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
      <header className="px-6 py-4 flex items-center justify-between bg-secondary/40">
        <span className="font-semibold text-sm tracking-wide">
          🍽️ IUT Cafeteria
        </span>
        <div className="flex items-center gap-2">
          {isAdmin(token!) && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin" className="flex items-center gap-2">
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </Link>
            </Button>
          )}
          <div className="flex items-center gap-3 ml-1">
            {name && (
              <span className="text-sm text-muted-foreground mr-1">
                {name} <span className="text-xs opacity-50">({studentId})</span>
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
