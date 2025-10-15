import Link from 'next/link';

export function BetaBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-center text-sm text-gray-700">
      In Development — data may change{' '}
      <Link href="/changelog" className="ml-1 underline hover:no-underline">
        Changelog
      </Link>
    </div>
  );
}