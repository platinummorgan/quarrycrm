'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export interface DealsQueryParams {
  pipeline?: string
  focus?: string
}

/**
 * Client component that handles ?pipeline=<id>&focus=<dealId> query parameters
 * to automatically select a pipeline and focus a specific deal card
 */
export function DealsQueryHandler({
  onPipelineChange,
  onDealFocus,
}: {
  onPipelineChange?: (pipelineId: string) => void
  onDealFocus?: (dealId: string) => void
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const pipelineId = searchParams?.get('pipeline')
    const dealId = searchParams?.get('focus')

    // Small delay to ensure board component is mounted and data is loaded
    setTimeout(() => {
      if (pipelineId && onPipelineChange) {
        onPipelineChange(pipelineId)
      }

      if (dealId && onDealFocus) {
        // Additional delay for focus to ensure pipeline is selected first
        setTimeout(
          () => {
            onDealFocus(dealId)

            // Scroll the deal card into view
            const dealElement = document.querySelector(
              `[data-deal-id="${dealId}"]`
            )
            if (dealElement) {
              dealElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              })
            }
          },
          pipelineId ? 500 : 100
        ) // Longer delay if pipeline also needs to change
      }
    }, 200)
  }, [searchParams, onPipelineChange, onDealFocus])

  return null // This component doesn't render anything
}
