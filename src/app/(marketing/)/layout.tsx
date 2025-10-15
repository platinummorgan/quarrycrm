import { BetaBanner } from '@/components/site/BetaBanner'
import { makeSEO } from '@/lib/seo'

export const metadata = makeSEO({
  title: 'Quarry CRM - Modern CRM for the Browser Era',
  description: 'Manage your contacts, companies, and deals with a fast, offline-capable CRM that works seamlessly across all your devices.',
  path: '/',
})

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const showBanner = process.env.NEXT_PUBLIC_APP_ENV !== 'prod';

  return (
    <>
      {showBanner && <BetaBanner />}
      <div className={showBanner ? 'pt-8' : ''}>
        {children}
      </div>
    </>
  );
}