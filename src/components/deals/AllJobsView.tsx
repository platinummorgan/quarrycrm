'use client'

import { useState, useMemo } from 'react'
import { JobCard } from './JobCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, SlidersHorizontal } from 'lucide-react'

interface AllJobsViewProps {
  deals: {
    items: Array<{
      id: string
      title: string
      value: number | null
      nextFollowupDate: Date | null
      stage: {
        name: string
        color: string | null
      } | null
      contact: {
        firstName: string | null
        lastName: string | null
        email: string | null
        phone?: string | null
      } | null
      company?: {
        name: string
      } | null
      jobType?: string | null
      status?: string | null
      updatedAt: Date
      createdAt: Date
      activities?: Array<{
        createdAt: Date
        type: string
      }>
    }>
  }
  pipelines: any[]
}

export function AllJobsView({ deals, pipelines }: AllJobsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'name'>('date')

  // Get unique stages for filtering
  const stages = useMemo(() => {
    const stageSet = new Set<string>()
    deals.items.forEach(job => {
      if (job.stage?.name) {
        stageSet.add(job.stage.name)
      }
    })
    return Array.from(stageSet).sort()
  }, [deals.items])

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = deals.items

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(job => {
        const title = job.title.toLowerCase()
        const contactName = `${job.contact?.firstName || ''} ${job.contact?.lastName || ''}`.toLowerCase()
        const companyName = job.company?.name?.toLowerCase() || ''
        return title.includes(query) || contactName.includes(query) || companyName.includes(query)
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.stage?.name === statusFilter)
    }

    // Sort
    const sorted = [...filtered]
    switch (sortBy) {
      case 'value':
        sorted.sort((a, b) => (b.value || 0) - (a.value || 0))
        break
      case 'name':
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'date':
      default:
        sorted.sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime()
          const dateB = new Date(b.updatedAt).getTime()
          return dateB - dateA
        })
        break
    }

    return sorted
  }, [deals.items, searchQuery, statusFilter, sortBy])

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs, contacts, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {stages.map(stage => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Most Recent</SelectItem>
              <SelectItem value="value">Highest Value</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedJobs.length} of {deals.items.length} jobs
        </p>
      </div>

      {/* Jobs Grid */}
      {filteredAndSortedJobs.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <div className="text-muted-foreground">
            {searchQuery || statusFilter !== 'all' ? (
              <>
                <p className="text-lg font-medium">No jobs found</p>
                <p className="mt-2 text-sm">Try adjusting your filters or search query</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">No jobs yet</p>
                <p className="mt-2 text-sm">Create your first job to get started</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedJobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
