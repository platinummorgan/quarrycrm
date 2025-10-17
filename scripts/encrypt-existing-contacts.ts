/**
 * Data Migration: Encrypt existing Contact fields
 * 
 * This script encrypts existing plaintext contact data and generates search hashes.
 * Safe to run multiple times (skips already encrypted records).
 * 
 * Usage:
 *   tsx scripts/encrypt-existing-contacts.ts
 * 
 * Options:
 *   --dry-run     Show what would be encrypted without making changes
 *   --batch-size  Number of records to process per batch (default: 100)
 */

import { PrismaClient } from '@prisma/client'
import { encryptField, makeSearchToken, isEncrypted } from '../src/lib/crypto/fields'

const prisma = new PrismaClient()

interface MigrationStats {
  total: number
  encrypted: number
  alreadyEncrypted: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

async function migrateContactEncryption(
  dryRun: boolean = false,
  batchSize: number = 100
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    encrypted: 0,
    alreadyEncrypted: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Count total contacts
    const totalContacts = await prisma.contact.count({
      where: {
        deletedAt: null, // Only process active contacts
      },
    })

    console.log(`📊 Found ${totalContacts} active contacts`)
    stats.total = totalContacts

    if (totalContacts === 0) {
      console.log('✅ No contacts to migrate')
      return stats
    }

    // Process in batches to avoid memory issues
    let processed = 0
    let skip = 0

    while (processed < totalContacts) {
      const contacts = await prisma.contact.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          notes: true,
          email_hash: true,
          phone_hash: true,
        },
        skip,
        take: batchSize,
      })

      console.log(`\n📦 Processing batch: ${skip + 1}-${skip + contacts.length} of ${totalContacts}`)

      for (const contact of contacts) {
        try {
          const updates: any = {}
          let needsUpdate = false

          // Check and encrypt email
          if (contact.email && !isEncrypted(contact.email)) {
            updates.email = encryptField(contact.email)
            updates.email_hash = makeSearchToken(contact.email)
            needsUpdate = true
            console.log(`  🔒 Encrypting email for contact ${contact.id}`)
          } else if (contact.email && isEncrypted(contact.email)) {
            stats.alreadyEncrypted++
          }

          // Check and encrypt phone
          if (contact.phone && !isEncrypted(contact.phone)) {
            updates.phone = encryptField(contact.phone)
            updates.phone_hash = makeSearchToken(contact.phone)
            needsUpdate = true
            console.log(`  🔒 Encrypting phone for contact ${contact.id}`)
          } else if (contact.phone && isEncrypted(contact.phone)) {
            stats.alreadyEncrypted++
          }

          // Check and encrypt notes
          if (contact.notes && !isEncrypted(contact.notes)) {
            updates.notes = encryptField(contact.notes)
            needsUpdate = true
            console.log(`  🔒 Encrypting notes for contact ${contact.id}`)
          } else if (contact.notes && isEncrypted(contact.notes)) {
            stats.alreadyEncrypted++
          }

          // Update if needed
          if (needsUpdate) {
            if (!dryRun) {
              await prisma.contact.update({
                where: { id: contact.id },
                data: updates,
              })
              stats.encrypted++
              console.log(`  ✅ Updated contact ${contact.id}`)
            } else {
              console.log(`  🔍 [DRY RUN] Would encrypt contact ${contact.id}`)
              stats.encrypted++
            }
          }
        } catch (error) {
          stats.failed++
          const errorMsg = error instanceof Error ? error.message : String(error)
          stats.errors.push({ id: contact.id, error: errorMsg })
          console.error(`  ❌ Failed to encrypt contact ${contact.id}:`, errorMsg)
        }

        processed++
      }

      skip += batchSize

      // Progress update
      const progress = Math.round((processed / totalContacts) * 100)
      console.log(`\n📈 Progress: ${processed}/${totalContacts} (${progress}%)`)
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }

  return stats
}

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean; batchSize: number } {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  
  const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='))
  const batchSize = batchSizeArg
    ? parseInt(batchSizeArg.split('=')[1], 10)
    : 100

  return { dryRun, batchSize }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔐 Contact Encryption Migration')
  console.log('================================\n')

  const { dryRun, batchSize } = parseArgs()

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: No data will be modified\n')
  }

  console.log(`⚙️  Batch size: ${batchSize}\n`)

  // Validate environment variables
  if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ERROR: ENCRYPTION_KEY environment variable not set')
    console.error('   Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
    process.exit(1)
  }

  if (!process.env.SEARCH_SALT) {
    console.error('❌ ERROR: SEARCH_SALT environment variable not set')
    console.error('   Generate a salt with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
    process.exit(1)
  }

  console.log('✅ Environment variables validated\n')

  // Run migration
  const startTime = Date.now()
  const stats = await migrateContactEncryption(dryRun, batchSize)
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary')
  console.log('='.repeat(50))
  console.log(`Total contacts:        ${stats.total}`)
  console.log(`Encrypted:             ${stats.encrypted}`)
  console.log(`Already encrypted:     ${stats.alreadyEncrypted}`)
  console.log(`Failed:                ${stats.failed}`)
  console.log(`Duration:              ${duration}s`)
  console.log('='.repeat(50))

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:')
    stats.errors.forEach(({ id, error }) => {
      console.log(`  - Contact ${id}: ${error}`)
    })
  }

  if (dryRun) {
    console.log('\n⚠️  This was a DRY RUN. No data was modified.')
    console.log('   Run without --dry-run to encrypt data.')
  } else if (stats.failed === 0) {
    console.log('\n✅ Migration completed successfully!')
  } else {
    console.log('\n⚠️  Migration completed with errors.')
    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
