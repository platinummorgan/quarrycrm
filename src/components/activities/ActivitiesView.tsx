'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  Plus, 
  MessageSquare,
  Phone,
  Calendar,
  Mail,
  CheckSquare,
} from 'lucide-react'
import { ActivityComposerWithLink } from './ActivityComposerWithLink'
import { ActivityType } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'

const activityIcons = {
  [ActivityType.NOTE]: MessageSquare,
  [ActivityType.CALL]: Phone,
  [ActivityType.MEETING]: Calendar,
  [ActivityType.EMAIL]: Mail,
  [ActivityType.TASK]: CheckSquare,
  [ActivityType.MESSAGE]: MessageSquare,
}

const activityColors = {
  [ActivityType.NOTE]: 'text-blue-600 bg-blue-50',
  [ActivityType.CALL]: 'text-green-600 bg-green-50',
  [ActivityType.MEETING]: 'text-purple-600 bg-purple-50',
  [ActivityType.EMAIL]: 'text-orange-600 bg-orange-50',
  [ActivityType.TASK]: 'text-red-600 bg-red-50',
  [ActivityType.MESSAGE]: 'text-indigo-600 bg-indigo-50',
}

export function ActivitiesView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const { data, isLoading, refetch } = trpc.activities.list.useQuery({
    limit: 50,
  })

  const handleActivityCreated = () => {
    setIsDialogOpen(false)
    refetch()
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups</h1>
          <p className="text-muted-foreground">
            Track all your customer interactions and tasks
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Your Activities
            </CardTitle>
            <CardDescription>
              A timeline of all your customer interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Activity className="mx-auto mb-4 h-12 w-12 opacity-50 animate-pulse" />
                <p>Loading activities...</p>
              </div>
            ) : !data?.items || data.items.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No activities yet.</p>
                <p className="text-sm">Log your first activity to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.items.map((activity) => {
                  const Icon = activityIcons[activity.type]
                  const colorClass = activityColors[activity.type]
                  
                  return (
                    <div
                      key={activity.id}
                      className="flex gap-4 border-b pb-4 last:border-0"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {activity.type}
                              </Badge>
                              {activity.isCompleted && (
                                <Badge variant="outline" className="text-xs">
                                  Completed
                                </Badge>
                              )}
                            </div>
                            {activity.subject && (
                              <h4 className="mt-1 font-semibold">{activity.subject}</h4>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        
                        {activity.body && (
                          <p className="text-sm">{activity.body}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {activity.contact && (
                            <span>
                              👤 {activity.contact.firstName} {activity.contact.lastName}
                            </span>
                          )}
                          {activity.deal && (
                            <span>💼 {activity.deal.title}</span>
                          )}
                          {activity.dueDate && (
                            <span>
                              📅 Due: {formatDistanceToNow(new Date(activity.dueDate), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Log a note, call, meeting, email, or task
            </DialogDescription>
          </DialogHeader>
          <ActivityComposerWithLink
            onSuccess={handleActivityCreated}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
