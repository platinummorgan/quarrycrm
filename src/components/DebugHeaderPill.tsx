'use client'

import { useEffect, useState } from 'react'

interface WhoAmIResponse {
  authenticated: boolean
  user: { id: string; email: string } | null
  orgId: string | null
  orgName: string | null
  role: string | null
  isDemo: boolean
}

/**
 * DebugHeaderPill
 *
 * Shows a small pill in the top-right corner with role@org for debugging.
 * Only visible in non-production environments.
 * Fetches data from /api/whoami endpoint.
 */
export function DebugHeaderPill() {
  const [data, setData] = useState<WhoAmIResponse | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  // Only show in non-production
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'
  if (isProduction) return null

  useEffect(() => {
    // Fetch whoami data
    fetch('/api/whoami')
      .then((res) => res.json())
      .then((data: WhoAmIResponse) => setData(data))
      .catch((err) => console.error('Failed to fetch whoami:', err))
  }, [])

  if (!isVisible || !data?.authenticated) return null

  const roleText = data.role || 'NO_ROLE'
  const orgText = data.orgName || data.orgId?.slice(0, 8) || 'NO_ORG'
  const displayText = `${roleText}@${orgText}`

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
      <div
        className="rounded-full bg-purple-600 px-3 py-1 font-mono text-xs font-medium text-white shadow-lg hover:bg-purple-700"
        title={`User: ${data.user?.email}\nOrg ID: ${data.orgId}\nRole: ${data.role}\nDemo: ${data.isDemo}`}
      >
        {displayText}
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="rounded-full bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-800"
        title="Hide debug pill"
      >
        ✕
      </button>
    </div>
  )
}
