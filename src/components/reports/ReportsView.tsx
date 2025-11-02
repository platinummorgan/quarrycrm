'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  BarChart3,
  Target,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface ReportsData {
  leadsByMonth: Record<string, number>
  conversionRate: number
  avgTimeToWon: number
  bestLeadSources: Array<{
    source: string
    total: number
    won: number
    rate: number
  }>
  revenueByMonth: Record<string, number>
  avgJobValue: number
  pipelineValue: number
  paymentRate: number
  totalRevenue: number
  followupRate: number
  avgResponseTime: number
  quoteWinRate: number
  quotesSent: number
  quotesWon: number
  leadsByWeek: Record<string, number>
  jobsCompletedByWeek: Record<string, number>
  topJobTypes: Array<{ type: string; count: number }>
  totalLeads: number
  totalWon: number
}

interface ReportsViewProps {
  data: ReportsData
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

function SimpleBarChart({
  data,
  valueKey,
  labelFormatter,
}: {
  data: Array<{ label: string; value: number }>
  valueKey?: string
  labelFormatter?: (value: number) => string
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground">
              {labelFormatter ? labelFormatter(item.value) : item.value}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function SimpleLineChart({
  data,
  labelFormatter,
}: {
  data: Array<{ label: string; value: number }>
  labelFormatter?: (value: number) => string
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const points = data.map((item, index) => ({
    x: (index / (data.length - 1)) * 100,
    y: 100 - (item.value / maxValue) * 100,
    value: item.value,
    label: item.label,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  return (
    <div className="space-y-4">
      <div className="relative h-48 w-full">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="currentColor"
              strokeWidth="0.2"
              className="text-muted-foreground/20"
            />
          ))}

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.5"
              fill="hsl(var(--primary))"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {data.map((item, index) => (
          <span key={index} className="truncate">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down'
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <Badge
                  variant={trend === 'up' ? 'default' : 'secondary'}
                  className="gap-1"
                >
                  {trend === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReportsView({ data }: ReportsViewProps) {
  // Prepare chart data
  const leadsChartData = Object.entries(data.leadsByMonth)
    .map(([date, count]) => ({
      label: format(parseISO(date), 'MMM'),
      value: count,
    }))
    .slice(-6)

  const revenueChartData = Object.entries(data.revenueByMonth)
    .map(([date, revenue]) => ({
      label: format(parseISO(date), 'MMM'),
      value: revenue,
    }))
    .slice(-6)

  const leadSourcesData = data.bestLeadSources.slice(0, 5).map((source) => ({
    label: source.source.replace('_', ' '),
    value: source.rate,
  }))

  const jobTypesData = data.topJobTypes.map((job) => ({
    label: job.type,
    value: job.count,
  }))

  const leadsWeekData = Object.entries(data.leadsByWeek)
    .map(([date, count]) => ({
      label: format(parseISO(date), 'MMM d'),
      value: count,
    }))
    .slice(-4)

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={data.totalLeads}
          subtitle="All time"
          icon={Users}
          trend="up"
        />
        <MetricCard
          title="Conversion Rate"
          value={formatPercent(data.conversionRate)}
          subtitle={`${data.totalWon} won deals`}
          icon={Target}
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          subtitle={`Avg: ${formatCurrency(data.avgJobValue)}`}
          icon={DollarSign}
          trend="up"
        />
        <MetricCard
          title="Pipeline Value"
          value={formatCurrency(data.pipelineValue)}
          subtitle="Quoted jobs"
          icon={BarChart3}
        />
      </div>

      {/* Lead Conversion Section */}
      <div>
        <h2 className="mb-4 text-xl font-bold">Lead Conversion</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads by Month</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={leadsChartData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Best Lead Sources</CardTitle>
              <CardDescription>Conversion rate by source</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={leadSourcesData}
                labelFormatter={formatPercent}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time to Close</CardTitle>
              <CardDescription>Average days from lead to won</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-4xl font-bold">
                    {Math.round(data.avgTimeToWon)}
                  </p>
                  <p className="text-sm text-muted-foreground">days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quote Performance</CardTitle>
              <CardDescription>Quotes sent vs won</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quotes Sent</span>
                  <span className="text-lg font-bold">{data.quotesSent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quotes Won</span>
                  <span className="text-lg font-bold">{data.quotesWon}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm font-medium">Win Rate</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatPercent(data.quoteWinRate)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue Section */}
      <div>
        <h2 className="mb-4 text-xl font-bold">Revenue</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleLineChart
                data={revenueChartData}
                labelFormatter={formatCurrency}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Job Value</CardTitle>
              <CardDescription>Per won job</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-4">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(data.avgJobValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>Won jobs paid in full</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-4">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {formatPercent(data.paymentRate)}
                  </p>
                  <p className="text-sm text-muted-foreground">paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow-up Performance */}
      <div>
        <h2 className="mb-4 text-xl font-bold">Follow-up Performance</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up Rate</CardTitle>
              <CardDescription>Quoted jobs followed up</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold">
                  {formatPercent(data.followupRate)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  of quoted jobs
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Time</CardTitle>
              <CardDescription>Avg. hours to first contact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold">
                  {Math.round(data.avgResponseTime)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">hours</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quote Win Rate</CardTitle>
              <CardDescription>Quotes that turn into jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">
                  {formatPercent(data.quoteWinRate)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.quotesWon} of {data.quotesSent}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Section */}
      <div>
        <h2 className="mb-4 text-xl font-bold">Activity</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads Added</CardTitle>
              <CardDescription>Last 4 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              {leadsWeekData.length > 0 ? (
                <SimpleBarChart data={leadsWeekData} />
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  No data available
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Common Job Types</CardTitle>
              <CardDescription>Top 5 by volume</CardDescription>
            </CardHeader>
            <CardContent>
              {jobTypesData.length > 0 ? (
                <SimpleBarChart data={jobTypesData} />
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  No data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
