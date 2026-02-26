import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Monitor</h1>
      <p className="text-muted-foreground">Admin dashboard — Day 6</p>
    </div>
  )
}
