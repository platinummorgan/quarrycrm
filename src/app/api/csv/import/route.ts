import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EntityType, CsvImportConfig } from '@/lib/csv-processor'
import Papa from 'papaparse'
import { demoGuard } from '@/lib/demo-guard'

// Parse CSV and return headers and sample data
export async function POST(request: NextRequest) {
  // Block demo users from CSV imports
  const demoCheck = await demoGuard()
  if (demoCheck) return demoCheck

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entityType') as EntityType

    if (!file || !entityType) {
      return NextResponse.json(
        { error: 'File and entity type are required' },
        { status: 400 }
      )
    }

    // Parse CSV
    const csvText = await file.text()
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    })

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid CSV format', details: parseResult.errors },
        { status: 400 }
      )
    }

    const headers = parseResult.meta.fields || []
    const rows = parseResult.data as Record<string, any>[]

    // Return parsed data for mapping
    return NextResponse.json({
      headers,
      sampleRows: rows.slice(0, 5), // First 5 rows for preview
      totalRows: rows.length,
    })
  } catch (error) {
    console.error('CSV parse error:', error)
    return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 500 })
  }
}

// Process import with mappings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { importId, config }: { importId: string; config: CsvImportConfig } =
      body

    if (!importId || !config) {
      return NextResponse.json(
        { error: 'Import ID and config are required' },
        { status: 400 }
      )
    }

    // Get the import record
    const importRecord = await prisma.importHistory.findUnique({
      where: { id: importId },
      include: { organization: true },
    })

    if (!importRecord) {
      return NextResponse.json(
        { error: 'Import record not found' },
        { status: 404 }
      )
    }

    // Update status to processing
    await prisma.importHistory.update({
      where: { id: importId },
      data: { status: 'PROCESSING' },
    })

    // Parse the CSV again (in production, you'd store the parsed data)
    // For now, we'll assume the CSV content is stored or passed again
    // This is a simplified version - in production you'd want to store the parsed data

    return NextResponse.json({
      success: true,
      importId,
      message: 'Import processing started',
    })
  } catch (error) {
    console.error('Import processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 }
    )
  }
}
