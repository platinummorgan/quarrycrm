export const dynamic = 'force-dynamic'

import React, { Suspense } from 'react'
import { JobsView } from '@/components/deals/JobsView'
import { getDeals, getPipelines } from '@/server/deals'
import { Skeleton } from '@/components/ui/skeleton'
import ClientErrorBoundary from '@/components/ClientErrorBoundary'
import { Button } from '@/components/ui/button'

async function JobsWrapper() {
  // Fetch initial data on server with error handling
  try {
    console.log('[JobsWrapper] Starting data fetch...')
    const [jobsData, pipelinesData] = await Promise.all([
      getDeals({ limit: 100 }).catch(err => {
        console.error('[JobsWrapper] getDeals error:', err)
        throw err
      }),
      getPipelines().catch(err => {
        console.error('[JobsWrapper] getPipelines error:', err)
        throw err
      }),
    ])
    console.log('[JobsWrapper] Data fetched successfully', { 
      jobs: jobsData.items.length, 
      pipelines: pipelinesData.length 
    })

    return (
      <ClientErrorBoundary>
        <React.Suspense fallback={<JobsSkeleton />}>
          <JobsView
            initialDeals={jobsData}
            initialPipelines={pipelinesData}
          />
        </React.Suspense>
      </ClientErrorBoundary>
    )
  } catch (error) {
    console.error('[JobsWrapper] Fatal error:', error)
    return (
      <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-8">
        <h2 className="text-2xl font-semibold text-destructive">Failed to Load Jobs</h2>
        <p className="mt-3 text-muted-foreground">
          An error occurred while fetching jobs data from the server.
        </p>
        <pre className="mt-4 max-h-64 overflow-auto rounded bg-slate-900 p-4 text-sm text-white">
          {error instanceof Error ? error.stack : String(error)}
        </pre>
      </div>
    )
  }
}

function JobsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function JobsPage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<JobsSkeleton />}>
        <JobsWrapper />
      </Suspense>
    </div>
  )
}
