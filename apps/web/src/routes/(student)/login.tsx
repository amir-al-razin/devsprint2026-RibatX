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
import { User, Lock, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background" />
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-2xl border bg-card/95 backdrop-blur-xl shadow-2xl p-8 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 mb-2">
              <span className="text-3xl">🍽️</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Already Signed In</h2>
              <p className="text-muted-foreground">
                You're signed in{existingName ? ` as ${existingName}` : ''}.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.navigate({ to: '/' })}
                className="w-full h-12 rounded-lg font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="w-full h-12 rounded-lg font-semibold border bg-background hover:bg-muted transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />

      {/* Floating orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Branding */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 mb-4 shadow-lg shadow-primary/20 relative">
            <span className="text-4xl">🍽️</span>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            IUT Cafeteria
          </h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
            <span>Order your meals with ease</span>
            <span className="text-lg">🌙</span>
          </p>
        </div>

        {/* Login Card */}
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500" />

          <div className="relative rounded-2xl border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="text-center pt-8 pb-6 px-6 border-b border-border/50">
              <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to start ordering
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Student ID Input */}
              <div className="space-y-2">
                <label
                  htmlFor="studentId"
                  className="text-sm font-medium flex items-center gap-2"
                >
                  <User className="h-4 w-4 text-primary" />
                  Student ID
                </label>
                <div className="relative group/input">
                  <input
                    id="studentId"
                    type="text"
                    placeholder="e.g. 2021331042"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                    disabled={loading || isRateLimited}
                    className={cn(
                      'w-full h-12 px-4 rounded-lg border bg-background/50 backdrop-blur',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                      'transition-all duration-200 text-base',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'group-hover/input:border-primary/50',
                    )}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium flex items-center gap-2"
                >
                  <Lock className="h-4 w-4 text-primary" />
                  Password
                </label>
                <div className="relative group/input">
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || isRateLimited}
                    className={cn(
                      'w-full h-12 px-4 rounded-lg border bg-background/50 backdrop-blur',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                      'transition-all duration-200 text-base',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'group-hover/input:border-primary/50',
                    )}
                  />
                </div>
              </div>

              {/* Rate Limit Warning */}
              {isRateLimited && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      Too many attempts
                    </p>
                    <p className="text-xs text-destructive/80 mt-1">
                      Please wait{' '}
                      <span className="font-bold tabular-nums">
                        {rateLimitCountdown}s
                      </span>{' '}
                      before trying again
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isRateLimited}
                className={cn(
                  'w-full h-12 rounded-lg font-semibold text-base',
                  'bg-gradient-to-r from-primary to-primary/80',
                  'text-primary-foreground shadow-lg shadow-primary/25',
                  'hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]',
                  'active:scale-[0.98] transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                  'flex items-center justify-center gap-2',
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : isRateLimited ? (
                  <span>Wait {rateLimitCountdown}s</span>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="px-6 pb-6 text-center">
              <p className="text-xs text-muted-foreground">
                Optimized for evening usage during Ramadan 🌙
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div
          className="mt-6 text-center space-y-2 animate-in fade-in duration-1000"
          style={{ animationDelay: '300ms' }}
        >
          <p className="text-xs text-muted-foreground">
            Need help? Contact cafeteria support
          </p>
        </div>
      </div>
    </div>
  )
}
