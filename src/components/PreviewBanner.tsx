'use client'

import { X } from 'lucide-react'
import { useState } from 'react'

export function PreviewBanner() {
  const [isVisible, setIsVisible] = useState(true)

  // Only show banner in preview environment
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'preview' || !isVisible) return null

  return (
    <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-medium relative">
      <div className="flex items-center justify-center gap-2">
        <span>🚧 Preview Environment - Not for production use</span>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-800 hover:text-yellow-900"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}