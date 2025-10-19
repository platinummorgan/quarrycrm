'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { GripVertical } from 'lucide-react'

interface KanbanCardProps {
  deal: {
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
  }
  isDragging?: boolean
  isFocused?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

export function KanbanCard({
  deal,
  isDragging = false,
  isFocused = false,
  onFocus,
  onBlur,
}: KanbanCardProps) {
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
    : 'No contact'

  const companyName = deal.company?.name || 'No company'

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab transition-shadow hover:shadow-md ${
        isDragging || isSortableDragging ? 'opacity-50 shadow-lg' : ''
      } ${isFocused ? 'ring-2 ring-primary' : ''}`}
      {...attributes}
      {...listeners}
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onFocus}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium leading-tight">{deal.title}</h3>
            </div>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{formatCurrency(deal.value || 0)}</span>
              {deal.probability && deal.probability > 0 && (
                <>
                  <span>•</span>
                  <span>{deal.probability}%</span>
                </>
              )}
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <span>👤</span>
                <span className="truncate">{contactName}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🏢</span>
                <span className="truncate">{companyName}</span>
              </div>
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
                  {deal.owner.user.name
                    ? deal.owner.user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : deal.owner.user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
