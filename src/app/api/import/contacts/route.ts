import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withLatencyLogMiddleware } from '@/lib/server/withLatencyLog'
import { demoGuard } from '@/lib/demo-guard'

const importContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  companyName: z.string().optional(),
})

interface ImportData {
  data: Array<Record<string, string>>
  mappings: Array<{
    csvField: string
    dbField: string
  }>
}

export const POST = withLatencyLogMiddleware(async (request: NextRequest) => {
  // Demo user guard
  const demoCheck = await demoGuard()
  if (demoCheck) return demoCheck

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const member = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
    })

    if (!member?.organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const orgId = member.organization.id
    const ownerId = member.id

    const body: ImportData = await request.json()
    const { data: csvData, mappings } = body

    const importHistory = await prisma.importHistory.create({
      data: {
        organizationId: orgId,
        entityType: 'CONTACT',
        filename: 'contacts-import.csv',
        status: 'PROCESSING',
        totalRows: csvData.length,
        processedRows: 0,
        skippedRows: 0,
        errorRows: 0,
        mappings: mappings,
        ownerId,
      },
    })

    let created = 0
    let skipped = 0
    let errors = 0
    const affectedIds: string[] = []
    const importErrors: Array<{ row: number; error: string }> = []

    // Process in batches of 50
    const batchSize = 50
    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize)
      const batchContacts = []

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]
        const rowIndex = i + j + 1

        try {
          // Map CSV fields to database fields
          const contactData: any = {}

          for (const mapping of mappings) {
            const value = row[mapping.csvField]?.trim()
            if (value) {
              switch (mapping.dbField) {
                case 'firstName':
                  contactData.firstName = value
                  break
                case 'lastName':
                  contactData.lastName = value
                  break
                case 'email':
                  contactData.email = value
                  break
                case 'phone':
                  contactData.phone = value
                  break
                case 'company':
                  // For company, we need to find or create the company
                  if (value) {
                    let company = await prisma.company.findFirst({
                      where: {
                        organizationId: orgId,
                        name: value,
                      },
                    })

                    if (!company) {
                      company = await prisma.company.create({
                        data: {
                          organizationId: orgId,
                          name: value,
                          ownerId,
                        },
                      })
                    }

                    contactData.companyId = company.id
                  }
                  break
              }
            }
          }

          // Validate the contact data
          const validatedData = importContactSchema.parse(contactData)

          // Check for duplicates (same email)
          if (validatedData.email) {
            const existing = await prisma.contact.findFirst({
              where: {
                organizationId: orgId,
                email: validatedData.email,
              },
            })

            if (existing) {
              skipped++
              importErrors.push({
                row: rowIndex,
                error: `Contact with email ${validatedData.email} already exists`,
              })
              continue
            }
          }

          batchContacts.push({
            ...validatedData,
            organizationId: orgId,
            ownerId,
          })
        } catch (error) {
          errors++
          importErrors.push({
            row: rowIndex,
            error: error instanceof Error ? error.message : 'Validation failed',
          })
        }
      }

      // Insert batch
      if (batchContacts.length > 0) {
        const createdContacts = await prisma.contact.createMany({
          data: batchContacts,
          skipDuplicates: true,
        })

        // Get the IDs of created contacts for rollback
        const createdContactRecords = await prisma.contact.findMany({
          where: {
            organizationId: orgId,
            firstName: { in: batchContacts.map(c => c.firstName) },
            lastName: { in: batchContacts.map(c => c.lastName) },
          },
          select: { id: true },
        })

        affectedIds.push(...createdContactRecords.map(c => c.id))
        created += createdContacts.count

        // Create rollback entries for undo functionality
        if (createdContactRecords.length > 0) {
          await prisma.importRollback.createMany({
            data: createdContactRecords.map(contact => ({
              importId: importHistory.id,
              entityType: 'CONTACT',
              entityId: contact.id,
              action: 'CREATE',
            }))
          })
        }
      }

      // Update progress
      const processedSoFar = Math.min(i + batchSize, csvData.length)
      await prisma.importHistory.update({
        where: { id: importHistory.id },
        data: {
          processedRows: processedSoFar,
          skippedRows: skipped,
          errorRows: errors,
        },
      })
    }

    // Update import history
    await prisma.importHistory.update({
      where: { id: importHistory.id },
      data: {
        status: 'COMPLETED',
        processedRows: created + skipped,
        skippedRows: skipped,
        errorRows: errors,
        affectedIds,
        errors: importErrors.length > 0 ? importErrors : undefined,
      },
    })

    return NextResponse.json({
      importId: importHistory.id,
      totalRows: csvData.length,
      created,
      skipped,
      errors,
      affectedIds,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Import failed' },
      { status: 500 }
    )
  }
}, { route: 'contacts-import' })