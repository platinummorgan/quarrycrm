'use client'

import { useRef } from 'react'
import { Board } from './Board'
import { DealsQueryHandler } from './DealsQueryHandler'
import type { DealsListResponse, PipelinesListResponse } from '@/lib/zod/deals'

/**
 * Client wrapper for Board component that handles query parameters
 */
export function BoardWithQueryHandler({
  initialDeals,
  initialPipelines,
}: {
  initialDeals: DealsListResponse
  initialPipelines: PipelinesListResponse
}) {
  const pipelineChangeRef = useRef<((pipelineId: string) => void) | undefined>()
  const dealFocusRef = useRef<((dealId: string) => void) | undefined>()

  return (
    <>
      <Board
        initialDeals={initialDeals}
        initialPipelines={initialPipelines}
        onPipelineChangeRef={pipelineChangeRef}
        onDealFocusRef={dealFocusRef}
      />
      <DealsQueryHandler
        onPipelineChange={(id) => pipelineChangeRef.current?.(id)}
        onDealFocus={(id) => dealFocusRef.current?.(id)}
      />
    </>
  )
}
