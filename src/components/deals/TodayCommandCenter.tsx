'use client'

import { useMemo } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  CheckSquare,
  Clock,
  MapPin,
  Users,
} from 'lucide-react'
import { isToday, isPast, parseISO, formatDistanceToNow, differenceInDays } from 'date-fns'
import Link from 'next/link'

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

interface Deal {
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
}

interface TodayCommandCenterProps {
  deals: {
    items: Deal[]
  }
  activities: Activity[]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function PriorityJobCard({ 
  job, 
  daysOverdue, 
  variant = 'default' 
}: { 
  job: Deal
  daysOverdue?: number
  variant?: 'overdue' | 'today' | 'quote'
}) {
  const contactName = job.contact
    ? `${job.contact.firstName || ''} ${job.contact.lastName || ''}`.trim() || 'No name'
    : 'No contact'
  
  const phone = job.contact?.phone
  const email = job.contact?.email

  const lastActivity = job.activities?.[0]
  const daysSinceContact = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card className={`${variant === 'overdue' ? 'border-destructive bg-destructive/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Link 
                href={`/app/deals/${job.id}`}
                className="font-semibold text-lg hover:text-primary transition-colors"
              >
                {contactName}
              </Link>
              {daysOverdue && daysOverdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {daysOverdue}d overdue
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">{job.title}</span>
                {job.jobType && (
                  <Badge variant="secondary" className="text-xs">
                    {job.jobType}
                  </Badge>
                )}
              </div>
              
              {job.company && (
                <div>{job.company.name}</div>
              )}
              
              {job.value && (
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(job.value)}
                </div>
              )}

              {daysSinceContact !== null && variant === 'quote' && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Clock className="h-3 w-3" />
                  <span>Last contact: {daysSinceContact}d ago</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2">
            {phone && (
              <Button size="lg" className="h-12 w-12 md:w-auto md:px-4" asChild>
                <a href={`tel:${phone}`} className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  <span className="hidden md:inline">{phone}</span>
                </a>
              </Button>
            )}
            
            {email && (
              <Button size="lg" variant="outline" className="h-12 w-12 md:w-auto md:px-4" asChild>
                <a href={`mailto:${email}`} className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <span className="hidden md:inline">Email</span>
                </a>
              </Button>
            )}
            
            <Button size="lg" variant="secondary" className="h-12 w-12 md:w-auto md:px-4" asChild>
              <Link href={`/app/deals/${job.id}`} className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="hidden md:inline">Details</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StartingTodayCard({ job }: { job: Deal }) {
  const contactName = job.contact
    ? `${job.contact.firstName || ''} ${job.contact.lastName || ''}`.trim() || 'No name'
    : 'No contact'
  
  const phone = job.contact?.phone

  return (
    <Card className="border-green-500 bg-green-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="bg-green-600">
                Starting Today
              </Badge>
            </div>
            
            <Link 
              href={`/app/deals/${job.id}`}
              className="font-semibold text-lg hover:text-primary transition-colors block mb-1"
            >
              {job.title}
            </Link>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{contactName}</span>
              </div>
              
              {job.company?.name && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{job.company.name}</span>
                </div>
              )}
              
              {job.value && (
                <div className="text-lg font-bold text-green-700">
                  {formatCurrency(job.value)}
                </div>
              )}
            </div>
          </div>

          {phone && (
            <Button size="lg" className="h-14 bg-green-600 hover:bg-green-700" asChild>
              <a href={`tel:${phone}`} className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                <span>{phone}</span>
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function TodayCommandCenter({ deals, activities }: TodayCommandCenterProps) {
  const categorizedData = useMemo(() => {
    const now = new Date()
    
    // Overdue follow-ups (past due, not today)
    const overdue = deals.items
      .filter(job => {
        if (!job.nextFollowupDate) return false
        const followupDate = typeof job.nextFollowupDate === 'string' 
          ? parseISO(job.nextFollowupDate) 
          : job.nextFollowupDate
        return isPast(followupDate) && !isToday(followupDate)
      })
      .map(job => ({
        job,
        daysOverdue: Math.abs(differenceInDays(
          now, 
          typeof job.nextFollowupDate === 'string' 
            ? parseISO(job.nextFollowupDate) 
            : job.nextFollowupDate!
        ))
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue) // Most overdue first
    
    // Call today (follow-up date is today)
    const callToday = deals.items
      .filter(job => {
        if (!job.nextFollowupDate) return false
        const followupDate = typeof job.nextFollowupDate === 'string' 
          ? parseISO(job.nextFollowupDate) 
          : job.nextFollowupDate
        return isToday(followupDate)
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0)) // Highest value first
    
    // Quotes awaiting response (Proposal/Negotiation status, 3+ days since last activity)
    const quotesAwaiting = deals.items
      .filter(job => {
        const stageName = job.stage?.name.toLowerCase() || ''
        if (!stageName.includes('proposal') && !stageName.includes('negotiation') && !stageName.includes('quote')) {
          return false
        }
        
        const lastActivity = job.activities?.[0]
        if (!lastActivity) return true // No activity = needs follow up
        
        const daysSinceContact = Math.floor(
          (Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysSinceContact >= 3
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0))
    
    // Starting today
    const startingToday = deals.items.filter(job => {
      if (!job.startDate) return false
      const startDate = typeof job.startDate === 'string'
        ? parseISO(job.startDate)
        : job.startDate
      return isToday(startDate)
    })
    
    // Tasks due today or overdue
    const tasksOverdue = activities.filter(activity => {
      if (!activity.dueDate) return false
      const dueDate = typeof activity.dueDate === 'string' 
        ? parseISO(activity.dueDate) 
        : activity.dueDate
      return isPast(dueDate) && !isToday(dueDate)
    })
    
    const tasksDueToday = activities.filter(activity => {
      if (!activity.dueDate) return false
      const dueDate = typeof activity.dueDate === 'string' 
        ? parseISO(activity.dueDate) 
        : activity.dueDate
      return isToday(dueDate)
    })
    
    return {
      overdue,
      callToday,
      quotesAwaiting,
      startingToday,
      tasksOverdue,
      tasksDueToday
    }
  }, [deals.items, activities])

  const hasAnyPriority = categorizedData.overdue.length > 0 || 
                        categorizedData.callToday.length > 0 || 
                        categorizedData.quotesAwaiting.length > 0 ||
                        categorizedData.startingToday.length > 0 ||
                        categorizedData.tasksOverdue.length > 0 ||
                        categorizedData.tasksDueToday.length > 0

  if (!hasAnyPriority) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-semibold">All clear for today! 🎉</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No urgent follow-ups or tasks scheduled. Time to prospect or focus on current jobs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* PRIORITY SECTION */}
      <div className="space-y-4">
        {/* Overdue Follow-ups */}
        {categorizedData.overdue.length > 0 && (
          <div className="space-y-3">
            <Alert variant="destructive" className="border-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-lg font-bold">
                🔥 OVERDUE Follow-ups ({categorizedData.overdue.length})
              </AlertTitle>
              <AlertDescription>
                These leads need immediate attention!
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {categorizedData.overdue.map(({ job, daysOverdue }) => (
                <PriorityJobCard 
                  key={job.id} 
                  job={job} 
                  daysOverdue={daysOverdue}
                  variant="overdue"
                />
              ))}
            </div>
          </div>
        )}

        {/* Call Today */}
        {categorizedData.callToday.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold">
                📞 Call Today ({categorizedData.callToday.length})
              </h2>
            </div>
            
            <div className="space-y-3">
              {categorizedData.callToday.map(job => (
                <PriorityJobCard 
                  key={job.id} 
                  job={job}
                  variant="today"
                />
              ))}
            </div>
          </div>
        )}

        {/* Quotes Awaiting Response */}
        {categorizedData.quotesAwaiting.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-bold">
                💰 Quotes Sent - Awaiting Response ({categorizedData.quotesAwaiting.length})
              </h2>
            </div>
            
            <div className="space-y-3">
              {categorizedData.quotesAwaiting.map(job => (
                <PriorityJobCard 
                  key={job.id} 
                  job={job}
                  variant="quote"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECONDARY SECTION */}
      {categorizedData.startingToday.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <MapPin className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-bold">
              🚧 Jobs Starting Today ({categorizedData.startingToday.length})
            </h2>
          </div>
          
          <div className="space-y-3">
            {categorizedData.startingToday.map(job => (
              <StartingTodayCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* OTHER TASKS */}
      {(categorizedData.tasksOverdue.length > 0 || categorizedData.tasksDueToday.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Other Tasks</h2>
          
          <div className="space-y-2">
            {categorizedData.tasksOverdue.map(task => (
              <Card key={task.id} className="border-l-4 border-l-destructive">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-destructive">{task.description}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {task.deal && (
                          <Link href={`/app/deals/${task.deal.id}`} className="hover:underline">
                            💼 {task.deal.title}
                          </Link>
                        )}
                        {task.contact && (
                          <span>👤 {task.contact.firstName} {task.contact.lastName}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      OVERDUE
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {categorizedData.tasksDueToday.map(task => (
              <Card key={task.id} className="border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{task.description}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {task.deal && (
                          <Link href={`/app/deals/${task.deal.id}`} className="hover:underline">
                            💼 {task.deal.title}
                          </Link>
                        )}
                        {task.contact && (
                          <span>👤 {task.contact.firstName} {task.contact.lastName}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Due today
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
