export const dynamic = 'force-dynamic'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { 
  Phone, 
  Plus, 
  Clock, 
  DollarSign, 
  Briefcase, 
  AlertTriangle,
  CheckCircle2,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/auth-helpers'
import { formatDistanceToNow, startOfWeek, startOfToday, endOfDay } from 'date-fns'
import Link from 'next/link'
import { formatPhoneNumber, getTelLink, getSmsLink } from '@/lib/format-phone'

async function getContractorDashboardData(orgId: string) {
  const now = new Date()
  const todayStart = startOfToday()
  const todayEnd = endOfDay(now)
  const weekStart = startOfWeek(now)

  const [
    todaysFollowUps,
    overdueFollowUps,
    newLeadsThisWeek,
    quotesThisWeek,
    jobsWonThisWeek,
    quotesGoingCold,
    activeJobs,
  ] = await Promise.all([
    // Today's follow-ups
    prisma.deal.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        nextFollowupDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: {
        id: true,
        title: true,
        value: true,
        nextFollowupDate: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            description: true,
            createdAt: true,
          },
        },
      },
      orderBy: { nextFollowupDate: 'asc' },
    }),

    // Overdue follow-ups
    prisma.deal.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        nextFollowupDate: {
          lt: todayStart,
        },
      },
    }),

    // New leads this week
    prisma.contact.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        createdAt: {
          gte: weekStart,
        },
      },
    }),

    // Quotes sent this week (assuming "Proposal Sent" stage)
    prisma.deal.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        updatedAt: {
          gte: weekStart,
        },
        stage: {
          name: {
            contains: 'Proposal',
            mode: 'insensitive',
          },
        },
      },
      select: {
        value: true,
      },
    }),

    // Jobs won this week
    prisma.deal.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        updatedAt: {
          gte: weekStart,
        },
        stage: {
          name: {
            contains: 'Won',
            mode: 'insensitive',
          },
        },
      },
      select: {
        value: true,
      },
    }),

    // Quotes going cold (7+ days without activity)
    prisma.deal.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        stage: {
          name: {
            contains: 'Proposal',
            mode: 'insensitive',
          },
        },
        OR: [
          {
            nextFollowupDate: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          {
            nextFollowupDate: null,
            updatedAt: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        value: true,
        updatedAt: true,
        contact: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      take: 5,
    }),

    // Active jobs in progress
    prisma.deal.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        stage: {
          name: {
            notIn: ['Won', 'Lost'],
          },
        },
      },
    }),
  ])

  const quotesTotal = quotesThisWeek.reduce((sum, deal) => sum + (deal.value || 0), 0)
  const revenueTotal = jobsWonThisWeek.reduce((sum, deal) => sum + (deal.value || 0), 0)

  return {
    todaysFollowUps,
    overdueCount: overdueFollowUps,
    weekStats: {
      newLeads: newLeadsThisWeek,
      quotesCount: quotesThisWeek.length,
      quotesTotal,
      jobsWonCount: jobsWonThisWeek.length,
      revenueTotal,
      activeJobs,
    },
    quotesGoingCold,
  }
}

export default async function ContractorDashboard() {
  const { orgId } = await requireOrg()

  let data = {
    todaysFollowUps: [],
    overdueCount: 0,
    weekStats: {
      newLeads: 0,
      quotesCount: 0,
      quotesTotal: 0,
      jobsWonCount: 0,
      revenueTotal: 0,
      activeJobs: 0,
    },
    quotesGoingCold: [],
  }

  try {
    data = await getContractorDashboardData(orgId) as any
  } catch (err) {
    console.error('Contractor dashboard data fetch failed:', err)
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Today's Work</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* TODAY'S FOLLOW-UPS - Most Prominent */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Phone className="h-6 w-6" />
                Today's Follow-ups
              </CardTitle>
              <CardDescription className="text-base">
                People to call today
              </CardDescription>
            </div>
            {data.overdueCount > 0 && (
              <Badge variant="destructive" className="text-lg px-4 py-2">
                {data.overdueCount} Overdue
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.todaysFollowUps.length > 0 ? (
            <div className="space-y-4">
              {data.todaysFollowUps.map((lead: any) => (
                <div 
                  key={lead.id} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {lead.contact?.firstName} {lead.contact?.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{lead.title}</p>
                    {lead.activities[0] && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        Last: {lead.activities[0].description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {lead.contact?.phone && (
                      <Button size="lg" asChild>
                        <a href={getTelLink(lead.contact.phone)} className="text-lg">
                          <Phone className="h-5 w-5 mr-2" />
                          {formatPhoneNumber(lead.contact.phone)}
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="lg">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Mark Contacted
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
              <p className="text-xl font-semibold">All caught up!</p>
              <p>No follow-ups scheduled for today</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* THIS WEEK STATS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>New Leads</CardDescription>
            <CardTitle className="text-3xl">
              {data.weekStats.newLeads}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Quotes Sent</CardDescription>
            <CardTitle className="text-3xl flex items-baseline gap-2">
              {data.weekStats.quotesCount}
              <span className="text-lg font-normal text-muted-foreground">
                {formatCurrency(data.weekStats.quotesTotal)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Jobs Won</CardDescription>
            <CardTitle className="text-3xl flex items-baseline gap-2">
              {data.weekStats.jobsWonCount}
              <span className="text-lg font-normal text-green-600">
                {formatCurrency(data.weekStats.revenueTotal)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Jobs</CardDescription>
            <CardTitle className="text-3xl">
              {data.weekStats.activeJobs}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* QUOTES GOING COLD */}
      {data.quotesGoingCold.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Quotes Going Cold
            </CardTitle>
            <CardDescription>
              No contact in 7+ days - follow up now!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.quotesGoingCold.map((quote: any) => {
                const daysSince = Math.floor(
                  (Date.now() - new Date(quote.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <div 
                    key={quote.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <h4 className="font-medium">
                        {quote.contact?.firstName} {quote.contact?.lastName} - {quote.title}
                      </h4>
                      <p className="text-sm text-orange-600">
                        {daysSince} days since last contact
                      </p>
                    </div>
                    <Button size="lg">
                      <Phone className="h-4 w-4 mr-2" />
                      Follow up now
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QUICK ACTIONS */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/app/contacts/new">
              <Button size="lg" className="w-full h-24" variant="outline">
                <div className="text-center">
                  <Plus className="mx-auto mb-2 h-8 w-8" />
                  <div className="font-semibold">Add New Lead</div>
                </div>
              </Button>
            </Link>
            <Link href="/app/deals/new">
              <Button size="lg" className="w-full h-24" variant="outline">
                <div className="text-center">
                  <Briefcase className="mx-auto mb-2 h-8 w-8" />
                  <div className="font-semibold">Create Job</div>
                </div>
              </Button>
            </Link>
            <Link href="/app/activities/new">
              <Button size="lg" className="w-full h-24" variant="outline">
                <div className="text-center">
                  <Clock className="mx-auto mb-2 h-8 w-8" />
                  <div className="font-semibold">Log Follow-up</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
