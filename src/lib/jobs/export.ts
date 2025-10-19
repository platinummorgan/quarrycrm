/**
 * Workspace Export Job Processor
 *
 * Handles async export of workspace data to JSON/CSV
 * Uploads to S3/R2 and generates signed download URL
 */

import { prisma } from '@/lib/prisma'
import {
  uploadExport,
  generateSignedDownloadUrl,
  generateExportKey,
  isStorageConfigured,
} from '@/lib/storage'

export type ExportFormat = 'json' | 'csv'

export interface ExportOptions {
  format: ExportFormat
  includeContacts?: boolean
  includeCompanies?: boolean
  includeDeals?: boolean
  includeActivities?: boolean
  includePipelines?: boolean
}

export interface ExportResult {
  downloadUrl: string
  expiresAt: string
  fileSize: number
  recordCounts: {
    contacts: number
    companies: number
    deals: number
    activities: number
    pipelines: number
  }
}

/**
 * Process export job
 *
 * @param jobId - WorkspaceJob ID
 * @returns Export result with download URL
 */
export async function processExportJob(jobId: string): Promise<ExportResult> {
  // Get job details
  const job = await prisma.workspaceJob.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  if (job.status !== 'PENDING') {
    throw new Error(`Job ${jobId} is not pending (status: ${job.status})`)
  }

  try {
    // Update status to PROCESSING
    await prisma.workspaceJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    })

    const options = (job.metadata as unknown as ExportOptions) || {}
    const format = options.format || 'json'

    // Check storage configuration
    if (!isStorageConfigured()) {
      throw new Error(
        'Storage not configured. Set R2_* or AWS_* environment variables.'
      )
    }

    // Export data
    const exportData = await exportWorkspaceData(job.organizationId, options)

    // Convert to file format
    let fileContent: Buffer | string
    let contentType: string

    if (format === 'json') {
      fileContent = JSON.stringify(exportData, null, 2)
      contentType = 'application/json'
    } else {
      // CSV format
      fileContent = convertToCSV(exportData)
      contentType = 'text/csv'
    }

    // Upload to storage
    const key = generateExportKey(job.organizationId, format)
    await uploadExport(key, fileContent, contentType)

    // Generate signed URL (24 hours)
    const downloadUrl = await generateSignedDownloadUrl(key, 24 * 60 * 60)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Prepare result
    const result: ExportResult = {
      downloadUrl,
      expiresAt,
      fileSize: Buffer.byteLength(fileContent),
      recordCounts: {
        contacts: exportData.contacts?.length || 0,
        companies: exportData.companies?.length || 0,
        deals: exportData.deals?.length || 0,
        activities: exportData.activities?.length || 0,
        pipelines: exportData.pipelines?.length || 0,
      },
    }

    // Update job with result
    await prisma.workspaceJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        result: result as any,
        completedAt: new Date(),
      },
    })

    return result
  } catch (error) {
    // Update job with error
    await prisma.workspaceJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    })

    throw error
  }
}

/**
 * Export workspace data
 */
async function exportWorkspaceData(
  organizationId: string,
  options: ExportOptions
) {
  const data: any = {
    exportedAt: new Date().toISOString(),
    organizationId,
  }

  // Get organization details
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  data.organization = {
    id: organization?.id,
    name: organization?.name,
    domain: organization?.domain,
    createdAt: organization?.createdAt,
  }

  // Export contacts
  if (options.includeContacts !== false) {
    data.contacts = await prisma.contact.findMany({
      where: { organizationId },
      include: {
        company: { select: { id: true, name: true } },
        owner: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
  }

  // Export companies
  if (options.includeCompanies !== false) {
    data.companies = await prisma.company.findMany({
      where: { organizationId },
      include: {
        owner: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
  }

  // Export deals
  if (options.includeDeals !== false) {
    data.deals = await prisma.deal.findMany({
      where: { organizationId },
      include: {
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        owner: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
  }

  // Export activities
  if (options.includeActivities !== false) {
    data.activities = await prisma.activity.findMany({
      where: { organizationId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
        owner: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
  }

  // Export pipelines
  if (options.includePipelines !== false) {
    data.pipelines = await prisma.pipeline.findMany({
      where: { organizationId },
      include: {
        stages: true,
      },
    })
  }

  return data
}

/**
 * Convert export data to CSV format
 */
function convertToCSV(data: any): string {
  const sections: string[] = []

  // Helper to convert array of objects to CSV
  const objectsToCsv = (objects: any[], title: string) => {
    if (!objects || objects.length === 0) return ''

    const lines: string[] = []
    lines.push(`\n### ${title} ###`)

    // Get headers from first object
    const headers = Object.keys(objects[0])
    lines.push(headers.map((h) => `"${h}"`).join(','))

    // Add rows
    for (const obj of objects) {
      const values = headers.map((h) => {
        const value = obj[h]
        if (value === null || value === undefined) return '""'
        if (typeof value === 'object')
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        return `"${String(value).replace(/"/g, '""')}"`
      })
      lines.push(values.join(','))
    }

    return lines.join('\n')
  }

  // Organization info
  sections.push(`Organization: ${data.organization?.name || 'Unknown'}`)
  sections.push(`Exported: ${data.exportedAt}`)
  sections.push('')

  // Export each section
  if (data.contacts) sections.push(objectsToCsv(data.contacts, 'Contacts'))
  if (data.companies) sections.push(objectsToCsv(data.companies, 'Companies'))
  if (data.deals) sections.push(objectsToCsv(data.deals, 'Deals'))
  if (data.activities)
    sections.push(objectsToCsv(data.activities, 'Activities'))
  if (data.pipelines) sections.push(objectsToCsv(data.pipelines, 'Pipelines'))

  return sections.join('\n')
}
