# TaalAI Design System
## Zero-Inspired Neumorphic Minimalism

---

## 🎨 Color Palette

### Primary Colors
```css
Charcoal Black: #0B0E11 (Background)
Midnight Blue:  #1C2532 (Cards)
Electric Cyan:  #00D4FF (Primary Actions)
Neon Purple:    #9D4EDD (Secondary Highlights)
Turquoise:      #2EE59D (Success/Growth)
Coral Red:      #FF6B6B (Errors/Alerts)
Cool Gray:      #B0B3B8 (Secondary Text)
```

### Usage
- **Charcoal Black**: Main background with subtle radial gradients
- **Midnight Blue**: Card backgrounds with glassmorphism
- **Electric Cyan**: CTAs, active states, primary branding
- **Neon Purple**: Secondary accents, savings indicators
- **Turquoise**: Positive metrics, goal progress
- **Coral Red**: Warnings, destructive actions
- **Cool Gray**: Labels, secondary information

---

## 📐 Typography

### Fonts
```css
Headings: 'Space Grotesk' - Bold, geometric, modern
Body: 'Inter' - Clean, readable, professional
```

### Scale
```
h1: 3.5rem (56px) - Dashboard headings
h2: 2.5rem (40px) - Section titles
h3: 1.75rem (28px) - Card titles
h4: 1.25rem (20px) - Subsections
Body: 1rem (16px) - Default text
Small: 0.875rem (14px) - Labels
Tiny: 0.75rem (12px) - Captions
```

### Weights
```
300: Light - Subtle emphasis
400: Regular - Body text
500: Medium - Subheadings
600: Semibold - Card titles
700: Bold - Main headings
900: Black - Numbers, stats
```

---

## 🎴 Components

### Neumorphic Cards
```css
.neuro-card {
  background: linear-gradient(135deg, rgba(28, 37, 50, 0.8), rgba(28, 37, 50, 0.4));
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.37),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border-radius: 2rem;
}
```

**Usage**: Primary content containers, stat cards, form sections

### Elevated Cards
```css
.card-elevated {
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 10px 30px rgba(0, 212, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

**Usage**: Hero cards, balance display, important metrics

### Interactive Cards
```css
.card-interactive-cyber:hover {
  transform: translateY(-2px);
  box-shadow:
    0 20px 60px rgba(0, 212, 255, 0.2),
    0 10px 30px rgba(157, 78, 221, 0.1);
}
```

**Usage**: Clickable items, navigation cards, action tiles

---

## ✨ Effects

### Glassmorphism
- **Blur**: 40px backdrop blur
- **Opacity**: 0.4 - 0.8 background opacity
- **Border**: 1px solid white at 5% opacity
- **Saturation**: 180% color saturation

### Glow Effects
```css
Cyan Glow:      box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
Purple Glow:    box-shadow: 0 0 20px rgba(157, 78, 221, 0.4);
Turquoise Glow: box-shadow: 0 0 20px rgba(46, 229, 157, 0.4);
```

### Gradients
```css
Cyber Gradient: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #2EE59D 100%)
Cyan Gradient:  linear-gradient(135deg, #00D4FF 0%, #00A8CC 100%)
Purple Gradient: linear-gradient(135deg, #9D4EDD 0%, #7209B7 100%)
```

---

## 🎯 Spacing System

### 8px Grid
```
2px:  0.125rem
4px:  0.25rem
8px:  0.5rem  (xs)
12px: 0.75rem (sm)
16px: 1rem    (md)
24px: 1.5rem  (lg)
32px: 2rem    (xl)
48px: 3rem    (2xl)
64px: 4rem    (3xl)
```

### Padding Scale
- Cards: 24px (1.5rem)
- Sections: 32px (2rem)
- Containers: 48px (3rem)

---

## 🔘 Buttons

### Primary Button
```css
.neuro-button {
  background: linear-gradient(135deg, #00D4FF, #00A8CC);
  box-shadow:
    -5px -5px 10px rgba(255, 255, 255, 0.02),
    5px 5px 10px rgba(0, 0, 0, 0.5);
  border-radius: 1.25rem;
  padding: 0.75rem 1.5rem;
}
```

### States
- **Hover**: Lift 1px, increase shadow
- **Active**: Inset shadow, press effect
- **Disabled**: 50% opacity, no interaction

---

## 📊 Data Visualization

### Chart Colors
```css
Income:   #00D4FF (Cyan)
Expense:  #9D4EDD (Purple)
Savings:  #2EE59D (Turquoise)
Goals:    Gradient (Cyan → Purple → Turquoise)
```

### Chart Container
```css
.chart-container {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.03), rgba(157, 78, 221, 0.03));
  backdrop-filter: blur(40px);
  border-radius: 1.5rem;
  padding: 1rem;
}
```

---

## 🎬 Animations

### Transitions
```css
Default:  all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
Micro:    all 0.2s ease-out
Smooth:   all 0.4s ease-in-out
Slow:     all 0.6s ease-in-out
```

### Keyframes
```
slide-up:    Entrance from bottom
slide-down:  Entrance from top
fade-in:     Opacity 0 → 1
scale-in:    Scale 0.95 → 1
shimmer:     Loading effect
pulse-glow:  Breathing glow effect
```

---

## 📱 Responsive Breakpoints

```css
sm:  640px   (Mobile landscape)
md:  768px   (Tablet)
lg:  1024px  (Desktop)
xl:  1280px  (Large desktop)
2xl: 1536px  (Ultra-wide)
```

### Mobile-First Approach
- Base styles: Mobile (320px+)
- Progressive enhancement for larger screens
- Touch-friendly tap targets (44px minimum)
- Bottom navigation on mobile

---

## 🌐 Accessibility

### Contrast Ratios
- Normal text: 7:1 (AAA)
- Large text: 4.5:1 (AAA)
- UI components: 3:1 (AA)

### Focus States
```css
.focus-cyber {
  outline: none;
  ring: 2px solid rgba(0, 212, 255, 0.5);
  ring-offset: 2px solid #0B0E11;
}
```

### ARIA Labels
- All interactive elements
- Icon buttons
- Form inputs
- Navigation items

---

## 🎨 Design Tokens

```javascript
// Colors
const colors = {
  cyber: {
    charcoal: '#0B0E11',
    midnight: '#1C2532',
    cyan: '#00D4FF',
    purple: '#9D4EDD',
    turquoise: '#2EE59D',
    coral: '#FF6B6B',
    gray: '#B0B3B8',
  }
}

// Shadows
const shadows = {
  neuro: '0 8px 32px rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  elevated: '0 20px 60px rgba(0, 0, 0, 0.5), 0 10px 30px rgba(0, 212, 255, 0.1)',
  glow: '0 0 20px rgba(0, 212, 255, 0.4), 0 0 40px rgba(0, 212, 255, 0.2)',
}

// Border Radius
const radius = {
  sm: '0.5rem',
  md: '1rem',
  lg: '1.25rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '2.5rem',
}
```

---

## 🎯 Usage Examples

### Balance Card
```tsx
<div className="balance-display">
  <span className="stat-label">Total Balance</span>
  <h1 className="stat-value">₹1,24,500</h1>
  <span className="text-muted-foreground">+12.5% this month</span>
</div>
```

### Stat Card
```tsx
<div className="stat-card">
  <div className="stat-value">75</div>
  <div className="stat-label">Financial Pulse</div>
</div>
```

### Progress Bar
```tsx
<div className="progress-neuro">
  <div className="progress-fill" style={{ width: '65%' }} />
</div>
```

---

## 🚀 Component Library

### Available Utility Classes
```
.neuro-card          - Neumorphic card
.neuro-card-hover    - Interactive neumorphic card
.card-elevated       - Card with depth
.balance-display     - Large stat display
.stat-card           - Metric card
.chart-container     - Chart wrapper
.neuro-button        - Neumorphic button
.gradient-cyber      - Cyber gradient background
.text-gradient-cyber - Gradient text
.glow-cyan           - Cyan glow effect
.pulse-glow-cyan     - Animated cyan glow
.shimmer-cyber       - Loading shimmer
.skeleton-cyber      - Loading skeleton
```

---

## 📖 Best Practices

### DO ✅
- Use neumorphic cards for content sections
- Apply glow effects sparingly (accents only)
- Maintain 8px spacing grid
- Use Space Grotesk for numbers/stats
- Animate state changes smoothly
- Ensure sufficient contrast
- Test on dark backgrounds

### DON'T ❌
- Overuse glow effects
- Mix multiple gradients
- Use pure white text (#FFFFFF on dark)
- Ignore mobile breakpoints
- Stack too many glassmorphic layers
- Use bright colors for backgrounds
- Skip focus states

---

## 🎨 Design Inspiration

**Zero App**: Minimalist stat displays, bold typography, clean layouts
**Neumorphism**: Soft shadows, depth, tactile feel
**Glassmorphism**: Transparency, blur, layering
**Cyberpunk**: Neon accents, glows, futuristic vibe

---

## 📚 Resources

- **Fonts**: [Google Fonts](https://fonts.google.com)
  - Inter: https://fonts.google.com/specimen/Inter
  - Space Grotesk: https://fonts.google.com/specimen/Space+Grotesk

- **Color Tools**:
  - Contrast Checker: https://webaim.org/resources/contrastchecker/
  - Color Palette: https://coolors.co/

- **Icons**: Lucide React (consistent line icons)

---

**Last Updated**: October 2025
**Version**: 2.0 (Zero-Inspired Redesign)
