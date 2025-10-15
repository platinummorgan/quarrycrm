'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Save,
  Star,
  StarOff,
  Share2,
  Settings,
  Plus,
  Eye,
  EyeOff,
  Filter,
  ArrowUpDown,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ViewFilters {
  [key: string]: any
}

export interface ViewConfig {
  filters: ViewFilters
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  visibleColumns?: string[]
}

export interface ContactsToolbarProps {
  currentView: ViewConfig
  onViewChange: (view: ViewConfig) => void
  onCreateContact?: () => void
  onImportContacts?: () => void
  className?: string
}

export function ContactsToolbar({
  currentView,
  onViewChange,
  onCreateContact,
  onImportContacts,
  className,
}: ContactsToolbarProps) {
  const { toast } = useToast()
  const sessionResult = useSession()
  const session = sessionResult?.data
  const isDemo = session?.user?.isDemo || session?.user?.currentOrg?.role === 'DEMO'
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [newViewName, setNewViewName] = useState('')
  const [newViewDescription, setNewViewDescription] = useState('')
  const [newViewIsPublic, setNewViewIsPublic] = useState(false)
  const [newViewIsStarred, setNewViewIsStarred] = useState(false)

  // tRPC hooks
  const { data: savedViews, refetch: refetchViews } = trpc.savedViews.list.useQuery({
    entityType: 'CONTACT',
    includePublic: true,
  })

  const createViewMutation = trpc.savedViews.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'View saved',
        description: 'Your view has been saved successfully.',
      })
      refetchViews()
      setSaveDialogOpen(false)
      resetSaveForm()
    },
    onError: (error) => {
      toast({
        title: 'Failed to save view',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const updateViewMutation = trpc.savedViews.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'View updated',
        description: 'Your view has been updated successfully.',
      })
      refetchViews()
    },
    onError: (error) => {
      toast({
        title: 'Failed to update view',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteViewMutation = trpc.savedViews.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'View deleted',
        description: 'Your view has been deleted successfully.',
      })
      refetchViews()
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete view',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const toggleStarMutation = trpc.savedViews.toggleStar.useMutation({
    onSuccess: () => {
      refetchViews()
    },
    onError: (error) => {
      toast({
        title: 'Failed to update view',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const resetSaveForm = useCallback(() => {
    setNewViewName('')
    setNewViewDescription('')
    setNewViewIsPublic(false)
    setNewViewIsStarred(false)
  }, [])

  const handleSaveView = useCallback(() => {
    if (!newViewName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your view.',
        variant: 'destructive',
      })
      return
    }

    createViewMutation.mutate({
      name: newViewName.trim(),
      description: newViewDescription.trim() || undefined,
      entityType: 'CONTACT',
      filters: currentView.filters,
      sortBy: currentView.sortBy,
      sortOrder: currentView.sortOrder,
      isPublic: newViewIsPublic,
      isStarred: newViewIsStarred,
    })
  }, [
    newViewName,
    newViewDescription,
    newViewIsPublic,
    newViewIsStarred,
    currentView,
    createViewMutation,
    toast,
  ])

  const handleLoadView = useCallback((viewId: string) => {
    const view = savedViews?.find(v => v.id === viewId)
    if (view) {
      onViewChange({
        filters: view.filters as ViewFilters,
        sortBy: view.sortBy || undefined,
        sortOrder: view.sortOrder as 'asc' | 'desc' | undefined,
        visibleColumns: currentView.visibleColumns, // Keep current column visibility
      })
      setSelectedViewId(viewId)
      toast({
        title: 'View loaded',
        description: `Loaded view "${view.name}"`,
      })
    }
  }, [savedViews, onViewChange, currentView.visibleColumns, toast])

  const handleToggleStar = useCallback((viewId: string) => {
    toggleStarMutation.mutate({ id: viewId })
  }, [toggleStarMutation])

  const handleDeleteView = useCallback((viewId: string) => {
    if (confirm('Are you sure you want to delete this view?')) {
      deleteViewMutation.mutate({ id: viewId })
    }
  }, [deleteViewMutation])

  const handleShareView = useCallback((viewId: string) => {
    const view = savedViews?.find(v => v.id === viewId)
    if (view?.viewUrl) {
      const shareUrl = `${window.location.origin}/app/contacts?view=${view.viewUrl}`
      navigator.clipboard.writeText(shareUrl)
      toast({
        title: 'Link copied',
        description: 'Share link has been copied to clipboard.',
      })
    } else {
      // Make view public first
      updateViewMutation.mutate({
        id: viewId,
        isPublic: true,
      })
    }
  }, [savedViews, updateViewMutation, toast])

  const getShareUrl = useCallback((viewId: string) => {
    const view = savedViews?.find(v => v.id === viewId)
    if (view?.viewUrl) {
      return `${window.location.origin}/app/contacts?view=${view.viewUrl}`
    }
    return null
  }, [savedViews])

  const starredViews = savedViews?.filter(v => v.isStarred) || []
  const regularViews = savedViews?.filter(v => !v.isStarred) || []

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Left side - Search and Filters */}
      <div className="flex items-center gap-2">
        {/* Quick filters could go here */}
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>

        {/* Sort dropdown */}
        <Select
          value={`${currentView.sortBy || 'updatedAt'}-${currentView.sortOrder || 'desc'}`}
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split('-')
            onViewChange({
              ...currentView,
              sortBy,
              sortOrder: sortOrder as 'asc' | 'desc',
            })
          }}
        >
          <SelectTrigger className="w-40">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="firstName-asc">Name A-Z</SelectItem>
            <SelectItem value="firstName-desc">Name Z-A</SelectItem>
            <SelectItem value="email-asc">Email A-Z</SelectItem>
            <SelectItem value="email-desc">Email Z-A</SelectItem>
            <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
            <SelectItem value="updatedAt-asc">Least Recently Updated</SelectItem>
            <SelectItem value="createdAt-desc">Recently Created</SelectItem>
            <SelectItem value="createdAt-asc">Oldest Created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right side - Views and Actions */}
      <div className="flex items-center gap-2">
        {/* Saved Views Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Views
              {savedViews && savedViews.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {savedViews.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Starred views */}
            {starredViews.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
                  Starred
                </DropdownMenuLabel>
                {starredViews.map((view) => (
                  <DropdownMenuItem
                    key={view.id}
                    onClick={() => handleLoadView(view.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className={cn(selectedViewId === view.id && 'font-semibold')}>
                        {view.name}
                      </span>
                      {view.isPublic && <Eye className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleStar(view.id)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <StarOff className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleShareView(view.id)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {/* Regular views */}
            {regularViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => handleLoadView(view.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className={cn(selectedViewId === view.id && 'font-semibold')}>
                    {view.name}
                  </span>
                  {view.isPublic && <Eye className="h-3 w-3 text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleStar(view.id)
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShareView(view.id)
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 w-6 p-0"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeleteView(view.id)}>
                        Delete view
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
              <Save className="h-4 w-4 mr-2" />
              Save current view
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Action buttons */}
        <Button 
          onClick={onCreateContact} 
          size="sm"
          disabled={isDemo}
          title={isDemo ? 'Demo is read-only' : undefined}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>

        {onImportContacts && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onImportContacts}
            disabled={isDemo}
            title={isDemo ? 'Demo is read-only' : undefined}
          >
            <Eye className="h-4 w-4 mr-2" />
            Import
          </Button>
        )}
      </div>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Save your current filters, sorting, and column visibility as a reusable view.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="My Custom View"
              />
            </div>

            <div>
              <Label htmlFor="view-description">Description (Optional)</Label>
              <Textarea
                id="view-description"
                value={newViewDescription}
                onChange={(e) => setNewViewDescription(e.target.value)}
                placeholder="Describe what this view shows..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="view-public"
                checked={newViewIsPublic}
                onCheckedChange={(checked) => setNewViewIsPublic(checked === true)}
              />
              <Label htmlFor="view-public" className="text-sm">
                Make this view public (shareable with team members)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="view-starred"
                checked={newViewIsStarred}
                onCheckedChange={(checked) => setNewViewIsStarred(checked === true)}
              />
              <Label htmlFor="view-starred" className="text-sm">
                Star this view (appears at top of list)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView} disabled={createViewMutation.isLoading}>
              {createViewMutation.isLoading ? 'Saving...' : 'Save View'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share View Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share View</DialogTitle>
            <DialogDescription>
              Share this view with team members using the link below.
            </DialogDescription>
          </DialogHeader>

          {selectedViewId && (
            <div className="space-y-4">
              <div>
                <Label>Share Link</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={getShareUrl(selectedViewId) || ''}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = getShareUrl(selectedViewId)
                      if (url) {
                        navigator.clipboard.writeText(url)
                        toast({
                          title: 'Copied!',
                          description: 'Link copied to clipboard.',
                        })
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = getShareUrl(selectedViewId)
                      if (url) {
                        window.open(url, '_blank')
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}