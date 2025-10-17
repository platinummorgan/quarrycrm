/**
 * Prisma Middleware for Field-Level Encryption
 * 
 * Automatically encrypts/decrypts sensitive Contact fields:
 * - email (encrypted + searchable hash)
 * - phone (encrypted + searchable hash)
 * - notes (encrypted only)
 * 
 * Encryption happens on write (create/update)
 * Decryption happens on read (findMany/findUnique/etc)
 */

import { Prisma } from '@prisma/client'
import {
  encryptField,
  decryptField,
  makeSearchToken,
  isEncrypted,
} from './fields'

/**
 * Fields to encrypt in Contact model
 */
const ENCRYPTED_CONTACT_FIELDS = ['email', 'phone', 'notes'] as const
const SEARCHABLE_FIELDS = ['email', 'phone'] as const

type EncryptedContactField = typeof ENCRYPTED_CONTACT_FIELDS[number]
type SearchableField = typeof SEARCHABLE_FIELDS[number]

/**
 * Encrypt contact data before writing to database
 */
function encryptContactData(data: any): any {
  if (!data) return data

  const encrypted = { ...data }

  // Encrypt each sensitive field
  for (const field of ENCRYPTED_CONTACT_FIELDS) {
    if (encrypted[field] && !isEncrypted(encrypted[field])) {
      const plaintext = encrypted[field]
      
      // Encrypt the field
      encrypted[field] = encryptField(plaintext)
      
      // Create search token if field is searchable
      if (SEARCHABLE_FIELDS.includes(field as SearchableField)) {
        const hashField = `${field}_hash` as const
        encrypted[hashField] = makeSearchToken(plaintext)
      }
    }
  }

  return encrypted
}

/**
 * Decrypt contact data after reading from database
 */
function decryptContactData(data: any): any {
  if (!data) return data

  // Handle arrays (findMany results)
  if (Array.isArray(data)) {
    return data.map(decryptContactData)
  }

  const decrypted = { ...data }

  // Decrypt each encrypted field
  for (const field of ENCRYPTED_CONTACT_FIELDS) {
    if (decrypted[field] && isEncrypted(decrypted[field])) {
      try {
        decrypted[field] = decryptField(decrypted[field])
      } catch (error) {
        console.error(`❌ Failed to decrypt Contact.${field}:`, error)
        decrypted[field] = null // Return null on decryption failure
      }
    }
  }

  return decrypted
}

/**
 * Transform where clause to use search tokens for encrypted fields
 */
function transformWhereClause(where: any): any {
  if (!where) return where

  const transformed = { ...where }

  // Transform searchable field queries to use hash fields
  for (const field of SEARCHABLE_FIELDS) {
    if (transformed[field]) {
      const query = transformed[field]
      const hashField = `${field}_hash` as const

      // Handle different query types
      if (typeof query === 'string') {
        // Direct equality: { email: 'test@example.com' }
        transformed[hashField] = makeSearchToken(query)
        delete transformed[field]
      } else if (query.equals) {
        // Explicit equals: { email: { equals: 'test@example.com' } }
        transformed[hashField] = { equals: makeSearchToken(query.equals) }
        delete transformed[field]
      } else if (query.in) {
        // IN clause: { email: { in: ['a@b.com', 'c@d.com'] } }
        transformed[hashField] = {
          in: query.in.map((val: string) => makeSearchToken(val)),
        }
        delete transformed[field]
      }
      // Note: contains/startsWith/endsWith not supported on encrypted fields
      // These require full-text search or prefix-preserving encryption
    }
  }

  // Recursively transform nested conditions
  if (transformed.AND) {
    transformed.AND = Array.isArray(transformed.AND)
      ? transformed.AND.map(transformWhereClause)
      : transformWhereClause(transformed.AND)
  }

  if (transformed.OR) {
    transformed.OR = Array.isArray(transformed.OR)
      ? transformed.OR.map(transformWhereClause)
      : transformWhereClause(transformed.OR)
  }

  if (transformed.NOT) {
    transformed.NOT = Array.isArray(transformed.NOT)
      ? transformed.NOT.map(transformWhereClause)
      : transformWhereClause(transformed.NOT)
  }

  return transformed
}

/**
 * Prisma middleware for Contact encryption
 * 
 * Usage:
 * ```typescript
 * import { prisma } from '@/lib/db'
 * import { contactEncryptionMiddleware } from '@/lib/crypto/middleware'
 * 
 * prisma.$use(contactEncryptionMiddleware)
 * ```
 */
export const contactEncryptionMiddleware: Prisma.Middleware = async (params, next) => {
  // Only apply to Contact model
  if (params.model !== 'Contact') {
    return next(params)
  }

  // WRITE OPERATIONS: Encrypt before writing
  if (params.action === 'create') {
    if (params.args.data) {
      params.args.data = encryptContactData(params.args.data)
    }
  }

  if (params.action === 'update') {
    if (params.args.data) {
      params.args.data = encryptContactData(params.args.data)
    }
  }

  if (params.action === 'upsert') {
    if (params.args.create) {
      params.args.create = encryptContactData(params.args.create)
    }
    if (params.args.update) {
      params.args.update = encryptContactData(params.args.update)
    }
  }

  if (params.action === 'createMany') {
    if (params.args.data) {
      params.args.data = Array.isArray(params.args.data)
        ? params.args.data.map(encryptContactData)
        : encryptContactData(params.args.data)
    }
  }

  if (params.action === 'updateMany') {
    if (params.args.data) {
      params.args.data = encryptContactData(params.args.data)
    }
  }

  // SEARCH OPERATIONS: Transform where clause to use hash fields
  if (
    params.action === 'findUnique' ||
    params.action === 'findFirst' ||
    params.action === 'findMany' ||
    params.action === 'count' ||
    params.action === 'delete' ||
    params.action === 'deleteMany' ||
    params.action === 'update' ||
    params.action === 'updateMany'
  ) {
    if (params.args.where) {
      params.args.where = transformWhereClause(params.args.where)
    }
  }

  // Execute query
  const result = await next(params)

  // READ OPERATIONS: Decrypt after reading
  if (
    params.action === 'findUnique' ||
    params.action === 'findFirst' ||
    params.action === 'findMany' ||
    params.action === 'create' ||
    params.action === 'update' ||
    params.action === 'upsert'
  ) {
    return decryptContactData(result)
  }

  return result
}

/**
 * Apply encryption middleware to Prisma client
 * 
 * Call this once during app initialization:
 * ```typescript
 * import { applyEncryptionMiddleware } from '@/lib/crypto/middleware'
 * applyEncryptionMiddleware()
 * ```
 */
export function applyEncryptionMiddleware() {
  const { prisma } = require('@/lib/db')
  prisma.$use(contactEncryptionMiddleware)
  console.log('✅ Contact encryption middleware enabled')
}
