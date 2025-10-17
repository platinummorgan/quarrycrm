/**
 * Blockchain-style Audit Chain using SHA-256
 * 
 * Features:
 * - Cryptographic chaining (prev_hash -> self_hash)
 * - Tamper detection via hash verification
 * - Canonical JSON serialization for deterministic hashing
 * - Genesis record support (first record has null prev_hash)
 * 
 * Security Properties:
 * - SHA-256: 256-bit cryptographic hash
 * - Any modification breaks the chain
 * - Verification detects tampering, missing records, reordering
 */

import crypto from 'crypto'
import type { EventAudit } from '@prisma/client'

/**
 * Canonicalize audit record for deterministic hashing
 * 
 * Ensures same data always produces same hash by:
 * - Sorting object keys alphabetically
 * - Excluding hash fields (prevHash, selfHash)
 * - Excluding auto-generated fields that change (id, createdAt if not part of payload)
 * - Using stable JSON serialization
 * 
 * @param record - Audit record (partial or full)
 * @returns Canonical JSON string
 */
export function canonicalizeAuditRecord(record: Partial<EventAudit>): string {
  // Extract fields for hashing (exclude hash fields and auto-generated IDs)
  const payload = {
    organizationId: record.organizationId,
    eventType: record.eventType,
    eventData: record.eventData,
    userId: record.userId || null,
    ipAddress: record.ipAddress || null,
    userAgent: record.userAgent || null,
    createdAt: record.createdAt?.toISOString() || new Date().toISOString(),
  }

  // Sort keys alphabetically and stringify
  const sortedKeys = Object.keys(payload).sort()
  const canonical: Record<string, any> = {}
  
  for (const key of sortedKeys) {
    canonical[key] = payload[key as keyof typeof payload]
  }

  return JSON.stringify(canonical)
}

/**
 * Compute SHA-256 hash of audit record
 * 
 * @param record - Audit record to hash
 * @returns 64-character hex-encoded SHA-256 hash
 */
export function computeAuditHash(record: Partial<EventAudit>): string {
  const canonical = canonicalizeAuditRecord(record)
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

/**
 * Compute chain hashes for a new audit record
 * 
 * @param record - New audit record (without hashes)
 * @param prevHash - Hash of previous record in chain (null for genesis)
 * @returns Object with prevHash and selfHash
 */
export function computeChainHashes(
  record: Partial<EventAudit>,
  prevHash: string | null
): { prevHash: string | null; selfHash: string } {
  const selfHash = computeAuditHash(record)
  
  return {
    prevHash,
    selfHash,
  }
}

/**
 * Verify audit chain integrity
 * 
 * Checks:
 * 1. First record has null prevHash (genesis)
 * 2. Each record's selfHash matches computed hash
 * 3. Each record's prevHash matches previous record's selfHash
 * 4. Records are in chronological order
 * 
 * @param records - Ordered audit records (chronological)
 * @returns Verification result with errors if any
 */
export interface ChainVerificationResult {
  valid: boolean
  totalRecords: number
  errors: ChainVerificationError[]
}

export interface ChainVerificationError {
  recordId: string
  recordIndex: number
  errorType: 'genesis' | 'self_hash' | 'prev_hash' | 'ordering'
  message: string
  expected?: string
  actual?: string
}

export function verifyAuditChain(records: EventAudit[]): ChainVerificationResult {
  const errors: ChainVerificationError[] = []

  if (records.length === 0) {
    return {
      valid: true,
      totalRecords: 0,
      errors: [],
    }
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i]

    // 1. Check genesis record (first should have null prevHash)
    if (i === 0) {
      if (record.prevHash !== null) {
        errors.push({
          recordId: record.id,
          recordIndex: i,
          errorType: 'genesis',
          message: 'First record must have null prevHash (genesis)',
          expected: 'null',
          actual: record.prevHash,
        })
      }
    }

    // 2. Verify selfHash matches computed hash
    const expectedSelfHash = computeAuditHash(record)
    if (record.selfHash !== expectedSelfHash) {
      errors.push({
        recordId: record.id,
        recordIndex: i,
        errorType: 'self_hash',
        message: 'Record selfHash does not match computed hash (tampered data)',
        expected: expectedSelfHash,
        actual: record.selfHash,
      })
    }

    // 3. Verify prevHash matches previous record's selfHash
    if (i > 0) {
      const prevRecord = records[i - 1]
      if (record.prevHash !== prevRecord.selfHash) {
        errors.push({
          recordId: record.id,
          recordIndex: i,
          errorType: 'prev_hash',
          message: 'Record prevHash does not match previous selfHash (broken chain)',
          expected: prevRecord.selfHash,
          actual: record.prevHash || 'null',
        })
      }
    }

    // 4. Verify chronological ordering
    if (i > 0) {
      const prevRecord = records[i - 1]
      if (record.createdAt < prevRecord.createdAt) {
        errors.push({
          recordId: record.id,
          recordIndex: i,
          errorType: 'ordering',
          message: 'Record is out of chronological order',
          expected: `>= ${prevRecord.createdAt.toISOString()}`,
          actual: record.createdAt.toISOString(),
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    totalRecords: records.length,
    errors,
  }
}

/**
 * Get the latest audit record for an organization (for chaining)
 * 
 * @param prisma - Prisma client
 * @param organizationId - Organization ID
 * @returns Latest audit record or null if none exist
 */
export async function getLatestAuditRecord(
  prisma: any,
  organizationId: string
): Promise<EventAudit | null> {
  return prisma.eventAudit.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Create audit record with chain hashes
 * 
 * Automatically computes prevHash and selfHash based on chain state
 * 
 * @param prisma - Prisma client
 * @param data - Audit record data (without hashes)
 * @returns Created audit record with hashes
 */
export async function createAuditRecord(
  prisma: any,
  data: Omit<EventAudit, 'id' | 'createdAt' | 'prevHash' | 'selfHash'>
): Promise<EventAudit> {
  // Get the latest record for this organization
  const latestRecord = await getLatestAuditRecord(prisma, data.organizationId)
  
  // Compute chain hashes
  const { prevHash, selfHash } = computeChainHashes(
    data,
    latestRecord?.selfHash || null
  )

  // Create record with hashes
  return prisma.eventAudit.create({
    data: {
      ...data,
      prevHash,
      selfHash,
    },
  })
}

/**
 * Verify audit chain for an organization
 * 
 * @param prisma - Prisma client
 * @param organizationId - Organization ID to verify
 * @returns Verification result
 */
export async function verifyOrganizationAuditChain(
  prisma: any,
  organizationId: string
): Promise<ChainVerificationResult> {
  const records = await prisma.eventAudit.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  })

  return verifyAuditChain(records)
}

/**
 * Verify entire audit chain across all organizations
 * 
 * @param prisma - Prisma client
 * @returns Map of organization ID to verification result
 */
export async function verifyAllAuditChains(
  prisma: any
): Promise<Map<string, ChainVerificationResult>> {
  const results = new Map<string, ChainVerificationResult>()

  // Get all unique organization IDs
  const organizations = await prisma.eventAudit.findMany({
    select: { organizationId: true },
    distinct: ['organizationId'],
  })

  // Verify each organization's chain
  for (const { organizationId } of organizations) {
    const result = await verifyOrganizationAuditChain(prisma, organizationId)
    results.set(organizationId, result)
  }

  return results
}
