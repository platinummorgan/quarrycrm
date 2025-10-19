'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Client component that handles ?open=<contactId> query parameter
 * to automatically open the contact drawer
 */
export function ContactQueryHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const openContactId = searchParams?.get('open')

    if (openContactId) {
      // Small delay to ensure drawer component is mounted
      setTimeout(() => {
        const event = new CustomEvent('contact:select', {
          detail: { contactId: openContactId },
        })
        window.dispatchEvent(event)
      }, 100)
    }
  }, [searchParams])

  return null // This component doesn't render anything
}
