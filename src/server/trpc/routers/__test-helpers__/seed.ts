import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'

export async function seedOrgUser(client?: PrismaClient | Prisma.TransactionClient) {
  const db = (client ?? prisma) as any

  const org = await db.organization.create({
    data: { name: 'Test Org' },
  })

  const user = await db.user.create({
    data: { email: `tester+${crypto.randomUUID()}@example.com`, name: 'Tester' },
  })

  const membership = await db.orgMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
    },
  })

  return { org, user, membership }
}

export default { seedOrgUser }
