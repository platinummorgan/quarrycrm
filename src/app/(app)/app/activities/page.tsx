export const dynamic = 'force-dynamic'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Activity, Plus } from 'lucide-react'

export default function ActivitiesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activities</h1>
          <p className="text-muted-foreground">
            Track all your customer interactions and tasks
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Activity
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Your Activities
          </CardTitle>
          <CardDescription>
            A timeline of all your customer interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No activities yet.</p>
            <p className="text-sm">Log your first activity to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
