'use client'

import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KanbanCard } from './kanban-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface KanbanColumnProps {
  stage: {
    id: string
    name: string
    color: string | null
  }
  deals: Array<{
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
        email: string
      }
    }
    updatedAt: Date
    createdAt: Date
  }>
  total: {
    count: number
    weightedTotal: number
  }
  focusedDealId: string | null
  onDealFocus: (dealId: string | null) => void
}

export function KanbanColumn({ stage, deals, total, focusedDealId, onDealFocus }: KanbanColumnProps) {
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
    <div className="flex w-80 flex-col">
      <Card className={`mb-4 ${isOver ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-sm font-medium">
              {stage.color && (
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
              )}
              {stage.name}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {total.count}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(total.weightedTotal)}
          </div>
        </CardHeader>
      </Card>

      <div
        ref={setNodeRef}
        className={`min-h-96 flex-1 rounded-lg border-2 border-dashed p-4 transition-colors ${
          isOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25'
        }`}
      >
        <SortableContext
          items={deals.map(deal => deal.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {deals.map((deal) => (
              <KanbanCard
                key={deal.id}
                deal={deal}
                isFocused={focusedDealId === deal.id}
                onFocus={() => onDealFocus(deal.id)}
                onBlur={() => onDealFocus(null)}
              />
            ))}
            {deals.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Drop deals here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}