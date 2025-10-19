'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  User,
  Building2,
  Target,
  ArrowRight,
  UserPlus,
  CheckSquare,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

type SearchResult = {
  id: string
  type: 'contact' | 'company' | 'deal'
  title: string
  subtitle?: string
  url: string
  metadata?: Record<string, any>
}

type QuickAction = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
}

export function SpotlightSearch() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null
  )
  const router = useRouter()
  const listRef = useRef<HTMLDivElement>(null)

  // Global search query
  const { data: searchResults, isLoading } = trpc.search.global.useQuery(
    { query: search },
    {
      enabled: open && search.length > 0,
      staleTime: 1000,
    }
  )

  // Keyboard shortcut to open spotlight (Cmd/Ctrl + K)
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
      setSearch('')
      setSelectedIndex(0)
      setShowQuickActions(false)
      setSelectedResult(null)
    }
  }, [open])

  // Parse search results - search.global returns array directly
  const results: SearchResult[] = searchResults || []

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = []
      }
      acc[result.type].push(result)
      return acc
    },
    {} as Record<string, SearchResult[]>
  )

  // Quick actions for selected result
  const getQuickActions = useCallback(
    (result: SearchResult): QuickAction[] => {
      const actions: QuickAction[] = []

      switch (result.type) {
        case 'contact':
          actions.push(
            {
              id: 'assign-owner',
              label: 'Assign owner',
              icon: UserPlus,
              action: () => {
                router.push(`/contacts/${result.id}?action=assign-owner`)
                setOpen(false)
              },
            },
            {
              id: 'new-task',
              label: 'Create task',
              icon: CheckSquare,
              action: () => {
                router.push(`/contacts/${result.id}?action=new-task`)
                setOpen(false)
              },
            },
            {
              id: 'send-email',
              label: 'Send email',
              icon: Mail,
              action: () => {
                router.push(`/contacts/${result.id}?action=send-email`)
                setOpen(false)
              },
            }
          )
          break
        case 'company':
          actions.push(
            {
              id: 'assign-owner',
              label: 'Assign owner',
              icon: UserPlus,
              action: () => {
                router.push(`/companies/${result.id}?action=assign-owner`)
                setOpen(false)
              },
            },
            {
              id: 'new-task',
              label: 'Create task',
              icon: CheckSquare,
              action: () => {
                router.push(`/companies/${result.id}?action=new-task`)
                setOpen(false)
              },
            }
          )
          break
        case 'deal':
          actions.push(
            {
              id: 'assign-owner',
              label: 'Assign owner',
              icon: UserPlus,
              action: () => {
                router.push(`/deals/${result.id}?action=assign-owner`)
                setOpen(false)
              },
            },
            {
              id: 'new-task',
              label: 'Create task',
              icon: CheckSquare,
              action: () => {
                router.push(`/deals/${result.id}?action=new-task`)
                setOpen(false)
              },
            },
            {
              id: 'schedule-meeting',
              label: 'Schedule meeting',
              icon: Calendar,
              action: () => {
                router.push(`/deals/${result.id}?action=schedule-meeting`)
                setOpen(false)
              },
            }
          )
          break
      }

      return actions
    },
    [router]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showQuickActions) {
        const actions = getQuickActions(selectedResult!)

        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, actions.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
          e.preventDefault()
          actions[selectedIndex]?.action()
        } else if (e.key === 'Escape' || e.key === 'ArrowLeft') {
          e.preventDefault()
          setShowQuickActions(false)
          setSelectedIndex(0)
        }
      } else {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
          e.preventDefault()
          const result = results[selectedIndex]
          if (result) {
            openResult(result)
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          const result = results[selectedIndex]
          if (result) {
            setSelectedResult(result)
            setShowQuickActions(true)
            setSelectedIndex(0)
          }
        }
      }
    },
    [results, selectedIndex, showQuickActions, selectedResult, getQuickActions]
  )

  // Open result
  const openResult = useCallback(
    (result: SearchResult) => {
      const routes = {
        contact: '/contacts',
        company: '/companies',
        deal: '/deals',
      }
      router.push(`${routes[result.type]}/${result.id}`)
      setOpen(false)
    },
    [router]
  )

  // Get icon for result type
  const getIcon = (type: string) => {
    switch (type) {
      case 'contact':
        return User
      case 'company':
        return Building2
      case 'deal':
        return Target
      default:
        return User
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command
        className="rounded-lg border shadow-md"
        onKeyDown={handleKeyDown}
      >
        <CommandInput
          placeholder="Search contacts, companies, deals..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList ref={listRef}>
          {!showQuickActions ? (
            <>
              <CommandEmpty>
                {isLoading ? 'Searching...' : 'No results found.'}
              </CommandEmpty>

              {Object.entries(groupedResults).map(([type, items]) => (
                <CommandGroup
                  key={type}
                  heading={type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                >
                  {items.map((result, index) => {
                    const Icon = getIcon(result.type)
                    const globalIndex = results.indexOf(result)
                    const isSelected = globalIndex === selectedIndex

                    return (
                      <CommandItem
                        key={result.id}
                        value={`${result.type}-${result.id}`}
                        onSelect={() => openResult(result)}
                        className={cn(
                          'flex items-center justify-between',
                          isSelected && 'bg-accent'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-sm text-muted-foreground">
                                {result.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                              →
                            </kbd>
                            <span>for actions</span>
                          </div>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b px-3 py-2 text-sm">
                <button
                  onClick={() => {
                    setShowQuickActions(false)
                    setSelectedIndex(0)
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
                <div className="h-4 w-px bg-border" />
                <span className="font-medium">{selectedResult?.title}</span>
              </div>
              <CommandGroup heading="Quick Actions">
                {getQuickActions(selectedResult!).map((action, index) => {
                  const Icon = action.icon
                  const isSelected = index === selectedIndex

                  return (
                    <CommandItem
                      key={action.id}
                      value={action.id}
                      onSelect={action.action}
                      className={cn(
                        'flex items-center gap-3',
                        isSelected && 'bg-accent'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{action.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

// Spotlight trigger button component
export function SpotlightTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Open spotlight search"
    >
      <span>Search...</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  )
}
