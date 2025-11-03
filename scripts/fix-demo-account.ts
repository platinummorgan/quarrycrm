/**
 * Fix Demo Account - Check and update user role if incorrectly set to DEMO
 * 
 * This script checks if your account is incorrectly marked as DEMO
 * and updates it to OWNER if needed.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking for accounts with DEMO role...\n')

  // Get your email from args or use default
  const email = process.argv[2]
  
  if (!email) {
    console.error('❌ Please provide your email address as an argument')
    console.error('   Usage: npx tsx scripts/fix-demo-account.ts your@email.com')
    process.exit(1)
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  })

  if (!user) {
    console.error(`❌ User not found: ${email}`)
    process.exit(1)
  }

  console.log(`✅ Found user: ${user.email} (ID: ${user.id})`)
  console.log(`   Memberships: ${user.memberships.length}\n`)

  // Check each membership
  for (const membership of user.memberships) {
    console.log(`📋 Organization: ${membership.organization.name}`)
    console.log(`   Role: ${membership.role}`)
    console.log(`   Org ID: ${membership.organizationId}`)

    if (membership.role === 'DEMO') {
      console.log(`   ⚠️  This is a DEMO role - should this be changed?`)
      console.log(`   Updating to OWNER...\n`)

      await prisma.orgMember.update({
        where: {
          id: membership.id,
        },
        data: {
          role: 'OWNER',
        },
      })

      console.log(`   ✅ Updated to OWNER\n`)
    } else {
      console.log(`   ✅ Role is correct\n`)
    }
  }

  // Also check if user has isDemo flag (this would be in session token, not DB)
  console.log('\n📝 Note: The isDemo flag is set during authentication, not stored in database.')
  console.log('   If masking still occurs, check:')
  console.log('   1. Are you signed in with the demo provider?')
  console.log('   2. Clear your session cookies and sign in again')
  console.log('   3. Check that your organization role is not DEMO')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
