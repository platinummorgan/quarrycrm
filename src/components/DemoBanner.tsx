'use client'

import { Eye, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function DemoBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const sessionResult = useSession()
  const session = sessionResult?.data
  const status = sessionResult?.status ?? 'loading'

  useEffect(() => {
    if (status === 'loading') return
    setIsDemo(session?.user?.isDemo || false)
  }, [session, status])

  // Only show banner for demo users
  if (!isDemo || !isVisible) return null

  return (
    <div className="bg-blue-600 text-white px-4 py-3 text-center text-sm font-medium relative shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <Eye className="h-4 w-4" />
        <span>Read-only demo - Explore Quarry CRM features</span>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white transition-colors"
        aria-label="Dismiss demo banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
