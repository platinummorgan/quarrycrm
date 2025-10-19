import Link from 'next/link'

export function BetaBanner() {
  // Only show banner in non-production environments
  if (process.env.NEXT_PUBLIC_APP_ENV === 'prod') {
    return null
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex h-8 items-center justify-center border-b border-gray-200 bg-gray-100 text-sm text-gray-700">
      In Development — data may change{' '}
      <Link href="/changelog" className="ml-1 underline hover:no-underline">
        Changelog
      </Link>
    </div>
  )
}
