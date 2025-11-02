export const dynamic = 'force-dynamic'

import { requireOrg } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { ReportsView } from '@/components/reports/ReportsView'
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns'

async function getReportsData(orgId: string) {
  const now = new Date()
  const sixMonthsAgo = subMonths(now, 6)

  // Get all deals for analysis
  const deals = await prisma.deal.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      value: true,
      estimatedValue: true,
      status: true,
      leadSource: true,
      jobType: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true,
      activities: {
        select: {
          type: true,
          createdAt: true,
        },
      },
    },
  })

  // LEAD CONVERSION METRICS
  const leadsByMonth = deals.reduce((acc, deal) => {
    const month = startOfMonth(deal.createdAt)
    const key = month.toISOString()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const wonDeals = deals.filter((d) => d.status === 'WON')
  const totalLeads = deals.length
  const conversionRate = totalLeads > 0 ? (wonDeals.length / totalLeads) * 100 : 0

  // Average time from lead to won
  const wonWithTime = wonDeals.map((deal) => {
    const firstActivity = deal.activities.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )[0]
    const startDate = firstActivity?.createdAt || deal.createdAt
    const daysDiff = Math.floor(
      (deal.updatedAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysDiff
  })
  const avgTimeToWon =
    wonWithTime.length > 0
      ? wonWithTime.reduce((a, b) => a + b, 0) / wonWithTime.length
      : 0

  // Best performing lead sources
  const leadSourcePerformance = deals.reduce((acc, deal) => {
    const source = deal.leadSource || 'UNKNOWN'
    if (!acc[source]) {
      acc[source] = { total: 0, won: 0 }
    }
    acc[source].total++
    if (deal.status === 'WON') {
      acc[source].won++
    }
    return acc
  }, {} as Record<string, { total: number; won: number }>)

  const bestLeadSources = Object.entries(leadSourcePerformance)
    .map(([source, data]) => ({
      source,
      total: data.total,
      won: data.won,
      rate: data.total > 0 ? (data.won / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.rate - a.rate)

  // REVENUE METRICS
  const revenueByMonth = wonDeals.reduce((acc, deal) => {
    const month = startOfMonth(deal.updatedAt)
    const key = month.toISOString()
    const value = Number(deal.value || deal.estimatedValue || 0)
    acc[key] = (acc[key] || 0) + value
    return acc
  }, {} as Record<string, number>)

  const totalRevenue = wonDeals.reduce(
    (sum, deal) => sum + Number(deal.value || deal.estimatedValue || 0),
    0
  )

  const avgJobValue = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0

  const quotedDeals = deals.filter((d) => d.status === 'QUOTED')
  const pipelineValue = quotedDeals.reduce(
    (sum, deal) => sum + Number(deal.estimatedValue || deal.value || 0),
    0
  )

  const paidDeals = wonDeals.filter((d) => d.paymentStatus === 'PAID_IN_FULL')
  const paymentRate =
    wonDeals.length > 0 ? (paidDeals.length / wonDeals.length) * 100 : 0

  // FOLLOW-UP PERFORMANCE
  const quotedWithFollowup = quotedDeals.filter(
    (d) => d.activities.some((a) => a.type === 'CALL' || a.type === 'MESSAGE')
  )
  const followupRate =
    quotedDeals.length > 0
      ? (quotedWithFollowup.length / quotedDeals.length) * 100
      : 0

  // Average response time to new leads (time from created to first activity)
  const newLeadsWithResponse = deals
    .filter((d) => d.status === 'CONTACTED' || d.status === 'QUOTED' || d.status === 'WON')
    .map((deal) => {
      const firstContact = deal.activities.find(
        (a) => a.type === 'CALL' || a.type === 'MESSAGE' || a.type === 'EMAIL'
      )
      if (!firstContact) return null
      const hoursToResponse = Math.floor(
        (firstContact.createdAt.getTime() - deal.createdAt.getTime()) /
          (1000 * 60 * 60)
      )
      return hoursToResponse
    })
    .filter((h): h is number => h !== null)

  const avgResponseTime =
    newLeadsWithResponse.length > 0
      ? newLeadsWithResponse.reduce((a, b) => a + b, 0) / newLeadsWithResponse.length
      : 0

  const quotesSent = deals.filter((d) => d.status === 'QUOTED' || d.status === 'WON')
  const quotesWon = wonDeals.length
  const quoteWinRate =
    quotesSent.length > 0 ? (quotesWon / quotesSent.length) * 100 : 0

  // ACTIVITY METRICS
  const fourWeeksAgo = subMonths(now, 1)
  const leadsByWeek = deals
    .filter((d) => d.createdAt >= fourWeeksAgo)
    .reduce((acc, deal) => {
      const week = startOfWeek(deal.createdAt)
      const key = week.toISOString()
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const jobsCompletedByWeek = wonDeals
    .filter((d) => d.updatedAt >= fourWeeksAgo)
    .reduce((acc, deal) => {
      const week = startOfWeek(deal.updatedAt)
      const key = week.toISOString()
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const jobTypeCounts = deals.reduce((acc, deal) => {
    const type = deal.jobType || 'Other'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topJobTypes = Object.entries(jobTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    // Lead Conversion
    leadsByMonth,
    conversionRate,
    avgTimeToWon,
    bestLeadSources,
    // Revenue
    revenueByMonth,
    avgJobValue,
    pipelineValue,
    paymentRate,
    totalRevenue,
    // Follow-up
    followupRate,
    avgResponseTime,
    quoteWinRate,
    quotesSent: quotesSent.length,
    quotesWon,
    // Activity
    leadsByWeek,
    jobsCompletedByWeek,
    topJobTypes,
    // Totals
    totalLeads,
    totalWon: wonDeals.length,
  }
}

export default async function ReportsPage() {
  const { orgId } = await requireOrg()
  const data = await getReportsData(orgId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Key metrics and insights for your business
        </p>
      </div>

      <ReportsView data={data} />
    </div>
  )
}
