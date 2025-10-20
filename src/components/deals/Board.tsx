'use client'

import React from 'react'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { getDeals, getPipelines, moveDealToStage } from '@/server/deals'
import {
  dealsListResponseSchema,
  pipelinesListResponseSchema,
  type DealsListResponse,
  type PipelinesListResponse,
} from '@/lib/zod/deals'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Settings, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from '@/lib/toast'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Types
type Deal = {
  id: string
  title: string
  value: number | null
  probability: number | null
  expectedClose: Date | null
  stage: {
    id: string
    name: string
    color: string | null
  } | null
  pipeline: {
    id: string
    name: string
  }
  contact: {
    id: string
    firstName: string
    lastName: string
    email: string | null
  } | null
  company: {
    id: string
    name: string
  } | null
  owner: {
    id: string
    user: {
      id: string
      name: string | null
      email: string | null
    } | null
  } | null
  updatedAt: Date
  createdAt: Date
}

type Stage = {
  id: string
  name: string
  order: number
  color: string | null
  _count: {
    deals: number
  }
}

type Pipeline = {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  stages: Stage[]
}

// Ensure date fields survive serialization from server actions
function deserializeDealsResponse(
  data: DealsListResponse
): DealsListResponse {
  return {
    ...data,
    items: data.items.map((deal) => ({
      ...deal,
      createdAt: new Date(deal.createdAt),
      updatedAt: new Date(deal.updatedAt),
      expectedClose: deal.expectedClose
        ? new Date(deal.expectedClose)
        : null,
    })),
  }
}

// Deal Card Component
function DealCard({
  deal,
  isDragging = false,
  isFocused = false,
  onFocus,
}: {
  deal: Deal
  isDragging?: boolean
  isFocused?: boolean
  onFocus?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getAgeBadgeVariant = (createdAt: Date) => {
    const days = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days <= 7) return 'default'
    if (days <= 30) return 'secondary'
    return 'outline'
  }

  const contactName = deal.contact
    ? `${deal.contact.firstName} ${deal.contact.lastName}`.trim()
    : null

  const companyName = deal.company?.name || null
  const primaryEntity = contactName || companyName || 'No contact/company'
  const ownerUser = deal.owner?.user
  const ownerInitials =
    ownerUser?.name
      ?.split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase() ||
    ownerUser?.email?.[0]?.toUpperCase() ||
    '?'

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-deal-id={deal.id}
      className={`cursor-grab transition-shadow hover:shadow-md ${
        isDragging || isSortableDragging ? 'opacity-50 shadow-lg' : ''
      } ${isFocused ? 'ring-2 ring-primary' : ''}`}
      {...attributes}
      {...listeners}
      tabIndex={0}
      onFocus={onFocus}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <h3 className="font-medium leading-tight">{deal.title}</h3>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">
              {formatCurrency(deal.value || 0)}
            </span>
            {deal.probability !== null && deal.probability > 0 && (
              <>
                <span>•</span>
                <span>{deal.probability}%</span>
              </>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <div className="truncate">{primaryEntity}</div>
          </div>

          <div className="flex items-center justify-between">
            <Badge
              variant={getAgeBadgeVariant(deal.createdAt)}
              className="text-xs"
            >
              {formatDistanceToNow(deal.createdAt, { addSuffix: true })}
            </Badge>

            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {ownerInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Stage Column Component
function StageColumn({
  stage,
  deals,
  total,
  focusedDealId,
  onDealFocus,
}: {
  stage: Stage
  deals: Deal[]
  total: {
    count: number
    weightedTotal: number
  }
  focusedDealId: string | null
  onDealFocus: (dealId: string | null) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex w-80 flex-shrink-0 flex-col">
      {/* Stage Header */}
      <div
        className={`mb-4 rounded-lg border p-4 ${isOver ? 'ring-2 ring-primary' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {stage.color && (
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
            )}
            <h3 className="text-sm font-medium">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {total.count}
            </Badge>
          </div>
        </div>
        <div className="mt-2 text-sm font-semibold text-muted-foreground">
          {formatCurrency(total.weightedTotal)}
        </div>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 rounded-lg border-2 border-dashed p-4 transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        style={{ minHeight: '200px' }}
      >
        <SortableContext
          items={deals.map((deal) => deal.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              isFocused={focusedDealId === deal.id}
              onFocus={() => onDealFocus(deal.id)}
            />
          ))}
          {deals.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No deals
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

// Skeleton Loading Component
function BoardSkeleton() {
  return (
    <div className="flex gap-6 overflow-x-auto pb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-80 flex-shrink-0 space-y-4">
          <div className="rounded-lg border p-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
          <div className="space-y-3 rounded-lg border-2 border-dashed p-4">
            {[1, 2].map((j) => (
              <Skeleton key={j} className="h-32 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Empty State Component
function EmptyBoardState({ onCreateDeal }: { onCreateDeal: () => void }) {
  return (
    <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold">No pipeline selected</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Select a pipeline to view your deals board
        </p>
      </div>
    </div>
  )
}

function EmptyPipelineState({
  onCreateDeal,
  isDemo,
}: {
  onCreateDeal: () => void
  isDemo?: boolean
}) {
  return (
    <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold">No deals yet</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Get started by creating your first deal
        </p>
        <Button
          onClick={onCreateDeal}
          disabled={isDemo}
          title={isDemo ? 'Demo is read-only' : undefined}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create first deal
        </Button>
      </div>
    </div>
  )
}

// Error State Component
function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-destructive/50">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h3 className="mb-2 text-lg font-semibold">Something went wrong</h3>
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
        <Button onClick={onRetry} variant="outline">
          Try again
        </Button>
      </div>
    </div>
  )
}

// Main Board Component
export function Board({
  initialDeals,
  initialPipelines,
  onPipelineChangeRef,
  onDealFocusRef,
}: {
  initialDeals: DealsListResponse
  initialPipelines: PipelinesListResponse
  onPipelineChangeRef?: React.MutableRefObject<
    ((pipelineId: string) => void) | undefined
  >
  onDealFocusRef?: React.MutableRefObject<
    ((dealId: string) => void) | undefined
  >
}) {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const isDemo =
    session?.user?.isDemo || session?.user?.currentOrg?.role === 'DEMO'
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [dealsData, setDealsData] = useState<DealsListResponse>(() =>
    deserializeDealsResponse(initialDeals)
  )
  const [pipelinesData, setPipelinesData] =
    useState<PipelinesListResponse>(initialPipelines)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [focusedDealId, setFocusedDealId] = useState<string | null>(null)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pipelines = pipelinesData || []

  // Auto-select first pipeline if none selected
  useEffect(() => {
    if (!selectedPipeline && pipelines.length > 0) {
      setSelectedPipeline(pipelines[0].id)
    }
  }, [pipelines, selectedPipeline])

  // Expose functions to query handler via refs
  useEffect(() => {
    if (onPipelineChangeRef) {
      onPipelineChangeRef.current = setSelectedPipeline
    }
    if (onDealFocusRef) {
      onDealFocusRef.current = setFocusedDealId
    }
  }, [onPipelineChangeRef, onDealFocusRef])

  // Find selected pipeline
  const selectedPipelineData = pipelines.find((p) => p.id === selectedPipeline)
  const stages = selectedPipelineData?.stages || []

  // Get deals for selected pipeline
  const pipelineDeals = useMemo(() => {
    if (!selectedPipeline) return []
    return dealsData.items.filter(
      (deal) => deal.pipeline?.id === selectedPipeline
    )
  }, [dealsData.items, selectedPipeline])

  // Default stages for when no pipeline is selected
  const defaultStages = [
    {
      id: 'lead',
      name: 'Lead',
      order: 0,
      color: '#3b82f6',
      _count: { deals: 0 },
    },
    {
      id: 'qualified',
      name: 'Qualified',
      order: 1,
      color: '#10b981',
      _count: { deals: 0 },
    },
    {
      id: 'proposal',
      name: 'Proposal',
      order: 2,
      color: '#f59e0b',
      _count: { deals: 0 },
    },
    {
      id: 'negotiation',
      name: 'Negotiation',
      order: 3,
      color: '#8b5cf6',
      _count: { deals: 0 },
    },
    {
      id: 'closed-won',
      name: 'Closed Won',
      order: 4,
      color: '#22c55e',
      _count: { deals: 0 },
    },
    {
      id: 'closed-lost',
      name: 'Closed Lost',
      order: 5,
      color: '#ef4444',
      _count: { deals: 0 },
    },
  ]

  const displayStages = selectedPipelineData ? stages : defaultStages

  // Function to refetch deals
  const refetchDeals = useCallback(async () => {
    if (!selectedPipeline) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await getDeals({
        pipeline: selectedPipeline,
        limit: 100,
      })
      setDealsData(deserializeDealsResponse(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals')
      toast.error('Failed to load deals')
    } finally {
      setIsLoading(false)
    }
  }, [selectedPipeline])

  // Function to refetch pipelines
  const refetchPipelines = useCallback(async () => {
    try {
      const result = await getPipelines()
      setPipelinesData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipelines')
      toast.error('Failed to load pipelines')
    }
  }, [])

  // Move deal mutation with optimistic updates
  const moveDealMutation = useCallback(
    async (dealId: string, stageId: string) => {
      // Optimistic update
      const previousDeals = [...dealsData.items]
      const dealIndex = previousDeals.findIndex((d) => d.id === dealId)
      if (dealIndex !== -1) {
        const updatedDeals = [...previousDeals]
        const stage = stages.find((s) => s.id === stageId)
        if (stage) {
          updatedDeals[dealIndex] = {
            ...updatedDeals[dealIndex],
            stage: {
              id: stageId,
              name: stage.name,
              color: stage.color,
            },
          }
          setDealsData((prev) => ({ ...prev, items: updatedDeals }))
        }
      }

      try {
        await moveDealToStage({ dealId, stageId })
        toast.success('Deal moved successfully')
      } catch (err) {
        // Rollback on error
        setDealsData((prev) => ({ ...prev, items: previousDeals }))
        const message =
          err instanceof Error ? err.message : 'Failed to move deal'
        setError(message)
        toast.error(message)
      }
    },
    [dealsData.items, stages]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {}
    displayStages.forEach((stage) => {
      grouped[stage.id] = []
    })

    if (selectedPipeline) {
      pipelineDeals.forEach((deal) => {
        if (deal.stage?.id && grouped[deal.stage.id]) {
          grouped[deal.stage.id].push(deal)
        }
      })
    }

    return grouped
  }, [pipelineDeals, displayStages, selectedPipeline])

  // Calculate weighted totals for each stage
  const stageTotals = useMemo(() => {
    const totals: Record<string, { count: number; weightedTotal: number }> = {}

    displayStages.forEach((stage) => {
      const stageDeals = dealsByStage[stage.id] || []
      const count = stageDeals.length
      const weightedTotal = stageDeals.reduce((sum, deal) => {
        return sum + ((deal.value || 0) * (deal.probability || 0)) / 100
      }, 0)

      totals[stage.id] = { count, weightedTotal }
    })

    return totals
  }, [dealsByStage, displayStages])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const dealId = active.id as string
    const targetId = over.id as string

    // If dropping on a stage column
    if (stages?.some((stage) => stage.id === targetId)) {
      const newStageId = targetId
      moveDealMutation(dealId, newStageId)
    }

    setActiveId(null)
  }

  const activeDeal = activeId
    ? pipelineDeals.find((deal) => deal.id === activeId)
    : null

  // Keyboard navigation - H/L to move left/right
  const moveDealKeyboard = useCallback(
    (dealId: string, direction: 'left' | 'right') => {
      const deal = pipelineDeals.find((d) => d.id === dealId)
      if (!deal || !stages.length) return

      const currentStageIndex = stages.findIndex((s) => s.id === deal.stage?.id)
      if (currentStageIndex === -1) return

      const newStageIndex =
        direction === 'left'
          ? Math.max(0, currentStageIndex - 1)
          : Math.min(stages.length - 1, currentStageIndex + 1)

      if (newStageIndex !== currentStageIndex) {
        const newStageId = stages[newStageIndex].id
        moveDealMutation(dealId, newStageId)
      }
    },
    [pipelineDeals, stages, moveDealMutation]
  )

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!focusedDealId) return

      if (event.key === 'h' || event.key === 'H') {
        event.preventDefault()
        moveDealKeyboard(focusedDealId, 'left')
      } else if (event.key === 'l' || event.key === 'L') {
        event.preventDefault()
        moveDealKeyboard(focusedDealId, 'right')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [focusedDealId, moveDealKeyboard])

  // Skeleton loading with 400ms max
  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true)
      const timer = setTimeout(() => {
        setShowSkeleton(false)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setShowSkeleton(false)
    }
  }, [isLoading])

  const handleCreateDeal = () => {
    // TODO: Open create deal dialog
    toast.info('Create deal feature coming soon')
  }

  // Handle errors
  if (error && !showSkeleton) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Deals</h1>
        </div>
        <ErrorState
          message={error}
          onRetry={() => {
            refetchPipelines()
            refetchDeals()
          }}
        />
      </div>
    )
  }

  // Show skeleton during initial load (max 400ms)
  if (isLoading && showSkeleton) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Deals</h1>
        </div>
        <BoardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Deals</h1>

          {/* Pipeline Selector */}
          {pipelines.length > 0 && (
            <Select
              value={selectedPipeline}
              onValueChange={setSelectedPipeline}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            View Options
          </Button>
          <Button
            size="sm"
            onClick={handleCreateDeal}
            disabled={isDemo}
            title={isDemo ? 'Demo is read-only' : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Board */}
      {pipelines.length === 0 ? (
        <EmptyBoardState onCreateDeal={handleCreateDeal} />
      ) : showSkeleton ? (
        <BoardSkeleton />
      ) : !selectedPipeline ? (
        // Show columns with CTA when no pipeline selected
        <div className="flex gap-6 overflow-x-auto pb-6">
          {displayStages.map((stage) => (
            <div key={stage.id} className="flex w-80 flex-shrink-0 flex-col">
              <div className="mb-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: stage.color || '#6b7280' }}
                    />
                    <h3 className="text-sm font-medium">{stage.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      0
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 text-sm font-semibold text-muted-foreground">
                  $0
                </div>
              </div>
              <div
                className="flex-1 space-y-3 rounded-lg border-2 border-dashed p-4"
                style={{ minHeight: '200px' }}
              >
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <h4 className="mb-2 text-sm font-medium">No deals yet</h4>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Select a pipeline or create your first deal
                    </p>
                    <Button
                      size="sm"
                      onClick={handleCreateDeal}
                      disabled={isDemo}
                      title={isDemo ? 'Demo is read-only' : undefined}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Create first deal
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : pipelineDeals.length === 0 ? (
        <EmptyPipelineState onCreateDeal={handleCreateDeal} isDemo={isDemo} />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCorners}
        >
          <div className="flex gap-6 overflow-x-auto pb-6">
            {displayStages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] || []}
                total={stageTotals[stage.id] || { count: 0, weightedTotal: 0 }}
                focusedDealId={focusedDealId}
                onDealFocus={setFocusedDealId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Keyboard shortcuts hint */}
      {focusedDealId && (
        <div className="fixed bottom-4 right-4 rounded-lg border bg-background p-3 text-xs text-muted-foreground shadow-lg">
          <div className="font-semibold">Keyboard shortcuts:</div>
          <div className="mt-1 space-y-1">
            <div>
              <kbd className="rounded bg-muted px-1.5 py-0.5">H</kbd> - Move
              left
            </div>
            <div>
              <kbd className="rounded bg-muted px-1.5 py-0.5">L</kbd> - Move
              right
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
