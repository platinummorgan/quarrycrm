'use client'

import { useMemo } from 'react'
import { JobCard } from './JobCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, CheckSquare, Calendar } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      {/* Tasks Due Today/Overdue */}
      {(tasksDueToday.length > 0 || tasksOverdue.length > 0) && (
        <Alert variant={tasksOverdue.length > 0 ? "destructive" : "default"}>
          <CheckSquare className="h-4 w-4" />
          <AlertTitle>Tasks Due</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {tasksOverdue.map(task => (
                <div key={task.id} className="flex items-start justify-between gap-2 rounded-md bg-background/50 p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      {task.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      {task.deal && (
                        <Link href={`/app/deals/${task.deal.id}`} className="hover:underline">
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
                  <Badge variant="destructive" className="text-xs">
                    {task.dueDate && formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                  </Badge>
                </div>
              ))}
              {tasksDueToday.map(task => (
                <div key={task.id} className="flex items-start justify-between gap-2 rounded-md bg-background/50 p-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {task.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {task.deal && (
                        <Link href={`/app/deals/${task.deal.id}`} className="hover:underline">
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
                  <Badge variant="secondary" className="text-xs">
                    Due today
                  </Badge>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Overdue Follow-ups - Red Alert Section */}
      {overdue.length > 0 && (
        <div className="space-y-4">
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
        </div>
      )}

      {/* Due Today */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Follow-ups Due Today</h2>
          <p className="text-sm text-muted-foreground">
            {dueToday.length} {dueToday.length === 1 ? 'job' : 'jobs'} scheduled for today
          </p>
        </div>
        
        {dueToday.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
            No follow-ups due today
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dueToday.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Starting Today */}
      {startingToday.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Starting Today</h2>
            <p className="text-sm text-muted-foreground">
              {startingToday.length} {startingToday.length === 1 ? 'job starts' : 'jobs start'} today
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {startingToday.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Jobs In Progress */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">In Progress</h2>
          <p className="text-sm text-muted-foreground">
            {inProgress.length} active {inProgress.length === 1 ? 'job' : 'jobs'}
          </p>
        </div>
        
        {inProgress.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
            No jobs currently in progress
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inProgress.slice(0, 6).map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
