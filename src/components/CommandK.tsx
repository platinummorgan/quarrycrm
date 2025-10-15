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
} from 'lucide-react'

// Props for controlling the command palette
interface CommandKProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNewContact?: () => void
}

export function CommandK({ open, onOpenChange, onNewContact }: CommandKProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

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
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Command palette search"
            />
            <kbd className="ml-auto hidden select-none rounded border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground sm:block">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Actions Group */}
            <Command.Group heading="Actions" className="mb-2">
              <Command.Item
                value="new-contact"
                onSelect={() =>
                  executeAction(() => {
                    if (onNewContact) {
                      onNewContact()
                    }
                  })
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">New Contact</div>
                  <div className="text-xs text-muted-foreground">
                    Create a new contact
                  </div>
                </div>
                <kbd className="hidden select-none rounded border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground sm:block">
                  ↵
                </kbd>
              </Command.Item>

              <Command.Item
                value="import-csv"
                onSelect={() =>
                  executeAction(() => {
                    router.push('/app/contacts?import=1')
                  })
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Import CSV</div>
                  <div className="text-xs text-muted-foreground">
                    Import contacts from CSV file
                  </div>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Navigation Group */}
            <Command.Group heading="Navigation" className="mb-2">
              <Command.Item
                value="go-to-contacts"
                onSelect={() =>
                  executeAction(() => {
                    router.push('/app/contacts')
                  })
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Go to Contacts</div>
                  <div className="text-xs text-muted-foreground">
                    View all contacts
                  </div>
                </div>
              </Command.Item>

              <Command.Item
                value="go-to-deals"
                onSelect={() =>
                  executeAction(() => {
                    router.push('/app/deals')
                  })
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                  <Target className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Go to Deals</div>
                  <div className="text-xs text-muted-foreground">
                    View all deals
                  </div>
                </div>
              </Command.Item>

              <Command.Item
                value="go-to-companies"
                onSelect={() =>
                  executeAction(() => {
                    router.push('/app/companies')
                  })
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Go to Companies</div>
                  <div className="text-xs text-muted-foreground">
                    View all companies
                  </div>
                </div>
              </Command.Item>

              <Command.Item
                value="go-to-activities"
                onSelect={() =>
                  executeAction(() => {
                    router.push('/app/activities')
                  })
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Go to Activities</div>
                  <div className="text-xs text-muted-foreground">
                    View all activities
                  </div>
                </div>
              </Command.Item>

              <Command.Item
                value="go-to-settings"
                onSelect={() =>
                  executeAction(() => {
                    router.push('/app/settings')
                  })
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
                  <Settings className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Go to Settings</div>
                  <div className="text-xs text-muted-foreground">
                    Manage your settings
                  </div>
                </div>
              </Command.Item>
            </Command.Group>
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
