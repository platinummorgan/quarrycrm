/**
 * Demo Data Seeder
 * 
 * Generates realistic demo data for performance testing:
 * - 10,000 contacts
 * - 2,000 companies
 * - 800 deals
 * 
 * Usage:
 *   npm run seed:demo           # Generate all demo data
 *   npm run seed:demo -- --clean # Clean existing data first
 * 
 * Performance targets:
 * - Seed 10k records in <60 seconds
 * - Batched inserts (100 records per batch)
 * - Progress indicators for monitoring
 */

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
  CONTACTS: 10_000,
  COMPANIES: 2_000,
  DEALS: 800,
  BATCH_SIZE: 100,
  // Ensure reproducible data for benchmarks
  SEED: 12345,
}

// Industries for companies
const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Real Estate',
  'Education',
  'Telecommunications',
  'Transportation',
]

// Deal stages with realistic conversion funnel
const DEAL_STAGES = [
  { name: 'Lead', weight: 40 },
  { name: 'Qualified', weight: 25 },
  { name: 'Proposal', weight: 15 },
  { name: 'Negotiation', weight: 10 },
  { name: 'Closed Won', weight: 5 },
  { name: 'Closed Lost', weight: 5 },
]

// Contact titles
const TITLES = [
  'CEO',
  'CTO',
  'VP of Sales',
  'VP of Marketing',
  'Director of Operations',
  'Senior Manager',
  'Account Manager',
  'Sales Representative',
  'Marketing Coordinator',
  'Software Engineer',
]

interface SeedStats {
  companies: number
  contacts: number
  deals: number
  duration: number
}

/**
 * Clean all demo data from database
 */
async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...\n')

  const startTime = Date.now()

  // Delete in correct order (respect foreign key constraints)
  await prisma.deal.deleteMany({})
  console.log('  ✓ Deleted all deals')

  await prisma.contact.deleteMany({})
  console.log('  ✓ Deleted all contacts')

  await prisma.company.deleteMany({})
  console.log('  ✓ Deleted all companies')

  const duration = Date.now() - startTime
  console.log(`\n✅ Cleanup completed in ${duration}ms\n`)
}

/**
 * Generate companies in batches
 */
async function seedCompanies(orgId: string, ownerId: string): Promise<string[]> {
  console.log(`📊 Seeding ${CONFIG.COMPANIES.toLocaleString()} companies...\n`)

  const companyIds: string[] = []
  const totalBatches = Math.ceil(CONFIG.COMPANIES / CONFIG.BATCH_SIZE)

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(CONFIG.BATCH_SIZE, CONFIG.COMPANIES - batch * CONFIG.BATCH_SIZE)
    const companies = []

    for (let i = 0; i < batchSize; i++) {
      const companyName = faker.company.name()
      companies.push({
        name: companyName,
        website: faker.internet.url(),
        industry: faker.helpers.arrayElement(INDUSTRIES),
        domain: faker.internet.domainName(),
        description: faker.company.catchPhrase(),
        organizationId: orgId,
        ownerId,
      })
    }

    const created = await prisma.company.createMany({
      data: companies,
    })

    // Fetch IDs for linking contacts/deals
    const batchCompanies = await prisma.company.findMany({
      where: { organizationId: orgId },
      select: { id: true },
      skip: batch * CONFIG.BATCH_SIZE,
      take: batchSize,
    })

    companyIds.push(...batchCompanies.map(c => c.id))

    const progress = ((batch + 1) / totalBatches * 100).toFixed(1)
    process.stdout.write(`  Progress: ${progress}% (${companyIds.length.toLocaleString()} / ${CONFIG.COMPANIES.toLocaleString()})\r`)
  }

  console.log(`\n✅ Created ${companyIds.length.toLocaleString()} companies\n`)
  return companyIds
}

/**
 * Generate contacts in batches
 */
async function seedContacts(orgId: string, companyIds: string[], ownerId: string): Promise<string[]> {
  console.log(`👥 Seeding ${CONFIG.CONTACTS.toLocaleString()} contacts...\n`)

  const contactIds: string[] = []
  const totalBatches = Math.ceil(CONFIG.CONTACTS / CONFIG.BATCH_SIZE)

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(CONFIG.BATCH_SIZE, CONFIG.CONTACTS - batch * CONFIG.BATCH_SIZE)
    const contacts = []

    for (let i = 0; i < batchSize; i++) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      // 80% of contacts linked to companies
      const companyId = Math.random() > 0.2 ? faker.helpers.arrayElement(companyIds) : null

      contacts.push({
        firstName,
        lastName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        phone: faker.phone.number(),
        companyId,
        organizationId: orgId,
        ownerId,
      })
    }

    await prisma.contact.createMany({
      data: contacts,
    })

    // Fetch IDs for linking deals
    const batchContacts = await prisma.contact.findMany({
      where: { organizationId: orgId },
      select: { id: true },
      skip: batch * CONFIG.BATCH_SIZE,
      take: batchSize,
    })

    contactIds.push(...batchContacts.map(c => c.id))

    const progress = ((batch + 1) / totalBatches * 100).toFixed(1)
    process.stdout.write(`  Progress: ${progress}% (${contactIds.length.toLocaleString()} / ${CONFIG.CONTACTS.toLocaleString()})\r`)
  }

  console.log(`\n✅ Created ${contactIds.length.toLocaleString()} contacts\n`)
  return contactIds
}

/**
 * Generate deals in batches
 */
async function seedDeals(orgId: string, companyIds: string[], contactIds: string[], pipelineId: string, stageIds: string[], ownerId: string): Promise<void> {
  console.log(`💰 Seeding ${CONFIG.DEALS.toLocaleString()} deals...\n`)

  let dealsCreated = 0
  const totalBatches = Math.ceil(CONFIG.DEALS / CONFIG.BATCH_SIZE)

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(CONFIG.BATCH_SIZE, CONFIG.DEALS - batch * CONFIG.BATCH_SIZE)
    const deals = []

    for (let i = 0; i < batchSize; i++) {
      // Select stage based on weighted distribution (realistic funnel)
      const rand = Math.random() * 100
      let cumulativeWeight = 0
      let stageIndex = 0

      for (let j = 0; j < DEAL_STAGES.length; j++) {
        cumulativeWeight += DEAL_STAGES[j].weight
        if (rand <= cumulativeWeight) {
          stageIndex = j
          break
        }
      }

      const stageId = stageIds[stageIndex] || stageIds[0]

      deals.push({
        title: faker.company.catchPhrase(),
        value: faker.number.int({ min: 5_000, max: 500_000 }),
        stageId,
        pipelineId,
        probability: faker.number.int({ min: 10, max: 90 }),
        expectedClose: faker.date.future(),
        companyId: faker.helpers.arrayElement(companyIds),
        contactId: faker.helpers.arrayElement(contactIds),
        organizationId: orgId,
        ownerId,
      })
    }

    await prisma.deal.createMany({
      data: deals,
    })

    dealsCreated += batchSize

    const progress = ((batch + 1) / totalBatches * 100).toFixed(1)
    process.stdout.write(`  Progress: ${progress}% (${dealsCreated.toLocaleString()} / ${CONFIG.DEALS.toLocaleString()})\r`)
  }

  console.log(`\n✅ Created ${dealsCreated.toLocaleString()} deals\n`)
}

/**
 * Print summary statistics
 */
async function printStats(stats: SeedStats) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📈 SEED SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log(`  Companies: ${stats.companies.toLocaleString()}`)
  console.log(`  Contacts:  ${stats.contacts.toLocaleString()}`)
  console.log(`  Deals:     ${stats.deals.toLocaleString()}`)
  console.log(`  Duration:  ${(stats.duration / 1000).toFixed(2)}s`)
  console.log(`  Rate:      ${Math.round((stats.companies + stats.contacts + stats.deals) / (stats.duration / 1000)).toLocaleString()} records/sec`)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('🚀 Ready for performance testing!')
  console.log('   Visit /speed to run benchmarks\n')
}

/**
 * Main seeding function
 */
async function main() {
  const args = process.argv.slice(2)
  const shouldClean = args.includes('--clean')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌱 CRM DEMO DATA SEEDER')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Set seed for reproducibility
  faker.seed(CONFIG.SEED)

  const startTime = Date.now()

  try {
    // Clean database if requested
    if (shouldClean) {
      await cleanDatabase()
    }

    // Get or create demo organization
    let org = await prisma.organization.findFirst({
      where: { name: 'Demo Organization' },
    })

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Demo Organization',
        },
      })
      console.log('✓ Created demo organization\n')
    } else {
      console.log('✓ Using existing demo organization\n')
    }

    // Get or create demo user
    let user = await prisma.user.findFirst({
      where: { email: 'demo@example.com' },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@example.com',
          name: 'Demo User',
        },
      })
      console.log('✓ Created demo user\n')
    } else {
      console.log('✓ Using existing demo user\n')
    }

    // Get or create org member
    let orgMember = await prisma.orgMember.findFirst({
      where: {
        organizationId: org.id,
        userId: user.id,
      },
    })

    if (!orgMember) {
      orgMember = await prisma.orgMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'OWNER',
        },
      })
      console.log('✓ Created org member\n')
    } else {
      console.log('✓ Using existing org member\n')
    }

    // Get or create pipeline with stages
    let pipeline = await prisma.pipeline.findFirst({
      where: {
        organizationId: org.id,
        isDefault: true,
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!pipeline) {
      pipeline = await prisma.pipeline.create({
        data: {
          organizationId: org.id,
          name: 'Default Sales Pipeline',
          description: 'Standard B2B sales process',
          isDefault: true,
          ownerId: orgMember.id,
          stages: {
            create: DEAL_STAGES.map((stage, index) => ({
              name: stage.name,
              order: index,
              color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#22c55e', '#ef4444'][index],
            })),
          },
        },
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
      })
      console.log('✓ Created pipeline with stages\n')
    } else {
      console.log('✓ Using existing pipeline\n')
    }

    const stageIds = pipeline.stages.map(s => s.id)

    // Seed data in dependency order
    const companyIds = await seedCompanies(org.id, orgMember.id)
    const contactIds = await seedContacts(org.id, companyIds, orgMember.id)
    await seedDeals(org.id, companyIds, contactIds, pipeline.id, stageIds, orgMember.id)

    const duration = Date.now() - startTime

    // Print summary
    await printStats({
      companies: companyIds.length,
      contacts: contactIds.length,
      deals: CONFIG.DEALS,
      duration,
    })
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
