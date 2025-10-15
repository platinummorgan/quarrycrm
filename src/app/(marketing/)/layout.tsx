import { BetaBanner } from '@/components/site/BetaBanner';

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