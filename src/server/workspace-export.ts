import { prisma } from '@/lib/db';
import JSZip from 'jszip';
import { ExportData, ExportFormat, ExportJobMetadata } from '@/lib/workspace-operations';

/**
 * Create a new export job
 */
export async function createExportJob(params: {
  organizationId: string;
  userId: string;
  metadata: ExportJobMetadata;
}) {
  const { organizationId, userId, metadata } = params;

  const job = await prisma.workspaceJob.create({
    data: {
      organizationId,
      userId,
      type: 'EXPORT',
      status: 'PENDING',
      metadata: metadata as any,
    },
  });

  // Start processing in background (you could use a job queue in production)
  processExportJob(job.id).catch(console.error);

  return job;
}

/**
 * Process an export job
 */
export async function processExportJob(jobId: string) {
  const job = await prisma.workspaceJob.findUnique({
    where: { id: jobId },
  });

  if (!job) throw new Error('Job not found');

  try {
    await prisma.workspaceJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    const metadata = job.metadata as ExportJobMetadata;

    // Fetch data
    const exportData: ExportData = {
      contacts: metadata.includeContacts
        ? await prisma.contact.findMany({
            where: { organizationId: job.organizationId },
            include: { company: true },
          })
        : [],
      companies: metadata.includeCompanies
        ? await prisma.company.findMany({
            where: { organizationId: job.organizationId },
          })
        : [],
      deals: metadata.includeDeals
        ? await prisma.deal.findMany({
            where: { organizationId: job.organizationId },
            include: { pipeline: true, stage: true },
          })
        : [],
      pipelines: metadata.includePipelines
        ? await prisma.pipeline.findMany({
            where: { organizationId: job.organizationId },
            include: { stages: true },
          })
        : [],
      activities: metadata.includeActivities
        ? await prisma.activity.findMany({
            where: { organizationId: job.organizationId },
          })
        : [],
    };

    // Generate ZIP file
    const zip = new JSZip();

    if (metadata.format === 'json') {
      zip.file('contacts.jsonl', exportData.contacts.map((c) => JSON.stringify(c)).join('\n'));
      zip.file('companies.jsonl', exportData.companies.map((c) => JSON.stringify(c)).join('\n'));
      zip.file('deals.jsonl', exportData.deals.map((d) => JSON.stringify(d)).join('\n'));
      zip.file('pipelines.jsonl', exportData.pipelines.map((p) => JSON.stringify(p)).join('\n'));
      zip.file(
        'activities.jsonl',
        exportData.activities.map((a) => JSON.stringify(a)).join('\n')
      );
    } else {
      // CSV format
      zip.file('contacts.csv', convertToCSV(exportData.contacts));
      zip.file('companies.csv', convertToCSV(exportData.companies));
      zip.file('deals.csv', convertToCSV(exportData.deals));
      zip.file('pipelines.csv', convertToCSV(exportData.pipelines));
      zip.file('activities.csv', convertToCSV(exportData.activities));
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // TODO: Upload to S3/R2 and get URL
    // For now, store in database (not recommended for production)
    const fileUrl = `/api/workspace/export/${jobId}/download`;

    await prisma.workspaceJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: {
          fileUrl,
          fileSize: zipBuffer.length,
          recordCounts: {
            contacts: exportData.contacts.length,
            companies: exportData.companies.length,
            deals: exportData.deals.length,
            pipelines: exportData.pipelines.length,
            activities: exportData.activities.length,
          },
        } as any,
        // Store buffer temporarily (for demo - use S3 in production)
        metadata: {
          ...metadata,
          zipData: zipBuffer.toString('base64'),
        } as any,
      },
    });

    // TODO: Send email with download link
  } catch (error: any) {
    await prisma.workspaceJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: error.message,
      },
    });
    throw error;
  }
}

/**
 * List export jobs for an organization
 */
export async function listExportJobs(organizationId: string) {
  return prisma.workspaceJob.findMany({
    where: {
      organizationId,
      type: 'EXPORT',
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
}

/**
 * Get export job by ID
 */
export async function getExportJob(jobId: string) {
  return prisma.workspaceJob.findUnique({
    where: { id: jobId },
  });
}

/**
 * Convert array of objects to CSV
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]).filter((key) => typeof data[0][key] !== 'object');
  const rows = data.map((item) =>
    headers.map((header) => JSON.stringify(item[header] ?? '')).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
