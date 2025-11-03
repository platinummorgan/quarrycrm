'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Activity, Plus } from 'lucide-react'
import { ActivityComposer } from './activity-composer'

export function ActivitiesView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleActivityCreated = () => {
    setIsDialogOpen(false)
    // Refresh the page to show new activity
    window.location.reload()
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Follow-ups</h1>
            <p className="text-muted-foreground">
              Track all your customer interactions and tasks
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Log a note, call, meeting, email, or task
            </DialogDescription>
          </DialogHeader>
          <ActivityComposer
            onSuccess={handleActivityCreated}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
