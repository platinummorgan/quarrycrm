'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { CheckSquare, AlertCircle, TrendingUp, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function OverdueTasksWidget() {
  const { data: tasks, isLoading } = trpc.activities.overdue.useQuery({
    limit: 10,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            My Overdue Tasks
          </CardTitle>
          <CardDescription>Tasks that are past their due date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-green-600" />
            My Overdue Tasks
          </CardTitle>
          <CardDescription>Tasks that are past their due date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <CheckSquare className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">You have no overdue tasks.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            My Overdue Tasks
          </span>
          <Badge variant="destructive">{tasks.length}</Badge>
        </CardTitle>
        <CardDescription>Tasks that are past their due date</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/app/activities/${task.id}`}
              className="block rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <p className="line-clamp-1 font-medium">{task.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Due{' '}
                      {formatDistanceToNow(new Date(task.dueDate!), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {task.contact && (
                    <p className="text-sm text-muted-foreground">
                      {task.contact.firstName} {task.contact.lastName}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    task.type === 'CALL'
                      ? 'default'
                      : task.type === 'EMAIL'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {task.type}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
        {tasks.length > 0 && (
          <div className="mt-4">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/app/activities?filter=overdue">
                View All Overdue Tasks
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DealsAtRiskWidget() {
  const { data: deals, isLoading } = trpc.deals.atRisk.useQuery({
    limit: 10,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            Deals at Risk
          </CardTitle>
          <CardDescription>Deals that need attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!deals || deals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Deals at Risk
          </CardTitle>
          <CardDescription>Deals that need attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <TrendingUp className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <p className="text-lg font-medium">All deals are healthy!</p>
            <p className="text-sm">No deals require immediate attention.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            Deals at Risk
          </span>
          <Badge variant="secondary">{deals.length}</Badge>
        </CardTitle>
        <CardDescription>Deals that need attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deals.map((deal) => (
            <Link
              key={deal.id}
              href={`/app/deals/${deal.id}`}
              className="block rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="line-clamp-1 font-medium">{deal.title}</p>
                    {deal.value && (
                      <Badge variant="outline">
                        ${deal.value.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  {deal.expectedClose && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Expected close:{' '}
                        {formatDistanceToNow(new Date(deal.expectedClose), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {deal.stage && (
                      <Badge variant="secondary" className="text-xs">
                        {deal.stage.name}
                      </Badge>
                    )}
                    {deal.company && (
                      <span className="text-sm text-muted-foreground">
                        {deal.company.name}
                      </span>
                    )}
                  </div>
                </div>
                {deal.probability !== null && (
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {deal.probability}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Win rate
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
        {deals.length > 0 && (
          <div className="mt-4">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/app/deals?filter=at-risk">
                View All At-Risk Deals
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
