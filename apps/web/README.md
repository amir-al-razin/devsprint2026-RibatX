# IUT Cafeteria — Web Frontend

Modern, mobile-first cafeteria ordering system with real-time admin monitoring dashboard.

TanStack Start (React 19 + TypeScript) frontend for the IUT Cafeteria ordering system.

## 🚀 Quick Start

```bash
# From the monorepo root — starts ALL services including the web app
pnpm turbo dev

# Start only the web app (assumes backend is already running)
pnpm turbo dev --filter=@ribatx/web
```

App runs at **http://localhost:4000**.

## 📱 Features

### Student Interface

- 🍽️ Browse menu with real-time stock updates
- 🛒 Place orders with one tap
- 📊 Track order status in real-time (Pending → Stock Verified → In Kitchen → Ready)
- 🎉 Confetti animation on successful orders
- 🌙 Dark theme optimized for evening use during Ramadan
- 📱 Mobile-first responsive design with 48px tap targets
- 🔔 Toast notifications for order events
- 📡 Live WebSocket connection indicator

### Admin Dashboard

- 🏥 Monitor all 5 microservices health in real-time
- 📈 Live metrics charts (throughput, latency, error rate)
- ⚡ Chaos engineering controls with confirmation modal
- 🚨 System capacity warnings (80%+ threshold)
- 🔄 Auto-refresh every 2 seconds
- 📊 Orders per second live counter
- 🎨 Color-coded health states (green glow, yellow pulse, red alert)

## 🎨 Design System

Built with:

- **React 19** + **TanStack Router** — Modern React framework
- **Tailwind CSS 4** + **shadcn/ui** — Styling and components
- **Recharts** — Real-time data visualization
- **Socket.io Client** — WebSocket for live updates
- **Sonner** — Toast notifications
- **Vite 7** — Lightning-fast dev server

**Design Inspiration**: Uber Eats + Vercel Dashboard + Grafana + Railway.app

## 📚 Documentation

- [**QUICKSTART.md**](./QUICKSTART.md) - Getting started guide with test scenarios
- [**UI_FEATURES.md**](./UI_FEATURES.md) - Comprehensive feature documentation
- [**COMPONENT_GUIDE.md**](./COMPONENT_GUIDE.md) - Component library reference
- [**ROUTING_GUIDE.md**](./ROUTING_GUIDE.md) - Routing structure and patterns
- [**IMPLEMENTATION_SUMMARY.md**](./IMPLEMENTATION_SUMMARY.md) - Implementation details

## 🏗️ Project Structure

```
src/
├── components/
│   ├── ui/              # 13+ reusable UI components
│   │   ├── status-badge.tsx
│   │   ├── metric-card.tsx
│   │   ├── loading-skeleton.tsx
│   │   ├── empty-state.tsx
│   │   ├── connection-indicator.tsx
│   │   ├── order-status-timeline.tsx
│   │   └── confetti.tsx
│   ├── student/         # Student-specific components
│   │   └── menu-item-card.tsx
│   └── admin/           # Admin-specific components
│       ├── service-health-card.tsx
│       ├── chaos-toggle.tsx
│       ├── metrics-chart.tsx
│       ├── capacity-banner.tsx
│       └── orders-per-second.tsx
├── routes/
│   ├── (student)/       # Student routes
│   │   ├── login.tsx
│   │   └── _layout/index.tsx
│   └── admin/           # Admin routes
│       └── _layout/index.tsx
├── hooks/               # Custom React hooks
│   ├── useSocket.ts
│   ├── useOrderStatus.ts
│   └── useMetricsHistory.ts
├── lib/                 # Utilities and API client
│   ├── api-client.ts
│   ├── auth.ts
│   └── utils.ts
└── styles.css           # Global styles and custom animations
```

## 🌐 API Integration

The Vite dev server proxies:

- `/api/*` → Order Gateway `:3000` (strip /api prefix)
- `/socket.io/*` → Notification Hub `:3004` (WebSocket upgrade)

Connects to 5 microservices:

- **Gateway** (port 3000) - Order management
- **Identity** (port 3001) - Authentication
- **Stock** (port 3002) - Inventory
- **Kitchen** (port 3003) - Order processing
- **Notification** (port 3004) - Real-time updates

## 🔐 Authentication

- JWT tokens stored in localStorage
- Student and admin roles
- Protected routes with automatic redirects
- Token expiration handling
- Rate limiting on login (60s cooldown)

## Environment Variables

Copy `/.env.example` to `/.env` at the monorepo root.

| Variable                | Description                           | Default                 |
| ----------------------- | ------------------------------------- | ----------------------- |
| `VITE_GATEWAY_URL`      | Order Gateway URL                     | `http://localhost:3000` |
| `VITE_IDENTITY_URL`     | Identity Provider URL                 | `http://localhost:3001` |
| `VITE_STOCK_URL`        | Stock Service URL                     | `http://localhost:3002` |
| `VITE_KITCHEN_URL`      | Kitchen Service URL                   | `http://localhost:3003` |
| `VITE_NOTIFICATION_URL` | Notification Hub URL                  | `http://localhost:3004` |
| `VITE_IFTAR_ITEM_ID`    | cuid of the Iftar Box item (optional) | -                       |

## 🎯 Key Features

### Zero-Latency Feel

- Optimistic UI updates
- Immediate visual feedback
- Smooth 60fps animations
- No jarring layout shifts

### Real-Time Updates

- WebSocket connection for live data
- Auto-refresh intervals (2-5 seconds)
- Connection status indicator
- Smooth transitions between states

### Mobile-First Design

- 48px minimum tap targets
- Responsive grid layouts (1/2/3 columns)
- Touch-friendly interactions
- Optimized for portrait mode

### Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- WCAG AA color contrast
- Screen reader friendly

## 🎨 Component Library

13+ reusable components with TypeScript:

- **StatusBadge** - Color-coded status indicators
- **MetricCard** - KPI display with trends
- **EmptyState** - Friendly empty states
- **Skeleton** - Loading placeholders
- **ConnectionIndicator** - WebSocket status
- **OrderStatusTimeline** - Order progress tracker
- **Confetti** - Celebration animation
- **MenuItemCard** - Food item display
- **ServiceHealthCard** - Service monitoring
- **ChaosToggle** - Chaos engineering control
- **MetricsChart** - Real-time line charts
- **CapacityBanner** - System warnings
- **OrdersPerSecond** - Live throughput

See [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) for detailed API reference.

## 🧪 Development

### Scripts

```bash
pnpm dev      # Start dev server (port 4000)
pnpm build    # Build for production
pnpm preview  # Preview production build
pnpm test     # Run tests
pnpm lint     # Lint code
pnpm format   # Format code
```

### Testing Scenarios

See [QUICKSTART.md](./QUICKSTART.md) for comprehensive testing guide.

## 🐳 Docker

```bash
# From the monorepo root
docker compose up --build
```

The web app will be available at `http://localhost:4000`.

## 📊 Routes

| Route    | Description                                                  | Access    |
| -------- | ------------------------------------------------------------ | --------- |
| `/login` | Student login with rate limiting                             | Public    |
| `/`      | Student dashboard — menu, ordering, status tracking          | Protected |
| `/admin` | Admin dashboard — health monitoring, metrics, chaos controls | Admin     |

## 📊 Performance

- Code splitting by route
- Lazy loading for charts
- Optimized re-renders with React.memo
- CSS animations (GPU accelerated)
- Efficient WebSocket subscriptions
- Debounced API calls

## 🎨 Animations

Custom animations for smooth UX:

- Page transitions (slide in/out)
- Confetti on successful orders
- Pulsing status indicators
- Skeleton loaders (no spinners!)
- Smooth chart transitions
- Hover and active states

## 🤝 Contributing

When adding new features:

1. Follow existing component structure
2. Use TypeScript for type safety
3. Add proper error handling
4. Include loading states
5. Test on mobile devices
6. Document in UI_FEATURES.md
7. Maintain accessibility standards

## 📄 Tech Stack Details

- **Framework**: React 19 with TanStack Start
- **Router**: TanStack Router (file-based)
- **Styling**: Tailwind CSS 4 with custom animations
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Charts**: Recharts 2.15
- **WebSocket**: Socket.io Client 4.8
- **Notifications**: Sonner 2.0
- **Build Tool**: Vite 7
- **Language**: TypeScript 5.7
- **Package Manager**: pnpm 10.30.1

---

**Optimized for evening usage during Ramadan** 🌙

For detailed feature documentation, see [UI_FEATURES.md](./UI_FEATURES.md)
