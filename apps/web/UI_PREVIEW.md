# UI Preview - Modern Student Interface

## 🎨 Visual Design Overview

### Login Page (`/login`)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              [Floating animated orbs]                   │
│                                                         │
│                    ┌──────────┐                        │
│                    │   🍽️    │  ← Gradient box        │
│                    │ Sparkles │     with glow          │
│                    └──────────┘                        │
│                                                         │
│              IUT Cafeteria                             │
│         Order your meals with ease 🌙                  │
│                                                         │
│    ┌─────────────────────────────────────────┐        │
│    │  [Glassmorphic card with glow effect]   │        │
│    │                                          │        │
│    │         Welcome Back                     │        │
│    │    Sign in to start ordering             │        │
│    │  ─────────────────────────────────────  │        │
│    │                                          │        │
│    │  👤 Student ID                          │        │
│    │  [Input with hover effect]              │        │
│    │                                          │        │
│    │  🔒 Password                            │        │
│    │  [Input with hover effect]              │        │
│    │                                          │        │
│    │  [Gradient button with shadow]          │        │
│    │         Sign In                          │        │
│    │                                          │        │
│    │  Optimized for Ramadan 🌙               │        │
│    └─────────────────────────────────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Student Dashboard (`/`)

#### Header

```
┌─────────────────────────────────────────────────────────────┐
│ [Sticky header with backdrop blur]                          │
│                                                              │
│  🍴  Welcome, John Doe ✨                    [Live] [Logout]│
│      Choose your delicious meal 🌙                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Active Order Card (when order is placed)

```
┌─────────────────────────────────────────────────────────────┐
│ [Card with gradient glow effect]                            │
│                                                              │
│  📦 Your Order                                          [X] │
│                                                              │
│  ●────────●────────●────────●                              │
│  Pending  Stock   Kitchen  Ready                           │
│           Verified                                          │
│                                                              │
│  [If ready: Green success banner]                          │
│  ✓ Your order is ready!                                    │
│    Please collect from the counter                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Menu Section

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Today's Menu 🍽️                        [30 items available]│
│  Fresh and delicious meals prepared with care               │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ ✨Popular│  │          │  │          │  │          │  │
│  │          │  │          │  │          │  │          │  │
│  │    📦    │  │    📦    │  │    📦    │  │    📦    │  │
│  │          │  │          │  │          │  │          │  │
│  │ [In Stock]  │ [Low Stock] │[Out Stock]│ [In Stock]│  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  │
│  │Chicken   │  │Beef Curry│  │Fish Fry  │  │Pasta     │  │
│  │Biryani   │  │with Rice │  │with Rice │  │Carbonara │  │
│  │          │  │          │  │          │  │          │  │
│  │📦 50 avail│  │📦 4 left │  │📦 0 avail│  │📦 18 avail│
│  │          │  │          │  │          │  │          │  │
│  │Price     │  │Price     │  │Price     │  │Price     │  │
│  │৳180      │  │৳150      │  │৳190      │  │৳170      │  │
│  │          │  │          │  │          │  │          │  │
│  │[🛒 Order]│  │[🛒 Order]│  │[Unavail] │  │[🛒 Order]│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                              │
│  [Grid continues with more items...]                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Key Visual Features

### Menu Item Cards

Each card includes:

1. **Image Section** (Top)
   - Gradient background (primary colors)
   - Large package icon in center
   - Animated background pattern
   - Popular badge (yellow, top-left) for high-stock items
   - Stock status badge (top-right):
     - Green "In Stock" for quantity > 5
     - Yellow "Only X left" (pulsing) for quantity 1-5
     - Red "Out of Stock" for quantity = 0
   - Decorative corner gradient (bottom-right)

2. **Content Section** (Bottom)
   - Item name (bold, large, hover effect)
   - Quantity available with icon
   - Divider line
   - Price display (large, gradient text)
   - Order button (gradient, shadow, hover effects)

3. **Interactive Effects**
   - Glow effect on hover (gradient border blur)
   - Scale up on hover (1.02x)
   - Scale down on click (0.98x)
   - Shine effect animation
   - Smooth transitions (300ms)

### Color States

**In Stock (Normal)**

- Card: Full color, full opacity
- Button: Gradient primary with shadow
- Glow: Primary color gradient

**Low Stock (Warning)**

- Card: Full color, full opacity
- Badge: Yellow, pulsing animation
- Button: Gradient primary with shadow
- Glow: Primary color gradient

**Out of Stock (Disabled)**

- Card: Grayscale, 60% opacity
- Button: Muted gray, disabled
- Glow: Muted gray gradient
- No hover effects

**Ordering (Loading)**

- Button: Shows spinner + "Ordering..."
- Card: Normal state
- Other buttons: Disabled

### Animations

1. **Page Load**
   - Cards fade in with stagger (50ms delay each)
   - Slide in from bottom
   - Duration: 500ms

2. **Order Placed**
   - Confetti animation (30 particles)
   - Toast notification
   - Order card slides in from top
   - Duration: 2 seconds

3. **Hover Effects**
   - Glow opacity: 0 → 100%
   - Scale: 1 → 1.02
   - Shine sweep: left → right
   - Duration: 300-500ms

4. **Button Click**
   - Scale: 1 → 0.98 → 1
   - Duration: 200ms

## 📱 Responsive Behavior

### Mobile (< 640px)

- 1 column grid
- Full-width cards
- Larger tap targets (48px minimum)
- Simplified header
- Stack elements vertically

### Tablet (640px - 1024px)

- 2 column grid
- Medium-sized cards
- Compact header
- Side-by-side elements

### Desktop (> 1024px)

- 3-4 column grid
- Optimal card size
- Full header with all info
- Hover effects enabled

## 🎨 Design Tokens Used

### Colors

```css
--primary: oklch(0.637 0.237 25.331)
  --primary-foreground: oklch(0.971 0.013 17.38) --card: oklch(0.205 0 0) with
  95% opacity --muted: oklch(0.269 0 0) --border: oklch(1 0 0 / 10%);
```

### Spacing

- Card padding: 20px (1.25rem)
- Grid gap: 24px (1.5rem)
- Section spacing: 32px (2rem)

### Border Radius

- Cards: 16px (rounded-2xl)
- Buttons: 12px (rounded-xl)
- Badges: 9999px (rounded-full)

### Shadows

- Card hover: shadow-2xl
- Button: shadow-lg with primary/25 opacity
- Button hover: shadow-xl with primary/30 opacity

### Typography

- Card title: 18px, bold (text-lg font-bold)
- Price: 24px, bold (text-2xl font-bold)
- Button: 14px, semibold (text-sm font-semibold)
- Description: 14px, normal (text-sm)

## 🌟 Special Effects

### Glassmorphism

- Cards: `bg-card/95 backdrop-blur-xl`
- Header: `bg-card/80 backdrop-blur-xl`
- Translucent with blur effect

### Gradient Glows

- Hover: `-inset-0.5 blur opacity-0 → opacity-100`
- Colors: `from-primary to-primary/50`
- Smooth transition: 500ms

### Backdrop Patterns

- Radial gradients in background
- Floating orbs with blur
- Animated pulse effects

### Shine Animation

```css
/* Sweep from left to right on hover */
from-transparent via-white/5 to-transparent
-translate-x-full → translate-x-full
duration: 1000ms
```

## 🎯 Accessibility

- Minimum tap target: 48px
- Focus rings on all interactive elements
- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- High contrast ratios

## 📊 Performance

- CSS animations (GPU accelerated)
- Staggered loading (50ms per card)
- Optimized re-renders
- Smooth 60fps animations
- Efficient hover effects

---

**Design Style**: Modern, Clean, Playful
**Inspiration**: Uber Eats + Vercel + Apple Design
**Optimized for**: Mobile-first, Evening usage, Ramadan 🌙
