import { makeSEO } from '@/lib/seo'

export const metadata = makeSEO({
  title: 'Pricing - Quarry CRM',
  description:
    'Choose the right Quarry CRM plan for your business. Free, Pro, and Team plans available.',
  path: '/pricing',
})

export async function generateStaticParams() {
  return []
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto max-w-[1200px] px-4">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold">Pricing</h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Choose the plan that fits your business needs. All plans include our
            core CRM features.
          </p>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground">
            Pricing page coming soon. Contact us for more information.
          </p>
        </div>
      </div>
    </div>
  )
}
