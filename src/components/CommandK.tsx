'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  Users,
  Target,
  Upload,
  Building2,
  Activity,
  Settings,
  FileText,
  Plus,
  Search,
  Clock,
  Phone,
  TrendingUp,
  Calendar,
  Zap,
  BarChart3,
  Users2,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { startOfWeek } from 'date-fns'

// Props for controlling the command palette
interface CommandKProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewContact?: () => void
}

export function CommandK({ open, onOpenChange, onNewContact }: CommandKProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  // Search for contacts by name or phone
  const { data: searchResults, isLoading } = trpc.search.quick.useQuery(
    { query: search },
    {
      enabled: open && search.length > 0,
      staleTime: 0,
    }
  )

  // Detect if search is a phone number
  const isPhoneNumber = /^\d{3,}/.test(search.replace(/\D/g, ''))

  // Close on Escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onOpenChange])

  // Reset search when closed
  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  const executeAction = useCallback(
    (action: () => void) => {
      action()
      onOpenChange(false)
      setSearch('')
    },
    [onOpenChange]
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      <div className="fixed left-1/2 top-[20%] w-full max-w-2xl -translate-x-1/2 px-4">
        <Command
          className="overflow-hidden rounded-lg border bg-popover shadow-2xl focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          shouldFilter={false}
          loop
        >
          <div className="sr-only">
            <h2 id="command-palette-title">Command Palette</h2>
          </div>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Command palette search"
            />
            <kbd className="ml-auto hidden select-none rounded border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground sm:block">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {isLoading ? 'Searching...' : 'No results found.'}
            </Command.Empty>

            {/* Quick Actions for Contractors */}
            {!search && (
              <>
                <Command.Group heading="Quick Actions" className="mb-2">
                  <Command.Item
                    value="add lead"
                    keywords={['new', 'create', 'add', 'lead', 'contact']}
                    onSelect={() =>
                      executeAction(() => {
                        if (onNewContact) {
                          onNewContact()
                        }
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Add Lead</div>
                      <div className="text-xs text-muted-foreground">
                        Quick lead capture
                      </div>
                    </div>
                    <kbd className="hidden select-none rounded border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground sm:block">
                      ↵
                    </kbd>
                  </Command.Item>

                  <Command.Item
                    value="today follow-ups"
                    keywords={['today', 'followup', 'follow-up', 'due']}
                    onSelect={() =>
                      executeAction(() => {
                        router.push('/app')
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Today&apos;s Follow-ups</div>
                      <div className="text-xs text-muted-foreground">
                        See what&apos;s due today
                      </div>
                    </div>
                  </Command.Item>

                  <Command.Item
                    value="active jobs"
                    keywords={['jobs', 'active', 'deals', 'pipeline']}
                    onSelect={() =>
                      executeAction(() => {
                        router.push('/app/deals')
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <Target className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Active Jobs</div>
                      <div className="text-xs text-muted-foreground">
                        View job pipeline
                      </div>
                    </div>
                  </Command.Item>

                  <Command.Item
                    value="won this week"
                    keywords={['won', 'week', 'recent', 'closed']}
                    onSelect={() =>
                      executeAction(() => {
                        const weekStart = startOfWeek(new Date()).toISOString()
                        router.push(`/app/reports?highlight=won&weekStart=${weekStart}`)
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Won This Week</div>
                      <div className="text-xs text-muted-foreground">
                        Jobs closed in last 7 days
                      </div>
                    </div>
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Navigation" className="mb-2">
                  <Command.Item
                    value="leads"
                    keywords={['leads', 'contacts', 'customers']}
                    onSelect={() =>
                      executeAction(() => {
                        router.push('/app/contacts')
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Leads</div>
                      <div className="text-xs text-muted-foreground">
                        View all leads
                      </div>
                    </div>
                  </Command.Item>

                  <Command.Item
                    value="reports"
                    keywords={['reports', 'analytics', 'stats', 'metrics']}
                    onSelect={() =>
                      executeAction(() => {
                        router.push('/app/reports')
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Reports</div>
                      <div className="text-xs text-muted-foreground">
                        Business insights
                      </div>
                    </div>
                  </Command.Item>

                  <Command.Item
                    value="team"
                    keywords={['team', 'crew', 'members']}
                    onSelect={() =>
                      executeAction(() => {
                        router.push('/app/team')
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                      <Users2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Team</div>
                      <div className="text-xs text-muted-foreground">
                        Manage your crew
                      </div>
                    </div>
                  </Command.Item>
                </Command.Group>
              </>
            )}

            {/* Search Results */}
            {search && searchResults && (
              <>
                {/* Contacts/Leads */}
                {searchResults.contacts && searchResults.contacts.length > 0 && (
                  <Command.Group heading="Contacts" className="mb-2">
                    {searchResults.contacts.map((contact: any) => (
                      <Command.Item
                        key={contact.id}
                        value={`contact-${contact.id}`}
                        onSelect={() =>
                          executeAction(() => {
                            router.push(`/app/contacts?open=${contact.id}`)
                          })
                        }
                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {contact.phone || contact.email || 'No contact info'}
                          </div>
                        </div>
                        {contact.phone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `tel:${contact.phone}`
                              onOpenChange(false)
                            }}
                            className="rounded-md border bg-background p-2 hover:bg-accent"
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Jobs/Deals */}
                {searchResults.deals && searchResults.deals.length > 0 && (
                  <Command.Group heading="Jobs" className="mb-2">
                    {searchResults.deals.map((deal: any) => (
                      <Command.Item
                        key={deal.id}
                        value={`deal-${deal.id}`}
                        onSelect={() =>
                          executeAction(() => {
                            router.push(`/app/deals/${deal.id}`)
                          })
                        }
                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                          <Target className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{deal.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {deal.contact
                              ? `${deal.contact.firstName} ${deal.contact.lastName}`
                              : deal.value
                              ? `$${deal.value.toLocaleString()}`
                              : 'No details'}
                          </div>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Phone Number Search Hint */}
                {isPhoneNumber && (!searchResults.contacts || searchResults.contacts.length === 0) && (
                  <Command.Group heading="Phone Search" className="mb-2">
                    <Command.Item
                      value="phone-search"
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                      disabled
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">No contact found</div>
                        <div className="text-xs text-muted-foreground">
                          Searching for: {search.replace(/\D/g, '')}
                        </div>
                      </div>
                    </Command.Item>
                  </Command.Group>
                )}
              </>
            )}
          </Command.List>

          {/* Footer with keyboard hints */}
          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">
                    ↵
                  </kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">
                    ESC
                  </kbd>
                  Close
                </span>
              </div>
            </div>
          </div>
        </Command>
      </div>
    </div>
  )
}

// Provider component to manage command palette state
export function CommandKProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [showContactDrawer, setShowContactDrawer] = useState(false)

  // Register Cmd/Ctrl+K hotkey
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowContactDrawer(false)
    }
  }, [open])

  // Handle new contact action
  const handleNewContact = useCallback(() => {
    setShowContactDrawer(true)
  }, [])

  // Close contact drawer
  const handleCloseContactDrawer = useCallback(() => {
    setShowContactDrawer(false)
  }, [])

  return (
    <>
      {children}
      <CommandK
        open={open}
        onOpenChange={setOpen}
        onNewContact={handleNewContact}
      />

      {/* Contact drawer will be injected via context or global state */}
      {showContactDrawer && (
        <div id="command-k-contact-drawer">
          {/* This will be handled by the ContactDrawer component */}
          {/* We'll emit a custom event that the contacts page can listen to */}
          {(() => {
            // Emit custom event for new contact
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('contact:create', {
                  detail: { timestamp: Date.now() },
                })
              )
            }
            // Close the drawer indicator after emission
            setTimeout(() => {
              setShowContactDrawer(false)
            }, 100)
            return null
          })()}
        </div>
      )}
    </>
  )
}
