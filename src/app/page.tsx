import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { makeSEO } from '@/lib/seo'
import { getBaseUrl } from '@/lib/utils'

export const metadata = makeSEO({
  title: 'Quarry CRM - Modern CRM for the Browser Era',
  description: 'Manage your contacts, companies, and deals with a fast, offline-capable CRM that works seamlessly across all your devices. Progressive Web App with offline support.',
  path: '/',
})

export default function MarketingPage() {
  const baseUrl = getBaseUrl()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    applicationCategory: 'BusinessApplication',
    name: 'Quarry CRM',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free trial available'
    },
    operatingSystem: 'Web',
    url: baseUrl,
    logo: `${baseUrl}/logo.png` // Placeholder - replace with actual logo URL
  }

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto max-w-[1200px] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">Quarry-CRM</h1>
              <Badge variant="secondary">Beta</Badge>
            </div>
            <nav className="hidden items-center space-x-6 md:flex">
              <Link
                href="#features"
                className="text-muted-foreground hover:text-foreground"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-muted-foreground hover:text-foreground"
              >
                Pricing
              </Link>
              <Link href="/app" className="text-primary hover:text-primary/80">
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20">
        <div className="container mx-auto max-w-[1200px] px-4 text-center">
          <h2 className="mb-6 text-5xl font-bold">
            Blazing Fast CRM
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Lightning-quick lists, one-click imports, and offline reliability for modern sales teams.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/app">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/app/deals">See the board</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/50 py-20">
        <div className="container mx-auto max-w-[1200px] px-4">
          <h3 className="mb-12 text-center text-3xl font-bold">Features</h3>
          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Blazing lists</CardTitle>
                <CardDescription>
                  Lightning-fast contact and company lists that load instantly, no matter the size.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>One-click import</CardTitle>
                <CardDescription>
                  Import contacts and companies from CSV with zero configuration. Just works.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Offline outbox</CardTitle>
                <CardDescription>
                  Create and edit deals offline. Everything syncs automatically when you're back online.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto max-w-[1200px] px-4 text-center text-muted-foreground">
          <p>
            &copy; 2025 Quarry-CRM. Built with Next.js and modern web
            technologies.
          </p>
        </div>
      </footer>
    </div>
  )
}
