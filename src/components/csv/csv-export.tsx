'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from 'next-auth/react'
import { EntityType } from '@/lib/csv-processor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Filter } from 'lucide-react'

const exportSchema = z.object({
  entityType: z.enum(['CONTACT', 'COMPANY', 'DEAL']),
  format: z.enum(['csv', 'json']),
  selectedColumns: z.array(z.string()).min(1),
  filters: z.record(z.any()).optional(),
})

type ExportForm = z.infer<typeof exportSchema>

type ColumnDefinition = {
  key: string
  label: string
  required?: boolean
}

// Available columns for each entity type
const ENTITY_COLUMNS = {
  [EntityType.CONTACT]: [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'companyName', label: 'Company Name', required: false },
    { key: 'ownerName', label: 'Owner Name', required: false },
    { key: 'createdAt', label: 'Created Date', required: false },
    { key: 'updatedAt', label: 'Updated Date', required: false },
  ],
  [EntityType.COMPANY]: [
    { key: 'name', label: 'Company Name', required: true },
    { key: 'website', label: 'Website', required: false },
    { key: 'industry', label: 'Industry', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'domain', label: 'Domain', required: false },
    { key: 'ownerName', label: 'Owner Name', required: false },
    { key: 'contactCount', label: 'Contact Count', required: false },
    { key: 'createdAt', label: 'Created Date', required: false },
    { key: 'updatedAt', label: 'Updated Date', required: false },
  ],
  [EntityType.DEAL]: [
    { key: 'title', label: 'Deal Title', required: true },
    { key: 'value', label: 'Value', required: false },
    { key: 'probability', label: 'Probability (%)', required: false },
    { key: 'expectedClose', label: 'Expected Close Date', required: false },
    { key: 'contactName', label: 'Contact Name', required: false },
    { key: 'contactEmail', label: 'Contact Email', required: false },
    { key: 'companyName', label: 'Company Name', required: false },
    { key: 'pipelineName', label: 'Pipeline Name', required: false },
    { key: 'stageName', label: 'Stage Name', required: false },
    { key: 'ownerName', label: 'Owner Name', required: false },
    { key: 'createdAt', label: 'Created Date', required: false },
    { key: 'updatedAt', label: 'Updated Date', required: false },
  ],
} as const

interface CsvExportProps {
  onExport?: (data: ExportForm) => void
}

export function CsvExport({ onExport }: CsvExportProps) {
  const { data: session } = useSession()
  const [isExporting, setIsExporting] = useState(false)
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null)
  
  // Check if user has demo role
  const isDemo = session?.user?.isDemo || session?.user?.currentOrg?.role === 'DEMO'

  const form = useForm<ExportForm>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      format: 'csv',
      selectedColumns: [],
    },
  })

  const entityType = form.watch('entityType')
  const selectedColumns = form.watch('selectedColumns')

  // Update available columns when entity type changes
  const handleEntityTypeChange = (value: EntityType) => {
    setSelectedEntityType(value)
    form.setValue('entityType', value)

    // Auto-select all columns by default
    const columns = ENTITY_COLUMNS[value].map(col => col.key)
    form.setValue('selectedColumns', columns)
  }

  // Handle column selection
  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    const current = selectedColumns || []
    if (checked) {
      form.setValue('selectedColumns', [...current, columnKey])
    } else {
      form.setValue('selectedColumns', current.filter(key => key !== columnKey))
    }
  }

  // Handle export
  const handleExport = async (data: ExportForm) => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/csv/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      if (data.format === 'json') {
        const jsonData = await response.json()
        // Download JSON
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${data.entityType.toLowerCase()}_export.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Download CSV
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${data.entityType.toLowerCase()}_export.csv`
        a.click()
        URL.revokeObjectURL(url)
      }

      onExport?.(data)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const availableColumns = selectedEntityType ? ENTITY_COLUMNS[selectedEntityType] : []

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Export Data</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDemo ? (
          <div className="text-center py-8 text-muted-foreground">
            <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Export Disabled</p>
            <p>Read-only demo. Export functionality is not available in demo mode.</p>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(handleExport)} className="space-y-6">
          {/* Entity Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="entityType">Data Type</Label>
            <Select onValueChange={handleEntityTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select data type to export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTACT">Contacts</SelectItem>
                <SelectItem value="COMPANY">Companies</SelectItem>
                <SelectItem value="DEAL">Deals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection */}
          {selectedEntityType && (
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select
                value={form.watch('format')}
                onValueChange={(value) => form.setValue('format', value as 'csv' | 'json')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                  <SelectItem value="json">JSON (Developer)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Column Selection */}
          {selectedEntityType && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Columns to Export</Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allKeys = availableColumns.map(col => col.key)
                      form.setValue('selectedColumns', allKeys)
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const requiredKeys = availableColumns.filter(col => col.required === true).map(col => col.key)
                      form.setValue('selectedColumns', requiredKeys)
                    }}
                  >
                    Required Only
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-3">
                {availableColumns.map((column) => (
                  <div key={column.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={column.key}
                      checked={selectedColumns?.includes(column.key) || false}
                      onCheckedChange={(checked) => handleColumnToggle(column.key, checked as boolean)}
                      disabled={column.required === true}
                    />
                    <Label htmlFor={column.key} className="text-sm">
                      {column.label}
                      {column.required === true && <Badge variant="secondary" className="ml-1 text-xs">Required</Badge>}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                {selectedColumns?.length || 0} of {availableColumns.length} columns selected
              </div>
            </div>
          )}

          {/* Filters Section (placeholder for future enhancement) */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filters (Optional)</span>
            </Label>
            <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/50">
              Filters will be available in a future update. Currently exports all records.
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!selectedEntityType || selectedColumns.length === 0 || isExporting}
              className="min-w-32"
            >
              {isExporting ? (
                <>
                  <FileText className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedColumns.length > 0 ? `(${selectedColumns.length} columns)` : ''}
                </>
              )}
            </Button>
          </div>
        </form>
        )}
      </CardContent>
    </Card>
  )
}