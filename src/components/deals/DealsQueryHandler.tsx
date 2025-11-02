'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export interface DealsQueryParams {
  pipeline?: string
  focus?: string
}

/**
 * Client component that handles ?pipeline=<id>&focus=<leadId> query parameters
 * to automatically select a pipeline and focus a specific lead card
 */
export function DealsQueryHandler({
  onPipelineChange,
  onDealFocus,
}: {
  onPipelineChange?: (pipelineId: string) => void
  onDealFocus?: (leadId: string) => void
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const pipelineId = searchParams?.get('pipeline')
    const leadId = searchParams?.get('focus')

    // Small delay to ensure board component is mounted and data is loaded
    setTimeout(() => {
      if (pipelineId && onPipelineChange) {
        onPipelineChange(pipelineId)
      }

      if (leadId && onDealFocus) {
        // Additional delay for focus to ensure pipeline is selected first
        setTimeout(
          () => {
            onDealFocus(leadId)

            // Scroll the lead card into view
            const leadElement = document.querySelector(
              `[data-deal-id="${leadId}"]`
            )
            if (leadElement) {
              leadElement.scrollIntoView({
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
