import { PrismaClient, Prisma } from '@prisma/client'
import type { Prisma as PrismaTypes } from '@prisma/client'

/**
 * Lazy-loaded Prisma client to avoid connecting at import time.
 * In tests, the client parameter should be passed from the test setup.
 */
let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

/**
 * Seed organization, user, and membership.
 * Returns full objects (not just IDs) for easy access in tests.
 */
export async function seedOrgUser(client?: PrismaClient | Prisma.TransactionClient) {
  const db = client ?? getPrismaClient()

  const domain = `seed-${Date.now()}-${Math.random().toString(36).slice(2)}.local`
  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

  // Insert organization using information_schema to select safe columns
  const orgCols = (await db.$queryRaw`
    SELECT column_name, is_nullable, column_default, udt_name
    FROM information_schema.columns
    WHERE table_name = 'organizations'
  `) as Array<{ column_name: string; is_nullable: string; column_default: string | null; udt_name: string }>

  const requiredOrgCols = orgCols.filter((c) => c.is_nullable === 'NO' && c.column_default === null).map((c) => c.column_name)
  const availableOrgColNames = orgCols.map((c) => c.column_name)
  const preferOrgCols = ['name', 'domain']
  const presentPreferOrg = preferOrgCols.filter((c) => availableOrgColNames.includes(c))
  const finalOrgSet = new Set<string>([...requiredOrgCols, ...presentPreferOrg])
  const finalOrgCols = Array.from(finalOrgSet.size > 0 ? finalOrgSet : new Set(['name', 'domain']))

  const now = new Date()
  const orgColsByName = new Map(orgCols.map((c) => [c.column_name, c]))

  const valueForOrg = (col: string) => {
    switch (col) {
      case 'id':
        return makeId()
      case 'name':
        return 'Seeded Org'
      case 'domain':
        return domain
      case 'description':
        return ''
      case 'plan': {
        const meta = orgColsByName.get(col)
        // If plan is an enum type, insert a valid enum value and cast it
        if (meta && meta.udt_name && meta.udt_name !== 'text') {
          return Prisma.sql`${'FREE'}::"${Prisma.raw(meta.udt_name as string)}"`
        }
        return 'FREE'
      }
      case 'created_at':
      case 'updated_at':
      case 'createdAt':
      case 'updatedAt':
        return Prisma.sql`to_timestamp(${Math.floor(now.getTime() / 1000)})`
      default:
        return ''
    }
  }

  const orgColsSql = Prisma.join(finalOrgCols.map((c) => Prisma.raw(`"${c}"`)))
  const orgValsSql = Prisma.join(finalOrgCols.map((c) => {
    const v = valueForOrg(c)
    return typeof v === 'object' && ('sql' in v || 'strings' in v) ? v as any : Prisma.sql`${v}`
  }))

  const orgSql = Prisma.sql`
    INSERT INTO organizations (${orgColsSql})
    VALUES (${orgValsSql})
    RETURNING *
  `
  const insertedOrg = await db.$queryRaw(orgSql)
  const org = Array.isArray(insertedOrg) ? insertedOrg[0] : insertedOrg

  // Insert user
  const email = `seed.${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`
  const userCols = (await db.$queryRaw`
    SELECT column_name, is_nullable, column_default, udt_name
    FROM information_schema.columns
    WHERE table_name = 'users'
  `) as Array<{ column_name: string; is_nullable: string; column_default: string | null; udt_name: string }>

  const requiredUserCols = userCols.filter((c) => c.is_nullable === 'NO' && c.column_default === null).map((c) => c.column_name)
  const availableUserCols = userCols.map((c) => c.column_name)
  const preferUserCols = ['email', 'name']
  const presentPreferUser = preferUserCols.filter((c) => availableUserCols.includes(c))
  const finalUserSet = new Set<string>([...requiredUserCols, ...presentPreferUser])
  const finalUserCols = Array.from(finalUserSet.size > 0 ? finalUserSet : new Set(['email', 'name']))

  const userValuesMap: Record<string, any> = {
    id: makeId(),
    email,
    name: 'Seed User',
    created_at: Prisma.sql`to_timestamp(${Math.floor(Date.now() / 1000)})`,
    updated_at: Prisma.sql`to_timestamp(${Math.floor(Date.now() / 1000)})`,
    createdAt: Prisma.sql`to_timestamp(${Math.floor(Date.now() / 1000)})`,
    updatedAt: Prisma.sql`to_timestamp(${Math.floor(Date.now() / 1000)})`,
  }

  const userColsSql = Prisma.join(finalUserCols.map((c) => Prisma.raw(`"${c}"`)))
  const userValsSql = Prisma.join(finalUserCols.map((c) => (userValuesMap[c] !== undefined ? Prisma.sql`${userValuesMap[c]}` : Prisma.sql`''`)))
  const userSql = Prisma.sql`
    INSERT INTO users (${userColsSql})
    VALUES (${userValsSql})
    RETURNING *
  `
  const insertedUser = await db.$queryRaw(userSql)
  const user = Array.isArray(insertedUser) ? insertedUser[0] : insertedUser

  // Insert org member
  const memberCols = (await db.$queryRaw`
    SELECT column_name, is_nullable, column_default, udt_name
    FROM information_schema.columns
    WHERE table_name = 'org_members'
  `) as Array<{ column_name: string; is_nullable: string; column_default: string | null; udt_name: string }>

  const requiredMemberCols = memberCols.filter((c) => c.is_nullable === 'NO' && c.column_default === null).map((c) => c.column_name)
  const availableMemberCols = memberCols.map((c) => c.column_name)
  const preferMember = ['id', 'organization_id', 'organizationId', 'user_id', 'userId', 'role', 'onboarding_progress', 'onboarding_dismissed']
  const presentPreferMember = preferMember.filter((c) => availableMemberCols.includes(c))
  const finalMemberSet = new Set<string>([...requiredMemberCols, ...presentPreferMember])
  const finalMemberCols = Array.from(finalMemberSet.size > 0 ? finalMemberSet : new Set(['organization_id', 'user_id', 'role']))

  const memberColsByName = new Map(memberCols.map((c) => [c.column_name, c]))

  const memberValuesMap: Record<string, any> = {
    id: makeId(),
    organization_id: org.id,
    organizationId: org.id,
    user_id: user.id,
    userId: user.id,
    role: 'OWNER',
    onboarding_progress: Prisma.sql`'{}'::json`,
    onboarding_dismissed: false,
    created_at: Prisma.sql`to_timestamp(${Math.floor(Date.now() / 1000)})`,
    updated_at: Prisma.sql`to_timestamp(${Math.floor(Date.now() / 1000)})`,
    createdAt: Prisma.sql`to_timestamp(${Math.floor(Date.now() / 1000)})`,
    updatedAt: Prisma.sql`to_timestamp(${Math.floor(Date.now() / 1000)})`,
  }

  const memberColsSql = Prisma.join(finalMemberCols.map((c) => Prisma.raw(`"${c}"`)))
  const memberValsSql = Prisma.join(finalMemberCols.map((c) => {
    const val = memberValuesMap[c]
    if (val === undefined) return Prisma.sql`''`
    // If this column is an enum (udt_name not text), cast the parameter to that enum type
    const meta = memberColsByName.get(c)
    if (meta && meta.udt_name && meta.udt_name !== 'text') {
      // Use parameterized value with a cast: $1::"EnumType"
      return Prisma.sql`${val}::"${Prisma.raw(meta.udt_name as string)}"`
    }
    return typeof val === 'object' && ('sql' in val || 'strings' in val) ? val as any : Prisma.sql`${val}`
  }))
  const memberSql = Prisma.sql`
    INSERT INTO org_members (${memberColsSql})
    VALUES (${memberValsSql})
    RETURNING *
  `
  const insertedMember = await db.$queryRaw(memberSql)
  const member = Array.isArray(insertedMember) ? insertedMember[0] : insertedMember

  return { org, user, member }
}

/**
 * Seed a minimal pipeline with 3 stages.
 * Uses names/colors that match test assertions.
 */
export async function seedPipelines(
  orgId: string,
  ownerMemberId: string,
  client?: PrismaClient | Prisma.TransactionClient
) {
  // Use the provided client (transaction) or the shared Prisma client.
  const db = client ?? getPrismaClient()
  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const pipelineId = makeId()
  const now = Math.floor(Date.now() / 1000)

  const pipelineSql = Prisma.sql`
    INSERT INTO pipelines ("id", "name", "organizationId", "ownerId", "createdAt", "updatedAt")
    VALUES (${pipelineId}, ${'Seeded Pipeline'}, ${orgId}, ${ownerMemberId}, to_timestamp(${now}), to_timestamp(${now}))
    RETURNING *
  `
  const insertedPipeline = await db.$queryRaw(pipelineSql)
  const pipeline = Array.isArray(insertedPipeline) ? insertedPipeline[0] : insertedPipeline

  const stagesData = [
    { name: 'Lead', color: '#3B82F6', order: 0 },
    { name: 'Proposal', color: '#eab308', order: 1 },
    { name: 'Negotiation', color: '#EF4444', order: 2 },
  ]

  const stageRows = []
  for (const s of stagesData) {
    const sid = makeId()
    const stageSql = Prisma.sql`
      INSERT INTO stages ("id", "name", "pipelineId", "order", "color", "createdAt", "updatedAt")
      VALUES (${sid}, ${s.name}, ${pipelineId}, ${s.order}, ${s.color}, to_timestamp(${now}), to_timestamp(${now}))
      RETURNING *
    `
  const inserted = await db.$queryRaw(stageSql)
  stageRows.push(Array.isArray(inserted) ? inserted[0] : inserted)
  }

  return { pipeline, stages: stageRows }
}

/**
 * Seed bulk contacts for performance testing.
 * @param orgId - Organization ID
 * @param ownerId - Owner member ID
 * @param count - Number of contacts to create
 * @param options - Optional overrides (e.g., specific companyId)
 */
export async function seedContacts(
  orgId: string,
  ownerId: string,
  count: number,
  options?: {
    companyId?: string
    client?: PrismaClient | Prisma.TransactionClient
  }
) {
  const db = options?.client ?? getPrismaClient()

  const contacts = []
  for (let i = 0; i < count; i++) {
    const contact = await db.contact.create({
      data: {
        organizationId: orgId,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `contact${i}-${Date.now()}@test.com`,
        ownerId,
        ...(options?.companyId && { companyId: options.companyId }),
      },
    })
    contacts.push(contact)
  }

  return contacts
}

export default { seedOrgUser, seedPipelines, seedContacts }
