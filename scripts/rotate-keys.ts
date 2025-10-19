/**
 * Key Rotation Script: Re-encrypt sample rows with latest key
 *
 * Usage:
 *   tsx scripts/rotate-keys.ts [--dry-run] [--limit=10]
 *
 * - Re-encrypts a sample of Contact rows using the latest key version.
 * - Supports legacy key IDs (v1, v2, ...).
 * - Prints before/after for verification.
 */

import { PrismaClient } from '@prisma/client'
import {
  getEncryptionVersion,
  rotateFieldKey,
  isEncrypted,
} from '../src/lib/crypto/fields'

const prisma = new PrismaClient()

async function rotateKeys({ dryRun = false, limit = 10 } = {}) {
  // Get latest key version from env
  const latestKeyId = process.env.KMS_KEY_ID || 'v2'

  // Fetch sample contacts
  const contacts = await prisma.contact.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, phone: true, notes: true },
    take: limit,
  })

  for (const contact of contacts) {
    const updates: any = {}
    let needsUpdate = false

    for (const field of ['email', 'phone', 'notes'] as const) {
      const value = contact[field]
      if (value && isEncrypted(value)) {
        const currentVersion = getEncryptionVersion(value)
        if (currentVersion !== latestKeyId) {
          updates[field] = rotateFieldKey(value, latestKeyId)
          needsUpdate = true
          console.log(
            `🔄 ${field} for contact ${contact.id}: ${currentVersion} → ${latestKeyId}`
          )
        }
      }
    }

    if (needsUpdate) {
      if (!dryRun) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: updates,
        })
        console.log(`✅ Updated contact ${contact.id}`)
      } else {
        console.log(`🔍 [DRY RUN] Would update contact ${contact.id}`)
      }
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 10
  return { dryRun, limit }
}

async function main() {
  const { dryRun, limit } = parseArgs()
  if (!process.env.KMS_KEY_ID || !process.env.ENCRYPTION_KEY) {
    console.error('❌ KMS_KEY_ID and ENCRYPTION_KEY env vars required')
    process.exit(1)
  }
  await rotateKeys({ dryRun, limit })
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
