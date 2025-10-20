'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useLoadingState } from '@/hooks/use-loading-state'
import { trpc } from '@/lib/trpc'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { QuickCreateDeal } from './quick-create-deal'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings } from 'lucide-react'

interface KanbanBoardProps {
  pipelineId?: string
}

export function KanbanBoard({ pipelineId }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedPipeline, setSelectedPipeline] = useState<string>(
    pipelineId || ''
  )
  const [focusedDealId, setFocusedDealId] = useState<string | null>(null)

  // Fetch pipelines
  const { data: pipelinesData } = trpc.pipelines.list.useQuery()

  const pipelines = pipelinesData?.items || []

  // Find selected pipeline
  const selectedPipelineData = pipelines.find((p) => p.id === selectedPipeline)

  // Get stages from selected pipeline
  const stages = selectedPipelineData?.stages || []

  // Fetch deals for the selected pipeline
  const { data: dealsData, isLoading } = trpc.deals.list.useQuery(
    {
      pipeline: selectedPipeline || undefined,
      limit: 100, // Get all deals for kanban view
    },
    {
      enabled: !!selectedPipeline,
    }
  )

  // Update deal mutation
  const updateDealMutation = trpc.deals.update.useMutation()
  const { showSkeleton, showEmptyState } = useLoadingState(isLoading, {
    // Disabled timeout for production to accommodate cold starts (can take 15-20s)
    // and demo mode for unauthenticated users. Passing `null` tells the hook
    // to keep showing the skeleton until loading completes.
    timeout: null,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    if (!dealsData?.items || !stages) return {}

    const grouped: Record<string, typeof dealsData.items> = {}
    stages.forEach((stage) => {
      grouped[stage.id] = []
    })

    dealsData.items.forEach((deal) => {
      if (deal.stage?.id) {
        if (!grouped[deal.stage.id]) {
          grouped[deal.stage.id] = []
        }
        grouped[deal.stage.id].push(deal)
      }
    })

    return grouped
  }, [dealsData?.items, stages])

  // Calculate weighted totals for each stage
  const stageTotals = useMemo(() => {
    const totals: Record<string, { count: number; weightedTotal: number }> = {}

    if (!stages) return totals

    stages.forEach((stage) => {
      const stageDeals = dealsByStage[stage.id] || []
      const count = stageDeals.length
      const weightedTotal = stageDeals.reduce((sum, deal) => {
        return sum + ((deal.value || 0) * (deal.probability || 0)) / 100
      }, 0)

      totals[stage.id] = { count, weightedTotal }
    })

    return totals
  }, [dealsByStage, stages])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // If dropping on a stage (not another card)
    if (stages?.some((stage) => stage.id === overId)) {
      const newStageId = overId
      updateDealMutation.mutate({
        id: activeId,
        data: { stageId: newStageId },
      })
    }

    setActiveId(null)
  }

  const activeDeal = activeId
    ? dealsData?.items.find((deal) => deal.id === activeId)
    : null

  // Keyboard navigation
  const moveDealToStage = useCallback(
    (dealId: string, direction: 'left' | 'right') => {
      const deal = dealsData?.items.find((d) => d.id === dealId)
      if (!deal || !stages.length) return

      const currentStageIndex = stages.findIndex((s) => s.id === deal.stage?.id)
      if (currentStageIndex === -1) return

      const newStageIndex =
        direction === 'left'
          ? Math.max(0, currentStageIndex - 1)
          : Math.min(stages.length - 1, currentStageIndex + 1)

      if (newStageIndex !== currentStageIndex) {
        const newStageId = stages[newStageIndex].id
        updateDealMutation.mutate({
          id: dealId,
          data: { stageId: newStageId },
        })
      }
    },
    [dealsData?.items, stages, updateDealMutation]
  )

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!focusedDealId) return

      if (event.key === 'h' || event.key === 'H') {
        event.preventDefault()
        moveDealToStage(focusedDealId, 'left')
      } else if (event.key === 'l' || event.key === 'L') {
        event.preventDefault()
        moveDealToStage(focusedDealId, 'right')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [focusedDealId, moveDealToStage])

  // Show skeleton for initial loading
  if (showSkeleton) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-8 rounded-full bg-muted"></div>
        </div>
      </div>
    )
  }

  // Show empty state after timeout
  if (showEmptyState) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed">
        <div className="text-center">
          <div className="mb-2 text-muted-foreground">
            Loading is taking longer than expected
          </div>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold">Deals</h1>

          {/* Pipeline Selector */}
          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
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
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            View Options
          </Button>
          <QuickCreateDeal
            pipelineId={selectedPipeline}
            onSuccess={() => {
              // Refetch deals after creating a new one
              // This will be handled by tRPC's cache invalidation
            }}
          />
        </div>
      </div>

      {/* Kanban Board */}
      {selectedPipeline && stages ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-6 overflow-x-auto pb-6">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] || []}
                total={stageTotals[stage.id]}
                focusedDealId={focusedDealId}
                onDealFocus={setFocusedDealId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDeal ? <KanbanCard deal={activeDeal} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <div className="text-muted-foreground">
              Select a pipeline to view the kanban board
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
