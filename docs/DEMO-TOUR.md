# Demo Tour Feature

## Overview

A lightweight, dismissible product tour for demo users that guides them through key features of the CRM on their first visit.

## Implementation

### Components

#### `src/components/demo/Tour.tsx`

The main tour component with the following features:

- **5-step guided tour** through key features
- **Visual highlighting** with animated borders and spotlight effect
- **Smart positioning** of tooltips (auto-adjusts to stay on screen)
- **localStorage persistence** to track completion
- **Demo-only** - only shows for users with demo role
- **Fully dismissible** - skip button and click outside to close

### Tour Steps

1. **Contacts Search** (`data-tour="contacts-search"`)
   - Targets the search input in the data table
   - Shows how to quickly find contacts
   - Position: Bottom

2. **Open Drawer** (`data-tour="contact-row"`)
   - Targets the first contact row
   - Explains clicking to view details
   - Position: Left

3. **Deals Board** (`data-tour="deals-nav"`)
   - Targets the Deals navigation link
   - Introduces the pipeline view
   - Position: Bottom

4. **Saved Views** (`data-tour="saved-views"`)
   - Targets the Views button in toolbar
   - Explains custom views feature
   - Position: Bottom

5. **Offline Banner** (`data-tour="offline-indicator"`)
   - Targets the offline status indicator
   - Highlights PWA capabilities
   - Position: Bottom

### Integration Points

#### 1. Root Layout (`src/app/layout.tsx`)

```tsx
const DemoTour = dynamic(() => import('@/components/demo/Tour').then(mod => ({ default: mod.DemoTour })), {
  ssr: false,
})

// In body:
<DemoTour />
```

#### 2. Data Table (`src/components/data-table.tsx`)

```tsx
// Search input
<div className="relative" data-tour="contacts-search">
  <Input ... />
</div>

// First table row
<TableRow data-tour={rowIndex === 0 ? 'contact-row' : undefined}>
```

#### 3. App Layout (`src/app/(app)/layout.tsx`)

```tsx
// Deals navigation link
<Button data-tour={isDealsLink ? 'deals-nav' : undefined}>
```

#### 4. Offline Indicator (`src/components/offline/offline-indicator.tsx`)

```tsx
<div data-tour="offline-indicator">
```

#### 5. Contacts Toolbar (`src/components/contacts/ContactsToolbar.tsx`)

```tsx
<Button data-tour="saved-views">Views</Button>
```

## Features

### Visual Design

- **Overlay**: Dark overlay (60% opacity) focuses attention
- **Highlight**: Animated blue border with pulse effect
- **Tooltip**: Clean white card with:
  - Step indicator dots (visual progress)
  - Title and description
  - Step counter (e.g., "Step 2 of 5")
  - Navigation buttons (Back/Next)
  - Skip tour button

### User Experience

1. **Auto-start**: Tour starts 1 second after page load for demo users
2. **Element detection**: Automatically waits for elements to appear in DOM
3. **Responsive positioning**: Tooltips adjust to stay on screen
4. **Keyboard support**: Users can dismiss with ESC (via overlay click)
5. **Progress tracking**: Visual dots show current step and completion

### Persistence

**Storage Key**: `quarry-demo-tour-completed`

- Stored in localStorage when tour is completed or skipped
- Tour won't show again once completed
- Per-browser storage (not per-user, intentionally simple)

### Restart Tour

Export a `useRestartTour()` hook for manual restart:

```tsx
import { useRestartTour } from '@/components/demo/Tour'

function MyComponent() {
  const { restartTour } = useRestartTour()

  return <Button onClick={restartTour}>Restart Tour</Button>
}
```

This clears the localStorage flag and reloads the page.

## Customization

### Adding New Steps

1. Add `data-tour="step-id"` to target element
2. Update `TOUR_STEPS` array in `Tour.tsx`:

```tsx
{
  id: 'step-id',
  title: 'Step Title',
  description: 'Step description text',
  selector: '[data-tour="step-id"]',
  position: 'bottom', // 'top' | 'bottom' | 'left' | 'right'
  highlightPadding: 8,
}
```

### Changing Appearance

Edit the Tour.tsx component styling:

- Overlay: `.fixed.inset-0.bg-black/60`
- Highlight border: `.border-2.border-blue-500`
- Tooltip: `.bg-white.dark:bg-gray-800`
- Progress dots: Modify in step indicator section

### Adjusting Timing

```tsx
// Start delay (default: 1000ms)
setTimeout(() => {
  setIsActive(true)
  updateHighlight()
}, 1000) // Change this value

// Element detection retry (default: 500ms)
setTimeout(updateHighlight, 500) // Change this value
```

## Technical Details

### Dynamic Positioning Algorithm

The tooltip position is calculated based on:

1. **Highlighted element bounds** (via `getBoundingClientRect()`)
2. **Preferred position** (top/bottom/left/right)
3. **Screen boundaries** (ensures tooltip stays visible)

```tsx
// Example: Bottom position
top = rect.bottom + padding
left = rect.left + rect.width / 2 - tooltipWidth / 2

// Clamp to screen bounds
left = Math.max(16, Math.min(left, maxLeft))
top = Math.max(16, Math.min(top, maxTop))
```

### Element Detection

The tour waits for elements to appear:

- Checks if element exists with `querySelector()`
- Retries every 500ms if not found
- Updates position on window resize

### Demo Detection

```tsx
const isDemo =
  session?.user?.isDemo || session?.user?.currentOrg?.role === 'DEMO'
```

Only users with `isDemo` flag or `DEMO` role see the tour.

## Accessibility

### Current Implementation

- Close button with `aria-label="Close tour"`
- Semantic HTML with buttons and navigation
- High contrast colors (WCAG AA compliant)
- Clear focus states

### Future Improvements

- Add ARIA live regions for screen readers
- Keyboard navigation (arrow keys to navigate steps)
- Focus trap within tooltip
- Announce step changes to screen readers

## Performance

### Optimization Strategies

1. **Dynamic import**: Tour is lazy-loaded to reduce initial bundle
2. **No SSR**: Client-side only (avoids hydration issues)
3. **Lightweight**: ~300 lines, no external dependencies
4. **Efficient updates**: Only re-calculates position on step change or resize

### Bundle Size

- Tour component: ~8KB minified
- No external libraries (no driver.js, shepherd.js, etc.)
- Uses existing UI components (Button, Badge)

## Testing

### Manual Testing Checklist

- [ ] Tour starts automatically for demo users
- [ ] All 5 steps highlight correct elements
- [ ] Tooltips position correctly on all screen sizes
- [ ] Skip button dismisses tour
- [ ] Clicking overlay dismisses tour
- [ ] Tour doesn't show again after completion
- [ ] Back button works on steps 2-5
- [ ] Next button advances through steps
- [ ] Finish button completes tour
- [ ] Progress dots update correctly
- [ ] Tour works in dark mode

### Testing Demo User

```bash
# Start dev server
npm run dev

# Open in browser and authenticate as demo user
# Tour should start automatically after 1 second
```

### Reset Tour for Testing

```javascript
// In browser console:
localStorage.removeItem('quarry-demo-tour-completed')
location.reload()
```

## Future Enhancements

### Potential Features

1. **Conditional steps** - Skip steps based on user actions
2. **Interactive triggers** - Wait for user to click before advancing
3. **Video embeds** - Add video tutorials in tooltips
4. **Multi-language** - Internationalize tour content
5. **Analytics** - Track step completion rates
6. **Branch tours** - Different tours for different user types
7. **Tooltips on hover** - Add mini-tours for specific features
8. **Progress persistence** - Resume tour if interrupted

### Known Limitations

1. **Element dependency** - Tour waits for elements but may skip if they never appear
2. **No mobile optimization** - Works best on desktop (consider separate mobile tour)
3. **Single tour** - Only supports one tour at a time
4. **No deep linking** - Can't link to specific tour steps
5. **localStorage only** - Not synced across devices

## Troubleshooting

### Tour Doesn't Start

- Check if user has demo role
- Verify localStorage isn't already set
- Check browser console for errors
- Ensure elements have `data-tour` attributes

### Element Not Highlighted

- Verify selector matches exactly
- Check if element is in DOM when tour starts
- Try increasing start delay
- Check for CSS conflicts (z-index)

### Tooltip Positioned Wrong

- Check `position` property in step config
- Verify element has proper dimensions
- Test on different screen sizes
- Adjust `highlightPadding` value

### Tour Appears for Non-Demo Users

- Check session authentication
- Verify `isDemo` logic in Tour.tsx
- Check for cached localStorage from previous demo session

## Related Files

- `src/components/demo/Tour.tsx` - Main tour component
- `src/app/layout.tsx` - Root layout integration
- `src/app/(app)/layout.tsx` - App layout with nav
- `src/components/data-table.tsx` - Search and row targets
- `src/components/contacts/ContactsToolbar.tsx` - Views button target
- `src/components/offline/offline-indicator.tsx` - Offline indicator target

## Conclusion

The demo tour provides a lightweight, user-friendly onboarding experience for demo users without adding heavy dependencies or impacting performance. The custom implementation gives full control over styling, behavior, and integration with the existing design system.
