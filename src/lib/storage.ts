/**
 * S3-compatible storage for exports (AWS S3 or Cloudflare R2)
 *
 * Features:
 * - Upload workspace exports to object storage
 * - Generate signed URLs for secure downloads (24h expiry)
 * - Support for both AWS S3 and Cloudflare R2
 * - Automatic file cleanup after expiry
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Storage configuration from environment
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'r2' // 'r2' or 's3'
const BUCKET_NAME = process.env.EXPORT_BUCKET_NAME || 'crm-exports'

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''

// AWS S3 configuration (fallback)
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || ''
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || ''

/**
 * Get S3 client (R2 or S3)
 */
function getS3Client(): S3Client {
  if (STORAGE_PROVIDER === 'r2') {
    // Cloudflare R2
    return new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  } else {
    // AWS S3
    return new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    })
  }
}

/**
 * Upload export file to storage
 *
 * @param key - File key/path (e.g., "exports/org-123/export-2025-01-01.json")
 * @param data - File content (Buffer or string)
 * @param contentType - MIME type (e.g., "application/json", "text/csv")
 * @returns Upload result with key and metadata
 */
export async function uploadExport(
  key: string,
  data: Buffer | string,
  contentType: string = 'application/json'
): Promise<{ key: string; bucket: string }> {
  const client = getS3Client()

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: data,
    ContentType: contentType,
    // Auto-delete after 30 days (S3 lifecycle rule should handle this, but set metadata too)
    Metadata: {
      'uploaded-at': new Date().toISOString(),
      'expires-at': new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    },
  })

  await client.send(command)

  return {
    key,
    bucket: BUCKET_NAME,
  }
}

/**
 * Generate signed URL for downloading export
 *
 * @param key - File key/path
 * @param expiresIn - URL expiry time in seconds (default: 24 hours)
 * @returns Signed URL valid for specified duration
 */
export async function generateSignedDownloadUrl(
  key: string,
  expiresIn: number = 24 * 60 * 60 // 24 hours
): Promise<string> {
  const client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  const signedUrl = await getSignedUrl(client, command, { expiresIn })

  return signedUrl
}

/**
 * Generate export file key
 *
 * @param organizationId - Organization ID
 * @param format - Export format (json, csv)
 * @returns S3 key path
 */
export function generateExportKey(
  organizationId: string,
  format: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `exports/${organizationId}/export-${timestamp}.${format}`
}

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
  if (STORAGE_PROVIDER === 'r2') {
    return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY)
  } else {
    return !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY)
  }
}

/**
 * Get storage configuration status (for debugging)
 */
export function getStorageConfig() {
  return {
    provider: STORAGE_PROVIDER,
    bucket: BUCKET_NAME,
    configured: isStorageConfigured(),
    region: STORAGE_PROVIDER === 's3' ? AWS_REGION : 'auto',
  }
}
