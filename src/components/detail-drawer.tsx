'use client'

import * as React from 'react'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Edit,
  Save,
  X,
  Plus,
  Activity as ActivityIcon,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'

interface DetailDrawerProps<T = any> {
  entity: 'contacts' | 'companies'
  item: T | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DetailDrawer<T extends { id: string; updatedAt: string }>({
  entity,
  item,
  open,
  onOpenChange,
}: DetailDrawerProps<T>) {
  const { toast } = useToast()
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({})

  // tRPC hooks
  const detailQuery = (trpc as any)[entity].getById.useQuery(
    { id: item?.id || '' },
    { enabled: !!item?.id && open }
  )

  const updateMutation = (trpc as any)[entity].update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Updated successfully',
        description: 'Your changes have been saved.',
      })
      setEditingField(null)
      detailQuery.refetch()
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      })
      // Reset field values on error
      setFieldValues({})
    },
  })

  const createActivityMutation = trpc.activities.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Activity added',
        description: 'The activity has been recorded.',
      })
      detailQuery.refetch()
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add activity',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const detail = detailQuery.data

  const handleFieldEdit = (field: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [field]: value }))
  }

  const handleFieldSave = (field: string) => {
    if (!detail) return

    const value = fieldValues[field]
    if (value !== undefined) {
      updateMutation.mutate({
        id: detail.id,
        data: { [field]: value },
      })
    }
  }

  const handleFieldCancel = (field: string) => {
    setFieldValues(prev => {
      const newValues = { ...prev }
      delete newValues[field]
      return newValues
    })
    setEditingField(null)
  }

  const renderEditableField = (
    field: string,
    label: string,
    value: any,
    type: 'text' | 'email' | 'tel' | 'textarea' = 'text',
    icon?: React.ReactNode
  ) => {
    const isEditing = editingField === field
    const currentValue = fieldValues[field] ?? value

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center space-x-2">
            {icon}
            <span>{label}</span>
          </label>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingField(field)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
        {isEditing ? (
          <div className="flex items-center space-x-2">
            {type === 'textarea' ? (
              <Textarea
                value={currentValue || ''}
                onChange={(e) => handleFieldEdit(field, e.target.value)}
                className="flex-1"
                rows={3}
              />
            ) : (
              <Input
                type={type}
                value={currentValue || ''}
                onChange={(e) => handleFieldEdit(field, e.target.value)}
                className="flex-1"
              />
            )}
            <Button
              size="sm"
              onClick={() => handleFieldSave(field)}
              disabled={updateMutation.isLoading}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFieldCancel(field)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {value || 'Not set'}
          </p>
        )}
      </div>
    )
  }

  const renderContactSummary = () => {
    if (!detail || entity !== 'contacts') return null

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {detail.firstName?.[0]}{detail.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">
              {detail.firstName} {detail.lastName}
            </h2>
            <p className="text-muted-foreground">{detail.email}</p>
            {detail.company && (
              <Badge variant="secondary" className="mt-1">
                {detail.company.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField(
              'firstName',
              'First Name',
              detail.firstName,
              'text',
              <User className="h-4 w-4" />
            )}
            {renderEditableField(
              'lastName',
              'Last Name',
              detail.lastName,
              'text',
              <User className="h-4 w-4" />
            )}
            {renderEditableField(
              'email',
              'Email',
              detail.email,
              'email',
              <Mail className="h-4 w-4" />
            )}
            {renderEditableField(
              'phone',
              'Phone',
              detail.phone,
              'tel',
              <Phone className="h-4 w-4" />
            )}
          </CardContent>
        </Card>

        {/* Company */}
        {detail.company && (
          <Card>
            <CardHeader>
              <CardTitle>Company</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{detail.company.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {detail.company.website}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 5 activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detail.activities?.slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <ActivityIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderCompanySummary = () => {
    if (!detail || entity !== 'companies') return null

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              <Building2 className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{detail.name}</h2>
            <p className="text-muted-foreground">{detail.website}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary">
                {detail._count?.contacts || 0} contacts
              </Badge>
              <Badge variant="secondary">
                {detail._count?.deals || 0} deals
              </Badge>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField(
              'name',
              'Company Name',
              detail.name,
              'text',
              <Building2 className="h-4 w-4" />
            )}
            {renderEditableField(
              'website',
              'Website',
              detail.website,
              'text',
              <Mail className="h-4 w-4" />
            )}
            {renderEditableField(
              'domain',
              'Domain',
              detail.domain,
              'text',
              <Mail className="h-4 w-4" />
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderActivityTab = () => {
    if (!detail) return null

    const [newActivity, setNewActivity] = useState('')
    const [activityType, setActivityType] = useState('NOTE')

    const activities = entity === 'contacts'
      ? detail.activities
      : [] // Companies don't have direct activities in this schema

    return (
      <div className="space-y-6">
        {/* Add Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Add Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOTE">Note</SelectItem>
                <SelectItem value="CALL">Call</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="MEETING">Meeting</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Describe the activity..."
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              rows={3}
            />
            <Button
              onClick={() => {
                if (newActivity.trim()) {
                  createActivityMutation.mutate({
                    contactId: entity === 'contacts' ? detail.id : undefined,
                    type: activityType as any,
                    description: newActivity,
                  })
                  setNewActivity('')
                }
              }}
              disabled={!newActivity.trim() || createActivityMutation.isLoading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities?.map((activity: any) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <ActivityIcon className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{activity.type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{activity.description}</p>
                  </div>
                </div>
              )) || (
                <p className="text-center text-muted-foreground py-8">
                  No activities yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderFieldsTab = () => {
    if (!detail) return null

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>All Fields</CardTitle>
            <CardDescription>
              View and edit all available fields for this {entity.slice(0, -1)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(detail).map(([key, value]) => {
              if (key === 'id' || key === 'organizationId' || key === 'createdAt' || key === 'updatedAt' || key === 'deletedAt') {
                return null
              }

              if (key.startsWith('_')) return null // Skip Prisma count fields

              return (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || 'Not set')}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {entity === 'contacts' ? 'Contact Details' : 'Company Details'}
          </SheetTitle>
        </SheetHeader>

        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : detail ? (
          <Tabs defaultValue="summary" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-6">
              {entity === 'contacts' ? renderContactSummary() : renderCompanySummary()}
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              {renderActivityTab()}
            </TabsContent>

            <TabsContent value="fields" className="mt-6">
              {renderFieldsTab()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Failed to load details</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}