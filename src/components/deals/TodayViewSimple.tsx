'use client'

import { useMemo } from 'react'
import { JobCard } from './JobCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, CheckSquare } from 'lucide-react'
import { isToday, isPast, parseISO, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface Activity {
  id: string
  type: string
  description: string
  dueDate: Date | null
  isCompleted: boolean
  contact: {
    id: string
    firstName: string
    lastName: string
  } | null
  deal: {
    id: string
    title: string
  } | null
}

interface TodayViewProps {
  deals: {
    items: Array<{
      id: string
      title: string
      value: number | null
      nextFollowupDate: Date | null
      startDate?: Date | null
      stage: {
        name: string
        color: string | null
      } | null
      contact: {
        firstName: string | null
        lastName: string | null
        email: string | null
        phone?: string | null
      } | null
      company?: {
        name: string
      } | null
      jobType?: string | null
      status?: string | null
      updatedAt: Date
      activities?: Array<{
        createdAt: Date
        type: string
      }>
    }>
  }
  activities: Activity[]
}

export function TodayView({ deals, activities }: TodayViewProps) {
  const { overdue, dueToday, startingToday, inProgress } = useMemo(() => {
    const now = new Date()
    
    return {
      // Overdue follow-ups
      overdue: deals.items.filter(job => {
        if (!job.nextFollowupDate) return false
        const followupDate = typeof job.nextFollowupDate === 'string' 
          ? parseISO(job.nextFollowupDate) 
          : job.nextFollowupDate
        return isPast(followupDate) && !isToday(followupDate)
      }),
      
      // Due today
      dueToday: deals.items.filter(job => {
        if (!job.nextFollowupDate) return false
        const followupDate = typeof job.nextFollowupDate === 'string' 
          ? parseISO(job.nextFollowupDate) 
          : job.nextFollowupDate
        return isToday(followupDate)
      }),
      
      // Starting today
      startingToday: deals.items.filter(job => {
        if (!job.startDate) return false
        const startDate = typeof job.startDate === 'string'
          ? parseISO(job.startDate)
          : job.startDate
        return isToday(startDate)
      }),
      
      // In progress (not in "Won" or "Lost" stages)
      inProgress: deals.items.filter(job => {
        if (!job.stage) return false
        const stageName = job.stage.name.toLowerCase()
        return !stageName.includes('won') && 
               !stageName.includes('lost') &&
               !stageName.includes('new')
      })
    }
  }, [deals.items])

  // Filter tasks due today or overdue
  const { tasksDueToday, tasksOverdue } = useMemo(() => {
    const now = new Date()
    return {
      tasksDueToday: activities.filter(activity => {
        if (!activity.dueDate) return false
        const dueDate = typeof activity.dueDate === 'string' 
          ? parseISO(activity.dueDate) 
          : activity.dueDate
        return isToday(dueDate)
      }),
      tasksOverdue: activities.filter(activity => {
        if (!activity.dueDate) return false
        const dueDate = typeof activity.dueDate === 'string' 
          ? parseISO(activity.dueDate) 
          : activity.dueDate
        return isPast(dueDate) && !isToday(dueDate)
      })
    }
  }, [activities])

  const hasAnythingToShow = tasksDueToday.length > 0 || tasksOverdue.length > 0 || 
                           overdue.length > 0 || dueToday.length > 0 || 
                           startingToday.length > 0 || inProgress.length > 0

  return (
    <div className="space-y-8">
      {!hasAnythingToShow ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-semibold">All clear for today!</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No tasks or follow-ups scheduled. Create a new job or task to get started.
          </p>
        </div>
      ) : (
        <>
          {/* YOUR TASKS */}
          {(tasksDueToday.length > 0 || tasksOverdue.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Your Tasks</h2>
              <Alert variant={tasksOverdue.length > 0 ? "destructive" : "default"}>
                <CheckSquare className="h-4 w-4" />
                <AlertTitle className="text-base">
                  {tasksOverdue.length > 0 ? `${tasksOverdue.length + tasksDueToday.length} Tasks (${tasksOverdue.length} Overdue)` : `${tasksDueToday.length} Tasks Due Today`}
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-3 space-y-2">
                    {tasksOverdue.map(task => (
                      <div key={task.id} className="flex items-start justify-between gap-2 rounded-md bg-background/50 p-3 border-l-2 border-destructive">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-destructive">
                            {task.description}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-xs">
                            {task.deal && (
                              <Link href={`/app/deals/${task.deal.id}`} className="hover:underline font-medium">
                                💼 {task.deal.title}
                              </Link>
                            )}
                            {task.contact && (
                              <span>
                                👤 {task.contact.firstName} {task.contact.lastName}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                          OVERDUE
                        </Badge>
                      </div>
                    ))}
                    {tasksDueToday.map(task => (
                      <div key={task.id} className="flex items-start justify-between gap-2 rounded-md bg-background/50 p-3 border-l-2 border-primary">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {task.description}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            {task.deal && (
                              <Link href={`/app/deals/${task.deal.id}`} className="hover:underline font-medium">
                                💼 {task.deal.title}
                              </Link>
                            )}
                            {task.contact && (
                              <span>
                                👤 {task.contact.firstName} {task.contact.lastName}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          Due today
                        </Badge>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* JOBS NEEDING ATTENTION */}
          {(overdue.length > 0 || dueToday.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Jobs Needing Attention</h2>
              
              {overdue.length > 0 && (
                <>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Overdue Follow-ups</AlertTitle>
                    <AlertDescription>
                      {overdue.length} {overdue.length === 1 ? 'job needs' : 'jobs need'} immediate attention
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {overdue.map(job => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </>
              )}

              {dueToday.length > 0 && (
                <>
                  {overdue.length > 0 && <div className="pt-2" />}
                  <h3 className="text-lg font-semibold">Due Today</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {dueToday.map(job => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STARTING TODAY */}
          {startingToday.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Starting Today</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {startingToday.map(job => (
                  <JobCard key={job.id} job={job} showDaysSinceContact={false} />
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE JOBS */}
          {inProgress.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Active Jobs</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Jobs currently in progress ({inProgress.length} total)
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgress.slice(0, 6).map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              {inProgress.length > 6 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing 6 of {inProgress.length} active jobs. View all in "All Jobs" tab.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
