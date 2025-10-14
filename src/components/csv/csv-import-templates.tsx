'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EntityType } from '@/lib/csv-processor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Save, Trash2, Edit, Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  entityType: z.enum(['CONTACT', 'COMPANY', 'DEAL']),
  mappings: z.record(z.string()),
})

type TemplateForm = z.infer<typeof templateSchema>

type ImportTemplate = {
  id: string
  name: string
  description?: string
  entityType: EntityType
  mappings: Record<string, string>
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface CsvImportTemplatesProps {
  onTemplateSelect?: (template: ImportTemplate) => void
  selectedTemplate?: ImportTemplate | null
}

export function CsvImportTemplates({ onTemplateSelect, selectedTemplate }: CsvImportTemplatesProps) {
  const [templates, setTemplates] = useState<ImportTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ImportTemplate | null>(null)

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      entityType: 'CONTACT',
      mappings: {},
    },
  })

  // Load templates
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/csv/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  // Handle form submission
  const onSubmit = async (data: TemplateForm) => {
    try {
      const method = editingTemplate ? 'PUT' : 'POST'
      const url = editingTemplate ? `/api/csv/templates/${editingTemplate.id}` : '/api/csv/templates'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success(editingTemplate ? 'Template updated' : 'Template saved')
        setIsDialogOpen(false)
        setEditingTemplate(null)
        form.reset()
        loadTemplates()
      } else {
        throw new Error('Failed to save template')
      }
    } catch (error) {
      console.error('Template save error:', error)
      toast.error('Failed to save template')
    }
  }

  // Handle template deletion
  const handleDelete = async (templateId: string) => {
    try {
      const response = await fetch(`/api/csv/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Template deleted')
        loadTemplates()
      } else {
        throw new Error('Failed to delete template')
      }
    } catch (error) {
      console.error('Template delete error:', error)
      toast.error('Failed to delete template')
    }
  }

  // Handle template editing
  const handleEdit = (template: ImportTemplate) => {
    setEditingTemplate(template)
    form.reset({
      name: template.name,
      description: template.description || '',
      entityType: template.entityType,
      mappings: template.mappings,
    })
    setIsDialogOpen(true)
  }

  // Handle template selection
  const handleSelect = (template: ImportTemplate) => {
    onTemplateSelect?.(template)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading templates...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Import Templates</span>
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingTemplate(null)
                  form.reset()
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="e.g., Salesforce Contacts"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Describe this template..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entityType">Data Type</Label>
                  <Select
                    value={form.watch('entityType')}
                    onValueChange={(value) => form.setValue('entityType', value as EntityType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTACT">Contacts</SelectItem>
                      <SelectItem value="COMPANY">Companies</SelectItem>
                      <SelectItem value="DEAL">Deals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Update' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates saved yet</p>
            <p className="text-sm">Create templates to save your column mappings for future imports</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <Badge variant="outline">{template.entityType}</Badge>
                      {selectedTemplate?.id === template.id && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(template.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSelect(template)}
                      disabled={selectedTemplate?.id === template.id}
                    >
                      Use
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{template.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(template.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}