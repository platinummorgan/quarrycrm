'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactFormSchema, type ContactFormData } from '@/lib/zod/contacts'
import { trpc } from '@/lib/trpc'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, User, Mail, Phone } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useRouter } from 'next/navigation'
import { CompanySelect } from './CompanySelect'

interface ContactDrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ContactDrawer({
  open: controlledOpen,
  onOpenChange,
}: ContactDrawerProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(controlledOpen || false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingContact, setIsLoadingContact] = useState(false)

  const isEditMode = !!selectedContactId

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      ownerId: undefined,
      notes: '',
    },
  })

  // Fetch owners for select input (server-provided formatted options)
  const { data: ownerOptions } = trpc.contacts.listOwnerOptions.useQuery(undefined, {
    enabled: isOpen,
  })

  // Lightweight whoami endpoint to get current membershipId for preselect
  const [me, setMe] = useState<{ org?: string; role?: string; membershipId?: string } | null>(null)
  useEffect(() => {
    let mounted = true
    if (isOpen) {
      fetch('/api/whoami')
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return
          // whoami returns org and role; membershipId may be attached by session elsewhere
          setMe(data as any)
        })
        .catch((err) => {
          console.debug('whoami fetch failed', err)
        })
    }
    return () => {
      mounted = false
    }
  }, [isOpen])

  // Local ownerId state to allow hiding the select when only one option exists
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined)
  const [companyId, setCompanyId] = useState<string | undefined>(undefined)

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

  // tRPC queries/mutations
  const getContactQuery = trpc.contacts.getById.useQuery(
    { id: selectedContactId as string },
    { enabled: isOpen && !!selectedContactId }
  )

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: async () => {
      console.debug('contacts.create onSuccess')
      await utils.contacts.list.invalidate()
      handleOpenChange(false)
      try { window.alert('Contact created successfully') } catch (e) {}
      toast.success('Contact created successfully')
    },
    onError: (err) => {
      console.error('contacts.create onError', err)
      try { window.alert('Failed to create contact: ' + (err?.message || 'unknown error')) } catch (e) {}
      // show server-provided message when available
      toast.error(err?.message ?? 'Failed to create contact')
    },
  })

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: async () => {
      await utils.contacts.list.invalidate()
      handleOpenChange(false)
      toast.success('Contact updated successfully')
    },
    onError: (err) => {
      toast.error(err?.message ?? 'Failed to update contact')
    },
  })

  // Expose mutate function and a robust pending flag (support isPending or fallback to isLoading)
  const { mutate: createMutate } = createMutation
  const { mutate: updateMutate } = updateMutation
  const createPending = (createMutation as any).isPending ?? createMutation.isLoading
  const updatePending = (updateMutation as any).isPending ?? updateMutation.isLoading

  // Handle custom events
  useEffect(() => {
    const handleCreateContact = () => {
      setSelectedContactId(null)
      setIsCreating(true)
      setIsOpen(true)
      setCompanyId(undefined)
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        ownerId: undefined,
        notes: '',
      })
    }

    const handleSelectContact = (event: CustomEvent) => {
      const { contactId } = event.detail
      setSelectedContactId(contactId)
      setIsCreating(false)
      setIsOpen(true)
      setIsLoadingContact(true)
      // getContactQuery will fetch when enabled; watch its result via effect below
    }

    window.addEventListener('contact:create', handleCreateContact)
    window.addEventListener('contact:select', handleSelectContact as EventListener)

    return () => {
      window.removeEventListener('contact:create', handleCreateContact)
      window.removeEventListener('contact:select', handleSelectContact as EventListener)
    }
  }, [form, getContactQuery.data])

  // Handle controlled open state
  useEffect(() => {
    if (controlledOpen !== undefined) {
      setIsOpen(controlledOpen)
    }
  }, [controlledOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    onOpenChange?.(open)

    // Reset state when closing
    if (!open) {
      setTimeout(() => {
        setSelectedContactId(null)
        setIsCreating(false)
      }, 200)
    }
  }

  const onSubmit = (data: ContactFormData) => {
    // Prevent double submits when a mutation is already in-flight
    if (createPending || updatePending) return

    const { firstName, lastName, email, phone, notes } = data as any

    if (isEditMode) {
      // Only send updateable fields according to the server update schema
      updateMutate({
        id: selectedContactId as string,
        data: {
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
        },
      })
    } else {
      // Fire-and-forget mutate; onSuccess/onError handle UI and messages
      const payload: any = {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        companyId: companyId || null,
        notes: notes || null,
      }
      if (ownerId) payload.ownerId = ownerId
      console.debug('contacts.create payload', payload)
      // If ownerId not provided, server will default to current member
      createMutate(payload)
    }
  }

  const isSubmitting = form.formState.isSubmitting || createPending || updatePending

  // Sync getContactQuery result into form when editing
  useEffect(() => {
    if (getContactQuery.data && isEditMode) {
      const contact = getContactQuery.data
      form.reset({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
        ownerId: contact.owner.id,
      })
      setCompanyId(contact.companyId || undefined)
      setIsLoadingContact(false)
    } else if (isEditMode && getContactQuery.isError) {
      console.error('Failed to load contact:', getContactQuery.error)
      toast.error('Failed to load contact')
      setIsOpen(false)
      setIsLoadingContact(false)
    }
  }, [getContactQuery.data, getContactQuery.isError, isEditMode])

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? 'Edit Contact' : 'Add New Contact'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Update contact information'
              : 'Fill in the details to create a new contact'}
          </SheetDescription>
        </SheetHeader>

        {isLoadingContact && isEditMode ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 pt-6"
          >
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                First Name
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="John"
                {...form.register('firstName')}
                disabled={isSubmitting}
                autoFocus
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Last Name
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...form.register('lastName')}
                disabled={isSubmitting}
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                {...form.register('email')}
                disabled={isSubmitting}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...form.register('phone')}
                disabled={isSubmitting}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.phone.message}
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
                  <User className="h-4 w-4" />
                  Owner
                  <span className="text-destructive">*</span>
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

            {/* Company (optional) */}
            <CompanySelect
              value={companyId}
              onChange={setCompanyId}
            />

            {/* Notes (optional) */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Notes (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Notes about the contact"
                {...form.register('notes')}
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1" data-testid="contact-form-submit">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : isEditMode ? (
                  'Update Contact'
                ) : (
                  'Create Contact'
                )}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
