'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { ActivityType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Plus } from 'lucide-react'

const taskCreateSchema = z.object({
  description: z.string().min(1).max(500),
  dueDate: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
})

type TaskCreateForm = z.infer<typeof taskCreateSchema>

interface TaskQuickCreateProps {
  contactId?: string
  dealId?: string
  companyId?: string
  onSuccess?: () => void
  className?: string
}

export function TaskQuickCreate({
  contactId,
  dealId,
  companyId,
  onSuccess,
  className = '',
}: TaskQuickCreateProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const form = useForm<TaskCreateForm>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: {
      description: '',
    },
  })

  const createTaskMutation = trpc.activities.create.useMutation({
    onSuccess: () => {
      form.reset()
      setIsExpanded(false)
      onSuccess?.()
    },
  })

  const onSubmit = (data: TaskCreateForm) => {
    createTaskMutation.mutate({
      type: ActivityType.TASK,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      contactId,
      dealId,
      companyId,
    })
  }

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={`flex items-center space-x-2 ${className}`}
      >
        <Plus className="h-4 w-4" />
        <span>Quick Task</span>
      </Button>
    )
  }

  return (
    <div className={`rounded-lg border bg-background p-3 ${className}`}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Task description..."
            className="flex-1"
            {...form.register('description')}
            autoFocus
          />
          <input
            type="date"
            className="w-40 rounded-md border px-3 py-2 text-sm"
            {...form.register('dueDate')}
          />
          <Button
            type="submit"
            size="sm"
            disabled={createTaskMutation.isLoading}
          >
            {createTaskMutation.isLoading ? '...' : 'Add'}
          </Button>
        </div>
      </form>
    </div>
  )
}
