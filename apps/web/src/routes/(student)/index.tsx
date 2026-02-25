import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(student)/')({
  component: OrderDashboard,
})

function OrderDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Order dashboard — Day 6</p>
    </div>
  )
}
