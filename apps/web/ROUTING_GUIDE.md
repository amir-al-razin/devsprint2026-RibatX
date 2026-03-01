# Routing Guide - TanStack Router Structure

## 🗺️ Route Tree

```
/
├── __root.tsx                    # Root layout with theme provider
│
├── (student)/                    # Student routes group
│   ├── login.tsx                 # Login page (public)
│   └── _layout.tsx               # Student layout wrapper
│       └── index.tsx             # Menu & ordering dashboard (protected)
│
├── admin/                        # Admin routes group
│   └── _layout.tsx               # Admin layout wrapper
│       └── index.tsx             # Monitoring dashboard (protected)
│
└── unauthorized.tsx              # Access denied page
```

## 📄 Route Details

### Root Layout (`__root.tsx`)

**Path**: `/`
**Purpose**: Global layout wrapper
**Features**:

- Theme provider setup
- Global error boundary
- Outlet for child routes
- Sonner toast container

---

### Student Login (`(student)/login.tsx`)

**Path**: `/login`
**Access**: Public
**Features**:

- Student ID and password form
- Rate limiting (60s cooldown)
- Auto-redirect if already logged in
- Smooth animations

**Before Load**:

```tsx
beforeLoad: () => {
  if (getValidToken()) {
    throw redirect({ to: '/' })
  }
}
```

---

### Student Dashboard (`(student)/_layout/index.tsx`)

**Path**: `/`
**Access**: Protected (requires valid JWT)
**Features**:

- Menu browsing
- Order placement
- Real-time order tracking
- WebSocket connection

**Data Flow**:

1. Fetch stock items on mount
2. Auto-refresh every 5 seconds
3. Subscribe to order status via WebSocket
4. Show confetti on successful order

**State Management**:

- `items`: Stock items array
- `currentOrderId`: Active order ID
- `orderingItemId`: Item being ordered
- `showOrderModal`: Order status visibility
- `showConfetti`: Confetti trigger

---

### Admin Dashboard (`admin/_layout/index.tsx`)

**Path**: `/admin`
**Access**: Protected (requires admin role)
**Features**:

- Service health monitoring
- Real-time metrics
- Chaos engineering controls
- Capacity warnings

**Before Load**:

```tsx
useEffect(() => {
  if (!token || !isAdmin(token)) {
    toast.error('Admin access required')
    navigate({ to: '/unauthorized' })
  }
}, [token])
```

**Data Flow**:

1. Fetch all service health on mount
2. Auto-refresh every 2 seconds
3. Fetch chaos status
4. Fetch kitchen queue length
5. Update metrics history for charts

**State Management**:

- `servicesData`: Health and metrics per service
- `chaosStatus`: Current chaos mode state
- `queueLength`: Kitchen queue size
- `lastUpdate`: Last refresh timestamp
- `history`: Metrics history for charts

---

### Unauthorized (`unauthorized.tsx`)

**Path**: `/unauthorized`
**Access**: Public
**Purpose**: Access denied page
**Features**:

- Friendly error message
- Link back to login
- Explanation of required permissions

---

## 🔐 Authentication Flow

### Student Flow

```
1. User visits /
2. No token → Redirect to /login
3. User logs in
4. Token stored in localStorage
5. Redirect to /
6. Dashboard loads with token
```

### Admin Flow

```
1. User visits /admin
2. No token → Redirect to /login
3. User logs in
4. Check if token has admin role
5. If admin → Show dashboard
6. If not admin → Redirect to /unauthorized
```

### Token Validation

```tsx
// Check if token exists and is not expired
const token = getValidToken()

// Extract user info
const studentId = getStudentId(token)
const studentName = getStudentName(token)
const isAdminUser = isAdmin(token)
```

---

## 🚦 Route Guards

### Protected Routes

Routes that require authentication:

- `/` (Student dashboard)
- `/admin` (Admin dashboard)

### Public Routes

Routes accessible without authentication:

- `/login`
- `/unauthorized`

### Role-Based Access

- **Student role**: Can access `/`
- **Admin role**: Can access `/` and `/admin`

---

## 🔄 Navigation Patterns

### Programmatic Navigation

```tsx
import { useNavigate } from '@tanstack/react-router'

const navigate = useNavigate()

// Navigate to route
navigate({ to: '/login' })

// Navigate with replace
navigate({ to: '/login', replace: true })

// Navigate with search params
navigate({ to: '/admin', search: { service: 'gateway' } })
```

### Link Navigation

```tsx
import { Link } from '@tanstack/react-router'

<Link to="/">Dashboard</Link>
<Link to="/admin">Admin</Link>
<Link to="/login">Login</Link>
```

---

## 📊 Data Loading Patterns

### Client-Side Fetching

All routes use client-side data fetching with `useEffect`:

```tsx
useEffect(() => {
  loadData()
  const interval = setInterval(loadData, 5000)
  return () => clearInterval(interval)
}, [])
```

### Auto-Refresh Intervals

- **Student Dashboard**: 5 seconds (stock items)
- **Admin Dashboard**: 2 seconds (service health)
- **Kitchen Queue**: 3 seconds (queue length)

### WebSocket Subscriptions

```tsx
const { socket, connected } = useSocket(studentId)

useEffect(() => {
  if (!socket) return

  socket.on('order:status', handleStatusUpdate)
  return () => {
    socket.off('order:status', handleStatusUpdate)
  }
}, [socket])
```

---

## 🎨 Layout Patterns

### Student Layout

```tsx
<div className="min-h-screen bg-background">
  <Header sticky>
    <Welcome />
    <ConnectionIndicator />
    <LogOut />
  </Header>

  <Main>
    <OrderStatus />
    <MenuGrid />
  </Main>
</div>
```

### Admin Layout

```tsx
<div className="min-h-screen bg-background">
  <Header sticky>
    <Logo />
    <HealthIndicator />
    <OrdersPerSecond />
    <ChaosToggle />
    <LogOut />
  </Header>

  <Main>
    <CapacityBanner />
    <MetricsGrid />
    <ServiceHealthGrid />
    <ChartsGrid />
  </Main>
</div>
```

---

## 🔧 Route Configuration

### Vite Proxy Setup

```tsx
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
    '/socket.io': {
      target: 'http://localhost:3004',
      changeOrigin: true,
      ws: true,
    },
  },
}
```

### Environment Variables

```env
VITE_GATEWAY_URL=http://localhost:3000
VITE_IDENTITY_URL=http://localhost:3001
VITE_STOCK_URL=http://localhost:3002
VITE_KITCHEN_URL=http://localhost:3003
VITE_NOTIFICATION_URL=http://localhost:3004
```

---

## 🚀 Route Transitions

### Page Transitions

All routes use smooth slide animations:

```css
.animate-in {
  animation: fadeIn 0.3s ease-out;
}

.slide-in-from-bottom-4 {
  animation: slideInFromBottom 0.5s ease-out;
}
```

### Loading States

- Show skeleton loaders during data fetch
- Smooth transitions between states
- No jarring layout shifts

---

## 📱 Mobile Routing

### Mobile-First Design

All routes are optimized for mobile:

- Touch-friendly tap targets (48px minimum)
- Responsive layouts
- Swipe-friendly interactions
- Bottom navigation (future)

### Responsive Breakpoints

```tsx
// Mobile: < 640px
// Tablet: 640px - 1024px
// Desktop: > 1024px

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

---

## 🔍 Route Debugging

### TanStack Router DevTools

```tsx
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// In __root.tsx
;<TanStackRouterDevtools position="bottom-right" />
```

### Route Tree Generation

```bash
# Auto-generated route tree
src/routeTree.gen.ts
```

### Navigation Logging

```tsx
// Log navigation events
navigate({ to: '/admin' })
console.log('Navigated to admin dashboard')
```

---

## 🎯 Best Practices

### Route Organization

1. Group related routes in folders
2. Use `_layout` for shared layouts
3. Keep route files focused
4. Extract complex logic to hooks

### Authentication

1. Check token on route load
2. Redirect to login if missing
3. Validate token expiration
4. Clear token on logout

### Data Fetching

1. Fetch on mount
2. Set up auto-refresh
3. Clean up intervals
4. Handle errors gracefully

### Performance

1. Code split by route
2. Lazy load heavy components
3. Optimize re-renders
4. Use React.memo where needed

---

## 📚 Related Documentation

- [TanStack Router Docs](https://tanstack.com/router)
- [UI_FEATURES.md](./UI_FEATURES.md) - Feature documentation
- [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) - Component reference
- [QUICKSTART.md](./QUICKSTART.md) - Getting started guide

---

**Route Structure**: File-based routing with TanStack Router
**Authentication**: JWT tokens in localStorage
**Real-time**: WebSocket via Socket.io
