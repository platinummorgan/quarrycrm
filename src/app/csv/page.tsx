'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CsvImportStepper } from '@/components/csv/csv-import-stepper'
import { CsvExport } from '@/components/csv/csv-export'
import { CsvImportTemplates } from '@/components/csv/csv-import-templates'
import { CsvImportHistory } from '@/components/csv/csv-import-history'
import { Upload, Download, FileText, History } from 'lucide-react'

export default function CsvManagementPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">CSV Import & Export</h1>
        <p className="text-muted-foreground">
          Import and export your CRM data with powerful validation, templates,
          and rollback capabilities.
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Import CSV Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CsvImportStepper
                selectedTemplate={selectedTemplate}
                onTemplateChange={setSelectedTemplate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <CsvExport />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <CsvImportTemplates
            selectedTemplate={selectedTemplate}
            onTemplateSelect={setSelectedTemplate}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <CsvImportHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}
