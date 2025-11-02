import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Setting up demo access...\n')

  // Create or find demo org
  let org = await prisma.organization.findFirst({
    where: { name: 'Quarry Demo' },
  })
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Quarry Demo',
        domain: 'demo.quarrycrm.com',
        description: 'Demo organization',
      },
    })
    console.log('✓ Created demo organization:', org.id)
  } else {
    console.log('✓ Demo organization exists:', org.id)
  }

  // Create or find demo user
  let user = await prisma.user.findFirst({
    where: { email: 'demo@demo.example' },
  })
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'demo@demo.example', name: 'Demo User' },
    })
    console.log('✓ Created demo user:', user.id)
  } else {
    console.log('✓ Demo user exists:', user.id)
  }

  // Create or find membership
  let member = await prisma.orgMember.findFirst({
    where: { organizationId: org.id, userId: user.id },
  })
  if (!member) {
    member = await prisma.orgMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'DEMO',
        onboardingProgress: {},
      },
    })
    console.log('✓ Created demo membership:', member.id)
  } else {
    console.log('✓ Demo membership exists:', member.id)
  }

  console.log('\n✅ Demo setup complete!')
  console.log('\n📍 Demo URL: http://localhost:3000/demo')
  console.log('   This will auto-sign you in to the demo account\n')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
