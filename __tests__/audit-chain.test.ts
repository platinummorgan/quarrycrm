/**
 * Tests for Audit Chain (Blockchain-style verification)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  canonicalizeAuditRecord,
  computeAuditHash,
  computeChainHashes,
  verifyAuditChain,
  type ChainVerificationResult,
} from '../src/lib/audit/chain'
import type { EventAudit } from '@prisma/client'

// Mock audit record factory
function createMockAudit(overrides: Partial<EventAudit> = {}): EventAudit {
  return {
    id: 'test-id-123',
    organizationId: 'org-123',
    eventType: 'contact.created',
    eventData: { contactId: 'contact-123', action: 'create' },
    userId: 'user-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    prevHash: null,
    selfHash: '',
    ...overrides,
  }
}

describe('Audit Chain', () => {
  describe('canonicalizeAuditRecord', () => {
    it('should produce deterministic JSON output', () => {
      const record = createMockAudit()

      const canonical1 = canonicalizeAuditRecord(record)
      const canonical2 = canonicalizeAuditRecord(record)

      expect(canonical1).toBe(canonical2)
    })

    it('should sort keys alphabetically', () => {
      const record = createMockAudit()
      const canonical = canonicalizeAuditRecord(record)

      // Parse and check key order
      const parsed = JSON.parse(canonical)
      const keys = Object.keys(parsed)
      const sortedKeys = [...keys].sort()

      expect(keys).toEqual(sortedKeys)
    })

    it('should exclude hash fields', () => {
      const record = createMockAudit({
        prevHash: 'abc123',
        selfHash: 'def456',
      })

      const canonical = canonicalizeAuditRecord(record)

      expect(canonical).not.toContain('prevHash')
      expect(canonical).not.toContain('selfHash')
      expect(canonical).not.toContain('abc123')
      expect(canonical).not.toContain('def456')
    })

    it('should exclude id field', () => {
      const record = createMockAudit({ id: 'test-id-999' })
      const canonical = canonicalizeAuditRecord(record)

      expect(canonical).not.toContain('test-id-999')
    })

    it('should normalize null values', () => {
      const record = createMockAudit({
        userId: null,
        ipAddress: null,
        userAgent: null,
      })

      const canonical = canonicalizeAuditRecord(record)
      const parsed = JSON.parse(canonical)

      expect(parsed.userId).toBe(null)
      expect(parsed.ipAddress).toBe(null)
      expect(parsed.userAgent).toBe(null)
    })

    it('should handle complex eventData', () => {
      const record = createMockAudit({
        eventData: {
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
          string: 'test',
        },
      })

      const canonical = canonicalizeAuditRecord(record)
      expect(canonical).toContain('"nested"')
      expect(canonical).toContain('"deep"')
    })
  })

  describe('computeAuditHash', () => {
    it('should return 64-character hex string (SHA-256)', () => {
      const record = createMockAudit()
      const hash = computeAuditHash(record)

      expect(hash).toMatch(/^[0-9a-f]{64}$/)
      expect(hash.length).toBe(64)
    })

    it('should be deterministic (same input = same hash)', () => {
      const record = createMockAudit()

      const hash1 = computeAuditHash(record)
      const hash2 = computeAuditHash(record)

      expect(hash1).toBe(hash2)
    })

    it('should change if data changes', () => {
      const record1 = createMockAudit({ eventType: 'contact.created' })
      const record2 = createMockAudit({ eventType: 'contact.updated' })

      const hash1 = computeAuditHash(record1)
      const hash2 = computeAuditHash(record2)

      expect(hash1).not.toBe(hash2)
    })

    it('should not change if hash fields change (excluded)', () => {
      const record1 = createMockAudit({ selfHash: 'abc' })
      const record2 = createMockAudit({ selfHash: 'xyz' })

      const hash1 = computeAuditHash(record1)
      const hash2 = computeAuditHash(record2)

      expect(hash1).toBe(hash2)
    })

    it('should not change if id changes (excluded)', () => {
      const record1 = createMockAudit({ id: 'id-1' })
      const record2 = createMockAudit({ id: 'id-2' })

      const hash1 = computeAuditHash(record1)
      const hash2 = computeAuditHash(record2)

      expect(hash1).toBe(hash2)
    })
  })

  describe('computeChainHashes', () => {
    it('should return prevHash and selfHash', () => {
      const record = createMockAudit()
      const result = computeChainHashes(record, null)

      expect(result).toHaveProperty('prevHash')
      expect(result).toHaveProperty('selfHash')
    })

    it('should set prevHash to null for genesis record', () => {
      const record = createMockAudit()
      const result = computeChainHashes(record, null)

      expect(result.prevHash).toBe(null)
    })

    it('should set prevHash to provided value', () => {
      const record = createMockAudit()
      const prevHashValue = 'abc123def456'
      const result = computeChainHashes(record, prevHashValue)

      expect(result.prevHash).toBe(prevHashValue)
    })

    it('should compute valid selfHash', () => {
      const record = createMockAudit()
      const result = computeChainHashes(record, null)

      expect(result.selfHash).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  describe('verifyAuditChain', () => {
    it('should return valid for empty chain', () => {
      const result = verifyAuditChain([])

      expect(result.valid).toBe(true)
      expect(result.totalRecords).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should verify genesis record (null prevHash)', () => {
      const record = createMockAudit({
        prevHash: null,
        selfHash: computeAuditHash(createMockAudit()),
      })

      const result = verifyAuditChain([record])

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail if genesis has non-null prevHash', () => {
      const record = createMockAudit({
        prevHash: 'should-be-null',
        selfHash: computeAuditHash(createMockAudit()),
      })

      const result = verifyAuditChain([record])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].errorType).toBe('genesis')
    })

    it('should verify valid chain with multiple records', () => {
      const record1 = createMockAudit({
        id: 'rec-1',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      })
      const hash1 = computeAuditHash(record1)
      record1.prevHash = null
      record1.selfHash = hash1

      const record2 = createMockAudit({
        id: 'rec-2',
        createdAt: new Date('2025-01-01T00:01:00Z'),
        eventType: 'contact.updated',
      })
      const hash2 = computeAuditHash(record2)
      record2.prevHash = hash1
      record2.selfHash = hash2

      const result = verifyAuditChain([record1, record2])

      expect(result.valid).toBe(true)
      expect(result.totalRecords).toBe(2)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect tampered selfHash', () => {
      const record = createMockAudit({
        prevHash: null,
        selfHash: 'tampered-hash-12345',
      })

      const result = verifyAuditChain([record])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].errorType).toBe('self_hash')
      expect(result.errors[0].message).toContain('tampered')
    })

    it('should detect broken chain (prevHash mismatch)', () => {
      const record1 = createMockAudit({
        id: 'rec-1',
        prevHash: null,
        selfHash: computeAuditHash(createMockAudit({ id: 'rec-1' })),
      })

      const record2 = createMockAudit({
        id: 'rec-2',
        eventType: 'contact.updated',
        prevHash: 'wrong-hash',
        selfHash: computeAuditHash(
          createMockAudit({
            id: 'rec-2',
            eventType: 'contact.updated',
          })
        ),
      })

      const result = verifyAuditChain([record1, record2])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].errorType).toBe('prev_hash')
      expect(result.errors[0].message).toContain('broken chain')
    })

    it('should detect out-of-order records', () => {
      const record1 = createMockAudit({
        id: 'rec-1',
        createdAt: new Date('2025-01-01T00:01:00Z'),
        prevHash: null,
        selfHash: computeAuditHash(
          createMockAudit({
            id: 'rec-1',
            createdAt: new Date('2025-01-01T00:01:00Z'),
          })
        ),
      })

      const record2 = createMockAudit({
        id: 'rec-2',
        createdAt: new Date('2025-01-01T00:00:00Z'), // Earlier than record1
        eventType: 'contact.updated',
        prevHash: record1.selfHash,
        selfHash: computeAuditHash(
          createMockAudit({
            id: 'rec-2',
            createdAt: new Date('2025-01-01T00:00:00Z'),
            eventType: 'contact.updated',
          })
        ),
      })

      const result = verifyAuditChain([record1, record2])

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.errorType === 'ordering')).toBe(true)
    })

    it('should detect multiple errors in chain', () => {
      const record1 = createMockAudit({
        id: 'rec-1',
        prevHash: 'not-null', // Error: genesis should be null
        selfHash: 'tampered', // Error: wrong hash
      })

      const result = verifyAuditChain([record1])

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })

    it('should verify long chain', () => {
      const records: EventAudit[] = []
      let prevHash: string | null = null

      for (let i = 0; i < 100; i++) {
        // Build a valid Date even when minutes exceed 59 by rolling into hours
        const hour = Math.floor(i / 60)
        const minute = i % 60
        const createdAt = new Date(Date.UTC(2025, 0, 1, hour, minute, 0))

        const record = createMockAudit({
          id: `rec-${i}`,
          createdAt,
          eventType: i % 2 === 0 ? 'contact.created' : 'contact.updated',
          eventData: { index: i },
        })

        const selfHash = computeAuditHash(record)
        record.prevHash = prevHash
        record.selfHash = selfHash

        records.push(record)
        prevHash = selfHash
      }

      const result = verifyAuditChain(records)

      expect(result.valid).toBe(true)
      expect(result.totalRecords).toBe(100)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Chain Security Properties', () => {
    it('should detect inserted record (breaks prevHash chain)', () => {
      // Create valid 3-record chain
      const records: EventAudit[] = []
      let prevHash: string | null = null

      for (let i = 0; i < 3; i++) {
        const record = createMockAudit({
          id: `rec-${i}`,
          createdAt: new Date(`2025-01-01T00:0${i}:00Z`),
        })
        const selfHash = computeAuditHash(record)
        record.prevHash = prevHash
        record.selfHash = selfHash
        records.push(record)
        prevHash = selfHash
      }

      // Insert a record in the middle with wrong prevHash
      const inserted = createMockAudit({
        id: 'inserted',
        createdAt: new Date('2025-01-01T00:01:30Z'),
        eventType: 'malicious.action',
      })
      inserted.prevHash = 'wrong-prev'
      inserted.selfHash = computeAuditHash(inserted)
      records.splice(2, 0, inserted)

      const result = verifyAuditChain(records)

      expect(result.valid).toBe(false)
      // Should detect broken chain at inserted record and next record
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should detect modified eventData (changes selfHash)', () => {
      const record = createMockAudit({
        eventData: { original: 'data' },
      })
      const correctHash = computeAuditHash(record)
      record.selfHash = correctHash
      record.prevHash = null

      // Now "modify" the data but keep old hash
      record.eventData = { modified: 'data' }

      const result = verifyAuditChain([record])

      expect(result.valid).toBe(false)
      expect(result.errors[0].errorType).toBe('self_hash')
    })

    it('should detect deleted record (breaks prevHash of next record)', () => {
      // Create 3-record chain
      const records: EventAudit[] = []
      let prevHash: string | null = null

      for (let i = 0; i < 3; i++) {
        const record = createMockAudit({
          id: `rec-${i}`,
          createdAt: new Date(`2025-01-01T00:0${i}:00Z`),
        })
        const selfHash = computeAuditHash(record)
        record.prevHash = prevHash
        record.selfHash = selfHash
        records.push(record)
        prevHash = selfHash
      }

      // Delete middle record
      records.splice(1, 1)

      const result = verifyAuditChain(records)

      expect(result.valid).toBe(false)
      // Record 2 now has prevHash pointing to deleted record 1's hash
      expect(result.errors.some((e) => e.errorType === 'prev_hash')).toBe(true)
    })
  })
})
