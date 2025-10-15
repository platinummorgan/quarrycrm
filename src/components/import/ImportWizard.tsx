'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  Trash2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from '@/lib/toast'
import {
  parseCSV,
  validateCSVFile,
  generateFieldMappings,
  validateFieldMappings,
  validateContactData,
  getConfidenceColor,
  getConfidenceLabel,
  type CSVRow,
  type FieldMapping,
  type ValidationError,
} from '@/lib/import'

interface ImportResult {
  importId: string
  totalRows: number
  created: number
  skipped: number
  errors: number
  affectedIds: string[]
}

type ImportStep = 'upload' | 'map' | 'preview' | 'import' | 'complete'

interface ImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportWizard({ open, onOpenChange }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const resetWizard = useCallback(() => {
    setCurrentStep('upload')
    setCsvData([])
    setHeaders([])
    setFieldMappings([])
    setValidationErrors([])
    setImportResult(null)
    setIsProcessing(false)
    setProgress(0)
  }, [])

  // Reset when sheet closes
  React.useEffect(() => {
    if (!open) {
      resetWizard()
    }
  }, [open, resetWizard])

  // Step 1: File Upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateCSVFile(file)
    if (!validation.valid) {
      toast.error(validation.error!)
      return
    }

    // Parse CSV
    parseCSV(file)
      .then((result) => {
        setCsvData(result.data)
        setHeaders(result.headers)
        setCurrentStep('map')
        setupFieldMappings(result.headers)
      })
      .catch((error) => {
        toast.error('Failed to parse CSV file')
        console.error('CSV parsing error:', error)
      })
  }, [])

  // Step 2: Auto-map fields
  const setupFieldMappings = (csvHeaders: string[]) => {
    const mappings = generateFieldMappings(csvHeaders)
    setFieldMappings(mappings)
  }

  const updateFieldMapping = (csvField: string, dbField: string | null) => {
    setFieldMappings(prev =>
      prev.map(mapping =>
        mapping.csvField === csvField
          ? { ...mapping, dbField, confidence: dbField ? 100 : 0 }
          : mapping
      )
    )
  }

  // Step 3: Preview with validation
  const validatePreviewData = () => {
    const validation = validateContactData(
      csvData,
      fieldMappings.filter(m => m.dbField).map(m => ({ csvField: m.csvField, dbField: m.dbField })),
      25
    )
    setValidationErrors(validation.errors)
  }

  React.useEffect(() => {
    if (currentStep === 'preview') {
      validatePreviewData()
    }
  }, [currentStep, fieldMappings])

  // Step 4: Import
  const handleImport = async () => {
    setIsProcessing(true)
    setProgress(0)

    try {
      const response = await fetch('/api/import/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: csvData,
          mappings: fieldMappings.filter(m => m.dbField),
        }),
      })

      if (!response.ok) {
        throw new Error('Import failed')
      }

      const result = await response.json()
      setImportResult(result)

      // Poll for progress updates
      const pollProgress = async (importId: string) => {
        try {
          const progressResponse = await fetch(`/api/import/contacts/${importId}/progress`)
          if (progressResponse.ok) {
            const progressData = await progressResponse.json()
            setProgress(progressData.progress)

            if (progressData.status === 'COMPLETED' || progressData.status === 'FAILED') {
              setCurrentStep('complete')
              toast.success(`Import completed! Created ${result.created} contacts`)
            } else if (progressData.status === 'PROCESSING') {
              // Continue polling
              setTimeout(() => pollProgress(importId), 1000)
            }
          }
        } catch (error) {
          console.error('Progress polling error:', error)
        }
      }

      // Start polling
      pollProgress(result.importId)
    } catch (error) {
      toast.error('Import failed')
      console.error('Import error:', error)
      setIsProcessing(false)
    }
  }

  // Step 5: Undo
  const handleUndo = async () => {
    if (!importResult) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/import/contacts/${importResult.importId}/rollback`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Rollback failed')
      }

      toast.success('Import rolled back successfully')
      setImportResult(null)
      setCurrentStep('upload')
      setCsvData([])
      setHeaders([])
      setFieldMappings([])
    } catch (error) {
      toast.error('Rollback failed')
      console.error('Rollback error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    const colorClass = getConfidenceColor(confidence)
    const label = getConfidenceLabel(confidence)
    return <Badge className={colorClass}>{label}</Badge>
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {(['upload', 'map', 'preview', 'import', 'complete'] as ImportStep[]).map((step, index) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            currentStep === step
              ? 'bg-primary border-primary text-primary-foreground'
              : index < ['upload', 'map', 'preview', 'import', 'complete'].indexOf(currentStep)
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-muted-foreground text-muted-foreground'
          }`}>
            {index < ['upload', 'map', 'preview', 'import', 'complete'].indexOf(currentStep) ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <span className="text-sm font-medium">{index + 1}</span>
            )}
          </div>
          {index < 4 && (
            <div className={`w-12 h-0.5 mx-2 ${
              index < ['upload', 'map', 'preview', 'import', 'complete'].indexOf(currentStep)
                ? 'bg-green-500'
                : 'bg-muted'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Import Contacts</SheetTitle>
          <SheetDescription>
            Upload a CSV file to import contacts into your CRM
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {renderStepIndicator()}

          {/* Upload Step */}
          {currentStep === 'upload' && (
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload CSV File
                </CardTitle>
                <CardDescription>
                  Select a CSV file containing your contact data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Drop your CSV file here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>• CSV files only</p>
                  <p>• First row should contain column headers</p>
                  <p>• Maximum file size: 10MB</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map Fields Step */}
          {currentStep === 'map' && (
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle>Map Fields</CardTitle>
                <CardDescription>
                  Match your CSV columns to contact fields
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fieldMappings.map((mapping) => (
                    <div key={mapping.csvField} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{mapping.csvField}</p>
                        <p className="text-sm text-muted-foreground">
                          CSV Column
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getConfidenceBadge(mapping.confidence)}
                      </div>
                      <select
                        value={mapping.dbField || ''}
                        onChange={(e) => updateFieldMapping(mapping.csvField, e.target.value || null)}
                        className="flex-1 p-2 border rounded"
                      >
                        <option value="">Don't import</option>
                        <option value="firstName">First Name</option>
                        <option value="lastName">Last Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="company">Company Name</option>
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep('preview')}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Step */}
          {currentStep === 'preview' && (
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle>Preview Import</CardTitle>
                <CardDescription>
                  Review the first 25 rows and fix any validation errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                {validationErrors.length > 0 && (
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Found {validationErrors.length} validation errors. Please fix them before importing.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-muted">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-muted p-2 text-left">Row</th>
                        {fieldMappings.filter(m => m.dbField).map(mapping => (
                          <th key={mapping.csvField} className="border border-muted p-2 text-left">
                            {mapping.dbField}
                          </th>
                        ))}
                        <th className="border border-muted p-2 text-left">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 25).map((row, index) => {
                        const rowErrors = validationErrors.filter(e => e.row === index + 1)
                        return (
                          <tr key={index} className={rowErrors.length > 0 ? 'bg-red-50' : ''}>
                            <td className="border border-muted p-2">{index + 1}</td>
                            {fieldMappings.filter(m => m.dbField).map(mapping => (
                              <td key={mapping.csvField} className="border border-muted p-2">
                                {row[mapping.csvField] || '-'}
                              </td>
                            ))}
                            <td className="border border-muted p-2">
                              {rowErrors.length > 0 && (
                                <div className="text-red-600 text-sm">
                                  {rowErrors.map((error, i) => (
                                    <div key={i}>{error.message}</div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep('map')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep('import')}
                    disabled={validationErrors.length > 0}
                  >
                    Import {csvData.length} Contacts
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Step */}
          {currentStep === 'import' && (
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle>Import Contacts</CardTitle>
                <CardDescription>
                  Importing {csvData.length} contacts...
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="space-y-4">
                    <Progress value={progress} className="h-2" />
                    <p className="text-center text-muted-foreground">
                      Processing contacts... {Math.round(progress)}%
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="mb-4">Ready to import {csvData.length} contacts</p>
                    <Button onClick={handleImport} size="lg">
                      Start Import
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && importResult && (
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Import Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                    <p className="text-sm text-muted-foreground">Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{importResult.totalRows}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleUndo}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Undo Import
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}