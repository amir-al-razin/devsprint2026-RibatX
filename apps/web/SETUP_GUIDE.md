# Setup Guide - Getting the UI Running

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
# From project root
pnpm install
```

### 2. Setup Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# The default values should work for local development
```

### 3. Setup Databases

#### Start PostgreSQL and Redis

```bash
# Using Docker Compose (recommended)
docker compose up -d postgres redis

# Or start them individually if you have them installed locally
```

#### Run Database Migrations

```bash
# Identity service
pnpm --filter @ribatx/identity prisma migrate dev

# Stock service
pnpm --filter @ribatx/stock prisma migrate dev
```

#### Seed the Stock Database with Menu Items

```bash
# This will create 30 menu items with realistic data
pnpm --filter @ribatx/stock prisma db seed
```

### 4. Start All Services

```bash
# Start all backend services + web app
pnpm turbo dev
```

This will start:

- **Identity Service** on port 3001
- **Gateway Service** on port 3000
- **Stock Service** on port 3002
- **Kitchen Service** on port 3003
- **Notification Service** on port 3004
- **Web App** on port 4000

### 5. Open the App

Visit `http://localhost:4000`

## 📝 Create Test Account

### Option 1: Using the UI

1. Go to `http://localhost:4000/login`
2. Enter any student ID (e.g., `2021331042`)
3. Enter any password (e.g., `password123`)
4. Click "Sign In" (this will auto-register if account doesn't exist)

### Option 2: Using API

```bash
# Register a student account
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "2021331042",
    "name": "John Doe",
    "password": "password123"
  }'

# Register an admin account
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "admin",
    "name": "Admin User",
    "password": "admin123",
    "role": "admin"
  }'
```

## 🎨 What You Should See

### Student Interface (`/`)

- **Header**: Welcome message, connection indicator, logout button
- **Menu Grid**: 30 food items in a responsive grid
  - Each card shows: name, price (৳), stock quantity, status badge
  - Items with stock > 5: Green "In Stock" badge
  - Items with stock 1-5: Yellow "Low Stock" badge
  - Items with stock 0: Red "Out of Stock" badge (button disabled)
- **Order Status**: After placing an order, see the timeline tracker

### Admin Dashboard (`/admin`)

- **Top Bar**: System health, orders/sec counter, chaos toggle
- **Capacity Banner**: Shows when queue > 20 orders
- **Metrics Cards**: 4 cards showing throughput, latency, queue, health
- **Service Health Grid**: 5 cards for each microservice
- **Charts**: Real-time throughput and latency graphs

## 🐛 Troubleshooting

### No Menu Items Showing

```bash
# Check if stock service is running
curl http://localhost:3002/stock/items

# If empty, seed the database
pnpm --filter @ribatx/stock prisma db seed

# Check the response
curl http://localhost:3002/stock/items | jq
```

### WebSocket Not Connecting

```bash
# Check if notification service is running
curl http://localhost:3004/health

# Check browser console for WebSocket errors
# Should see: "WebSocket connection established"
```

### Login Not Working

```bash
# Check if identity service is running
curl http://localhost:3001/health

# Try registering a new account
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"studentId":"test123","name":"Test User","password":"test123"}'
```

### Services Not Starting

```bash
# Check if ports are already in use
lsof -i :3000  # Gateway
lsof -i :3001  # Identity
lsof -i :3002  # Stock
lsof -i :3003  # Kitchen
lsof -i :3004  # Notification
lsof -i :4000  # Web

# Kill processes if needed
kill -9 <PID>

# Restart services
pnpm turbo dev
```

### Database Connection Errors

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
psql postgresql://postgres:postgres@localhost:5432/cafeteria

# Reset databases if needed
pnpm --filter @ribatx/identity prisma migrate reset
pnpm --filter @ribatx/stock prisma migrate reset
```

## 🎯 Testing the UI

### Test Student Flow

1. **Login**: Go to `/login`, enter credentials
2. **Browse Menu**: See all 30 items in grid
3. **Place Order**: Click "Order Now" on any item
4. **Watch Confetti**: See celebration animation
5. **Track Status**: See order timeline appear
6. **Real-time Updates**: Watch status change automatically

### Test Admin Flow

1. **Login as Admin**: Use admin credentials
2. **Go to `/admin`**: See monitoring dashboard
3. **Check Services**: All 5 services should show "Healthy"
4. **View Metrics**: See throughput, latency, queue length
5. **Enable Chaos**: Click chaos toggle, confirm modal
6. **Watch Failures**: See services turn yellow/red

### Test Edge Cases

- **Out of Stock**: Try ordering item with 0 quantity
- **Low Stock**: See yellow badge on items with < 5 quantity
- **Rate Limiting**: Try logging in with wrong password 3 times
- **Disconnect**: Turn off WiFi, see connection indicator turn red
- **Mobile**: Resize browser to mobile size, check responsiveness

## 📊 Sample Data

The seed script creates 30 menu items:

**Main Dishes** (৳120-190):

- Chicken Biryani, Beef Curry, Fried Rice, etc.

**Fast Food** (৳100-380):

- Burgers, Sandwiches, Pizza, Pasta, Noodles

**Snacks** (৳40-180):

- Samosa, Spring Rolls, Chicken Wings, Fries

**Ramadan Special** (৳80-250):

- Iftar Box, Haleem, Jilapi

**Beverages** (৳15-50):

- Juices, Soft Drinks, Tea, Water

## 🔧 Development Tips

### Hot Reload

All services support hot reload:

- Edit any `.tsx` file in `apps/web/src`
- Browser auto-refreshes
- No need to restart

### View Logs

```bash
# All services
pnpm turbo dev

# Specific service
pnpm --filter @ribatx/web dev
pnpm --filter @ribatx/gateway dev
```

### Clear Cache

```bash
# Clear Vite cache
rm -rf apps/web/node_modules/.vite

# Clear Turbo cache
rm -rf .turbo

# Reinstall
pnpm install
```

### Database GUI

```bash
# Prisma Studio for Identity DB
pnpm --filter @ribatx/identity prisma studio

# Prisma Studio for Stock DB
pnpm --filter @ribatx/stock prisma studio
```

## 🎨 Customization

### Change Theme Colors

Edit `apps/web/src/styles.css`:

```css
:root {
  --primary: oklch(0.637 0.237 25.331); /* Change this */
}
```

### Add More Menu Items

Edit `apps/stock/prisma/seed.ts` and re-run:

```bash
pnpm --filter @ribatx/stock prisma db seed
```

### Adjust Auto-Refresh Intervals

- Student dashboard: `apps/web/src/routes/(student)/_layout/index.tsx` (line ~40)
- Admin dashboard: `apps/web/src/routes/admin/_layout/index.tsx` (line ~80)

## 📚 Next Steps

1. Read [QUICKSTART.md](./QUICKSTART.md) for testing scenarios
2. Check [UI_FEATURES.md](./UI_FEATURES.md) for feature details
3. Review [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) for components
4. See [ROUTING_GUIDE.md](./ROUTING_GUIDE.md) for routing info

## 🆘 Still Having Issues?

1. Check all services are running: `pnpm turbo dev`
2. Check browser console for errors
3. Check network tab for failed API calls
4. Verify database is seeded: `curl http://localhost:3002/stock/items`
5. Try clearing cache and restarting

---

**Happy coding!** 🚀
