'use client'

import Link from 'next/link'
import { makeSEO } from '@/lib/seo'

export const metadata = makeSEO({
  title: 'Page not found — Quarry CRM',
  description: 'An error occurred while loading this page.',
  path: '/error',
})

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Error</h1>
        <p className="mb-8 text-muted-foreground">
          An error occurred while loading this page.
        </p>
        <Link href="/" className="text-primary underline hover:text-primary/80">
          Go home
        </Link>
      </div>
    </div>
  )
}
