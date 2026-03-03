import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { LogIn, User, Lock, CheckCircle2 } from 'lucide-react'
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
  CardDescription,
  CardHeader,
  CardTitle,
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Card className="w-full bg-card/96">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/14 text-primary">
                <CheckCircle2 size={18} />
              </div>
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
                variant="secondary"
                className="w-full"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Card className="w-full bg-card/96">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/14 text-primary">
              <LogIn size={18} />
            </div>
            <CardTitle className="text-2xl">🍽️ IUT Cafeteria</CardTitle>
            <CardDescription>Sign in with your student ID</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="studentId">Student ID</Label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="studentId"
                    placeholder="e.g. 2021331042"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    disabled={loading || isRateLimited}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || isRateLimited}
                    className="pl-9"
                  />
                </div>
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
      </motion.div>
    </div>
  )
}
