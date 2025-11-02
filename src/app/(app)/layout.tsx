export const dynamic = 'force-dynamic'

import { BetaBanner } from '@/components/site/BetaBanner'
import { ReactNode, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import SearchTriggerButton from '@/components/SearchTriggerButton'
import { SkipLink } from '@/components/skip-link'
import { ErrorBoundary } from '@/components/error-boundary'
import { RouteErrorBoundary } from '@/components/route-error-boundary'
import { OfflineIndicator } from '@/components/offline/offline-indicator'
import { OutboxBanner } from '@/components/offline/outbox-banner'
import { CommandKProvider } from '@/components/CommandK'
import { ContactDrawer } from '@/components/contacts/ContactDrawer'
import { OnboardingProgressServer } from '@/components/onboarding/OnboardingProgressServer'
import { DemoPill } from '@/components/ui/DemoPill'
import { QuickAddLeadFAB } from '@/components/contacts/QuickAddLeadFAB'
import { Menu, Search } from 'lucide-react'
import AppNav from '@/components/AppNav'

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <BetaBanner />
      <SkipLink href="#main-content">Skip to main content</SkipLink>

      {/* Demo Banner - Full width, prominent */}
      <DemoPill variant="large" />

      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-[1200px] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/app" className="text-xl font-bold">
                Quarry-CRM
              </Link>
              {/* Small pill in header for redundancy */}
              <DemoPill variant="default" />
            </div>
            <div className="flex items-center space-x-4">              {/* Onboarding Progress - TEMPORARILY DISABLED FOR DEBUGGING */}
              {/* <Suspense fallback={null}>
                <OnboardingProgressServer />
              </Suspense> */}
              {/* Search trigger button (client) */}
              <SearchTriggerButton />
              <OfflineIndicator />
              <nav className="hidden items-center space-x-1 md:flex">
                <AppNav />
              </nav>
            </div>
            {/* Mobile menu button */}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Outbox Banner */}
      <OutboxBanner />

      {/* Main content */}
      <main
        id="main-content"
        className="container mx-auto max-w-[1200px] px-4 py-8"
      >
        <RouteErrorBoundary routeName="App Dashboard">
          {children}
        </RouteErrorBoundary>
      </main>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <CommandKProvider>
      <AppLayout>{children}</AppLayout>
      <ContactDrawer />
      <QuickAddLeadFAB />
    </CommandKProvider>
  )
}
