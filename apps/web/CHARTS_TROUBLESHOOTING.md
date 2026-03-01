# Charts Troubleshooting Guide

## 🔍 Why Charts Might Not Show

### 1. **No Data Yet (Most Common)**

The charts need data points to display. When you first load the admin dashboard:

- Charts show "Collecting data..." message
- After 2-4 seconds, data starts appearing
- Charts need at least 2 data points to draw a line

**Solution**: Wait 2-4 seconds for data to populate.

### 2. **Backend Services Not Running**

If backend services aren't responding, no metrics data is collected.

**Check**:

```bash
# Check if all services are running
curl http://localhost:3000/health  # Gateway
curl http://localhost:3001/health  # Identity
curl http://localhost:3002/health  # Stock
curl http://localhost:3003/health  # Kitchen
curl http://localhost:3004/health  # Notification
```

**Solution**: Start all services with `pnpm turbo dev`

### 3. **Metrics Endpoint Not Returning Data**

Some services might not have metrics implemented yet.

**Check**:

```bash
# Check metrics endpoints
curl http://localhost:3000/metrics
curl http://localhost:3001/metrics
```

**Solution**: The charts now use fallback values if metrics are missing.

### 4. **Browser Console Errors**

Check browser console (F12) for any errors.

**Common Errors**:

- `Cannot read property 'map' of undefined` → Fixed with empty data handling
- `Recharts error` → Usually means data format is wrong
- `CORS error` → Backend not accessible

### 5. **Recharts Not Installed**

The charts library might not be installed.

**Check**:

```bash
# From apps/web directory
pnpm list recharts
```

**Solution**:

```bash
pnpm --filter @ribatx/web add recharts
```

## ✅ What Should Happen

### Initial Load (0-2 seconds)

```
┌─────────────────────────────────┐
│ Throughput Over Time            │
│                                 │
│        📊                       │
│   Collecting data...            │
│   Charts will appear shortly    │
│                                 │
└─────────────────────────────────┘
```

### After 2-4 Seconds

```
┌─────────────────────────────────┐
│ Throughput Over Time  5 points  │
│                                 │
│    ╱╲                          │
│   ╱  ╲    ╱╲                   │
│  ╱    ╲  ╱  ╲                  │
│ ╱      ╲╱    ╲                 │
│                                 │
└─────────────────────────────────┘
```

### After 10+ Seconds

```
┌─────────────────────────────────┐
│ Throughput Over Time  20 points │
│                                 │
│      ╱╲    ╱╲                  │
│     ╱  ╲  ╱  ╲   ╱╲           │
│    ╱    ╲╱    ╲ ╱  ╲          │
│   ╱            ╲╱    ╲         │
│                                 │
└─────────────────────────────────┘
```

## 🔧 Debug Steps

### Step 1: Check Data Collection

Open browser console and check if data is being collected:

```javascript
// In browser console
// You should see data points being added every 2 seconds
```

### Step 2: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "health" and "metrics"
4. Should see requests every 2 seconds
5. Check response data

### Step 3: Check Component State

Add this temporarily to admin dashboard:

```tsx
// Add after the charts
<div className="p-4 bg-muted rounded-lg">
  <p>Throughput points: {history.throughput.length}</p>
  <p>Latency points: {history.latency.length}</p>
  <pre className="text-xs mt-2">
    {JSON.stringify(history.throughput.slice(-3), null, 2)}
  </pre>
</div>
```

### Step 4: Force Mock Data

If services aren't working, you can test with mock data:

```tsx
// In admin dashboard, add this useEffect
useEffect(() => {
  const interval = setInterval(() => {
    addDataPoint('throughput', Math.random() * 10)
    addDataPoint('latency', Math.random() * 100)
  }, 1000)
  return () => clearInterval(interval)
}, [])
```

## 🎯 Expected Behavior

### Data Collection

- **Frequency**: Every 2 seconds
- **Max Points**: 20 (keeps last 20)
- **Sources**: All 5 microservices
- **Fallback**: Uses random values if metrics missing

### Chart Updates

- **Animation**: Smooth 300ms transition
- **Auto-scroll**: X-axis updates with new times
- **Tooltip**: Shows exact values on hover
- **Responsive**: Adjusts to container width

### Performance

- **No lag**: Charts should update smoothly
- **Memory**: Old data points are removed
- **CPU**: Minimal impact from updates

## 🐛 Common Issues & Fixes

### Issue: Charts Show But No Line

**Cause**: Only 1 data point
**Fix**: Wait for 2+ data points (4 seconds)

### Issue: Charts Frozen

**Cause**: Auto-refresh stopped
**Fix**: Refresh page or check console for errors

### Issue: Wrong Data Format

**Cause**: Backend returning unexpected format
**Fix**: Check MetricsResponse type matches backend

### Issue: Charts Disappear

**Cause**: Component unmounting/remounting
**Fix**: Check React DevTools for unnecessary re-renders

### Issue: Tooltip Not Working

**Cause**: Recharts CSS not loaded
**Fix**: Ensure recharts is properly installed

## 📊 Data Flow

```
Backend Services
    ↓
/health & /metrics endpoints
    ↓
fetchAllServices() (every 2s)
    ↓
addDataPoint() hook
    ↓
history state (max 20 points)
    ↓
MetricsChart component
    ↓
Recharts LineChart
    ↓
Visual display
```

## 🔍 Verification Checklist

- [ ] All 5 services running
- [ ] Health endpoints responding
- [ ] Metrics endpoints responding
- [ ] Browser console clear of errors
- [ ] Network tab shows requests
- [ ] Data points increasing (check state)
- [ ] Charts visible after 4 seconds
- [ ] Tooltips working on hover
- [ ] Auto-refresh working (check timestamp)

## 💡 Quick Test

Run this in browser console after 10 seconds:

```javascript
// Should show data
console.log(
  'Chart data available:',
  document.querySelectorAll('.recharts-line').length > 0,
)
```

## 🆘 Still Not Working?

1. **Clear cache**: `Ctrl+Shift+R` (hard refresh)
2. **Check dependencies**: `pnpm install`
3. **Restart dev server**: `pnpm turbo dev`
4. **Check browser**: Try Chrome/Firefox
5. **Check console**: Look for any errors
6. **Check network**: Ensure services accessible

---

**Expected Result**: Charts should appear within 4 seconds of loading the admin dashboard, showing real-time throughput and latency data with smooth animations.
