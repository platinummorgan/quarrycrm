import Link from 'next/link'
import { makeSEO } from '@/lib/seo'

export const metadata = makeSEO({
  title: 'Page not found — Quarry CRM',
  description: 'The page you are looking for could not be found.',
  path: '/404',
})

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-8 text-muted-foreground">
          The page you are looking for could not be found.
        </p>
        <Link href="/" className="text-primary underline hover:text-primary/80">
          Go home
        </Link>
      </div>
    </div>
  )
}
