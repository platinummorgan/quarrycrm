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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground mb-8">
          An error occurred while loading this page.
        </p>
        <Link
          href="/"
          className="text-primary hover:text-primary/80 underline"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}