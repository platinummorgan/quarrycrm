/**
 * Demo Data Seeder
 * 
 * Generates realistic demo data for Quarry CRM:
 * - 3,000 contacts
 * - 500 companies
 * - 200 deals
 * - 300 activities
 * 
 * Usage:
 *   npm run seed:demo           # Generate all demo data
 *   npm run seed:demo -- --clean # Clean existing data first
 * 
 * Features:
 * - Masked PII data (emails: first.last@demo.example, phones: ***-***-1234)
 * - Realistic sales pipeline with proper stage distribution
 * - Quarry Demo organization with DEMO role user
 */

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
  CONTACTS: 3_000,
  COMPANIES: 500,
  DEALS: 200,
  ACTIVITIES: 300,
  BATCH_SIZE: 500,
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

// Deal stages with realistic conversion funnel for Quarry Demo
const DEAL_STAGES = [
  { name: 'Lead', weight: 40 },
  { name: 'Discovery', weight: 25 },
  { name: 'Proposal', weight: 15 },
  { name: 'Negotiation', weight: 10 },
  { name: 'Closed Won', weight: 5 },
  { name: 'Closed Lost', weight: 5 },
]

// Activity types with realistic distribution
const ACTIVITY_TYPES = [
  { type: 'CALL', weight: 30, descriptions: ['Called prospect', 'Follow-up call', 'Discovery call', 'Demo call', 'Negotiation call'] },
  { type: 'EMAIL', weight: 40, descriptions: ['Sent proposal', 'Follow-up email', 'Introduction email', 'Thank you email', 'Meeting confirmation'] },
  { type: 'MEETING', weight: 15, descriptions: ['Product demo', 'Discovery meeting', 'Negotiation meeting', 'Contract review', 'Onboarding call'] },
  { type: 'NOTE', weight: 10, descriptions: ['Added contact notes', 'Meeting summary', 'Deal update', 'Research findings', 'Internal notes'] },
  { type: 'TASK', weight: 5, descriptions: ['Follow up next week', 'Send contract', 'Schedule demo', 'Prepare proposal', 'Review documents'] },
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
  activities: number
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

  await prisma.activity.deleteMany({})
  console.log('  ✓ Deleted all activities')

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
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.example`,
        phone: '***-***-1234',
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
 * Generate activities in batches
 */
async function seedActivities(orgId: string, companyIds: string[], contactIds: string[], dealIds: string[], ownerId: string): Promise<void> {
  console.log(`� Seeding ${CONFIG.ACTIVITIES.toLocaleString()} activities...\n`)

  let activitiesCreated = 0
  const totalBatches = Math.ceil(CONFIG.ACTIVITIES / CONFIG.BATCH_SIZE)

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(CONFIG.BATCH_SIZE, CONFIG.ACTIVITIES - batch * CONFIG.BATCH_SIZE)
    const activities = []

    for (let i = 0; i < batchSize; i++) {
      // Select activity type based on weighted distribution
      const rand = Math.random() * 100
      let cumulativeWeight = 0
      let activityType = ACTIVITY_TYPES[0]

      for (const type of ACTIVITY_TYPES) {
        cumulativeWeight += type.weight
        if (rand <= cumulativeWeight) {
          activityType = type
          break
        }
      }

      // Randomly link to contact, deal, or company (or combination)
      const contactId = Math.random() > 0.3 ? faker.helpers.arrayElement(contactIds) : null
      const dealId = Math.random() > 0.6 ? faker.helpers.arrayElement(dealIds) : null
      const companyId = Math.random() > 0.7 ? faker.helpers.arrayElement(companyIds) : null

      const description = faker.helpers.arrayElement(activityType.descriptions)
      const isTask = activityType.type === 'TASK'
      const isCompleted = isTask ? Math.random() > 0.4 : undefined // 60% of tasks are completed

      activities.push({
        type: activityType.type as any,
        description,
        subject: activityType.type === 'EMAIL' ? faker.lorem.sentence() : null,
        body: activityType.type === 'EMAIL' || activityType.type === 'NOTE' ? faker.lorem.paragraphs(2) : null,
        dueDate: isTask ? faker.date.future() : null,
        isCompleted,
        contactId,
        dealId,
        companyId,
        organizationId: orgId,
        ownerId,
      })
    }

    await prisma.activity.createMany({
      data: activities,
    })

    activitiesCreated += batchSize

    const progress = ((batch + 1) / totalBatches * 100).toFixed(1)
    process.stdout.write(`  Progress: ${progress}% (${activitiesCreated.toLocaleString()} / ${CONFIG.ACTIVITIES.toLocaleString()})\r`)
  }

  console.log(`\n✅ Created ${activitiesCreated.toLocaleString()} activities\n`)
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
  console.log(`  Activities: ${stats.activities.toLocaleString()}`)
  console.log(`  Duration:  ${(stats.duration / 1000).toFixed(2)}s`)
  console.log(`  Rate:      ${Math.round((stats.companies + stats.contacts + stats.deals + stats.activities) / (stats.duration / 1000)).toLocaleString()} records/sec`)
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

    // Get or create Quarry Demo organization
    let org = await prisma.organization.findFirst({
      where: { name: 'Quarry Demo' },
    })

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Quarry Demo',
          domain: 'demo.example',
          description: 'Demo organization for Quarry CRM showcasing all features',
        },
      })
      console.log('✓ Created Quarry Demo organization\n')
    } else {
      console.log('✓ Using existing Quarry Demo organization\n')
    }

    // Get or create demo user
    let user = await prisma.user.findFirst({
      where: { email: 'demo@demo.example' },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@demo.example',
          name: 'Demo User',
        },
      })
      console.log('✓ Created demo user\n')
    } else {
      console.log('✓ Using existing demo user\n')
    }

    // Get or create org member with DEMO role
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
          role: 'DEMO',
          onboardingProgress: {},
        },
      })
      console.log('✓ Created org member with DEMO role\n')
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
          name: 'Quarry Sales Pipeline',
          description: 'Standard sales process for Quarry CRM demo',
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
      console.log('✓ Created Quarry Sales Pipeline with stages\n')
    } else {
      console.log('✓ Using existing pipeline\n')
    }

    const stageIds = pipeline.stages.map(s => s.id)

    // Seed data in dependency order
    const companyIds = await seedCompanies(org.id, orgMember.id)
    const contactIds = await seedContacts(org.id, companyIds, orgMember.id)
    await seedDeals(org.id, companyIds, contactIds, pipeline.id, stageIds, orgMember.id)

    // Get deal IDs for linking activities
    const deals = await prisma.deal.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    })
    const dealIds = deals.map(d => d.id)

    await seedActivities(org.id, companyIds, contactIds, dealIds, orgMember.id)

    const duration = Date.now() - startTime

    // Print summary
    await printStats({
      companies: companyIds.length,
      contacts: contactIds.length,
      deals: CONFIG.DEALS,
      activities: CONFIG.ACTIVITIES,
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
