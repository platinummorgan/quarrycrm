# Query Parameter Routing - Implementation Summary

## Overview
Implemented deep linking support for contacts and deals, allowing users to share URLs that automatically open specific resources.

## Features Implemented

### 1. Contact Deep Linking
**URL Format:** `/app/contacts?open=<contactId>`

**Components:**
- `src/components/contacts/ContactQueryHandler.tsx` (NEW)
  - Reads `?open` query parameter
  - Dispatches `contact:select` event to open drawer
  - 100ms delay to ensure DOM is ready

**Integration:**
- Modified `src/app/(app)/contacts/page.tsx`
  - Added `<ContactQueryHandler />` component
  - Maintains server-side data fetching

**Usage Example:**
```
/app/contacts?open=cm3abc123
```

### 2. Deal Deep Linking
**URL Formats:**
- `/app/deals?focus=<dealId>` - Focus a specific deal
- `/app/deals?pipeline=<id>&focus=<dealId>` - Select pipeline and focus deal

**Components:**
- `src/components/deals/DealsQueryHandler.tsx` (NEW)
  - Reads `?pipeline` and `?focus` query parameters
  - Calls callbacks via refs to update Board state
  - Implements scrollIntoView with smooth scrolling
  - Smart delays: 200ms initial, 500ms for pipeline change, 100ms for focus-only

- `src/components/deals/BoardWithQueryHandler.tsx` (NEW)
  - Client wrapper component
  - Creates refs for pipeline and deal focus callbacks
  - Bridges Board and DealsQueryHandler

**Board Modifications:**
- Modified `src/components/deals/Board.tsx`
  - Added `onPipelineChangeRef` and `onDealFocusRef` props (MutableRefObject)
  - Added useEffect to expose internal state setters via refs
  - Added `data-deal-id` attribute to deal cards for DOM querying

**Integration:**
- Modified `src/app/(app)/deals/page.tsx`
  - Changed from `<Board>` to `<BoardWithQueryHandler>`

**Usage Examples:**
```
/app/deals?focus=deal-789
/app/deals?pipeline=pipeline-456&focus=deal-789
```

### 3. Tour Documentation
**Modified:** `src/components/demo/Tour.tsx`
- Updated step descriptions to mention deep linking:
  - Step 2: "You can also use deep links like /app/contacts?open=<contactId>"
  - Step 3: "Use /app/deals?focus=<dealId> to link to specific deals"

### 4. Tests
**Created:** `__tests__/query-routing.test.tsx`

**Test Coverage (14 tests, all passing):**

**ContactQueryHandler Tests:**
- ✅ Dispatches contact:select event when `?open` param is present
- ✅ Does not dispatch event when param is missing
- ✅ Handles null searchParams gracefully
- ✅ Re-triggers on searchParams change

**DealsQueryHandler Tests:**
- ✅ Calls onPipelineChange when `?pipeline` param is present
- ✅ Calls onDealFocus when `?focus` param is present
- ✅ Handles both pipeline and focus params together
- ✅ Attempts to scroll deal card into view
- ✅ Handles missing DOM element gracefully
- ✅ Does not call handlers when params are missing
- ✅ Handles null searchParams gracefully

**URL Format Documentation:**
- ✅ Documents correct contact URL format
- ✅ Documents correct deal URL format (focus only)
- ✅ Documents correct deal URL format (pipeline + focus)

## Technical Details

### Timing Strategy
The implementation uses strategic delays to ensure DOM elements are ready:

1. **ContactQueryHandler:** 100ms delay before dispatching event
2. **DealsQueryHandler:** 
   - 200ms initial delay for mounting
   - 500ms additional delay when changing pipeline (to allow rerender)
   - 100ms delay for focus-only scenarios

### Component Boundaries
- Server components maintained for data fetching (`/contacts/page.tsx`, `/deals/page.tsx`)
- Client components handle query parameters and user interaction
- Ref pattern used to expose internal state without breaking encapsulation

### Event System
- Contacts use existing custom event system (`contact:select` event)
- Deals use React refs to pass callbacks between components
- Both approaches maintain clean separation of concerns

## Use Cases

### Shareable Links
Users can share links to specific resources:
- "Check out this contact: https://app.example.com/app/contacts?open=cm3abc123"
- "Review this deal: https://app.example.com/app/deals?focus=deal-456"

### Email Integration
Email notifications can include deep links:
- Deal stage changes → Link to specific deal
- Contact updates → Link to contact record

### Bookmarks
Users can bookmark specific views:
- Favorite contacts
- Important deals in specific pipelines

### Tour & Documentation
The product tour now educates users about deep linking capabilities, encouraging adoption of this feature.

## Dependencies Added
- `@testing-library/react` - Component testing
- `@testing-library/jest-dom` - DOM matchers

## Files Created
1. `src/components/contacts/ContactQueryHandler.tsx` (28 lines)
2. `src/components/deals/DealsQueryHandler.tsx` (45 lines)
3. `src/components/deals/BoardWithQueryHandler.tsx` (32 lines)
4. `__tests__/query-routing.test.tsx` (283 lines)

## Files Modified
1. `src/app/(app)/contacts/page.tsx` - Added ContactQueryHandler
2. `src/components/deals/Board.tsx` - Added ref props and data-deal-id
3. `src/app/(app)/deals/page.tsx` - Changed to BoardWithQueryHandler
4. `src/components/demo/Tour.tsx` - Updated step descriptions
5. `package.json` - Added testing dependencies

## Verification
Run tests with:
```bash
npm test -- __tests__/query-routing.test.tsx --run
```

All 14 tests should pass in ~3.6 seconds.

## Future Enhancements
- [ ] URL parameter validation with Zod schemas
- [ ] Error handling for invalid IDs (show toast notification)
- [ ] Support for multiple query parameters (e.g., filters + focus)
- [ ] History API integration to update URL on manual navigation
- [ ] Keyboard shortcuts to copy current view's deep link
