# Component Guide - Visual Hierarchy

## 🎨 Component Architecture

### Student UI Components

```
StudentDashboard (/)
├── Header (Sticky)
│   ├── Welcome Message
│   ├── ConnectionIndicator
│   └── LogOut Button
├── Confetti (Conditional)
├── OrderStatusCard (Conditional)
│   ├── OrderStatusTimeline
│   │   ├── Stage Icons
│   │   ├── Progress Bar
│   │   └── Position Badge
│   └── Ready Message (Conditional)
└── MenuGrid
    ├── MenuItemCard (Multiple)
    │   ├── Image Placeholder
    │   ├── StatusBadge
    │   ├── Item Name & Quantity
    │   ├── Price Display
    │   └── Order Button
    └── EmptyState (Fallback)
```

### Admin Dashboard Components

```
AdminDashboard (/admin)
├── Header (Sticky)
│   ├── Logo & Title
│   ├── Global Health Indicator
│   ├── OrdersPerSecond
│   ├── ConnectionIndicator
│   ├── ChaosToggle
│   │   └── ConfirmationModal (Conditional)
│   └── LogOut Button
└── Main Content
    ├── CapacityBanner (Conditional)
    │   ├── Warning Icon
    │   ├── Message
    │   ├── Capacity Bar
    │   └── Dismiss Button
    ├── Global Metrics Grid
    │   ├── MetricCard (Throughput)
    │   ├── MetricCard (Latency)
    │   ├── MetricCard (Queue Length)
    │   └── MetricCard (Healthy Services)
    ├── Service Health Grid
    │   └── ServiceHealthCard (x5)
    │       ├── Service Name & Uptime
    │       ├── StatusBadge
    │       ├── Metrics Grid
    │       │   ├── Throughput
    │       │   ├── Latency
    │       │   └── Error Rate
    │       └── Last Check Timestamp
    ├── Charts Grid
    │   ├── MetricsChart (Throughput)
    │   └── MetricsChart (Latency)
    └── Footer Info
```

## 🧩 Reusable Component Library

### UI Components (`components/ui/`)

#### StatusBadge

```tsx
<StatusBadge variant="success">In Stock</StatusBadge>
<StatusBadge variant="warning">Low Stock</StatusBadge>
<StatusBadge variant="error">Out of Stock</StatusBadge>
<StatusBadge variant="pending">Processing</StatusBadge>
```

**Props**:

- `variant`: 'success' | 'warning' | 'error' | 'pending' | 'neutral'
- `icon`: Optional custom icon
- `pulse`: Boolean for pulse animation

**Use Cases**:

- Stock status indicators
- Service health status
- Order status
- Connection status

---

#### MetricCard

```tsx
<MetricCard
  label="Total Throughput"
  value={42}
  trend="up"
  trendValue="+12%"
  icon={<Activity />}
/>
```

**Props**:

- `label`: Metric name
- `value`: Number or string
- `trend`: 'up' | 'down' | 'neutral'
- `trendValue`: Percentage change
- `icon`: Optional icon
- `loading`: Boolean for skeleton state

**Use Cases**:

- Dashboard metrics
- KPI displays
- Performance indicators

---

#### EmptyState

```tsx
<EmptyState
  icon={Package}
  title="No items available"
  description="The menu is currently empty."
  action={<Button>Refresh</Button>}
/>
```

**Props**:

- `icon`: Lucide icon component
- `title`: Main message
- `description`: Supporting text
- `action`: Optional action button

**Use Cases**:

- Empty menu
- No orders
- No search results
- Error states

---

#### Skeleton

```tsx
<Skeleton variant="card" className="h-32" />
<Skeleton variant="text" className="w-3/4" />
<Skeleton variant="circle" className="h-12 w-12" />
<Skeleton variant="button" />
```

**Variants**:

- `card`: Rounded rectangle
- `text`: Text line
- `circle`: Circular
- `button`: Button-shaped

**Pre-built Skeletons**:

- `MenuItemSkeleton`: For food items
- `ServiceCardSkeleton`: For service cards

---

#### ConnectionIndicator

```tsx
<ConnectionIndicator connected={true} />
```

**Props**:

- `connected`: Boolean
- `className`: Optional styling

**Features**:

- Pulsing dot when connected
- WiFi icon with status
- Color-coded (green/red)

---

#### OrderStatusTimeline

```tsx
<OrderStatusTimeline currentStatus="IN_KITCHEN" position={3} />
```

**Props**:

- `currentStatus`: OrderStatus enum
- `position`: Queue position (optional)

**Stages**:

1. PENDING
2. STOCK_VERIFIED
3. IN_KITCHEN
4. READY

**Features**:

- Animated progress bar
- Pulsing current stage
- Checkmarks for completed stages

---

#### Confetti

```tsx
<Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
```

**Props**:

- `active`: Boolean trigger
- `onComplete`: Callback when done

**Features**:

- 30 colored particles
- Falls from top with rotation
- Auto-dismisses after 2s

---

### Student Components (`components/student/`)

#### MenuItemCard

```tsx
<MenuItemCard
  item={stockItem}
  onOrder={(itemId) => handleOrder(itemId)}
  disabled={false}
/>
```

**Props**:

- `item`: StockItem object
- `onOrder`: Callback with itemId
- `disabled`: Boolean

**Features**:

- Image placeholder
- Stock status badge
- Price in Taka
- Disabled state for out-of-stock
- Hover and active animations

---

### Admin Components (`components/admin/`)

#### ServiceHealthCard

```tsx
<ServiceHealthCard
  name="Order Gateway"
  health={healthResponse}
  metrics={metricsResponse}
  loading={false}
  onClick={() => console.log('clicked')}
/>
```

**Props**:

- `name`: Service name
- `health`: HealthResponse | null
- `metrics`: MetricsResponse | null
- `loading`: Boolean
- `onClick`: Optional callback

**Features**:

- Color-coded health status
- Glow effect for healthy services
- Pulsing for warnings
- Metrics grid (throughput, latency, error rate)

---

#### ChaosToggle

```tsx
<ChaosToggle service="gateway" currentStatus="OFF" onToggle={() => refetch()} />
```

**Props**:

- `service`: Service name
- `currentStatus`: 'ON' | 'OFF'
- `onToggle`: Callback after toggle

**Features**:

- Dramatic confirmation modal
- Warning icon and message
- Color-coded button (red/green)

---

#### MetricsChart

```tsx
<MetricsChart
  data={historyData}
  title="Throughput Over Time"
  color="#22C55E"
  unit=" req/s"
/>
```

**Props**:

- `data`: Array of {timestamp, value}
- `title`: Chart title
- `color`: Line color
- `unit`: Value unit

**Features**:

- Real-time updates
- Smooth transitions
- Hover tooltips
- Responsive sizing

---

#### CapacityBanner

```tsx
<CapacityBanner queueLength={22} threshold={25} />
```

**Props**:

- `queueLength`: Current queue size
- `threshold`: Max capacity (default: 20)

**Features**:

- Shows at 80% capacity
- Critical state at 95%
- Animated capacity bar
- Dismissible

---

#### OrdersPerSecond

```tsx
<OrdersPerSecond throughput={4.2} />
```

**Props**:

- `throughput`: Current throughput value
- `className`: Optional styling

**Features**:

- Animated scale on increase
- Gradient background
- Tabular numbers
- Smooth transitions

---

## 🎨 Styling Patterns

### Color System

```css
/* Health States */
--healthy: #22c55e (green-500) --warning: #eab308 (yellow-500) --error: #ef4444
  (red-500) --neutral: hsl(var(--muted)) /* Primary Colors */
  --primary: oklch(0.637 0.237 25.331)
  --primary-foreground: oklch(0.971 0.013 17.38);
```

### Animation Classes

```css
.animate-in          /* Fade in */
.fade-in             /* Fade animation */
.slide-in-from-top   /* Slide from top */
.slide-in-from-bottom /* Slide from bottom */
.zoom-in             /* Zoom in */
.animate-pulse       /* Pulsing */
.animate-spin        /* Spinning */
```

### Spacing Scale

```
4px   → gap-1, p-1
8px   → gap-2, p-2
12px  → gap-3, p-3
16px  → gap-4, p-4
24px  → gap-6, p-6
32px  → gap-8, p-8
48px  → gap-12, p-12
64px  → gap-16, p-16
```

### Border Radius

```
4px   → rounded-md (buttons)
8px   → rounded-lg (cards)
12px  → rounded-xl (modals)
9999px → rounded-full (badges, circles)
```

## 🔧 Custom Hooks

### useSocket

```tsx
const { socket, connected } = useSocket(studentId)
```

**Returns**:

- `socket`: Socket.io instance
- `connected`: Boolean connection state

**Use Cases**:

- Real-time order updates
- Live notifications
- Connection monitoring

---

### useOrderStatus

```tsx
const orderState = useOrderStatus(orderId, studentId)
```

**Returns**:

- `orderId`: Order ID
- `status`: Current OrderStatus
- `position`: Queue position

**Use Cases**:

- Track order progress
- Show status timeline
- Display queue position

---

### useMetricsHistory

```tsx
const { history, addDataPoint } = useMetricsHistory()
```

**Returns**:

- `history`: Object with throughput, latency, errorRate arrays
- `addDataPoint`: Function to add new data

**Use Cases**:

- Real-time charts
- Historical data tracking
- Trend analysis

---

## 📱 Responsive Breakpoints

```css
/* Mobile First */
default: < 640px

/* Tablet */
sm: 640px

/* Desktop */
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Grid Layouts

```tsx
/* Menu Grid */
grid - cols - 1 /* Mobile: 1 column */
sm: grid - cols - 2 /* Tablet: 2 columns */
lg: grid - cols - 3 /* Desktop: 3 columns */

/* Metrics Grid */
grid - cols - 1 /* Mobile: 1 column */
md: grid - cols - 2 /* Tablet: 2 columns */
md: grid - cols - 4 /* Desktop: 4 columns */
```

## 🎯 Best Practices

### Component Creation

1. Use TypeScript for props
2. Export interface for props
3. Use `cn()` for className merging
4. Include loading states
5. Handle error states
6. Add hover/active states
7. Make mobile-friendly

### Animation Guidelines

1. Use CSS animations (GPU accelerated)
2. Keep duration under 300ms
3. Use ease-out for exits
4. Use ease-in for entrances
5. Avoid layout shifts
6. Test on mobile devices

### Accessibility

1. Use semantic HTML
2. Add ARIA labels
3. Support keyboard navigation
4. Ensure color contrast
5. Provide focus indicators
6. Test with screen readers

---

**Reference**: See UI_FEATURES.md for detailed feature documentation
