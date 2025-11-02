# Offline Mode - Quarry CRM

Quarry CRM includes comprehensive offline support for contractors working in areas with poor connectivity. This document explains how the offline system works and how to use it.

## Features

### 1. **Automatic Data Caching** ✅
- Query results are automatically cached using `localforage` (IndexedDB)
- Cached data includes:
  - Contacts/Leads
  - Deals/Jobs
  - Activities/Notes
  - Companies
- Service worker caches app shell and static assets via `next-pwa`

### 2. **Offline Mutation Queue** ✅
- All create/update/delete operations are queued when offline
- Queue is stored in IndexedDB and persists across page refreshes
- Mutations include:
  - Creating new leads or contacts
  - Updating lead status (NEW → CONTACTED → QUOTED → WON/LOST)
  - Adding notes and follow-ups
  - Updating job details

### 3. **Connection Monitoring** ✅
- Real-time network status detection using `navigator.onLine`
- Visual indicators in header:
  - 🟢 **Online** - Connected and synced
  - 🔴 **Offline** - No connection
  - 🔵 **Syncing** - Uploading queued changes
- Outbox banner shows pending changes count

### 4. **Automatic Sync** ✅
- When connection is restored, queued mutations are automatically synced
- Failed mutations are retried up to 3 times with exponential backoff
- Sync status is visible in the Outbox banner

### 5. **Conflict Detection & Resolution** ✅
- System detects when data was modified both offline and online
- Conflicts are stored with:
  - Local version (your changes)
  - Remote version (server changes)
  - Timestamps for both
- Users can choose which version to keep or merge them

## File Structure

```
src/
├── lib/
│   ├── offline-storage.ts          # IndexedDB wrapper (localforage)
│   └── outbox-manager.ts            # Mutation queue management
├── hooks/
│   └── use-offline.ts               # React hooks for offline state
├── components/
│   └── offline/
│       ├── offline-indicator.tsx    # Header status badge
│       └── outbox-banner.tsx        # Pending changes banner
└── app/
    └── offline/
        └── page.tsx                 # Offline fallback page
```

## How It Works

### Data Caching

When you're online, query results are automatically cached:

```typescript
import { OfflineStorage } from '@/lib/offline-storage'

// Cache a query result
await OfflineStorage.setQueryCache('contacts.list', data, {
  ttl: 5 * 60 * 1000, // 5 minutes
  version: 1,
})

// Retrieve cached data when offline
const cached = await OfflineStorage.getCachedQuery('contacts.list')
```

### Mutation Queue

When you perform an action offline, it's added to the queue:

```typescript
import { OfflineStorage } from '@/lib/offline-storage'

// Add mutation to outbox
await OfflineStorage.addToOutbox({
  type: 'update',
  entity: 'contact',
  data: { firstName: 'John', status: 'CONTACTED' },
  procedure: 'contacts.update',
  args: [{ id: '123', firstName: 'John', status: 'CONTACTED' }],
})
```

When connection is restored, `outbox-manager.ts` processes the queue:

```typescript
import { outboxManager } from '@/lib/outbox-manager'

// Process queued mutations
await outboxManager.processOutbox()
```

### Conflict Resolution

If a conflict is detected:

```typescript
// Conflict structure
{
  entity: 'contact',
  entityId: 'contact_123',
  localData: { firstName: 'John', status: 'CONTACTED' },
  remoteData: { firstName: 'Jonathan', status: 'QUOTED' },
  localTimestamp: 1699000000000,
  remoteTimestamp: 1699000100000,
  resolved: false
}
```

Users can resolve via the conflict dialog (choose local, remote, or merge).

## Using Offline Hooks

### useOffline

Main hook for offline state:

```typescript
import { useOffline } from '@/hooks/use-offline'

function MyComponent() {
  const {
    networkState,        // 'online' | 'offline' | 'syncing'
    isOnline,            // boolean
    isSyncing,           // boolean
    lastSync,            // timestamp
    outboxStats,         // { total, pending, failed, retrying }
    conflicts,           // array of unresolved conflicts
    unresolvedConflicts, // count
    hasPendingWork,      // boolean
  } = useOffline()

  if (!isOnline) {
    return <div>You're offline - changes will sync later</div>
  }

  return <div>Connected</div>
}
```

### useOutbox

Monitor queued mutations:

```typescript
import { useOutbox } from '@/hooks/use-offline'

function OutboxStatus() {
  const { stats, refreshStats, clearOutbox } = useOutbox()

  return (
    <div>
      {stats.total} pending changes
      {stats.failed > 0 && <button onClick={clearOutbox}>Clear All</button>}
    </div>
  )
}
```

### useConflicts

Handle data conflicts:

```typescript
import { useConflicts } from '@/hooks/use-offline'

function ConflictResolver() {
  const { conflicts, unresolvedCount, resolveConflict } = useConflicts()

  const handleResolve = async (conflictId: string) => {
    await resolveConflict(conflictId, 'local') // or 'remote' or 'merged'
  }

  return (
    <div>
      {unresolvedCount} conflicts need resolution
      {conflicts.map(conflict => (
        <ConflictCard 
          key={conflict.id} 
          conflict={conflict}
          onResolve={handleResolve}
        />
      ))}
    </div>
  )
}
```

## What Works Offline?

### ✅ Fully Supported
- View cached leads and jobs
- Add notes to contacts
- Update lead status (NEW → CONTACTED → QUOTED → WON → LOST)
- Set follow-up dates
- Mark activities as complete
- Update job details (address, crew, dates)
- Search cached contacts by name or phone

### ⚠️ Limited Support
- Adding new leads (requires sync for final ID)
- Photo uploads (queued, uploaded when online)
- Team collaboration (chat/comments require connection)

### ❌ Not Supported Offline
- Real-time updates from other users
- Import CSV
- Report generation (requires live data)
- Generating quotes/invoices

## Testing Offline Mode

### In Chrome DevTools

1. Open DevTools (F12)
2. Go to **Network** tab
3. Change **Online** dropdown to **Offline**
4. Refresh the page

### Simulating Slow Connection

1. DevTools → **Network** tab
2. Select **Slow 3G** or **Fast 3G** from dropdown
3. Test sync behavior under poor conditions

## Best Practices

### For Users

1. **Work normally** - The system handles offline/online transitions automatically
2. **Check the outbox** - If you see pending changes, they'll sync when online
3. **Resolve conflicts** - If you see a conflict notification, review and choose a version
4. **Clear old data** - Periodically clear cache in Settings to free space

### For Developers

1. **Always queue mutations** when network is unreliable
2. **Include retry logic** for critical operations
3. **Test offline scenarios** during development
4. **Set appropriate TTL** for cached queries (5-15 minutes for frequently changing data)
5. **Handle conflicts gracefully** with clear UI

## Storage Limits

- **IndexedDB**: ~50MB on mobile, ~250MB+ on desktop
- **Service Worker Cache**: Managed by browser, typically 50MB+ per origin
- **Automatic cleanup**: Expired cache entries are removed periodically

## Troubleshooting

### Changes aren't syncing

1. Check network status indicator in header
2. Open Outbox banner to see pending changes
3. Click "Retry Failed" if mutations failed
4. Check browser console for errors

### Data seems stale

1. Pull down to refresh (on mobile)
2. Click sync button in Outbox banner
3. Clear cache in Settings → Developer

### Conflicts appearing repeatedly

1. Ensure only one device is being used simultaneously
2. Resolve all conflicts before making new changes
3. Clear local cache if data is corrupted

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────┐        ┌──────────────┐                    │
│  │   React    │◄──────►│    tRPC      │                    │
│  │ Components │        │    Client    │                    │
│  └────────────┘        └──────┬───────┘                    │
│        │                      │                            │
│        │                      │                            │
│        ▼                      ▼                            │
│  ┌────────────────────────────────────┐                    │
│  │     Offline Storage Manager        │                    │
│  │  (localforage + IndexedDB)         │                    │
│  │                                    │                    │
│  │  • Query Cache                     │                    │
│  │  • Mutation Outbox                 │                    │
│  │  • Conflict Store                  │                    │
│  └────────────────────────────────────┘                    │
│                                                             │
│  ┌────────────────────────────────────┐                    │
│  │      Service Worker (PWA)          │                    │
│  │  • App Shell Caching               │                    │
│  │  • Static Asset Caching            │                    │
│  │  • Background Sync                 │                    │
│  └────────────────────────────────────┘                    │
│                                                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Network
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                        Server                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────┐        ┌──────────────┐                    │
│  │   tRPC     │◄──────►│   Prisma     │◄──────► Database  │
│  │  Routers   │        │    Client    │                    │
│  └────────────┘        └──────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Future Enhancements

- [ ] Differential sync (only sync changed fields)
- [ ] Conflict auto-resolution strategies (most recent wins, etc.)
- [ ] Offline analytics (track usage patterns)
- [ ] Background sync via Service Worker Sync API
- [ ] Push notifications when conflicts need resolution
- [ ] Selective sync (choose what to cache)
- [ ] Compression for cached data

## Related Documentation

- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Next.js PWA](https://github.com/shadowwalker/next-pwa)
- [localforage](https://localforage.github.io/localForage/)

---

**Note**: Offline mode is production-ready and has been tested on mobile devices in field conditions. However, always ensure critical data is backed up and synced regularly.
