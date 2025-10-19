/**
 * Quarry Demo Data Seeder
 *
 * Creates a "Quarry Demo" organization with realistic demo data:
 * - 3,000 contacts
 * - 500 companies
 * - 200 deals
 * - 300 activities
 *
 * PII Masking:
 * - Emails: first.last@demo.example
 * - Phones: ***-***-1234
 *
 * Usage:
 *   npm run seed:demo-small
 */

import { PrismaClient, OrgMemberRole } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Configuration for demo data
const CONFIG = {
  COMPANIES: 500,
  CONTACTS: 3000,
  DEALS: 200,
  ACTIVITIES: 300,
  BATCH_SIZE: 500,
  SEED: 54321, // Different seed for demo data
}

// Realistic sales pipeline stages
const SALES_PIPELINE = {
  name: 'Sales Pipeline',
  description: 'Standard B2B sales process for Quarry CRM',
  stages: [
    { name: 'Lead', color: '#3B82F6', order: 1 },
    { name: 'Discovery', color: '#10B981', order: 2 },
    { name: 'Proposal', color: '#F59E0B', order: 3 },
    { name: 'Negotiation', color: '#EF4444', order: 4 },
    { name: 'Closed Won', color: '#22C55E', order: 5 },
    { name: 'Closed Lost', color: '#6B7280', order: 6 },
  ],
}

// Industries for companies
const INDUSTRIES = [
  'Technology',
  'SaaS',
  'Finance',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Real Estate',
  'Education',
  'Marketing',
]

// Activity types
const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK'] as const

/**
 * Mask PII data for demo purposes
 */
function maskEmail(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.example`
}

function maskPhone(): string {
  return '***-***-1234'
}

/**
 * Create Quarry Demo organization with realistic pipeline
 */
async function createDemoOrganization() {
  console.log('🏗️  Setting up Quarry Demo organization...')

  // Check if demo organization already exists
  let org = await prisma.organization.findFirst({
    where: { name: 'Quarry Demo' },
  })

  if (!org) {
    // Create organization
    org = await prisma.organization.create({
      data: {
        name: 'Quarry Demo',
        domain: 'demo.quarrycrm.com',
        description: 'Demo organization showcasing Quarry CRM features',
        emailLogAddress: 'demo@quarrycrm.com',
      },
    })
    console.log('✅ Created Quarry Demo organization')
  } else {
    console.log('✅ Using existing Quarry Demo organization')
  }

  // Check if demo user already exists
  let user = await prisma.user.findFirst({
    where: { email: 'demo@quarrycrm.com' },
  })

  if (!user) {
    // Create demo user
    user = await prisma.user.create({
      data: {
        email: 'demo@quarrycrm.com',
        name: 'Demo User',
      },
    })
    console.log('✅ Created demo user')
  } else {
    console.log('✅ Using existing demo user')
  }

  // Check if org member already exists
  let member = await prisma.orgMember.findFirst({
    where: {
      organizationId: org.id,
      userId: user.id,
    },
  })

  if (!member) {
    // Create org member with DEMO role
    member = await prisma.orgMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: OrgMemberRole.DEMO,
        onboardingProgress: {},
      },
    })
    console.log('✅ Created org member with DEMO role')
  } else {
    console.log('✅ Using existing org member')
  }

  // Check if pipeline already exists
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
    // Create sales pipeline with stages
    pipeline = await prisma.pipeline.create({
      data: {
        organizationId: org.id,
        name: SALES_PIPELINE.name,
        description: SALES_PIPELINE.description,
        isDefault: true,
        ownerId: member.id,
        stages: {
          create: SALES_PIPELINE.stages.map((stage) => ({
            name: stage.name,
            order: stage.order,
            color: stage.color,
          })),
        },
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    })
    console.log('✅ Created sales pipeline with stages')
  } else {
    console.log('✅ Using existing pipeline')
  }

  return { org, user, member, pipeline }
}

/**
 * Generate companies in batches
 */
async function seedCompanies(
  orgId: string,
  ownerId: string
): Promise<string[]> {
  console.log(`🏢 Seeding ${CONFIG.COMPANIES} companies...`)

  const companyIds: string[] = []
  const totalBatches = Math.ceil(CONFIG.COMPANIES / CONFIG.BATCH_SIZE)

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(
      CONFIG.BATCH_SIZE,
      CONFIG.COMPANIES - batch * CONFIG.BATCH_SIZE
    )
    const companies = []

    for (let i = 0; i < batchSize; i++) {
      companies.push({
        name: faker.company.name(),
        website: faker.internet.url(),
        industry: faker.helpers.arrayElement(INDUSTRIES),
        domain: faker.internet.domainName(),
        description: faker.company.catchPhrase(),
        organizationId: orgId,
        ownerId,
      })
    }

    await prisma.company.createMany({
      data: companies,
    })

    // Fetch IDs for linking
    const batchCompanies = await prisma.company.findMany({
      where: { organizationId: orgId },
      select: { id: true },
      skip: batch * CONFIG.BATCH_SIZE,
      take: batchSize,
    })

    companyIds.push(...batchCompanies.map((c) => c.id))

    const progress = (((batch + 1) / totalBatches) * 100).toFixed(1)
    process.stdout.write(
      `  Progress: ${progress}% (${companyIds.length} / ${CONFIG.COMPANIES})\r`
    )
  }

  console.log(`\n✅ Created ${companyIds.length} companies\n`)
  return companyIds
}

/**
 * Generate contacts in batches with PII masking
 */
async function seedContacts(
  orgId: string,
  companyIds: string[],
  ownerId: string
): Promise<string[]> {
  console.log(`👥 Seeding ${CONFIG.CONTACTS} contacts with masked PII...`)

  const contactIds: string[] = []
  const totalBatches = Math.ceil(CONFIG.CONTACTS / CONFIG.BATCH_SIZE)

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(
      CONFIG.BATCH_SIZE,
      CONFIG.CONTACTS - batch * CONFIG.BATCH_SIZE
    )
    const contacts = []

    for (let i = 0; i < batchSize; i++) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      // 70% of contacts linked to companies
      const companyId =
        Math.random() > 0.3 ? faker.helpers.arrayElement(companyIds) : null

      contacts.push({
        firstName,
        lastName,
        email: maskEmail(firstName, lastName),
        phone: maskPhone(),
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

    contactIds.push(...batchContacts.map((c) => c.id))

    const progress = (((batch + 1) / totalBatches) * 100).toFixed(1)
    process.stdout.write(
      `  Progress: ${progress}% (${contactIds.length} / ${CONFIG.CONTACTS})\r`
    )
  }

  console.log(`\n✅ Created ${contactIds.length} contacts\n`)
  return contactIds
}

/**
 * Generate deals in batches
 */
async function seedDeals(
  orgId: string,
  companyIds: string[],
  contactIds: string[],
  pipelineId: string,
  stageIds: string[],
  ownerId: string
): Promise<void> {
  console.log(`💰 Seeding ${CONFIG.DEALS} deals...`)

  let dealsCreated = 0
  const totalBatches = Math.ceil(CONFIG.DEALS / CONFIG.BATCH_SIZE)

  for (let batch = 0; batch < totalBatches; batch++) {
    const batchSize = Math.min(
      CONFIG.BATCH_SIZE,
      CONFIG.DEALS - batch * CONFIG.BATCH_SIZE
    )
    const deals = []

    for (let i = 0; i < batchSize; i++) {
      // Distribute deals across stages (weighted towards earlier stages)
      const stageWeights = [0.4, 0.25, 0.15, 0.1, 0.05, 0.05] // Lead, Discovery, Proposal, Negotiation, Won, Lost
      const rand = Math.random()
      let cumulativeWeight = 0
      let stageIndex = 0

      for (let j = 0; j < stageWeights.length; j++) {
        cumulativeWeight += stageWeights[j]
        if (rand <= cumulativeWeight) {
          stageIndex = j
          break
        }
      }

      const stageId = stageIds[stageIndex] || stageIds[0]

      deals.push({
        title: faker.company.catchPhrase(),
        value: faker.number.int({ min: 10000, max: 500000 }),
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

    const progress = (((batch + 1) / totalBatches) * 100).toFixed(1)
    process.stdout.write(
      `  Progress: ${progress}% (${dealsCreated} / ${CONFIG.DEALS})\r`
    )
  }

  console.log(`\n✅ Created ${dealsCreated} deals\n`)
}

/**
 * Generate activities
 */
async function seedActivities(
  orgId: string,
  companyIds: string[],
  contactIds: string[],
  dealIds: string[],
  ownerId: string
): Promise<void> {
  console.log(`📝 Seeding ${CONFIG.ACTIVITIES} activities...`)

  const activities = []

  for (let i = 0; i < CONFIG.ACTIVITIES; i++) {
    // Randomly link to contact, deal, or company
    const contactId =
      Math.random() > 0.4 ? faker.helpers.arrayElement(contactIds) : null
    const dealId =
      Math.random() > 0.6 ? faker.helpers.arrayElement(dealIds) : null
    const companyId =
      Math.random() > 0.8 ? faker.helpers.arrayElement(companyIds) : null

    const type = faker.helpers.arrayElement(ACTIVITY_TYPES)
    const isTask = type === 'TASK'

    activities.push({
      type: type as any,
      description: faker.lorem.sentence(),
      subject: type === 'EMAIL' ? faker.lorem.sentence() : null,
      body:
        type === 'EMAIL' || type === 'NOTE' ? faker.lorem.paragraph() : null,
      dueDate: isTask ? faker.date.future() : null,
      isCompleted: isTask ? faker.datatype.boolean() : false,
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

  console.log(`✅ Created ${CONFIG.ACTIVITIES} activities\n`)
}

/**
 * Print summary
 */
function printSummary(startTime: number) {
  const duration = Date.now() - startTime

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 QUARRY DEMO DATA SEEDING COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('📊 Data Summary:')
  console.log(`   • Organization: Quarry Demo`)
  console.log(`   • User: Demo User (DEMO role)`)
  console.log(
    `   • Pipeline: ${SALES_PIPELINE.name} (${SALES_PIPELINE.stages.length} stages)`
  )
  console.log(`   • Companies: ${CONFIG.COMPANIES.toLocaleString()}`)
  console.log(`   • Contacts: ${CONFIG.CONTACTS.toLocaleString()}`)
  console.log(`   • Deals: ${CONFIG.DEALS.toLocaleString()}`)
  console.log(`   • Activities: ${CONFIG.ACTIVITIES.toLocaleString()}`)
  console.log(`   • Duration: ${(duration / 1000).toFixed(2)}s`)
  console.log('\n🔒 PII Protection:')
  console.log('   • Emails: first.last@demo.example')
  console.log('   • Phones: ***-***-1234')
  console.log('\n🚀 Demo ready! Login with demo@quarrycrm.com')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

/**
 * Main seeding function
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌱 QUARRY DEMO DATA SEEDER')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Set seed for reproducible demo data
  faker.seed(CONFIG.SEED)

  const startTime = Date.now()

  try {
    // Create demo organization and pipeline
    const { org, member, pipeline } = await createDemoOrganization()

    // Seed data in dependency order
    const companyIds = await seedCompanies(org.id, member.id)
    const contactIds = await seedContacts(org.id, companyIds, member.id)
    await seedDeals(
      org.id,
      companyIds,
      contactIds,
      pipeline.id,
      pipeline.stages.map((s) => s.id),
      member.id
    )

    // Get deal IDs for linking activities
    const deals = await prisma.deal.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    })
    const dealIds = deals.map((d) => d.id)

    await seedActivities(org.id, companyIds, contactIds, dealIds, member.id)

    // Print summary
    printSummary(startTime)
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
