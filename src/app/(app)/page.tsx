import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Users, Building2, Target, Activity, TrendingUp } from 'lucide-react'
import { OverdueTasksWidget, DealsAtRiskWidget } from '@/components/dashboard/widgets'

export default function AppDashboard() {
  const stats = [
    {
      title: 'Total Contacts',
      value: '0',
      description: 'Active contacts in your CRM',
      icon: Users,
      trend: '+0%',
    },
    {
      title: 'Companies',
      value: '0',
      description: 'Business relationships',
      icon: Building2,
      trend: '+0%',
    },
    {
      title: 'Active Deals',
      value: '0',
      description: 'Current opportunities',
      icon: Target,
      trend: '+0%',
    },
    {
      title: 'Activities',
      value: '0',
      description: 'Recent interactions',
      icon: Activity,
      trend: '+0%',
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <div className="flex items-center pt-1">
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500">{stat.trend}</span>
                </div>
              </CardContent>
            </Card>
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
          <div className="py-8 text-center text-muted-foreground">
            <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No recent activity yet.</p>
            <p className="text-sm">
              Start by adding your first contact or company.
            </p>
          </div>
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
            <div className="cursor-pointer rounded-lg border p-4 text-center transition-colors hover:bg-muted/50">
              <Users className="mx-auto mb-2 h-8 w-8 text-primary" />
              <h3 className="font-medium">Add Contact</h3>
              <p className="text-sm text-muted-foreground">
                Create a new contact
              </p>
            </div>
            <div className="cursor-pointer rounded-lg border p-4 text-center transition-colors hover:bg-muted/50">
              <Building2 className="mx-auto mb-2 h-8 w-8 text-primary" />
              <h3 className="font-medium">Add Company</h3>
              <p className="text-sm text-muted-foreground">
                Create a new company
              </p>
            </div>
            <div className="cursor-pointer rounded-lg border p-4 text-center transition-colors hover:bg-muted/50">
              <Target className="mx-auto mb-2 h-8 w-8 text-primary" />
              <h3 className="font-medium">Create Deal</h3>
              <p className="text-sm text-muted-foreground">
                Start a new opportunity
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
