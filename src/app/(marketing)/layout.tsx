import { BetaBanner } from '@/components/site/BetaBanner'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BetaBanner />
      {children}
    </>
  )
}
