import { Suspense } from 'react'
import { BoardWithQueryHandler } from '@/components/deals/BoardWithQueryHandler'
import { getDeals, getPipelines } from '@/server/deals'
import { Skeleton } from '@/components/ui/skeleton'

async function BoardWrapper() {
  // Fetch initial data on server
  const [dealsData, pipelinesData] = await Promise.all([
    getDeals({ limit: 100 }), // Get all deals for kanban view
    getPipelines(),
  ])

  return (
    <BoardWithQueryHandler
      initialDeals={dealsData}
      initialPipelines={pipelinesData}
    />
  )
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
