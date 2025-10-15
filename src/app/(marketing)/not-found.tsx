import Link from 'next/link'
import { makeSEO } from '@/lib/seo'

export const metadata = makeSEO({
  title: 'Page not found — Quarry CRM',
  description: 'The page you are looking for could not be found.',
  path: '/404',
})

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-8">
          The page you are looking for could not be found.
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