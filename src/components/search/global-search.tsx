'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  Building2,
  Target,
  UserCheck,
  Plus,
  Calendar,
  DollarSign,
  Percent,
} from 'lucide-react'
import { format } from 'date-fns'

interface SearchResult {
  id: string
  type: 'contact' | 'company' | 'deal'
  title: string
  subtitle?: string
  url: string
  metadata?: Record<string, any>
}

const typeIcons = {
  contact: Users,
  company: Building2,
  deal: Target,
}

const typeColors = {
  contact: 'bg-blue-100 text-blue-800',
  company: 'bg-green-100 text-green-800',
  deal: 'bg-purple-100 text-purple-800',
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  // Search query with debouncing
  const { data: results = [], isLoading } = trpc.search.global.useQuery(
    { query, limit: 10 },
    {
      enabled: query.length > 2,
      staleTime: 1000, // Cache for 1 second
    }
  )

  // Keyboard shortcuts
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

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (results.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % results.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(
            (prev) => (prev - 1 + results.length) % results.length
          )
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex])
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          // Quick actions would go here
          break
      }
    },
    [results, selectedIndex]
  )

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(result.url)
  }

  const handleQuickAction = (action: string, result: SearchResult) => {
    setOpen(false)
    setQuery('')

    switch (action) {
      case 'assign-owner':
        // This would open a modal or navigate to assignment
        console.log('Assign owner for', result.type, result.id)
        break
      case 'new-task':
        // This would open a task creation modal
        console.log('Create task for', result.type, result.id)
        break
      default:
        router.push(result.url)
    }
  }

  const renderResult = (result: SearchResult, index: number) => {
    const Icon = typeIcons[result.type]
    const isSelected = index === selectedIndex

    return (
      <CommandItem
        key={result.id}
        value={`${result.type}-${result.id}`}
        onSelect={() => handleSelect(result)}
        className={`flex items-center gap-3 p-3 ${isSelected ? 'bg-accent' : ''}`}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className={typeColors[result.type]}>
            <Icon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{result.title}</span>
            <Badge variant="secondary" className="text-xs">
              {result.type}
            </Badge>
          </div>
          {result.subtitle && (
            <p className="truncate text-sm text-muted-foreground">
              {result.subtitle}
            </p>
          )}
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            {result.metadata?.email && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {result.metadata.email}
              </span>
            )}
            {result.metadata?.value && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(result.metadata.value)}
              </span>
            )}
            {result.metadata?.probability && (
              <span className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                {result.metadata.probability}%
              </span>
            )}
            {result.metadata?.expectedClose && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(result.metadata.expectedClose), 'MMM d')}
              </span>
            )}
          </div>
        </div>

        {/* Quick actions - shown when selected */}
        {isSelected && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleQuickAction('assign-owner', result)
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Assign owner"
            >
              <UserCheck className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleQuickAction('new-task', result)
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Create task"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </CommandItem>
    )
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search contacts, companies, deals..."
        value={query}
        onValueChange={setQuery}
        onKeyDown={handleKeyDown}
      />
      <CommandList>
        <CommandEmpty>
          {query.length < 3
            ? 'Type at least 3 characters to search...'
            : isLoading
              ? 'Searching...'
              : 'No results found.'}
        </CommandEmpty>

        {results.length > 0 && (
          <>
            <CommandGroup heading="Results">
              {results.map((result, index) => renderResult(result, index))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  router.push('/app/contacts/new')
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create new contact
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  router.push('/app/companies/new')
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create new company
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  router.push('/app/deals/new')
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create new deal
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
