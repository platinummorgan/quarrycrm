const { PrismaClient } = require('@prisma/client')

async function checkDemoData() {
  const prisma = new PrismaClient()

  try {
    // Check demo user
    const demoUser = await prisma.user.findFirst({
      where: { email: 'demo@demo.example' },
    })
    console.log('Demo user:', demoUser)

    // Check demo org
    const demoOrg = await prisma.organization.findUnique({
      where: { id: 'cmgsie0el0000gbupogubboh0' },
    })
    console.log('Demo org:', demoOrg)

    // Check membership
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: demoUser.id,
        organizationId: 'cmgsie0el0000gbupogubboh0',
        role: 'DEMO',
      },
    })
    console.log('Demo membership:', membership)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDemoData()