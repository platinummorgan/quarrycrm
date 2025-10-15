'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getContacts } from '@/server/contacts'
import { contactListResponseSchema, type ContactListResponse } from '@/lib/zod/contacts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { EmptyState } from '@/components/empty-state'
import { ContactsToolbar, type ViewConfig } from './ContactsToolbar'
import { trpc } from '@/lib/trpc'

interface ContactsTableProps {
  initialData?: ContactListResponse
  initialQuery?: string
  initialCursor?: string
}

export function ContactsTable({
  initialData,
  initialQuery,
  initialCursor,
}: ContactsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(initialQuery || '')
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursor, setCursor] = useState<string | undefined>(initialCursor)
  const [data, setData] = useState<ContactListResponse | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const tableRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // View state management
  const [currentView, setCurrentView] = useState<ViewConfig>({
    filters: {},
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    visibleColumns: ['firstName', 'lastName', 'email', 'owner', 'updatedAt'],
  })

  // Load view from URL parameter
  useEffect(() => {
    const viewParam = searchParams.get('view')
    if (viewParam) {
      // Try to load shared view
      trpc.savedViews.getByUrl.useQuery({ viewUrl: viewParam }, {
        enabled: !!viewParam,
        onSuccess: (view) => {
          if (view) {
            setCurrentView({
              filters: view.filters as any,
              sortBy: view.sortBy || 'updatedAt',
              sortOrder: (view.sortOrder as 'asc' | 'desc') || 'desc',
              visibleColumns: currentView.visibleColumns,
            })
          }
        }
      })
    }
  }, [searchParams, trpc])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setCursor(undefined)
      setSelectedIndex(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Update URL when search or cursor changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery) params.set('q', debouncedQuery)
    if (cursor) params.set('cursor', cursor)

    const newUrl = params.toString() ? `/app/contacts?${params.toString()}` : '/app/contacts'
    router.replace(newUrl, { scroll: false })
  }, [debouncedQuery, cursor, router])

  // Fetch data when query, cursor, or view changes
  useEffect(() => {
    if (debouncedQuery === initialQuery && cursor === initialCursor && initialData) {
      return // Don't refetch if we already have the data
    }

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const result = await getContacts({
          q: debouncedQuery || undefined,
          cursor: cursor,
          // TODO: Add sortBy/sortOrder support to getContacts server action
          // sortBy: currentView.sortBy,
          // sortOrder: currentView.sortOrder,
          ...currentView.filters,
        })
        setData(result)
      } catch (error) {
        console.error('Failed to fetch contacts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [debouncedQuery, cursor, initialQuery, initialCursor, initialData, currentView])

  const contacts = data?.items || []
  const hasNextPage = data?.hasMore ?? false
  const hasPrevPage = !!cursor

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        // Allow Escape to blur input
        if (e.key === 'Escape') {
          ;(document.activeElement as HTMLElement).blur()
          e.preventDefault()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            Math.min(prev + 1, contacts.length - 1)
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (contacts[selectedIndex]) {
            // Dispatch custom event to open drawer
            window.dispatchEvent(new CustomEvent('contact:select', {
              detail: { contactId: contacts[selectedIndex].id }
            }))
          }
          break
        case '/':
          e.preventDefault()
          searchInputRef.current?.focus()
          break
        case 'n':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            // Dispatch custom event to create contact
            window.dispatchEvent(new CustomEvent('contact:create'))
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [contacts, selectedIndex])

  // Scroll selected row into view
  useEffect(() => {
    if (tableRef.current && contacts.length > 0) {
      const selectedRow = tableRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      )
      if (selectedRow) {
        selectedRow.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
    }
  }, [selectedIndex, contacts.length])

  // Reset selection when page changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [cursor, debouncedQuery])

  const handleNextPage = useCallback(() => {
    if (hasNextPage && data?.nextCursor) {
      setCursor(data.nextCursor)
    }
  }, [hasNextPage, data?.nextCursor])

  const handlePrevPage = useCallback(() => {
    // For previous page, we need to reset cursor and refetch
    setCursor(undefined)
  }, [])

  const handleCreateContact = () => {
    window.dispatchEvent(new CustomEvent('contact:create'))
  }

  const handleImportCSV = () => {
    router.push('/import/contacts')
  }

  const handleViewChange = useCallback((view: ViewConfig) => {
    setCurrentView(view)
    setCursor(undefined) // Reset pagination when view changes
    setSelectedIndex(0)
  }, [])

  const handleSelectContact = (contactId: string) => {
    window.dispatchEvent(new CustomEvent('contact:select', {
      detail: { contactId }
    }))
  }

  // Empty state
  if (!isLoading && contacts.length === 0 && !debouncedQuery) {
    return (
      <div className="space-y-4">
        <ContactsToolbar
          currentView={currentView}
          onViewChange={handleViewChange}
          onCreateContact={handleCreateContact}
          onImportContacts={handleImportCSV}
        />
        <EmptyState
          icon={Search}
          title="No contacts yet"
          description="Get started by adding your first contact or importing from CSV"
          actions={[
            {
              label: 'Add Contact',
              onClick: handleCreateContact,
              variant: 'default',
              icon: Plus,
            },
            {
              label: 'Import CSV',
              onClick: handleImportCSV,
              variant: 'outline' as const,
              icon: Upload,
            },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Contacts Toolbar */}
      <ContactsToolbar
        currentView={currentView}
        onViewChange={handleViewChange}
        onCreateContact={handleCreateContact}
        onImportContacts={handleImportCSV}
      />

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search contacts... (press / to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Results count */}
      {data && (
        <div className="text-sm text-muted-foreground">
          {data.total === 0
            ? 'No contacts found'
            : `Showing ${cursor ? 'more' : '1'}-${Math.min(25, data.total)} of ${data.total} contacts`}
        </div>
      )}

      {/* Table */}
      <div
        ref={tableRef}
        className="relative rounded-md border overflow-hidden"
      >
        <div className="overflow-auto max-h-[calc(100vh-300px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 border-b shadow-sm">
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead className="w-[200px]">Owner</TableHead>
                <TableHead className="w-[150px]">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-[180px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[160px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                  </TableRow>
                ))
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-50" />
                      <p>No contacts found matching &quot;{debouncedQuery}&quot;</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear search
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact, index) => (
                  <TableRow
                    key={contact.id}
                    data-index={index}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedIndex === index &&
                        'bg-muted/50 ring-2 ring-primary ring-inset'
                    )}
                    onClick={() => handleSelectContact(contact.id)}
                  >
                    <TableCell className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.email || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {contact.owner.user.name ||
                        contact.owner.user.email.split('@')[0]}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(contact.updatedAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && contacts.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {cursor ? 'Page 2+' : 'Page 1'}
            {data?.hasMore && ' of many'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={!hasPrevPage || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasNextPage || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        <kbd className="px-2 py-1 bg-muted rounded">↑</kbd>
        <kbd className="px-2 py-1 bg-muted rounded ml-1">↓</kbd> Navigate •{' '}
        <kbd className="px-2 py-1 bg-muted rounded">Enter</kbd> Open •{' '}
        <kbd className="px-2 py-1 bg-muted rounded">/</kbd> Search •{' '}
        <kbd className="px-2 py-1 bg-muted rounded">Ctrl+N</kbd> New
      </div>
    </div>
  )
}
