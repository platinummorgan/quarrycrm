export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { BoardWithQueryHandler } from '@/components/deals/BoardWithQueryHandler'
import { getDeals, getPipelines } from '@/server/deals'
import { Skeleton } from '@/components/ui/skeleton'
import ClientErrorBoundary from '@/components/ClientErrorBoundary'
import { Button } from '@/components/ui/button'

async function BoardWrapper() {
  // Fetch initial data on server with error handling
  try {
    console.log('[BoardWrapper] Starting data fetch...')
    const [dealsData, pipelinesData] = await Promise.all([
      getDeals({ limit: 100 }).catch(err => {
        console.error('[BoardWrapper] getDeals error:', err)
        throw err
      }),
      getPipelines().catch(err => {
        console.error('[BoardWrapper] getPipelines error:', err)
        throw err
      }),
    ])
    console.log('[BoardWrapper] Data fetched successfully', { 
      deals: dealsData.items.length, 
      pipelines: pipelinesData.length 
    })

    return (
      <ClientErrorBoundary>
        <BoardWithQueryHandler
          initialDeals={dealsData}
          initialPipelines={pipelinesData}
        />
      </ClientErrorBoundary>
    )
  } catch (error) {
    console.error('[BoardWrapper] Fatal error:', error)
    return (
      <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-8">
        <h2 className="text-2xl font-semibold text-destructive">Failed to Load Deals</h2>
        <p className="mt-3 text-muted-foreground">
          An error occurred while fetching deals data from the server.
        </p>
        <pre className="mt-4 max-h-64 overflow-auto rounded bg-slate-900 p-4 text-sm text-white">
          {error instanceof Error ? error.stack : String(error)}
        </pre>
      </div>
    )
  }
}

function BoardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="flex gap-6 overflow-x-auto pb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-80 flex-shrink-0 space-y-4">
            <div className="rounded-lg border p-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="mt-2 h-4 w-24" />
            </div>
            <div className="space-y-3 rounded-lg border-2 border-dashed p-4">
              {[1, 2].map((j) => (
                <Skeleton key={j} className="h-32 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Loading deals... This may take up to 20 seconds on first load.
        </p>
      </div>
    </div>
  )
}

export default function DealsPage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<BoardSkeleton />}>
        <BoardWrapper />
      </Suspense>
    </div>
  )
}
