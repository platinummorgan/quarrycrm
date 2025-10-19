'use client'

import { useEffect, useRef } from 'react'

interface StatusAnnouncerProps {
  message: string
  /** Use 'polite' for non-critical updates, 'assertive' for critical ones */
  priority?: 'polite' | 'assertive'
}

/**
 * StatusAnnouncer provides screen reader announcements for async operations
 * Uses ARIA live regions to announce loading, success, and error states
 */
export function StatusAnnouncer({
  message,
  priority = 'polite',
}: StatusAnnouncerProps) {
  const previousMessage = useRef<string>('')

  useEffect(() => {
    // Only announce if message has changed to avoid repetitive announcements
    previousMessage.current = message
  }, [message])

  if (!message || message === previousMessage.current) {
    return null
  }

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
