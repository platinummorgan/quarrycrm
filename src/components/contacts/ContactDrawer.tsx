'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactFormSchema, type ContactFormData } from '@/lib/zod/contacts'
import { createContact, updateContact, getContactById } from '@/server/contacts'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, User, Mail, Phone } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useRouter } from 'next/navigation'

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
    },
  })

  // Handle custom events
  useEffect(() => {
    const handleCreateContact = () => {
      setSelectedContactId(null)
      setIsCreating(true)
      setIsOpen(true)
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      })
    }

    const handleSelectContact = (event: CustomEvent) => {
      const { contactId } = event.detail
      setSelectedContactId(contactId)
      setIsCreating(false)
      setIsOpen(true)
      setIsLoadingContact(true)

      // Fetch contact data
      getContactById(contactId)
        .then((contact) => {
          form.reset({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || '',
            phone: contact.phone || '',
          })
        })
        .catch((error) => {
          console.error('Failed to load contact:', error)
          toast.error('Failed to load contact')
          setIsOpen(false)
        })
        .finally(() => {
          setIsLoadingContact(false)
        })
    }

    window.addEventListener('contact:create', handleCreateContact)
    window.addEventListener('contact:select', handleSelectContact as EventListener)

    return () => {
      window.removeEventListener('contact:create', handleCreateContact)
      window.removeEventListener('contact:select', handleSelectContact as EventListener)
    }
  }, [form])

  // Handle controlled open state
  useEffect(() => {
    if (controlledOpen !== undefined) {
      setIsOpen(controlledOpen)
    }
  }, [controlledOpen])

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

  const onSubmit = async (data: ContactFormData) => {
    try {
      if (isEditMode) {
        await updateContact(selectedContactId, data)
        toast.success('Contact updated successfully')
      } else {
        await createContact(data)
        toast.success('Contact created successfully')
      }

      handleOpenChange(false)
      // The page will be revalidated by the server actions
    } catch (error) {
      console.error('Failed to save contact:', error)
      toast.error(isEditMode ? 'Failed to update contact' : 'Failed to create contact')
    }
  }

  const isSubmitting = form.formState.isSubmitting

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

            {/* Owner info */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Owner
              </Label>
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                Contacts will be assigned to you as the owner.
              </div>
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
              <Button type="submit" disabled={isSubmitting} className="flex-1">
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
