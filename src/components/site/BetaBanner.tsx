import Link from 'next/link'

export function BetaBanner() {
  const isProd =
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production'
  const forcedOn = process.env.NEXT_PUBLIC_SHOW_DEV_BANNER === '1'
  if (isProd && !forcedOn) return null

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex h-8 items-center justify-center border-b border-gray-200 bg-gray-100 text-sm text-gray-700">
      In Development — data may change{' '}
      <Link href="/changelog" className="ml-1 underline hover:no-underline">
        Changelog
      </Link>
    </div>
  )
}
