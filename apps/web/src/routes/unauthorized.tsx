import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ShieldX } from 'lucide-react'
import { getValidToken, getStudentName, clearToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/unauthorized')({
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
  const router = useRouter()
  const token = typeof window !== 'undefined' ? getValidToken() : null
  const name = token ? getStudentName(token) : null

  function handleSignOut() {
    clearToken()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center bg-card/96">
        <CardHeader className="pb-3">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/12 text-primary">
            <ShieldX size={28} />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription className="text-base mt-2">
            This area is restricted to administrators only.
            {name && (
              <>
                {' '}
                You are signed in as{' '}
                <span className="font-medium text-foreground">{name}</span>, but
                your account does not have admin privileges.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-2">
          <p className="text-sm text-muted-foreground mb-2">
            If you believe this is a mistake, please contact your system
            administrator.
          </p>
          <Button
            className="w-full"
            onClick={() => router.navigate({ to: '/' })}
          >
            Go to Student Dashboard
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
    </div>
  )
}
