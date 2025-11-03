'use client'

import { useMemo } from 'react'
import { JobCard } from './JobCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isThisWeek, parseISO, subDays } from 'date-fns'

interface ThisWeekViewProps {
  deals: {
    items: Array<{
      id: string
      title: string
      value: number | null
      nextFollowupDate: Date | null
      startDate?: Date | null
      createdAt: Date
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
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ThisWeekView({ deals }: ThisWeekViewProps) {
  const { followupsThisWeek, startingThisWeek, recentlyQuoted, stats } = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7)
    
    const followups = deals.items.filter(job => {
      if (!job.nextFollowupDate) return false
      const followupDate = typeof job.nextFollowupDate === 'string'
        ? parseISO(job.nextFollowupDate)
        : job.nextFollowupDate
      return isThisWeek(followupDate, { weekStartsOn: 0 })
    })
    
    const starting = deals.items.filter(job => {
      if (!job.startDate) return false
      const startDate = typeof job.startDate === 'string'
        ? parseISO(job.startDate)
        : job.startDate
      return isThisWeek(startDate, { weekStartsOn: 0 })
    })
    
    const quoted = deals.items.filter(job => {
      const createdDate = typeof job.createdAt === 'string'
        ? parseISO(job.createdAt)
        : job.createdAt
      return createdDate >= sevenDaysAgo && job.stage?.name?.toLowerCase().includes('quote')
    })
    
    // Calculate stats
    const allActive = deals.items.filter(job => {
      const stageName = job.stage?.name?.toLowerCase() || ''
      return !stageName.includes('won') && !stageName.includes('lost')
    })
    
    const quotedValue = quoted.reduce((sum, job) => sum + (job.value || 0), 0)
    
    return {
      followupsThisWeek: followups,
      startingThisWeek: starting,
      recentlyQuoted: quoted,
      stats: {
        leadsCount: allActive.length,
        quotesCount: quoted.length,
        quotesTotal: quotedValue
      }
    }
  }, [deals.items])

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leadsCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quotes Sent (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quotesCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quote Value (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.quotesTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups This Week */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Follow-ups This Week</h2>
          <p className="text-sm text-muted-foreground">
            {followupsThisWeek.length} {followupsThisWeek.length === 1 ? 'job' : 'jobs'} scheduled
          </p>
        </div>
        
        {followupsThisWeek.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
            No follow-ups scheduled this week
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {followupsThisWeek.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Starting This Week */}
      {startingThisWeek.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Starting This Week</h2>
            <p className="text-sm text-muted-foreground">
              {startingThisWeek.length} {startingThisWeek.length === 1 ? 'job' : 'jobs'} scheduled to start
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {startingThisWeek.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Quoted */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Recently Quoted (Last 7 Days)</h2>
          <p className="text-sm text-muted-foreground">
            {recentlyQuoted.length} {recentlyQuoted.length === 1 ? 'quote' : 'quotes'} sent
          </p>
        </div>
        
        {recentlyQuoted.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
            No quotes sent in the last 7 days
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentlyQuoted.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
