import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Setting up demo access for PRODUCTION...\n')
  console.log('⚠️  Make sure DATABASE_URL points to production database!\n')

  try {
    // Step 1: Add missing columns if needed
    console.log('📋 Step 1: Checking database schema...')
    
    try {
      // Test if we can query organizations
      await prisma.$queryRaw`SELECT 1 FROM organizations LIMIT 1`
      console.log('✓ Organizations table exists')
    } catch (e: any) {
      console.log('❌ Database connection error:', e.message)
      throw e
    }

    // Step 2: Add DEMO role to enum if not exists
    console.log('\n📋 Step 2: Adding DEMO role to OrgMemberRole enum...')
    try {
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrgMemberRole') THEN
            CREATE TYPE "OrgMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'DEMO');
          ELSIF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DEMO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrgMemberRole')) THEN
            ALTER TYPE "OrgMemberRole" ADD VALUE 'DEMO';
          END IF;
        END $$;
      `
      console.log('✓ DEMO role added/verified')
    } catch (e: any) {
      console.log('⚠️  DEMO role might already exist:', e.message)
    }

    // Step 3: Add missing organization columns
    console.log('\n📋 Step 3: Adding missing organization columns...')
    try {
      await prisma.$executeRaw`
        ALTER TABLE organizations 
        ADD COLUMN IF NOT EXISTS logo TEXT,
        ADD COLUMN IF NOT EXISTS "emailLogAddress" TEXT,
        ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "scheduledPurgeAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
      `
      console.log('✓ Organization columns added/verified')
    } catch (e: any) {
      console.log('⚠️  Columns might already exist:', e.message)
    }

    // Step 4: Add plan enum and column
    console.log('\n📋 Step 4: Adding organization plan...')
    try {
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizationPlan') THEN
            CREATE TYPE "OrganizationPlan" AS ENUM ('FREE', 'PRO', 'TEAM');
          END IF;
        END $$;
      `
      await prisma.$executeRaw`
        ALTER TABLE organizations 
        ADD COLUMN IF NOT EXISTS plan "OrganizationPlan" NOT NULL DEFAULT 'FREE';
      `
      console.log('✓ Organization plan added/verified')
    } catch (e: any) {
      console.log('⚠️  Plan might already exist:', e.message)
    }

    // Step 5: Create demo organization
    console.log('\n📋 Step 5: Creating demo organization...')
    let org = await prisma.organization.findFirst({
      where: { name: 'Quarry Demo' },
    })
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Quarry Demo',
          domain: 'demo.quarrycrm.com',
          description: 'Demo organization showcasing Quarry CRM',
        },
      })
      console.log('✓ Created demo organization:', org.id)
    } else {
      console.log('✓ Demo organization exists:', org.id)
    }

    // Step 6: Create demo user
    console.log('\n📋 Step 6: Creating demo user...')
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

    // Step 7: Create demo membership
    console.log('\n📋 Step 7: Creating demo membership...')
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

    console.log('\n✅ Production demo setup complete!')
    console.log('\n📍 Demo URL: https://quarrycrm-94v53h3ii-michaels-projects-4c786e88.vercel.app/demo')
    console.log('   (or your custom domain/demo)\n')
  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
