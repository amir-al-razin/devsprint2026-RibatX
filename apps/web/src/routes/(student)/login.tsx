import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { identityApi, type ApiError } from '@/lib/api-client'
import {
  storeToken,
  getValidToken,
  clearToken,
  getStudentName,
} from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

export const Route = createFileRoute('/(student)/login')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return // SSR: skip
    // Already logged in → skip the login page
    if (getValidToken()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Client-side: detect already-authenticated state (covers SSR hydration gap)
  const existingToken = typeof window !== 'undefined' ? getValidToken() : null
  const existingName = existingToken ? getStudentName(existingToken) : null

  // Clear countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  function startCountdown(seconds = 60) {
    setRateLimitCountdown(seconds)
    countdownRef.current = setInterval(() => {
      setRateLimitCountdown((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current!)
          countdownRef.current = null
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rateLimitCountdown > 0) return
    setLoading(true)
    try {
      const res = await identityApi.login({ studentId, password })
      storeToken(res.access_token)
      toast.success(`Welcome back, ${res.name}!`)
      await router.navigate({ to: '/' })
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr.status === 429) {
        startCountdown(60)
        toast.error('Too many attempts. Try again in 60s.')
      } else if (apiErr.status === 401) {
        toast.error('Invalid student ID or password.')
      } else {
        toast.error('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSignOut() {
    clearToken()
    router.navigate({ to: '/login', replace: true })
  }

  const isRateLimited = rateLimitCountdown > 0

  // Already authenticated — show a "signed in" card instead of the form
  if (existingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🍽️ IUT Cafeteria</CardTitle>
            <CardDescription>
              You&apos;re already signed in
              {existingName ? ` as ${existingName}` : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={() => router.navigate({ to: '/' })}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🍽️ IUT Cafeteria</CardTitle>
          <CardDescription>Sign in with your student ID</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                placeholder="e.g. 2021331042"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                disabled={loading || isRateLimited}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || isRateLimited}
              />
            </div>

            {isRateLimited && (
              <p className="text-sm text-destructive text-center">
                Too many attempts — try again in{' '}
                <span className="font-semibold tabular-nums">
                  {rateLimitCountdown}s
                </span>
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || isRateLimited}
              className="w-full"
            >
              {loading
                ? 'Signing in…'
                : isRateLimited
                  ? `Wait ${rateLimitCountdown}s`
                  : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
