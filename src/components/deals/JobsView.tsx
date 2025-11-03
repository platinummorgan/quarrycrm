'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickCreateDeal } from '@/components/kanban/quick-create-deal'
import { Plus } from 'lucide-react'
import { TodayView } from './TodayView'
import { ThisWeekView } from './ThisWeekView'
import { AllJobsView } from './AllJobsView'
import { Button } from '@/components/ui/button'
import { ActivityType } from '@prisma/client'

interface JobsViewProps {
  initialDeals: any
  initialPipelines: any
}

export function JobsView({ initialDeals, initialPipelines }: JobsViewProps) {
  const [activeTab, setActiveTab] = useState('today')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Fetch tasks due today
  const { data: activities } = trpc.activities.list.useQuery({
    type: ActivityType.TASK,
    isCompleted: false,
    limit: 50,
  })

  // Get default pipeline for creating jobs
  const defaultPipeline = initialPipelines.find((p: any) => p.isDefault) || initialPipelines[0]

  const handleJobCreated = () => {
    setCreateDialogOpen(false)
    // Refresh the page to show new job
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Jobs</h1>
      </div>

      {/* Time-based Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          <TodayView deals={initialDeals} activities={activities?.items || []} />
        </TabsContent>

        <TabsContent value="week" className="space-y-6">
          <ThisWeekView deals={initialDeals} />
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <AllJobsView deals={initialDeals} pipelines={initialPipelines} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
