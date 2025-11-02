'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import React, { useState } from 'react'
import superjson from 'superjson'
import { trpc } from '@/lib/trpc'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes before considering it stale
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 10 minutes
            cacheTime: 10 * 60 * 1000,
            // Retry failed queries once
            retry: 1,
            // Refetch on window focus for critical data
            refetchOnWindowFocus: true,
          },
        },
      })
  )
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
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
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  )
}
