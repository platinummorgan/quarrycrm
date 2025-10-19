'use client'

import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { trpc } from '@/lib/trpc'
import { ActivityType } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  MessageSquare,
  Phone,
  Calendar,
  Mail,
  CheckSquare,
  Filter,
  Plus
} from 'lucide-react'

interface ActivityTimelineProps {
  contactId?: string
  dealId?: string
  companyId?: string
  limit?: number
  showFilters?: boolean
  showComposer?: boolean
}

const activityIcons = {
  [ActivityType.NOTE]: MessageSquare,
  [ActivityType.CALL]: Phone,
  [ActivityType.MEETING]: Calendar,
  [ActivityType.EMAIL]: Mail,
  [ActivityType.TASK]: CheckSquare,
}

const activityColors = {
  [ActivityType.NOTE]: 'text-blue-600',
  [ActivityType.CALL]: 'text-green-600',
  [ActivityType.MEETING]: 'text-purple-600',
  [ActivityType.EMAIL]: 'text-orange-600',
  [ActivityType.TASK]: 'text-red-600',
}

export function ActivityTimeline({
  contactId,
  dealId,
  companyId,
  limit = 50,
  showFilters = true,
  showComposer = true
}: ActivityTimelineProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')

  // Fetch activities
  const { data: activitiesData, isLoading } = trpc.activities.list.useQuery({
    contact: contactId,
    deal: dealId,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    limit,
  })

  // Fetch organization members for owner filter
  // TODO: Add organizations router for member listing
  // const { data: members } = trpc.organizations.getMembers.useQuery()

  const activities = activitiesData?.items || []

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, typeof activities> = {}

    activities.forEach((activity) => {
      const date = activity.createdAt.toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
    })

    return groups
  }, [activities])

  const formatRelativeDate = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const getActivityTitle = (activity: typeof activities[0]) => {
    switch (activity.type) {
      case ActivityType.TASK:
        return `Task: ${activity.description}`
      case ActivityType.CALL:
        return `Called ${activity.contact ? `${activity.contact.firstName} ${activity.contact.lastName}` : 'contact'}`
      case ActivityType.MEETING:
        return `Meeting: ${activity.description}`
      case ActivityType.EMAIL:
        return activity.subject ? `Email: ${activity.subject}` : `Email: ${activity.description}`
      case ActivityType.NOTE:
      default:
        return activity.description
    }
  }

  const getActivitySubtitle = (activity: typeof activities[0]) => {
    const parts = []

    if (activity.contact) {
      parts.push(`${activity.contact.firstName} ${activity.contact.lastName}`)
    }

    if (activity.deal) {
      parts.push(activity.deal.title)
    }

    return parts.join(' • ')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      {(showFilters || showComposer) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {showFilters && (
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ActivityType | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={ActivityType.NOTE}>Notes</SelectItem>
                  <SelectItem value={ActivityType.CALL}>Calls</SelectItem>
                  <SelectItem value={ActivityType.MEETING}>Meetings</SelectItem>
                  <SelectItem value={ActivityType.EMAIL}>Emails</SelectItem>
                  <SelectItem value={ActivityType.TASK}>Tasks</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {showComposer && (
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Activity
            </Button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedActivities).map(([date, dayActivities]) => (
          <div key={date} className="space-y-3">
            {/* Date header */}
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Activities for this date */}
            <div className="space-y-3">
              {dayActivities.map((activity) => {
                const Icon = activityIcons[activity.type]
                const iconColor = activityColors[activity.type]

                return (
                  <Card key={activity.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {/* Activity icon */}
                        <div className={`p-2 rounded-full bg-muted ${iconColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Activity content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">
                                {getActivityTitle(activity)}
                              </h4>
                              {getActivitySubtitle(activity) && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {getActivitySubtitle(activity)}
                                </p>
                              )}
                              {activity.body && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {activity.body}
                                </p>
                              )}
                            </div>

                            {/* Task status and due date */}
                            {activity.type === ActivityType.TASK && (
                              <div className="flex items-center space-x-2 ml-4">
                                {activity.dueDate && (
                                  <Badge
                                    variant={activity.dueDate < new Date() && !activity.isCompleted ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    Due {formatDistanceToNow(activity.dueDate, { addSuffix: true })}
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant={activity.isCompleted ? 'default' : 'outline'}
                                  className="h-6 w-6 p-0"
                                >
                                  <CheckSquare className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Footer with owner and timestamp */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">
                                  {activity.owner.user.name
                                    ? activity.owner.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                    : activity.owner.user.email[0].toUpperCase()
                                  }
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {activity.owner.user.name || activity.owner.user.email}
                              </span>
                            </div>

                            <span className="text-xs text-muted-foreground">
                              {formatRelativeDate(activity.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-sm font-medium text-muted-foreground">
              No activities yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Activities will appear here as you add them.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}