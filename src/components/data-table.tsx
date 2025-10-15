'use client'

import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useLoadingState } from '@/hooks/use-loading-state'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
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
  editRender?: (value: any, item: T, onChange: (value: any) => void) => React.ReactNode
}

export interface DataTableProps<T = any> {
  entity: 'contacts' | 'companies'
  columns: Column<T>[]
  searchPlaceholder?: string
  onCreate?: () => void
  onImport?: () => void
  className?: string
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
}: DataTableProps<T>) {
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
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(initialColumns.map(col => col.id))
  )
  const [savedViews, setSavedViews] = useState<Array<{ id: string; name: string; columns: string[] }>>([])

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
      limit: 50,
      cursor: cursor || undefined,
    },
    {
      keepPreviousData: true,
    }
  )

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
  const { showSkeleton, showEmptyState } = useLoadingState(listQuery.isLoading && data.length === 0, {
    timeout: 400,
    showToast: true,
    toastMessage: `Loading ${entity} is taking longer than expected...`,
    onTimeout: () => {
      console.error(`Failed to load ${entity} within timeout`)
    },
  })

  // Update data when query changes
  useEffect(() => {
    if (listQuery.data) {
      setData(prevData => {
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
  const handleRowSelect = useCallback((rowId: string, checked: boolean, shiftKey: boolean = false) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (checked) {
        if (shiftKey && prev.size > 0) {
          // Shift-click for range selection
          const allIds = data.map(item => item.id)
          const currentIndex = allIds.indexOf(rowId)
          const lastSelectedIndex = allIds.findIndex(id => prev.has(id))

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
  }, [data])

  // Handle sorting
  const handleSort = useCallback((columnId: string) => {
    if (sortBy === columnId) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(columnId)
      setSortOrder('asc')
    }
  }, [sortBy])

  // Handle inline editing
  const handleCellEdit = useCallback((rowId: string, columnId: string, value: any) => {
    const column = initialColumns.find(col => col.id === columnId)
    if (!column?.editable) return

    // Optimistic update
    setData(prevData =>
      prevData.map(item =>
        item.id === rowId
          ? { ...item, [columnId]: value }
          : item
      )
    )

    // Server update
    updateMutation.mutate({
      id: rowId,
      data: { [columnId]: value },
    })

    setEditingCell(null)
  }, [initialColumns, updateMutation])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (data.length === 0) return

    const visibleCols = initialColumns.filter(col => visibleColumns.has(col.id))

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedRowIndex(prev => Math.min(prev + 1, data.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedRowIndex(prev => Math.max(prev - 1, 0))
        break
      case 'ArrowLeft':
        e.preventDefault()
        setFocusedCellIndex(prev => Math.max(prev - 1, 0))
        break
      case 'ArrowRight':
        e.preventDefault()
        setFocusedCellIndex(prev => Math.min(prev + 1, visibleCols.length - 1))
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
  }, [data, focusedRowIndex, focusedCellIndex, visibleColumns, initialColumns, selectedRows, handleRowSelect])

  // Column resizing
  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [columnId]: width }))
  }, [])

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
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
  const saveView = useCallback((name: string) => {
    const view = {
      id: Date.now().toString(),
      name,
      columns: Array.from(visibleColumns),
    }
    setSavedViews(prev => [...prev, view])
  }, [visibleColumns])

  // Load view
  const loadView = useCallback((viewId: string) => {
    const view = savedViews.find(v => v.id === viewId)
    if (view) {
      setVisibleColumns(new Set(view.columns))
    }
  }, [savedViews])

  // Render cell value
  const renderCellValue = useCallback((item: T, column: Column<T>, isEditing: boolean) => {
    const value = typeof column.accessor === 'function'
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
  }, [handleCellEdit])

  const visibleCols = initialColumns.filter(col => visibleColumns.has(col.id))

  // Render mobile card view
  const renderMobileCard = (item: T, index: number) => {
    const primaryColumn = visibleCols.find((col: Column<T>) => col.id === 'name' || col.id === 'firstName') || visibleCols[0]
    const secondaryColumn = visibleCols.find((col: Column<T>) => col.id === 'email' || col.id === 'website') || visibleCols[1]

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
              <h3 className="font-semibold text-lg">
                {primaryColumn ? renderCellValue(item, primaryColumn, false) : item.id}
              </h3>
              {secondaryColumn && (
                <p className="text-sm text-muted-foreground mt-1">
                  {renderCellValue(item, secondaryColumn, false)}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedRows.has(item.id)}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  handleRowSelect(item.id, !!checked)
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
                <span className="ml-1">{renderCellValue(item, column, false)}</span>
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-muted rounded-full"></div>
        </div>
      </div>
    )
  }

  // Show empty state after timeout
  if (showEmptyState) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Loading is taking longer than expected</p>
          <Button onClick={() => listQuery.refetch()} variant="outline">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (listQuery.isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load data</p>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          {selectedRows.size > 0 && (
            <Badge variant="secondary">
              {selectedRows.size} selected
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Column chooser */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {initialColumns.map(column => (
                <DropdownMenuItem
                  key={column.id}
                  onClick={() => toggleColumnVisibility(column.id)}
                  className="flex items-center space-x-2"
                >
                  {visibleColumns.has(column.id) ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  <span>{column.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Saved views */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Views
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedViews.map(view => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => loadView(view.id)}
                >
                  {view.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => saveView(`View ${savedViews.length + 1}`)}>
                Save current view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Actions */}
          <Button onClick={onCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add {entity.slice(0, -1)}
          </Button>
        </div>
      </div>

      {/* Table or Mobile Cards */}
      {isMobile ? (
        <div className="space-y-4">
          {data.map((item, index) => renderMobileCard(item, index))}
          {hasMore && (
            <div className="p-4 text-center">
              <Button
                onClick={loadMore}
                disabled={loading}
                variant="outline"
              >
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
              actions={[
                {
                  label: `Add ${entity.slice(0, -1)}`,
                  onClick: onCreate || (() => {}),
                  icon: Plus,
                },
                {
                  label: 'Import CSV',
                  onClick: onImport || (() => {}),
                  variant: 'outline' as const,
                  icon: Upload,
                },
              ]}
            />
          )}
        </div>
      ) : (
        <div
          ref={tableRef}
          className="border rounded-md overflow-hidden"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === data.length && data.length > 0}
                    onCheckedChange={(checked: boolean | 'indeterminate') => {
                      if (checked) {
                        setSelectedRows(new Set(data.map(item => item.id)))
                      } else {
                        setSelectedRows(new Set())
                      }
                    }}
                  />
                </TableHead>
                {visibleCols.map(column => (
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
                              'h-3 w-3 -mt-1',
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
                        const startWidth = columnWidths[column.id] || column.width || 150

                        const handleMouseMove = (e: MouseEvent) => {
                          const newWidth = Math.max(
                            column.minWidth || 50,
                            startWidth + (e.clientX - startX)
                          )
                          handleColumnResize(column.id, newWidth)
                        }

                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove)
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
                  className={cn(
                    'cursor-pointer',
                    selectedRows.has(item.id) && 'bg-muted',
                    focusedRowIndex === rowIndex && 'ring-2 ring-primary'
                  )}
                  onClick={() => {
                    setSelectedItem(item)
                    setDrawerOpen(true)
                  }}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(item.id)}
                      onCheckedChange={(checked: boolean | 'indeterminate') =>
                        handleRowSelect(item.id, !!checked)
                      }
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    />
                  </TableCell>
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
                          setEditingCell({ rowId: item.id, columnId: column.id })
                        }
                      }}
                    >
                      {renderCellValue(
                        item,
                        column,
                        editingCell?.rowId === item.id && editingCell?.columnId === column.id
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Load more */}
          {hasMore && (
            <div className="p-4 text-center border-t">
              <Button
                onClick={loadMore}
                disabled={loading}
                variant="outline"
              >
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
              actions={[
                {
                  label: `Add ${entity.slice(0, -1)}`,
                  onClick: onCreate || (() => {}),
                  icon: Plus,
                },
                {
                  label: 'Import CSV',
                  onClick: onImport || (() => {}),
                  variant: 'outline' as const,
                  icon: Upload,
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
    </div>
  )
}