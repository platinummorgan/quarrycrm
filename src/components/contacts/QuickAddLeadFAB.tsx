'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { QuickAddLeadDialog } from '@/components/contacts/QuickAddLeadDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ActivityComposer } from '@/components/activities/activity-composer'
import { QuickCreateDeal } from '@/components/kanban/quick-create-deal'

export function QuickAddLeadFAB() {
  const [leadDialogOpen, setLeadDialogOpen] = useState(false)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [jobDialogOpen, setJobDialogOpen] = useState(false)
  const pathname = usePathname()

  // Determine which page we're on
  const isContactsPage = pathname?.includes('/contacts')
  const isActivitiesPage = pathname?.includes('/activities')
  const isJobsPage = pathname?.includes('/deals')

  // Don't show on other pages
  if (!isContactsPage && !isActivitiesPage && !isJobsPage) {
    return null
  }

  const handleActivityCreated = () => {
    setActivityDialogOpen(false)
    window.location.reload()
  }

  const handleJobCreated = () => {
    setJobDialogOpen(false)
    window.location.reload()
  }

  // Jobs page
  if (isJobsPage) {
    return (
      <QuickCreateDeal
        onSuccess={handleJobCreated}
        trigger={
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg md:h-14 md:w-auto md:rounded-md md:px-6 z-50"
            aria-label="Add new job"
          >
            <Plus className="h-6 w-6 md:mr-2" />
            <span className="hidden md:inline">New Job</span>
          </Button>
        }
      />
    )
  }

  // Activities page
  if (isActivitiesPage) {
    return (
      <>
        <Button
          onClick={() => setActivityDialogOpen(true)}
          size="lg"
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg md:h-14 md:w-auto md:rounded-md md:px-6 z-50"
          aria-label="Add new activity"
        >
          <Plus className="h-6 w-6 md:mr-2" />
          <span className="hidden md:inline">Add Activity</span>
        </Button>

        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Activity</DialogTitle>
              <DialogDescription>
                Log a note, call, meeting, email, or task
              </DialogDescription>
            </DialogHeader>
            <ActivityComposer
              onSuccess={handleActivityCreated}
              onCancel={() => setActivityDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Contacts page (default)
  return (
    <>
      <Button
        onClick={() => setLeadDialogOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg md:h-14 md:w-auto md:rounded-md md:px-6 z-50"
        aria-label="Add new lead"
      >
        <Plus className="h-6 w-6 md:mr-2" />
        <span className="hidden md:inline">New Lead</span>
      </Button>

      <QuickAddLeadDialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen} />
    </>
  )
}
