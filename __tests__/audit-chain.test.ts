/**
 * Tests for Audit Chain (Blockchain-style verification)
 */

import { describe, it, expect } from 'vitest'
import {
  canonicalizeAuditRecord,
  computeAuditHash,
  computeChainHashes,
  verifyAuditChain,
  type ChainVerificationResult,
} from '@/lib/audit/chain'
import type { Prisma } from '@prisma/client'

// Small helper so object literals satisfy Prisma.JsonValue
const j = <T extends Prisma.JsonValue>(v: T) => v

// Minimal shape the audit helpers operate on.
interface AuditRecord {
  id: string
  organizationId: string
  eventType: string
  eventData: Prisma.JsonValue
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  prevHash: string | null
  selfHash: string | null
}

// Mock audit record factory
function createMockAudit(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    id: 'test-id-123',
    organizationId: 'org-123',
    eventType: 'contact.created',
    eventData: j({ contactId: 'contact-123', action: 'create' }),
    userId: 'user-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    prevHash: null,
    selfHash: null,
    ...overrides,
  }
}

describe('Audit Chain', () => {
  describe('canonicalizeAuditRecord', () => {
    it('produces deterministic JSON output', () => {
      const record = createMockAudit()
      const canonical1 = canonicalizeAuditRecord(record)
      const canonical2 = canonicalizeAuditRecord(record)
      expect(canonical1).toBe(canonical2)
    })

    it('sorts keys alphabetically and excludes hash/id fields', () => {
      const record = createMockAudit({ id: 'test-id-999', prevHash: 'abc', selfHash: 'def' })
      const canonical = canonicalizeAuditRecord(record)

      // excluded
      expect(canonical).not.toContain('prevHash')
      expect(canonical).not.toContain('selfHash')
      expect(canonical).not.toContain('test-id-999')

      const parsed = JSON.parse(canonical)
      const keys = Object.keys(parsed)
      const sorted = [...keys].sort()
      expect(keys).toEqual(sorted)
    })

    it('normalizes null-ish optional values', () => {
      const canonical = canonicalizeAuditRecord(
        createMockAudit({ userId: null, ipAddress: null, userAgent: null })
      )
      const parsed = JSON.parse(canonical)
      expect(parsed.userId).toBeNull()
      expect(parsed.ipAddress).toBeNull()
      expect(parsed.userAgent).toBeNull()
    })

    it('handles complex eventData', () => {
      const canonical = canonicalizeAuditRecord(
        createMockAudit({
          eventData: j({ nested: { deep: { value: 123 } }, array: [1, 2, 3], string: 'test' }),
        })
      )
      expect(canonical).toContain('"nested"')
      expect(canonical).toContain('"deep"')
    })
  })

  describe('computeAuditHash', () => {
    it('returns 64-char hex (SHA-256)', () => {
      const hash = computeAuditHash(createMockAudit())
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
      expect(hash.length).toBe(64)
    })

    it('is deterministic and sensitive to non-excluded fields', () => {
      const r = createMockAudit()
      expect(computeAuditHash(r)).toBe(computeAuditHash(r))

      const r1 = createMockAudit({ eventType: 'contact.created' })
      const r2 = createMockAudit({ eventType: 'contact.updated' })
      expect(computeAuditHash(r1)).not.toBe(computeAuditHash(r2))

      // excluded fields (id/selfHash) must not affect hash
      const r3 = createMockAudit({ id: 'id-1', selfHash: 'x' })
      const r4 = createMockAudit({ id: 'id-2', selfHash: 'y' })
      expect(computeAuditHash(r3)).toBe(computeAuditHash(r4))
    })
  })

  describe('computeChainHashes', () => {
    it('returns prevHash and selfHash with proper genesis handling', () => {
      const g = computeChainHashes(createMockAudit(), null)
      expect(g.prevHash).toBeNull()
      expect(g.selfHash).toMatch(/^[0-9a-f]{64}$/)

      const prev = 'abc123def456'
      const r = computeChainHashes(createMockAudit(), prev)
      expect(r.prevHash).toBe(prev)
    })
  })

  describe('verifyAuditChain', () => {
    it('accepts empty chain', () => {
      const result = verifyAuditChain([])
      expect(result.valid).toBe(true)
      expect(result.totalRecords).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('verifies correct genesis record (null prevHash)', () => {
      const rec = createMockAudit({ prevHash: null })
      rec.selfHash = computeAuditHash(rec)
      const result = verifyAuditChain([rec])
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails if genesis has non-null prevHash', () => {
      const rec = createMockAudit({ prevHash: 'not-null' })
      rec.selfHash = computeAuditHash(rec)
      const result = verifyAuditChain([rec])
      expect(result.valid).toBe(false)
      expect(result.errors[0]?.errorType).toBe('genesis')
    })

    it('verifies a valid 2-record chain', () => {
      const r1 = createMockAudit({ id: 'rec-1', createdAt: new Date('2025-01-01T00:00:00Z') })
      r1.prevHash = null
      r1.selfHash = computeAuditHash(r1)

      const r2 = createMockAudit({
        id: 'rec-2',
        createdAt: new Date('2025-01-01T00:01:00Z'),
        eventType: 'contact.updated',
      })
      r2.prevHash = r1.selfHash
      r2.selfHash = computeAuditHash(r2)

      const result = verifyAuditChain([r1, r2])
      expect(result.valid).toBe(true)
      expect(result.totalRecords).toBe(2)
      expect(result.errors).toHaveLength(0)
    })

    it('detects tampered selfHash', () => {
      const rec = createMockAudit({ prevHash: null, selfHash: 'tampered-hash-12345' })
      const result = verifyAuditChain([rec])
      expect(result.valid).toBe(false)
      expect(result.errors[0]?.errorType).toBe('self_hash')
    })

    it('detects broken chain (prevHash mismatch)', () => {
      const r1 = createMockAudit({ id: 'rec-1' })
      r1.prevHash = null
      r1.selfHash = computeAuditHash(r1)

      const r2 = createMockAudit({ id: 'rec-2', eventType: 'contact.updated' })
      r2.prevHash = 'wrong-hash'
      r2.selfHash = computeAuditHash(r2)

      const result = verifyAuditChain([r1, r2])
      expect(result.valid).toBe(false)
      expect(result.errors[0]?.errorType).toBe('prev_hash')
    })

    it('detects out-of-order timestamps', () => {
      const r1 = createMockAudit({
        id: 'rec-1',
        createdAt: new Date('2025-01-01T00:01:00Z'),
      })
      r1.prevHash = null
      r1.selfHash = computeAuditHash(r1)

      const r2 = createMockAudit({
        id: 'rec-2',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        eventType: 'contact.updated',
        prevHash: r1.selfHash,
      })
      r2.selfHash = computeAuditHash(r2)

      const result = verifyAuditChain([r1, r2])
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.errorType === 'ordering')).toBe(true)
    })

    it('aggregates multiple errors', () => {
      const r1 = createMockAudit({ prevHash: 'not-null', selfHash: 'tampered' })
      const result = verifyAuditChain([r1])
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })

    it('verifies a long chain (100)', () => {
      const records: AuditRecord[] = []
      let prev: string | null = null

      for (let i = 0; i < 100; i++) {
        const hour = Math.floor(i / 60)
        const minute = i % 60
        const createdAt = new Date(Date.UTC(2025, 0, 1, hour, minute, 0))
        const rec = createMockAudit({
          id: `rec-${i}`,
          createdAt,
          eventType: i % 2 === 0 ? 'contact.created' : 'contact.updated',
          eventData: j({ index: i }),
        })
        rec.prevHash = prev
        rec.selfHash = computeAuditHash(rec)
        records.push(rec)
        prev = rec.selfHash
      }

      const result = verifyAuditChain(records)
      expect(result.valid).toBe(true)
      expect(result.totalRecords).toBe(100)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Chain Security Properties', () => {
    it('detects an inserted record (breaks chain)', () => {
      const records: AuditRecord[] = []
      let prev: string | null = null

      for (let i = 0; i < 3; i++) {
        const rec = createMockAudit({
          id: `rec-${i}`,
          createdAt: new Date(`2025-01-01T00:0${i}:00Z`),
        })
        rec.prevHash = prev
        rec.selfHash = computeAuditHash(rec)
        records.push(rec)
        prev = rec.selfHash
      }

      const inserted = createMockAudit({
        id: 'inserted',
        createdAt: new Date('2025-01-01T00:01:30Z'),
        eventType: 'malicious.action',
        eventData: j({ sneaky: true }),
      })
      inserted.prevHash = 'wrong-prev'
      inserted.selfHash = computeAuditHash(inserted)
      records.splice(2, 0, inserted)

      const result = verifyAuditChain(records)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('detects modified eventData (selfHash mismatch)', () => {
      const rec = createMockAudit({ eventData: j({ original: 'data' }) })
      rec.prevHash = null
      rec.selfHash = computeAuditHash(rec)

      // mutate without recomputing hash
      rec.eventData = j({ modified: 'data' })

      const result = verifyAuditChain([rec])
      expect(result.valid).toBe(false)
      expect(result.errors[0]?.errorType).toBe('self_hash')
    })

    it('detects a deleted record (next prevHash now wrong)', () => {
      const records: AuditRecord[] = []
      let prev: string | null = null

      for (let i = 0; i < 3; i++) {
        const rec = createMockAudit({
          id: `rec-${i}`,
          createdAt: new Date(`2025-01-01T00:0${i}:00Z`),
        })
        rec.prevHash = prev
        rec.selfHash = computeAuditHash(rec)
        records.push(rec)
        prev = rec.selfHash
      }

      // delete middle record
      records.splice(1, 1)

      const result = verifyAuditChain(records)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.errorType === 'prev_hash')).toBe(true)
    })
  })
})
