# Quick Start Guide - IUT Cafeteria UI

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10.30.1+
- Backend services running (Gateway, Identity, Stock, Kitchen, Notification)

### Installation

```bash
# From project root
pnpm install

# Start the web app
pnpm --filter @ribatx/web dev
```

The app will be available at `http://localhost:4000`

## 📱 Student Interface

### Access

Navigate to `http://localhost:4000/login`

### Test Credentials

Use any student ID and password (register first if needed)

### Features to Test

1. **Login Flow**
   - Enter student ID and password
   - Notice the smooth animations and gradient background
   - Rate limiting kicks in after multiple failed attempts

2. **Menu Browsing**
   - View all available food items in a responsive grid
   - Check real-time stock status badges
   - Notice skeleton loaders while data loads

3. **Place an Order**
   - Click "Order Now" on any in-stock item
   - Watch the confetti animation 🎉
   - See the order status timeline appear

4. **Track Order Status**
   - Watch real-time updates via WebSocket
   - See the progress bar move through stages:
     - Pending → Stock Verified → In Kitchen → Ready
   - Notice the pulsing animation on current stage
   - Get notified when order is ready

5. **Connection Status**
   - Check the live indicator in the header
   - Pulsing green dot = connected
   - Red indicator = disconnected

## 🖥️ Admin Dashboard

### Access

Navigate to `http://localhost:4000/admin`

### Admin Credentials

You need a JWT token with `role: "admin"` claim

### Features to Test

1. **Global Health Overview**
   - Top bar shows system health percentage
   - Color-coded indicator (green/yellow/red)
   - Real-time connection status

2. **Service Health Cards**
   - 5 service cards showing health status
   - Hover to see glow effect on healthy services
   - Warning services pulse with yellow border
   - Failed services show red border

3. **Metrics Dashboard**
   - 4 global metric cards at the top
   - Real-time throughput, latency, queue length
   - Trend indicators with percentages

4. **Live Charts**
   - Throughput chart (green line)
   - Latency chart (yellow line)
   - Auto-updates every 2 seconds
   - Hover for exact values

5. **Chaos Engineering**
   - Click "Chaos: OFF" button in header
   - Dramatic warning modal appears
   - Confirm to enable chaos mode
   - Watch services start failing randomly

6. **Capacity Warning**
   - When queue length exceeds 80% capacity
   - Yellow warning banner appears
   - At 95%+ capacity, turns red and critical
   - Shows capacity bar and percentage

## 🎨 Design Features to Notice

### Animations

- ✨ Confetti on successful order
- 🌊 Smooth page transitions
- 💫 Pulsing status indicators
- 🎭 Skeleton loaders (no spinners!)
- 📊 Smooth chart transitions

### Mobile Optimization

- 📱 Responsive grid layouts
- 👆 48px minimum tap targets
- 🔄 Touch-friendly interactions
- 📐 Optimized for portrait mode

### Dark Theme

- 🌙 Comfortable for evening use
- 🎨 Subtle color palette
- ✨ Glowing effects for healthy states
- 🔆 High contrast for readability

## 🔧 Configuration

### Environment Variables

Create `.env` in `apps/web/`:

```env
VITE_GATEWAY_URL=http://localhost:3000
VITE_IDENTITY_URL=http://localhost:3001
VITE_STOCK_URL=http://localhost:3002
VITE_KITCHEN_URL=http://localhost:3003
VITE_NOTIFICATION_URL=http://localhost:3004
```

### Proxy Configuration

The Vite dev server proxies:

- `/api/*` → Gateway (port 3000)
- `/socket.io/*` → Notification Hub (port 3004)

## 🧪 Testing Scenarios

### Student Flow

1. Register a new student account
2. Login and browse menu
3. Place multiple orders
4. Watch real-time status updates
5. Test with low stock items
6. Try ordering out-of-stock items

### Admin Flow

1. Login as admin
2. Monitor all services
3. Enable chaos mode on gateway
4. Watch services fail and recover
5. Monitor queue length during rush
6. Check capacity warnings

### Edge Cases

- Disconnect WebSocket (turn off WiFi)
- Rapid order placement (test idempotency)
- Service failures (stop a backend service)
- Rate limiting (multiple failed logins)
- Empty menu state
- Zero queue length

## 📊 Performance Tips

### Optimization

- Components use React.memo where appropriate
- Debounced API calls prevent spam
- Efficient WebSocket subscriptions
- CSS animations (GPU accelerated)
- Code splitting by route

### Monitoring

- Check Network tab for API calls
- Watch WebSocket messages in DevTools
- Monitor re-renders with React DevTools
- Check bundle size with `pnpm build`

## 🐛 Troubleshooting

### WebSocket Not Connecting

- Check Notification Hub is running on port 3004
- Verify proxy configuration in `vite.config.ts`
- Check browser console for errors

### Orders Not Updating

- Ensure student ID matches JWT token
- Check WebSocket connection indicator
- Verify backend services are running

### Styles Not Loading

- Clear Vite cache: `rm -rf node_modules/.vite`
- Restart dev server
- Check Tailwind CSS configuration

### API Errors

- Verify all backend services are running
- Check environment variables
- Look at Network tab for failed requests

## 🎯 Key Shortcuts (Future)

These are planned but not yet implemented:

- `k` - Toggle chaos mode
- `r` - Refresh all services
- `Esc` - Close modals
- `?` - Show help

## 📚 Next Steps

1. Read `UI_FEATURES.md` for detailed feature documentation
2. Check component source code in `src/components/`
3. Explore route files in `src/routes/`
4. Review hooks in `src/hooks/`
5. Customize theme in `src/styles.css`

## 🤝 Contributing

When adding new features:

1. Follow the existing component structure
2. Use TypeScript for type safety
3. Add proper error handling
4. Include loading states
5. Test on mobile devices
6. Document in UI_FEATURES.md

---

**Happy coding!** 🚀
