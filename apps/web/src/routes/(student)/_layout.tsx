import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(student)/_layout')({
  beforeLoad: () => {
    // TODO Day 6: Read JWT from cookie/sessionStorage
    // const token = sessionStorage.getItem('access_token')
    // if (!token) throw redirect({ to: '/login' })
  },
  component: StudentLayout,
})

function StudentLayout() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <Outlet />
      </main>
    </div>
  )
}
