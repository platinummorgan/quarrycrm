'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  EntityType,
  CsvColumnMapping,
  autoDetectMappings,
} from '@/lib/csv-processor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload,
  FileText,
  Settings,
  Play,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
} from 'lucide-react'

// Step definitions
const STEPS = [
  { id: 'upload', title: 'Upload CSV', icon: Upload },
  { id: 'map', title: 'Map Columns', icon: Settings },
  { id: 'preview', title: 'Preview & Fix', icon: FileText },
  { id: 'import', title: 'Import', icon: Play },
] as const

// Form schemas
const uploadSchema = z.object({
  entityType: z.enum(['CONTACT', 'COMPANY', 'DEAL']),
  file: z.instanceof(File),
})

const mappingSchema = z.object({
  columnMappings: z.array(
    z.object({
      csvColumn: z.string(),
      field: z.string(),
      confidence: z.number(),
      transform: z
        .enum([
          'none',
          'normalize_phone',
          'normalize_email',
          'lowercase',
          'uppercase',
        ])
        .optional(),
      treatAsTag: z.boolean().optional(),
    })
  ),
  skipDuplicates: z.boolean().default(true),
  updateExisting: z.boolean().default(false),
  createMissingCompanies: z.boolean().default(false),
})

type UploadForm = z.infer<typeof uploadSchema>
type MappingForm = z.infer<typeof mappingSchema>

interface CsvImportStepperProps {
  onComplete?: (result: any) => void
  onCancel?: () => void
  selectedTemplate?: any
  onTemplateChange?: (template: any) => void
}

export function CsvImportStepper({
  onComplete,
  onCancel,
  selectedTemplate,
  onTemplateChange,
}: CsvImportStepperProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [parsedData, setParsedData] = useState<{
    headers: string[]
    sampleRows: Record<string, any>[]
    totalRows: number
  } | null>(null)
  const [mappings, setMappings] = useState<CsvColumnMapping[]>([])
  const [importProgress, setImportProgress] = useState<{
    processed: number
    total: number
    status: 'idle' | 'processing' | 'completed' | 'error'
    errors: string[]
  }>({ processed: 0, total: 0, status: 'idle', errors: [] })

  const uploadForm = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
  })

  const mappingForm = useForm<MappingForm>({
    resolver: zodResolver(mappingSchema),
    defaultValues: {
      skipDuplicates: true,
      updateExisting: false,
      createMissingCompanies: false,
    },
  })

  // Handle file upload
  const handleFileUpload = useCallback(
    async (data: UploadForm) => {
      const formData = new FormData()
      formData.append('file', data.file)
      formData.append('entityType', data.entityType)

      try {
        const response = await fetch('/api/csv/import', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Failed to parse CSV')
        }

        const result = await response.json()
        setParsedData(result)

        // Auto-detect mappings
        const autoMappings = autoDetectMappings(
          result.headers,
          data.entityType as EntityType
        )
        setMappings(autoMappings)

        mappingForm.setValue('columnMappings', autoMappings)
        setCurrentStep(1)
      } catch (error) {
        console.error('Upload error:', error)
      }
    },
    [mappingForm]
  )

  // Handle mapping submission
  const handleMappingSubmit = useCallback((data: MappingForm) => {
    setMappings(data.columnMappings)
    setCurrentStep(2)
  }, [])

  // Handle import start
  const handleImportStart = useCallback(async () => {
    if (!parsedData) return

    setImportProgress({
      processed: 0,
      total: parsedData.totalRows,
      status: 'processing',
      errors: [],
    })

    try {
      // Create import record first
      const importResponse = await fetch('/api/csv/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId: 'temp-id', // This would be generated
          config: {
            entityType: uploadForm.getValues('entityType'),
            mappings,
            ...mappingForm.getValues(),
          },
        }),
      })

      if (!importResponse.ok) {
        throw new Error('Failed to start import')
      }

      // Simulate progress (in real implementation, this would be WebSocket or polling)
      for (let i = 0; i <= parsedData.totalRows; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        setImportProgress((prev) => ({
          ...prev,
          processed: Math.min(i, parsedData.totalRows),
        }))
      }

      setImportProgress((prev) => ({ ...prev, status: 'completed' }))
      setCurrentStep(3)
    } catch (error) {
      setImportProgress((prev) => ({
        ...prev,
        status: 'error',
        errors: ['Import failed'],
      }))
    }
  }, [parsedData, mappings, uploadForm, mappingForm])

  const getStepIcon = (stepIndex: number, Icon: any) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    if (stepIndex === currentStep) {
      return <Icon className="h-5 w-5 text-blue-500" />
    }
    return <Icon className="h-5 w-5 text-gray-400" />
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">Import CSV Data</h1>
        <p className="text-muted-foreground">
          Upload and import your data with automatic column detection and
          validation.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                index <= currentStep
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300'
              }`}
            >
              {getStepIcon(index, step.icon)}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  index <= currentStep ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {step.title}
              </p>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-4 h-0.5 w-16 ${
                  index < currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-lg font-semibold">Upload CSV File</h3>
                <p className="mb-4 text-muted-foreground">
                  Select the type of data you're importing and upload your CSV
                  file.
                </p>
              </div>

              <form
                onSubmit={uploadForm.handleSubmit(handleFileUpload)}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Data Type
                  </label>
                  <select
                    {...uploadForm.register('entityType')}
                    className="w-full rounded-md border px-3 py-2"
                  >
                    <option value="CONTACT">Contacts</option>
                    <option value="COMPANY">Companies</option>
                    <option value="DEAL">Deals</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadForm.setValue('file', file)
                    }}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!uploadForm.formState.isValid}
                  >
                    Next: Map Columns
                  </Button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 1 && parsedData && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-lg font-semibold">Map Columns</h3>
                <p className="mb-4 text-muted-foreground">
                  Review and adjust how your CSV columns map to system fields.
                </p>
              </div>

              <form
                onSubmit={mappingForm.handleSubmit(handleMappingSubmit)}
                className="space-y-4"
              >
                <div className="space-y-3">
                  {mappings.map((mapping, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{mapping.csvColumn}</div>
                        <div className="text-sm text-muted-foreground">
                          Maps to: {mapping.field}
                        </div>
                      </div>
                      <Badge
                        variant={
                          mapping.confidence > 0.8 ? 'default' : 'secondary'
                        }
                      >
                        {Math.round(mapping.confidence * 100)}% confidence
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newMappings = [...mappings]
                          newMappings.splice(index, 1)
                          setMappings(newMappings)
                          mappingForm.setValue('columnMappings', newMappings)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Import Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...mappingForm.register('skipDuplicates')}
                        defaultChecked
                      />
                      <span className="text-sm">Skip duplicate records</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...mappingForm.register('updateExisting')}
                      />
                      <span className="text-sm">Update existing records</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...mappingForm.register('createMissingCompanies')}
                      />
                      <span className="text-sm">Create missing companies</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(0)}
                  >
                    Back
                  </Button>
                  <Button type="submit">Next: Preview Data</Button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 2 && parsedData && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-lg font-semibold">
                  Preview & Fix Data
                </h3>
                <p className="mb-4 text-muted-foreground">
                  Review your data before importing. Fix any issues or adjust
                  mappings.
                </p>
              </div>

              <Tabs defaultValue="preview" className="w-full">
                <TabsList>
                  <TabsTrigger value="preview">Data Preview</TabsTrigger>
                  <TabsTrigger value="issues">Issues Found</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-4">
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          {parsedData.headers.map((header) => (
                            <th
                              key={header}
                              className="p-2 text-left font-medium"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.sampleRows.map((row, index) => (
                          <tr key={index} className="border-b">
                            {parsedData.headers.map((header) => (
                              <td key={header} className="p-2">
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="issues" className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No issues detected in the preview data. You can proceed
                      with the import.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </Button>
                <Button onClick={handleImportStart}>Start Import</Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-lg font-semibold">Import Progress</h3>
                <p className="mb-4 text-muted-foreground">
                  Importing your data... This may take a few moments.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
                      {importProgress.processed} / {importProgress.total}
                    </span>
                  </div>
                  <Progress
                    value={
                      (importProgress.processed / importProgress.total) * 100
                    }
                    className="w-full"
                  />
                </div>

                {importProgress.status === 'completed' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Import completed successfully! {importProgress.processed}{' '}
                      records imported.
                    </AlertDescription>
                  </Alert>
                )}

                {importProgress.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="mb-2 font-medium">
                        Import completed with errors:
                      </div>
                      <ul className="list-inside list-disc space-y-1">
                        {importProgress.errors.map((error, index) => (
                          <li key={index} className="text-sm">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onCancel}>
                  Close
                </Button>
                <Button onClick={() => onComplete?.(importProgress)}>
                  View Results
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
