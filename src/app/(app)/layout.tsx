'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SkipLink } from '@/components/skip-link'
import { ErrorBoundary } from '@/components/error-boundary'
import { RouteErrorBoundary } from '@/components/route-error-boundary'
import { OfflineIndicator } from '@/components/offline/offline-indicator'
import { OutboxBanner } from '@/components/offline/outbox-banner'
import { CommandKProvider } from '@/components/CommandK'
import { ContactDrawer } from '@/components/contacts/ContactDrawer'
import {
  Users,
  Building2,
  Target,
  Activity,
  Settings,
  Menu,
  Search,
} from 'lucide-react'

const navigation = [
  { name: 'Contacts', href: '/app/contacts', icon: Users },
  { name: 'Companies', href: '/app/companies', icon: Building2 },
  { name: 'Deals', href: '/app/deals', icon: Target },
  { name: 'Activities', href: '/app/activities', icon: Activity },
  { name: 'Settings', href: '/app/settings', icon: Settings },
]

function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-[1200px] px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/app" className="text-xl font-bold">
              Quarry-CRM
            </Link>
            <div className="flex items-center space-x-4">
              {/* Search trigger button */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => {
                  // Trigger command palette with Cmd/Ctrl+K
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    metaKey: true,
                    bubbles: true,
                  })
                  document.dispatchEvent(event)
                }}
              >
                <Search className="h-4 w-4" />
                <span className="hidden md:inline">Command...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium md:inline-flex">
                  ⌘K
                </kbd>
              </Button>
              <OfflineIndicator />
              <nav className="hidden items-center space-x-1 md:flex">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Button
                      key={item.name}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      asChild
                    >
                      <Link
                        href={item.href}
                        className="flex items-center space-x-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </Button>
                  )
                })}
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
    </CommandKProvider>
  )
}
