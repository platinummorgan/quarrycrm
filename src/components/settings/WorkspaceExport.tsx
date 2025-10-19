'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Download,
  FileJson,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface ExportJob {
  jobId: string
  status: string
  type: string
  createdAt: string
  completedAt?: string
  result?: {
    downloadUrl: string
    expiresAt: string
    fileSize: number
    recordCounts: {
      contacts: number
      companies: number
      deals: number
      pipelines: number
      activities: number
    }
  }
  error?: string
}

export function WorkspaceExport({
  organizationId,
}: {
  organizationId: string
}) {
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [exporting, setExporting] = useState(false)
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  )

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [pollingInterval])

  async function startExport() {
    setExporting(true)
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          format,
          includeContacts: true,
          includeCompanies: true,
          includeDeals: true,
          includePipelines: true,
          includeActivities: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const data = await response.json()
      toast.success('Export started! Generating your download...')

      // Start polling for job status
      startPolling(data.jobId)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to start export'
      )
      setExporting(false)
    }
  }

  function startPolling(jobId: string) {
    // Poll every 2 seconds
    const interval = setInterval(() => {
      checkJobStatus(jobId)
    }, 2000)

    setPollingInterval(interval)
  }

  async function checkJobStatus(jobId: string) {
    try {
      const response = await fetch(`/api/export?jobId=${jobId}`)

      if (!response.ok) {
        throw new Error('Failed to check export status')
      }

      const job: ExportJob = await response.json()
      setCurrentJob(job)

      if (job.status === 'COMPLETED') {
        if (pollingInterval) clearInterval(pollingInterval)
        setPollingInterval(null)
        setExporting(false)
        toast.success('Export ready for download!', {
          description: 'Your download link expires in 24 hours',
        })
      } else if (job.status === 'FAILED') {
        if (pollingInterval) clearInterval(pollingInterval)
        setPollingInterval(null)
        setExporting(false)
        toast.error('Export failed', {
          description: job.error || 'Unknown error occurred',
        })
      }
    } catch (error) {
      console.error('Failed to check export status:', error)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatExpiryTime(expiresAt: string): string {
    const expires = new Date(expiresAt)
    const now = new Date()
    const hours = Math.floor(
      (expires.getTime() - now.getTime()) / (1000 * 60 * 60)
    )

    if (hours < 1) return 'Expires in less than 1 hour'
    if (hours === 1) return 'Expires in 1 hour'
    return `Expires in ${hours} hours`
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Export Workspace Data</h3>
          <p className="text-sm text-muted-foreground">
            Download all your contacts, companies, deals, pipelines, and
            activities. Export files are stored securely and expire after 24
            hours.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Export Format</label>
            <div className="mt-2 flex gap-2">
              <Button
                variant={format === 'json' ? 'default' : 'outline'}
                onClick={() => setFormat('json')}
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileJson className="h-4 w-4" />
                JSON
              </Button>
              <Button
                variant={format === 'csv' ? 'default' : 'outline'}
                onClick={() => setFormat('csv')}
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                CSV
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {format === 'json'
                ? 'JSON format preserves all data structure and relationships'
                : 'CSV format is compatible with spreadsheet applications'}
            </p>
          </div>

          <Button
            onClick={startExport}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            {exporting ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Generating Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Start Export
              </>
            )}
          </Button>
        </div>

        {currentJob && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentJob.status === 'COMPLETED' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {currentJob.status === 'PROCESSING' && (
                  <Clock className="h-5 w-5 animate-spin text-blue-600" />
                )}
                {currentJob.status === 'FAILED' && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  Export {currentJob.status.toLowerCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(currentJob.createdAt).toLocaleString()}
              </span>
            </div>

            {currentJob.status === 'PROCESSING' && (
              <div className="space-y-2">
                <Progress value={undefined} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Exporting your data... This may take a few minutes depending
                  on data size.
                </p>
              </div>
            )}

            {currentJob.status === 'COMPLETED' && currentJob.result && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Contacts:</span>
                    <span className="ml-2 font-medium">
                      {currentJob.result.recordCounts.contacts.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Companies:</span>
                    <span className="ml-2 font-medium">
                      {currentJob.result.recordCounts.companies.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deals:</span>
                    <span className="ml-2 font-medium">
                      {currentJob.result.recordCounts.deals.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Activities:</span>
                    <span className="ml-2 font-medium">
                      {currentJob.result.recordCounts.activities.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-2">
                  <div className="text-xs text-muted-foreground">
                    <div>
                      Size: {formatFileSize(currentJob.result.fileSize)}
                    </div>
                    <div className="text-amber-600">
                      {formatExpiryTime(currentJob.result.expiresAt)}
                    </div>
                  </div>
                  <Button size="sm" asChild>
                    <a
                      href={currentJob.result.downloadUrl}
                      download
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {currentJob.status === 'FAILED' && (
              <div className="text-sm text-red-600">
                <p className="font-medium">Export failed</p>
                <p className="mt-1 text-xs">
                  {currentJob.error || 'An unknown error occurred'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
