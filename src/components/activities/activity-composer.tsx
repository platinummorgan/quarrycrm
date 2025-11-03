'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { ActivityType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Phone,
  Calendar,
  Mail,
  CheckSquare,
  X,
  Plus,
  CalendarIcon,
} from 'lucide-react'

const activityCreateSchema = z.object({
  type: z.nativeEnum(ActivityType),
  description: z.string().min(1).max(1000),
  subject: z.string().optional(),
  body: z.string().optional(),
  dueDate: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
})

type ActivityCreateForm = z.infer<typeof activityCreateSchema>

interface ActivityComposerProps {
  contactId?: string
  dealId?: string
  companyId?: string
  onSuccess?: () => void
  onCancel?: () => void
  defaultType?: ActivityType
}

const activityTypes = [
  {
    value: ActivityType.NOTE,
    label: 'Note',
    icon: MessageSquare,
    color: 'text-blue-600',
  },
  {
    value: ActivityType.CALL,
    label: 'Call',
    icon: Phone,
    color: 'text-green-600',
  },
  {
    value: ActivityType.MEETING,
    label: 'Meeting',
    icon: Calendar,
    color: 'text-purple-600',
  },
  {
    value: ActivityType.EMAIL,
    label: 'Email',
    icon: Mail,
    color: 'text-orange-600',
  },
  {
    value: ActivityType.TASK,
    label: 'Task',
    icon: CheckSquare,
    color: 'text-red-600',
  },
]

export function ActivityComposer({
  contactId,
  dealId,
  companyId,
  onSuccess,
  onCancel,
  defaultType = ActivityType.NOTE,
}: ActivityComposerProps) {
  const [selectedEntities, setSelectedEntities] = useState<
    Array<{ id: string; type: 'contact' | 'deal' | 'company'; name: string }>
  >([])

  const form = useForm<ActivityCreateForm>({
    resolver: zodResolver(activityCreateSchema),
    defaultValues: {
      type: defaultType,
      description: '',
    },
  })

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Pre-populate selected entities based on props
  useEffect(() => {
    const entities = []
    if (contactId)
      entities.push({
        id: contactId,
        type: 'contact' as const,
        name: 'Contact',
      })
    if (dealId)
      entities.push({ id: dealId, type: 'deal' as const, name: 'Deal' })
    if (companyId)
      entities.push({
        id: companyId,
        type: 'company' as const,
        name: 'Company',
      })
    setSelectedEntities(entities)
  }, [contactId, dealId, companyId])

  const createActivityMutation = trpc.activities.create.useMutation({
    onSuccess: () => {
      form.reset({
        type: defaultType,
        description: '',
        subject: '',
        body: '',
        dueDate: '',
      })
      setSelectedEntities([])
      onSuccess?.()
    },
  })

  const onSubmit = (data: ActivityCreateForm) => {
    createActivityMutation.mutate({
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      contactId: selectedEntities.find((e) => e.type === 'contact')?.id,
      dealId: selectedEntities.find((e) => e.type === 'deal')?.id,
      companyId: selectedEntities.find((e) => e.type === 'company')?.id,
    })
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      form.handleSubmit(onSubmit)()
    } else if (event.key === 'Escape') {
      handleCancel()
    }
  }

  const handleCancel = () => {
    form.reset({
      type: defaultType,
      description: '',
      subject: '',
      body: '',
      dueDate: '',
    })
    setSelectedEntities([])
    onCancel?.()
  }

  const currentType = activityTypes.find((t) => t.value === form.watch('type'))
  const Icon = currentType?.icon || MessageSquare

  return (
    <div className="rounded-lg border bg-background p-4">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Type selector */}
        <div className="flex items-center space-x-2">
          <Select
            value={form.watch('type')}
            onValueChange={(value) =>
              form.setValue('type', value as ActivityType)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activityTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center space-x-2">
                    <type.icon className={`h-4 w-4 ${type.color}`} />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Subject (for emails) */}
        {form.watch('type') === ActivityType.EMAIL && (
          <input
            type="text"
            placeholder="Email subject..."
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...form.register('subject')}
          />
        )}

        {/* Description */}
        <Textarea
          placeholder={
            form.watch('type') === ActivityType.EMAIL
              ? 'Email body...'
              : form.watch('type') === ActivityType.TASK
                ? 'Task description...'
                : 'Add a note...'
          }
          className="min-h-20 resize-none"
          {...form.register('description')}
          onKeyDown={handleKeyDown}
          ref={(e) => {
            const { ref } = form.register('description')
            ref(e)
            textareaRef.current = e
          }}
        />

        {/* Due date (for tasks) */}
        {form.watch('type') === ActivityType.TASK && (
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              className="rounded-md border px-3 py-2 text-sm"
              {...form.register('dueDate')}
            />
          </div>
        )}

        {/* Selected entities */}
        {selectedEntities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedEntities.map((entity) => (
              <Badge
                key={`${entity.type}-${entity.id}`}
                variant="secondary"
                className="text-xs"
              >
                {entity.name}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedEntities((prev) =>
                      prev.filter((e) => e.id !== entity.id)
                    )
                  }
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to
            save
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createActivityMutation.isLoading}
            >
              {createActivityMutation.isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
