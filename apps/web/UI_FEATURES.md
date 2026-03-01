# IUT Cafeteria UI - Feature Documentation

## Overview

Modern, mobile-first cafeteria ordering interface with real-time admin monitoring dashboard. Built with React, TanStack Router, Tailwind CSS, and shadcn/ui components.

## Student UI Features

### 🎨 Visual Design

- **Dark Theme Optimized**: Designed for evening usage during Ramadan with comfortable color palette
- **Mobile-First**: Responsive grid layout with thumb-friendly tap targets (minimum 48px)
- **Smooth Animations**:
  - Page transitions with slide animations
  - Confetti animation on successful order placement
  - Pulsing skeleton loaders (no spinners)
  - Smooth status timeline transitions

### 🔐 Login Screen (`/login`)

- Minimal, centered card with IUT branding
- Clean form with student ID and password fields
- Rate limiting with countdown timer
- Smooth fade-in animations
- Gradient background for visual appeal

### 🍽️ Menu View (`/`)

- Grid layout of food items (responsive: 1/2/3 columns)
- Each item shows:
  - Item name and price (in Taka ৳)
  - Real-time stock quantity
  - Status badges (In Stock / Low Stock / Out of Stock)
  - Order button with disabled state
- Skeleton loaders during data fetch
- Empty state with friendly message
- Auto-refresh every 5 seconds

### 📊 Order Status Tracker

- Timeline-style progress indicator with 4 stages:
  1. **Pending** - Order received
  2. **Stock Verified** - Stock confirmed
  3. **In Kitchen** - Being prepared
  4. **Ready** - Ready for pickup
- Shows queue position for active orders
- Animated progress bar between stages
- Pulsing current stage indicator
- Success message when order is ready
- Dismissible order card

### 🔔 Real-time Features

- WebSocket connection indicator (pulsing dot)
- Live order status updates via Socket.io
- Toast notifications for order events
- Connection status in header

### 🎯 UX Principles

- **Zero-latency feel**: Optimistic updates, immediate feedback
- **Status-first design**: Order status instantly scannable
- **Forgiveness**: Clear error messages with suggested actions
- **Real-time confidence**: Live connection indicator

## Admin Dashboard Features

### 📈 Layout

- Full-screen dashboard with efficient space usage
- Sticky top bar with global health status
- Three main sections:
  1. Global metrics cards
  2. Service health grid
  3. Real-time charts

### 🎨 Visual Hierarchy

- **Primary**: Service health cards with status indicators
- **Secondary**: Real-time metrics charts (line graphs)
- **Tertiary**: Detailed metrics within cards

### 🚦 Color Coding

- **Healthy**: Subtle green glow (#22C55E)
- **Warning**: Pulsing yellow border (#EAB308)
- **Failed**: Red with alert icon (#EF4444)
- **Neutral**: Gray with skeleton animation

### 🏥 Service Health Cards

Each card displays:

- Service name and uptime
- Status badge (Healthy/Warning/Offline)
- Key metrics:
  - Throughput (req/s)
  - Latency (ms)
  - Error Rate (%)
- Last health check timestamp
- Hover effects with glow for healthy services
- Click to drill into details (future enhancement)

### 📊 Global Metrics

Four metric cards showing:

1. **Total Throughput**: Aggregate requests per second
2. **Average Latency**: Mean response time across services
3. **Queue Length**: Current kitchen queue size
4. **Healthy Services**: X/Y services operational

### 📈 Real-time Charts

- **Throughput Over Time**: Green line chart
- **Latency Over Time**: Yellow line chart
- Auto-updating every 2 seconds
- Keeps last 20 data points
- Smooth transitions between updates
- Tooltips on hover

### ⚡ Chaos Engineering

- Prominent toggle button in header
- Shows current status (ON/OFF)
- Dramatic confirmation modal before activation
- Warning icon and message
- Prevents accidental chaos activation

### 🔄 Auto-refresh

- All data refreshes every 2 seconds
- Smooth transitions without jarring updates
- Last update timestamp displayed
- Connection indicator shows live status

## Component Library

### Design Tokens

- **Typography**: Inter Variable font family
- **Spacing**: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64px)
- **Border Radius**: 8px for cards, 4px for buttons
- **Shadows**: Subtle, layered shadows
- **Transitions**: 200ms ease-out (150ms for critical actions)

### Reusable Components

#### `StatusBadge`

Pill-shaped badge with icon and text

- Variants: success, warning, error, pending, neutral
- Auto-selects appropriate icon
- Optional pulse animation

#### `MetricCard`

Displays a metric with label, value, and optional trend

- Supports trend indicators (up/down/neutral)
- Loading state with skeleton
- Icon support
- Hover effects

#### `EmptyState`

Friendly empty state with icon, title, description, and action

- Customizable icon
- Optional action button
- Centered layout

#### `Skeleton`

Loading placeholder components

- Variants: card, text, circle, button
- Pulsing animation
- Pre-built skeletons for menu items and service cards

#### `ConnectionIndicator`

Shows WebSocket connection status

- Pulsing dot for connected state
- WiFi icon with status text
- Color-coded (green/red)

#### `OrderStatusTimeline`

Visual timeline for order progress

- 4 stages with icons
- Animated progress bar
- Current stage pulsing
- Shows queue position

#### `Confetti`

Celebration animation for successful actions

- 30 particles with random colors
- Falls from top with rotation
- Auto-dismisses after 2 seconds

## Quick Wins Implemented

✅ Confetti animation on successful order placement
✅ Real-time connection status indicator
✅ Smooth color transitions for service health changes
✅ Skeleton loaders instead of spinners
✅ Optimistic UI updates
✅ Keyboard-friendly navigation
✅ Mobile-optimized tap targets

## Future Enhancements

### Student UI

- [ ] Order history view
- [ ] Favorite items
- [ ] Push notifications
- [ ] Dietary filters
- [ ] Item images from CDN

### Admin Dashboard

- [ ] System capacity warning banner (98% threshold)
- [ ] Keyboard shortcuts (press 'k' for chaos mode)
- [ ] Orders per second live counter
- [ ] Service dependency map visualization
- [ ] Detailed logs panel (collapsible)
- [ ] Export metrics to CSV
- [ ] Alert configuration

## Development

### Running the App

```bash
# Install dependencies
pnpm install

# Start dev server (port 4000)
pnpm --filter @ribatx/web dev

# Build for production
pnpm --filter @ribatx/web build
```

### Environment Variables

```env
VITE_GATEWAY_URL=http://localhost:3000
VITE_IDENTITY_URL=http://localhost:3001
VITE_STOCK_URL=http://localhost:3002
VITE_KITCHEN_URL=http://localhost:3003
VITE_NOTIFICATION_URL=http://localhost:3004
```

### Tech Stack

- **Framework**: React 19 + TanStack Router
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Charts**: Recharts
- **WebSocket**: Socket.io Client
- **Notifications**: Sonner
- **Build**: Vite 7

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Color contrast meets WCAG AA standards
- Screen reader friendly status updates

## Performance

- Code splitting by route
- Lazy loading for charts
- Optimized re-renders with React hooks
- Debounced API calls
- Efficient WebSocket subscriptions
- CSS animations (GPU accelerated)

---

**Design Philosophy**: Uber Eats meets Vercel Dashboard meets Grafana
**Optimized for**: Evening usage during Ramadan 🌙
