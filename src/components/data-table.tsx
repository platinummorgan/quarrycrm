'use client'

import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useLoadingState } from '@/hooks/use-loading-state'
import { useSession } from 'next-auth/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  Settings,
  Plus,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Upload,
  Download,
  Save,
  X,
  Users,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Components
import { DetailDrawer } from './detail-drawer'
import { EmptyState } from './empty-state'
import { maskPII } from '@/lib/mask-pii'

// Types
export interface Column<T = any> {
  id: string
  label: string
  accessor: keyof T | ((item: T) => any)
  sortable?: boolean
  filterable?: boolean
  editable?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  render?: (value: any, item: T, isEditing: boolean) => React.ReactNode
  editRender?: (
    value: any,
    item: T,
    onChange: (value: any) => void
  ) => React.ReactNode
}

export interface DataTableProps<T = any> {
  entity: 'contacts' | 'companies'
  columns: Column<T>[]
  searchPlaceholder?: string
  onCreate?: () => void
  onImport?: () => void
  className?: string
  showCheckboxes?: boolean // Whether to show row selection checkboxes
}

export interface DetailDrawerProps<T = any> {
  entity: 'contacts' | 'companies'
  item: T | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// DataTable Component
export function DataTable<T extends { id: string; updatedAt: string }>({
  entity,
  columns: initialColumns,
  searchPlaceholder = 'Search...',
  onCreate,
  onImport,
  className,
  showCheckboxes = false, // Default to false - hide checkboxes
}: DataTableProps<T>) {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const isDemo =
    session?.user?.isDemo || session?.user?.currentOrg?.role === 'DEMO'
  const tableRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingCell, setEditingCell] = useState<{
    rowId: string
    columnId: string
  } | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(initialColumns.map((col) => col.id))
  )
  const [savedViews, setSavedViews] = useState<
    Array<{ id: string; name: string; columns: string[] }>
  >([])
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)

  // Keyboard navigation state
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1)
  const [focusedCellIndex, setFocusedCellIndex] = useState<number>(-1)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // tRPC hooks
  const listQuery = (trpc as any)[entity].list.useQuery(
    {
      q: searchQuery || undefined,
      cursor: cursor || undefined,
      sortBy: sortBy || undefined,
      sortOrder,
    },
    {
      keepPreviousData: true,
    }
  )
  
  // Load saved views from database
  const entityTypeMap: Record<string, 'CONTACT' | 'COMPANY' | 'DEAL'> = {
    contacts: 'CONTACT',
    companies: 'COMPANY',
    deals: 'DEAL',
  }
  const savedViewsQuery = trpc.savedViews.list.useQuery({
    entityType: entityTypeMap[entity],
  })
  
  // Create view mutation
  const createViewMutation = trpc.savedViews.create.useMutation({
    onSuccess: (data) => {
      console.log('✅ View saved successfully:', data)
      savedViewsQuery.refetch()
    },
    onError: (error) => {
      console.error('❌ Failed to save view:', error)
    },
  })

  // Sync savedViews state with database (only name for now, columns not persisted)
  useEffect(() => {
    if (savedViewsQuery.data) {
      setSavedViews(
        savedViewsQuery.data.map((v) => ({
          id: v.id,
          name: v.name,
          columns: initialColumns.map((c) => c.id), // Use default columns
        }))
      )
    }
  }, [savedViewsQuery.data, initialColumns])

  const { data: listData, isLoading: listLoading } = listQuery

  const updateMutation = (trpc as any)[entity].update.useMutation({
    onSuccess: () => {
      // Refetch data after successful update
      listQuery.refetch()
    },
    onError: (error: any) => {
      console.error('Update failed:', error)
      // Rollback optimistic update
      listQuery.refetch()
    },
  })

  // Use loading state hook for skeleton → empty UI pattern
  const { showSkeleton, showEmptyState } = useLoadingState(
    listQuery.isLoading && data.length === 0,
    {
      // No timeout - data will load as long as it takes
      // Passing `null` disables the timeout and keeps the skeleton until loading finishes
      timeout: null,
    }
  )

  // Update data when query changes
  useEffect(() => {
    if (listQuery.data) {
      setData((prevData) => {
        if (cursor) {
          return [...prevData, ...listQuery.data.items]
        }
        return listQuery.data.items
      })
      setHasMore(listQuery.data.hasMore)
    }
  }, [listQuery.data, cursor])

  // Reset data when search changes
  useEffect(() => {
    setData([])
    setCursor(null)
    setFocusedRowIndex(-1)
    setFocusedCellIndex(-1)
  }, [searchQuery])

  // Load more data
  const loadMore = useCallback(() => {
    if (hasMore && !loading && listQuery.data?.nextCursor) {
      setCursor(listQuery.data.nextCursor)
    }
  }, [hasMore, loading, listQuery.data?.nextCursor])

  // Handle row selection
  const handleRowSelect = useCallback(
    (rowId: string, checked: boolean, shiftKey: boolean = false) => {
      setSelectedRows((prev) => {
        const newSet = new Set(prev)
        if (checked) {
          if (shiftKey && prev.size > 0) {
            // Shift-click for range selection
            const allIds = data.map((item) => item.id)
            const currentIndex = allIds.indexOf(rowId)
            const lastSelectedIndex = allIds.findIndex((id) => prev.has(id))

            if (lastSelectedIndex !== -1) {
              const start = Math.min(currentIndex, lastSelectedIndex)
              const end = Math.max(currentIndex, lastSelectedIndex)

              for (let i = start; i <= end; i++) {
                newSet.add(allIds[i])
              }
            }
          } else {
            newSet.add(rowId)
          }
        } else {
          newSet.delete(rowId)
        }
        return newSet
      })
    },
    [data]
  )

  // Handle sorting
  const handleSort = useCallback(
    (columnId: string) => {
      if (sortBy === columnId) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortBy(columnId)
        setSortOrder('asc')
      }
    },
    [sortBy]
  )

  // Handle inline editing
  const handleCellEdit = useCallback(
    (rowId: string, columnId: string, value: any) => {
      const column = initialColumns.find((col) => col.id === columnId)
      if (!column?.editable) return

      // Optimistic update
      setData((prevData) =>
        prevData.map((item) =>
          item.id === rowId ? { ...item, [columnId]: value } : item
        )
      )

      // Server update
      updateMutation.mutate({
        id: rowId,
        data: { [columnId]: value },
      })

      setEditingCell(null)
    },
    [initialColumns, updateMutation]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (data.length === 0) return

      const visibleCols = initialColumns.filter((col) =>
        visibleColumns.has(col.id)
      )

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedRowIndex((prev) => Math.min(prev + 1, data.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedRowIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'ArrowLeft':
          e.preventDefault()
          setFocusedCellIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'ArrowRight':
          e.preventDefault()
          setFocusedCellIndex((prev) =>
            Math.min(prev + 1, visibleCols.length - 1)
          )
          break
        case 'Enter':
          e.preventDefault()
          if (focusedRowIndex >= 0) {
            const item = data[focusedRowIndex]
            setSelectedItem(item)
            setDrawerOpen(true)
          }
          break
        case ' ':
          e.preventDefault()
          if (focusedRowIndex >= 0) {
            const item = data[focusedRowIndex]
            handleRowSelect(item.id, !selectedRows.has(item.id))
          }
          break
      }
    },
    [
      data,
      focusedRowIndex,
      focusedCellIndex,
      visibleColumns,
      initialColumns,
      selectedRows,
      handleRowSelect,
    ]
  )

  // Column resizing
  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [columnId]: width }))
  }, [])

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(columnId)) {
        newSet.delete(columnId)
      } else {
        newSet.add(columnId)
      }
      return newSet
    })
  }, [])

  // Save view
  const saveView = useCallback(
    (name: string) => {
      const entityTypeMap: Record<string, 'CONTACT' | 'COMPANY' | 'DEAL'> = {
        contacts: 'CONTACT',
        companies: 'COMPANY',
        deals: 'DEAL',
      }
      
      console.log('💾 Saving view:', { name, entity, entityType: entityTypeMap[entity] })
      
      // Save to database via tRPC (only filters/sorting for now, columns not persisted)
      createViewMutation.mutate({
        name,
        entityType: entityTypeMap[entity],
        filters: {},
        sortBy: sortBy || 'updatedAt',
        sortOrder,
      })
      setSaveViewDialogOpen(false)
      setNewViewName('')
    },
    [entity, sortBy, sortOrder, createViewMutation]
  )

  const openSaveViewDialog = useCallback(() => {
    setNewViewName(`View ${savedViews.length + 1}`)
    setSaveViewDialogOpen(true)
  }, [savedViews.length])

  // Load view
  const loadView = useCallback(
    (viewId: string) => {
      const view = savedViews.find((v) => v.id === viewId)
      if (view) {
        setVisibleColumns(new Set(view.columns))
      }
    },
    [savedViews]
  )

  // Render cell value
  const renderCellValue = useCallback(
    (item: T, column: Column<T>, isEditing: boolean) => {
      const value =
        typeof column.accessor === 'function'
          ? column.accessor(item)
          : item[column.accessor as keyof T]

      if (isEditing && column.editRender) {
        return column.editRender(value, item, (newValue) => {
          handleCellEdit(item.id, column.id, newValue)
        })
      }

      if (column.render) {
        return column.render(value, item, isEditing)
      }

      return String(value || '')
    },
    [handleCellEdit]
  )

  const visibleCols = initialColumns.filter((col) => visibleColumns.has(col.id))

  // Render mobile card view
  const renderMobileCard = (item: T, index: number) => {
    const primaryColumn =
      visibleCols.find(
        (col: Column<T>) => col.id === 'name' || col.id === 'firstName'
      ) || visibleCols[0]
    const secondaryColumn =
      visibleCols.find(
        (col: Column<T>) => col.id === 'email' || col.id === 'website'
      ) || visibleCols[1]

    return (
      <Card
        key={item.id}
        className={cn(
          'cursor-pointer transition-colors',
          selectedRows.has(item.id) && 'ring-2 ring-primary',
          focusedRowIndex === index && 'ring-2 ring-primary'
        )}
        onClick={() => {
          setSelectedItem(item)
          setDrawerOpen(true)
        }}
        tabIndex={0}
        role="button"
        aria-label={`View ${entity.slice(0, -1)} details`}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setSelectedItem(item)
            setDrawerOpen(true)
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {primaryColumn
                  ? renderCellValue(item, primaryColumn, false)
                  : item.id}
              </h3>
              {secondaryColumn && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {renderCellValue(item, secondaryColumn, false)}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedRows.has(item.id)}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  handleRowSelect(item.id, !!checked, false)
                }
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                aria-label={`Select ${entity.slice(0, -1)}`}
              />
            </div>
          </div>

          {/* Additional fields in mobile view */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {visibleCols.slice(2, 6).map((column: Column<T>) => (
              <div key={column.id}>
                <span className="text-muted-foreground">{column.label}:</span>
                <span className="ml-1">
                  {renderCellValue(item, column, false)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show skeleton for initial loading
  if (showSkeleton) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-8 rounded-full bg-muted"></div>
        </div>
      </div>
    )
  }

  // Show empty state after timeout
  if (showEmptyState) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-muted-foreground">
            Loading is taking longer than expected
          </p>
          <Button onClick={() => listQuery.refetch()} variant="outline">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (listQuery.isError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-destructive">Failed to load data</p>
          <Button onClick={() => listQuery.refetch()} variant="outline">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative" data-tour="contacts-search">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          {selectedRows.size > 0 && (
            <Badge variant="secondary">{selectedRows.size} selected</Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Column chooser - Popover with checkboxes */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-3">Visible Columns</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {initialColumns.map((column) => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`column-${column.id}`}
                          checked={visibleColumns.has(column.id)}
                          onCheckedChange={() => toggleColumnVisibility(column.id)}
                        />
                        <label
                          htmlFor={`column-${column.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {column.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Saved views */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="mr-2 h-4 w-4" />
                Views
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => loadView(view.id)}
                >
                  {view.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openSaveViewDialog}>
                Save current view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Actions - Don't show Add button if onCreate is provided, use FAB instead */}
        </div>
      </div>

      {/* Table or Mobile Cards */}
      {isMobile ? (
        <div className="space-y-4">
          {data.map((item, index) => renderMobileCard(item, index))}
          {hasMore && (
            <div className="p-4 text-center">
              <Button onClick={loadMore} disabled={loading} variant="outline">
                {loading ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
          {data.length === 0 && !listQuery.isLoading && (
            <EmptyState
              icon={entity === 'contacts' ? Users : Building2}
              iconLabel={`No ${entity} icon`}
              title={`No ${entity} yet`}
              description={`Get started by adding your first ${entity.slice(0, -1)} or importing from a CSV file.`}
              showCta={entity !== 'companies'}
              actions={[
                {
                  label: `Add ${entity.slice(0, -1)}`,
                  onClick: onCreate || (() => {}),
                  icon: Plus,
                  disabled: isDemo,
                  tooltip: isDemo ? 'Demo is read-only' : undefined,
                },
                {
                  label: 'Import CSV',
                  onClick: onImport || (() => {}),
                  variant: 'outline' as const,
                  icon: Upload,
                  disabled: isDemo,
                  tooltip: isDemo ? 'Demo is read-only' : undefined,
                },
              ]}
            />
          )}
        </div>
      ) : (
        <div
          ref={tableRef}
          className="overflow-hidden rounded-md border"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {showCheckboxes && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedRows.size === data.length && data.length > 0
                      }
                      onCheckedChange={(checked: boolean | 'indeterminate') => {
                        if (checked) {
                          setSelectedRows(new Set(data.map((item) => item.id)))
                        } else {
                          setSelectedRows(new Set())
                        }
                      }}
                    />
                  </TableHead>
                )}
                {visibleCols.map((column) => (
                  <TableHead
                    key={column.id}
                    style={{
                      width: columnWidths[column.id] || column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                    }}
                    className={cn(
                      'relative select-none',
                      column.sortable && 'cursor-pointer hover:bg-muted/50'
                    )}
                    onClick={() => column.sortable && handleSort(column.id)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <div className="flex flex-col">
                          <ChevronUp
                            className={cn(
                              'h-3 w-3',
                              sortBy === column.id && sortOrder === 'asc'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            )}
                          />
                          <ChevronDown
                            className={cn(
                              '-mt-1 h-3 w-3',
                              sortBy === column.id && sortOrder === 'desc'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            )}
                          />
                        </div>
                      )}
                    </div>
                    {/* Column resize handle */}
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        const startX = e.clientX
                        const startWidth =
                          columnWidths[column.id] || column.width || 150

                        const handleMouseMove = (e: MouseEvent) => {
                          const newWidth = Math.max(
                            column.minWidth || 50,
                            startWidth + (e.clientX - startX)
                          )
                          handleColumnResize(column.id, newWidth)
                        }

                        const handleMouseUp = () => {
                          document.removeEventListener(
                            'mousemove',
                            handleMouseMove
                          )
                          document.removeEventListener('mouseup', handleMouseUp)
                        }

                        document.addEventListener('mousemove', handleMouseMove)
                        document.addEventListener('mouseup', handleMouseUp)
                      }}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, rowIndex) => (
                <TableRow
                  key={item.id}
                  data-tour={rowIndex === 0 ? 'contact-row' : undefined}
                  className={cn(
                    'cursor-pointer',
                    selectedRows.has(item.id) && 'bg-muted',
                    focusedRowIndex === rowIndex && 'ring-2 ring-primary'
                  )}
                  onClick={() => {
                    // For contacts, use CustomEvent to trigger ContactDrawer
                    if (entity === 'contacts') {
                      window.dispatchEvent(
                        new CustomEvent('contact:select', {
                          detail: { contactId: item.id },
                        })
                      )
                    } else {
                      setSelectedItem(item)
                      setDrawerOpen(true)
                    }
                  }}
                >
                  {showCheckboxes && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(item.id)}
                        onCheckedChange={(checked: boolean | 'indeterminate') =>
                          handleRowSelect(item.id, !!checked, false)
                        }
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {visibleCols.map((column, cellIndex) => (
                    <TableCell
                      key={column.id}
                      style={{
                        width: columnWidths[column.id] || column.width,
                      }}
                      className={cn(
                        focusedRowIndex === rowIndex &&
                          focusedCellIndex === cellIndex &&
                          'ring-2 ring-primary'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (column.editable) {
                          setEditingCell({
                            rowId: item.id,
                            columnId: column.id,
                          })
                        }
                      }}
                    >
                      {renderCellValue(
                        item,
                        column,
                        editingCell?.rowId === item.id &&
                          editingCell?.columnId === column.id
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Load more */}
          {hasMore && (
            <div className="border-t p-4 text-center">
              <Button onClick={loadMore} disabled={loading} variant="outline">
                {loading ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}

          {/* Empty state */}
          {data.length === 0 && !listQuery.isLoading && (
            <EmptyState
              icon={entity === 'contacts' ? Users : Building2}
              iconLabel={`No ${entity} icon`}
              title={`No ${entity} yet`}
              description={`Get started by adding your first ${entity.slice(0, -1)} or importing from a CSV file.`}
              showCta={entity !== 'companies'}
              actions={[
                {
                  label: `Add ${entity.slice(0, -1)}`,
                  onClick: onCreate || (() => {}),
                  icon: Plus,
                  disabled: isDemo,
                  tooltip: isDemo ? 'Demo is read-only' : undefined,
                },
                {
                  label: 'Import CSV',
                  onClick: onImport || (() => {}),
                  variant: 'outline' as const,
                  icon: Upload,
                  disabled: isDemo,
                  tooltip: isDemo ? 'Demo is read-only' : undefined,
                },
              ]}
            />
          )}
        </div>
      )}

      {/* Detail Drawer */}
      <DetailDrawer
        entity={entity}
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Save View Dialog */}
      <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Give your view a name to save your current column selection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="View name"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newViewName.trim()) {
                  saveView(newViewName.trim())
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveViewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveView(newViewName.trim())}
              disabled={!newViewName.trim()}
            >
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
