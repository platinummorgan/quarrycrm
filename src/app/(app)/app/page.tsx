import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Users, Building2, Target, Activity, TrendingUp } from 'lucide-react'
import { OverdueTasksWidget, DealsAtRiskWidget } from '@/components/dashboard/widgets'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/auth-helpers'
import { checkOnboardingProgress } from '@/server/onboarding'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

async function getDashboardData(orgId: string) {
  const [contactsCount, companiesCount, dealsCount, activitiesCount, recentActivities] = await Promise.all([
    prisma.contact.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    }),
    prisma.company.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    }),
    prisma.deal.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    }),
    prisma.activity.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    }),
    prisma.activity.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        type: true,
        description: true,
        subject: true,
        createdAt: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        owner: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    }),
  ])

  return {
    stats: {
      contacts: contactsCount,
      companies: companiesCount,
      deals: dealsCount,
      activities: activitiesCount,
    },
    recentActivities,
  }
}

export default async function AppDashboard() {
  const { orgId } = await requireOrg()
  const [{ stats, recentActivities }, onboardingState] = await Promise.all([
    getDashboardData(orgId),
    checkOnboardingProgress(),
  ])

  const statsConfig = [
    {
      title: 'Total Contacts',
      key: 'contacts' as keyof typeof stats,
      description: 'Active contacts in your CRM',
      icon: Users,
      trend: '+0%',
      href: '/app/contacts',
    },
    {
      title: 'Companies',
      key: 'companies' as keyof typeof stats,
      description: 'Business relationships',
      icon: Building2,
      trend: '+0%',
      href: '/app/companies',
    },
    {
      title: 'Active Deals',
      key: 'deals' as keyof typeof stats,
      description: 'Current opportunities',
      icon: Target,
      trend: '+0%',
      href: '/app/deals',
    },
    {
      title: 'Activities',
      key: 'activities' as keyof typeof stats,
      description: 'Recent interactions',
      icon: Activity,
      trend: '+0%',
      href: '/app/activities',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Quarry-CRM. Here&apos;s an overview of your business.
        </p>
      </div>

      {/* Onboarding Checklist */}
      {onboardingState && !onboardingState.dismissed && !onboardingState.completed && (
        <OnboardingChecklist initialState={onboardingState} />
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsConfig.map((stat) => {
          const Icon = stat.icon
          const value = stats[stat.key]
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {value.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                  <div className="flex items-center pt-1">
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">{stat.trend}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <OverdueTasksWidget />
        <DealsAtRiskWidget />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest interactions and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                      {activity.subject && (
                        <span className="truncate max-w-xs">{activity.subject}</span>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                      {activity.owner.user.name && (
                        <span>by {activity.owner.user.name}</span>
                      )}
                    </div>
                    {(activity.contact || activity.company || activity.deal) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {activity.contact && (
                          <Link
                            href={`/app/contacts/${activity.contact.id}`}
                            className="hover:underline"
                          >
                            {activity.contact.firstName} {activity.contact.lastName}
                          </Link>
                        )}
                        {activity.company && (
                          <Link
                            href={`/app/companies/${activity.company.id}`}
                            className="hover:underline"
                          >
                            {activity.company.name}
                          </Link>
                        )}
                        {activity.deal && (
                          <Link
                            href={`/app/deals/${activity.deal.id}`}
                            className="hover:underline"
                          >
                            {activity.deal.title}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No recent activity yet.</p>
              <p className="text-sm">
                Start by adding your first contact or company.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/app/contacts/new">
              <div className="cursor-pointer rounded-lg border p-4 text-center transition-colors hover:bg-muted/50">
                <Users className="mx-auto mb-2 h-8 w-8 text-primary" />
                <h3 className="font-medium">Add Contact</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new contact
                </p>
              </div>
            </Link>
            <Link href="/app/companies/new">
              <div className="cursor-pointer rounded-lg border p-4 text-center transition-colors hover:bg-muted/50">
                <Building2 className="mx-auto mb-2 h-8 w-8 text-primary" />
                <h3 className="font-medium">Add Company</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new company
                </p>
              </div>
            </Link>
            <Link href="/app/deals/new">
              <div className="cursor-pointer rounded-lg border p-4 text-center transition-colors hover:bg-muted/50">
                <Target className="mx-auto mb-2 h-8 w-8 text-primary" />
                <h3 className="font-medium">Create Deal</h3>
                <p className="text-sm text-muted-foreground">
                  Start a new opportunity
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
