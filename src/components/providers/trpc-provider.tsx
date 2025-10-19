'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import React, { useState } from 'react'
import superjson from 'superjson'
import { trpc } from '@/lib/trpc'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
          // Ensure browser requests send cookies so server can read NextAuth session
          // and include selected org id (if present) to support multi-org flows.
          fetch: (input, init) => {
            const headers = new Headers(
              (init?.headers as HeadersInit) || undefined
            )
            try {
              const orgId = localStorage.getItem('orgId')
              if (orgId) headers.set('x-org-id', orgId)
            } catch (e) {
              // localStorage may be unavailable in some environments; ignore
            }
            return fetch(input as RequestInfo, {
              ...init,
              credentials: 'include',
              headers,
            })
          },
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
