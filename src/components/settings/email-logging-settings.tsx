'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Info } from 'lucide-react'

const emailSettingsSchema = z.object({
  emailLogAddress: z.string().email().optional().or(z.literal('')),
})

type EmailSettingsForm = z.infer<typeof emailSettingsSchema>

export function EmailLoggingSettings() {
  const [isEditing, setIsEditing] = useState(false)

  const { data: organization, isLoading } = trpc.organizations.getCurrent.useQuery()
  const updateOrganizationMutation = trpc.organizations.update.useMutation({
    onSuccess: () => {
      setIsEditing(false)
    },
  })

  const form = useForm<EmailSettingsForm>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      emailLogAddress: organization?.emailLogAddress || '',
    },
  })

  // Update form when organization data loads
  React.useEffect(() => {
    if (organization) {
      form.reset({
        emailLogAddress: organization.emailLogAddress || '',
      })
    }
  }, [organization, form])

  const onSubmit = (data: EmailSettingsForm) => {
    if (!organization) return

    updateOrganizationMutation.mutate({
      id: organization.id,
      data: {
        emailLogAddress: data.emailLogAddress || null,
      },
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Logging</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Email Logging</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Configure an email address to automatically log activities when emails are sent to it.
            This is useful for tracking email conversations and logging customer communications.
          </AlertDescription>
        </Alert>

        {!isEditing ? (
          <div className="space-y-2">
            <Label>Email Log Address</Label>
            <div className="flex items-center space-x-2">
              <Input
                value={organization?.emailLogAddress || 'Not configured'}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Configure
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailLogAddress">Email Log Address</Label>
              <Input
                id="emailLogAddress"
                placeholder="activities@yourcompany.com"
                {...form.register('emailLogAddress')}
              />
              {form.formState.errors.emailLogAddress && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.emailLogAddress.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                type="submit"
                disabled={updateOrganizationMutation.isLoading}
              >
                {updateOrganizationMutation.isLoading ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  form.reset()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {organization?.emailLogAddress && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Instructions:</strong> Configure your email server to forward emails
              sent to <code>{organization.emailLogAddress}</code> to{' '}
              <code>{process.env.NEXT_PUBLIC_APP_URL || 'your-app-url'}/api/email-log/{organization.emailLogAddress}</code>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}