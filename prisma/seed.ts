import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Set faker seed for reproducible data
faker.seed(12345)

async function main() {
  console.log('🌱 Starting seed...')

  // Create demo organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Demo CRM Corp',
      domain: 'demo-crm.com',
      description: 'A demo organization for testing the CRM system',
    },
  })

  console.log('✅ Created organization:', organization.name)

  // Create 3 users
  const users = []
  for (let i = 0; i < 3; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i + 1}@demo-crm.com`,
        name: faker.person.fullName(),
      },
    })
    users.push(user)
  }

  console.log(
    '✅ Created users:',
    users.map((u) => u.name)
  )

  // Create org members (all as members, first as owner)
  const members = []
  for (let i = 0; i < users.length; i++) {
    const member = await prisma.orgMember.create({
      data: {
        organizationId: organization.id,
        userId: users[i].id,
        role: i === 0 ? 'OWNER' : 'MEMBER',
      },
    })
    members.push(member)
  }

  console.log('✅ Created org members')

  // Create 1 pipeline with 5 stages
  const pipeline = await prisma.pipeline.create({
    data: {
      organizationId: organization.id,
      name: 'Sales Pipeline',
      description: 'Standard sales pipeline',
      isDefault: true,
      ownerId: members[0].id,
    },
  })

  const stages = []
  const stageNames = [
    'Lead',
    'Qualified',
    'Proposal',
    'Negotiation',
    'Closed Won',
  ]
  for (let i = 0; i < stageNames.length; i++) {
    const stage = await prisma.stage.create({
      data: {
        pipelineId: pipeline.id,
        name: stageNames[i],
        order: i + 1,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i],
      },
    })
    stages.push(stage)
  }

  console.log('✅ Created pipeline with stages')

  // Create 2,000 companies (for performance testing)
  console.log('🌱 Creating 2,000 companies...')
  const companies = []
  for (let i = 0; i < 2000; i++) {
    const company = await prisma.company.create({
      data: {
        organizationId: organization.id,
        name: faker.company.name(),
        website: faker.internet.url(),
        industry: faker.company.buzzPhrase(),
        description: faker.company.catchPhrase(),
        domain: faker.internet.domainName(),
        ownerId: faker.helpers.arrayElement(members).id,
      },
    })
    companies.push(company)

    if ((i + 1) % 500 === 0) {
      console.log(`  ✅ Created ${i + 1} companies`)
    }
  }

  console.log('✅ Created 2,000 companies')

  // Create 10,000 contacts (for performance testing)
  console.log('🌱 Creating 10,000 contacts...')
  const contacts = []
  for (let i = 0; i < 10000; i++) {
    const contact = await prisma.contact.create({
      data: {
        organizationId: organization.id,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        companyId: faker.helpers.arrayElement(companies).id,
        ownerId: faker.helpers.arrayElement(members).id,
      },
    })
    contacts.push(contact)

    if ((i + 1) % 1000 === 0) {
      console.log(`  ✅ Created ${i + 1} contacts`)
    }
  }

  console.log('✅ Created 10,000 contacts')

  // Create 800 deals (for performance testing)
  console.log('🌱 Creating 800 deals...')
  const deals: any[] = []
  for (let i = 0; i < 800; i++) {
    const deal = await prisma.deal.create({
      data: {
        organizationId: organization.id,
        title: faker.company.buzzPhrase(),
        value: faker.number.float({ min: 1000, max: 100000 }),
        stageId: faker.helpers.arrayElement(stages).id,
        pipelineId: pipeline.id,
        contactId: faker.helpers.arrayElement(contacts).id,
        companyId: faker.helpers.arrayElement(companies).id,
        ownerId: faker.helpers.arrayElement(members).id,
        expectedClose: faker.date.future(),
      },
    })
    deals.push(deal)

    if ((i + 1) % 200 === 0) {
      console.log(`  ✅ Created ${i + 1} deals`)
    }
  }

  console.log('✅ Created 800 deals')

  // Create 30 activities
  const activityTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK'] as const
  for (let i = 0; i < 30; i++) {
    await prisma.activity.create({
      data: {
        organizationId: organization.id,
        type: faker.helpers.arrayElement(activityTypes),
        description: faker.lorem.sentence(),
        contactId: faker.helpers.arrayElement(contacts).id,
        dealId: faker.helpers.maybe(() => faker.helpers.arrayElement(deals).id),
        ownerId: faker.helpers.arrayElement(members).id,
      },
    })
  }

  console.log('✅ Created activities')

  // Create a sample webhook
  await prisma.webhook.create({
    data: {
      organizationId: organization.id,
      url: 'https://webhook.site/demo-crm',
      secret: 'demo-webhook-secret',
      events: ['deal.created', 'deal.updated', 'contact.created'],
      ownerId: members[0].id,
    },
  })

  console.log('✅ Created webhook')

  console.log('🎉 Seed completed successfully!')
  console.log(`📊 Summary:
  - 1 Organization
  - 3 Users
  - 1 Pipeline with 5 Stages
  - 2,000 Companies
  - 10,000 Contacts
  - 800 Deals
  - 30 Activities
  - 1 Webhook
  `)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
