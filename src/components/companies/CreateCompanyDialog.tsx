'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, Building2, Globe, Briefcase, FileText, AtSign } from 'lucide-react'

const companyFormSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  domain: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  ownerId: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companyFormSchema>

interface CreateCompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCompanyDialog({ open, onOpenChange }: CreateCompanyDialogProps) {
  const [me, setMe] = useState<{ org?: string; role?: string; membershipId?: string } | null>(null)
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined)

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      website: '',
      domain: '',
      industry: '',
      description: '',
      ownerId: undefined,
    },
  })

  // Fetch owners for select input
  const { data: ownerOptions } = trpc.companies.listOwnerOptions.useQuery(undefined, {
    enabled: open,
  })

  // Lightweight whoami endpoint to get current membershipId for preselect
  useEffect(() => {
    let mounted = true
    if (open) {
      fetch('/api/whoami')
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return
          setMe(data as any)
        })
        .catch((err) => {
          console.debug('whoami fetch failed', err)
        })
    }
    return () => {
      mounted = false
    }
  }, [open])

  // Preselect current member when available
  useEffect(() => {
    if (!ownerId && (me as any)?.membershipId) {
      setOwnerId((me as any).membershipId)
      form.setValue('ownerId', (me as any).membershipId)
    }
  }, [me?.membershipId, ownerId])

  // If only one owner option is present, set it on the form
  useEffect(() => {
    if (ownerOptions && ownerOptions.length === 1) {
      const only = ownerOptions[0].id
      setOwnerId(only)
      form.setValue('ownerId', only)
    }
  }, [ownerOptions])

  const utils = trpc.useContext()

  const createMutation = trpc.companies.create.useMutation({
    onSuccess: async () => {
      console.debug('companies.create onSuccess')
      await utils.companies.list.invalidate()
      onOpenChange(false)
      form.reset()
      toast.success('Company created successfully')
    },
    onError: (err) => {
      console.error('companies.create onError', err)
      toast.error(err?.message ?? 'Failed to create company')
    },
  })

  const onSubmit = (data: CompanyFormData) => {
    const payload: any = {
      name: data.name,
      website: data.website || undefined,
      domain: data.domain || undefined,
      industry: data.industry || undefined,
      description: data.description || undefined,
    }
    if (ownerId) payload.ownerId = ownerId

    console.debug('companies.create payload', payload)
    createMutation.mutate(payload)
  }

  const isSubmitting = form.formState.isSubmitting || createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Company
          </DialogTitle>
          <DialogDescription>
            Fill in the details to create a new company in your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Name
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Acme Corporation"
              {...form.register('name')}
              disabled={isSubmitting}
              autoFocus
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website
            </Label>
            <Input
              id="website"
              type="url"
              placeholder="https://www.acme.com"
              {...form.register('website')}
              disabled={isSubmitting}
            />
            {form.formState.errors.website && (
              <p className="text-sm text-destructive">
                {form.formState.errors.website.message}
              </p>
            )}
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain" className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Domain
            </Label>
            <Input
              id="domain"
              placeholder="acme.com"
              {...form.register('domain')}
              disabled={isSubmitting}
            />
            {form.formState.errors.domain && (
              <p className="text-sm text-destructive">
                {form.formState.errors.domain.message}
              </p>
            )}
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Industry
            </Label>
            <Input
              id="industry"
              placeholder="Technology"
              {...form.register('industry')}
              disabled={isSubmitting}
            />
            {form.formState.errors.industry && (
              <p className="text-sm text-destructive">
                {form.formState.errors.industry.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of the company"
              {...form.register('description')}
              disabled={isSubmitting}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Owner */}
          {ownerOptions && ownerOptions.length === 1 ? (
            // If only one owner option, preselect and hide the field
            <input type="hidden" value={ownerOptions[0].id} {...form.register('ownerId')} />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ownerId" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Owner
              </Label>
              <Select
                value={ownerId ?? form.watch('ownerId')}
                onValueChange={(value) => {
                  setOwnerId(value)
                  form.setValue('ownerId', value)
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an owner" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label} {o.subLabel ? `· ${o.subLabel}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.ownerId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.ownerId.message}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Company'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}