'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { TodayView } from './TodayView'
import { ThisWeekView } from './ThisWeekView'
import { AllJobsView } from './AllJobsView'

interface JobsViewProps {
  initialDeals: any
  initialPipelines: any
}

export function JobsView({ initialDeals, initialPipelines }: JobsViewProps) {
  const [activeTab, setActiveTab] = useState('today')

  const handleCreateJob = () => {
    // TODO: Open create job dialog
    console.log('Create job clicked')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <Button onClick={handleCreateJob}>
          <Plus className="mr-2 h-4 w-4" />
          New Job
        </Button>
      </div>

      {/* Time-based Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          <TodayView deals={initialDeals} />
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
