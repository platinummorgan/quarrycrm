'use client'

import { trpc } from '@/lib/trpc'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function OverdueTasks() {
  const { data: overdueTasks, isLoading } = trpc.activities.list.useQuery({
    overdue: true,
    type: 'TASK',
    limit: 10,
  })

  const completeTaskMutation = trpc.activities.update.useMutation()

  const handleCompleteTask = (taskId: string) => {
    completeTaskMutation.mutate({
      id: taskId,
      data: { isCompleted: true },
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Overdue Tasks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!overdueTasks?.items || overdueTasks.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckSquare className="h-5 w-5 text-green-500" />
            <span>Overdue Tasks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No overdue tasks! 🎉</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span>Overdue Tasks ({overdueTasks.items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdueTasks.items.map((task) => (
          <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <p className="font-medium">{task.description}</p>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Due {formatDistanceToNow(new Date(task.dueDate!), { addSuffix: true })}</span>
                {task.contact && (
                  <>
                    <span>•</span>
                    <span>{task.contact.firstName} {task.contact.lastName}</span>
                  </>
                )}
                {task.deal && (
                  <>
                    <span>•</span>
                    <span>{task.deal.title}</span>
                  </>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCompleteTask(task.id)}
              disabled={completeTaskMutation.isLoading}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Complete
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}