import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(student)/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Login page — Day 6</p>
    </div>
  )
}
