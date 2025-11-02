'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MessageSquare } from 'lucide-react'

interface TextTemplate {
  id: string
  label: string
  message: string
}

const DEFAULT_TEMPLATES: TextTemplate[] = [
  {
    id: 'initial_response',
    label: 'Initial Response',
    message: "Thanks for reaching out! I'll get you a quote within 24 hours.",
  },
  {
    id: 'quote_ready',
    label: 'Quote Ready',
    message: 'Your quote is ready. Can I call you to discuss?',
  },
  {
    id: 'follow_up',
    label: 'Follow Up',
    message:
      "Just checking in on the quote I sent last week. Any questions?",
  },
  {
    id: 'job_scheduled',
    label: 'Job Scheduled',
    message: "We're scheduled to start your job on [DATE]. Looking forward to it!",
  },
]

interface TextTemplatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phoneNumber: string
  contactName: string
  onSendText: (message: string) => void
}

export function TextTemplatesDialog({
  open,
  onOpenChange,
  phoneNumber,
  contactName,
  onSendText,
}: TextTemplatesDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customMessage, setCustomMessage] = useState('')

  const handleSelectTemplate = (template: TextTemplate) => {
    setSelectedTemplate(template.id)
    setCustomMessage(template.message)
  }

  const handleSendText = () => {
    if (!customMessage.trim()) return
    onSendText(customMessage)
    onOpenChange(false)
    // Reset state
    setSelectedTemplate('')
    setCustomMessage('')
  }

  const handleOpenSMS = () => {
    if (!customMessage.trim()) return
    const encodedMessage = encodeURIComponent(customMessage)
    const smsLink = `sms:${phoneNumber}?body=${encodedMessage}`
    window.open(smsLink, '_blank')
    // Log the communication
    onSendText(customMessage)
    onOpenChange(false)
    // Reset state
    setSelectedTemplate('')
    setCustomMessage('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Text Message</DialogTitle>
          <DialogDescription>
            To: {contactName} ({phoneNumber})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Buttons */}
          <div>
            <Label>Quick Templates</Label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEFAULT_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant={
                    selectedTemplate === template.id ? 'default' : 'outline'
                  }
                  className="justify-start text-left"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{template.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Message Editor */}
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type your message here..."
              className="mt-2 min-h-[120px]"
              rows={5}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Tip: Replace [DATE] with the actual date before sending
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setSelectedTemplate('')
                setCustomMessage('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleOpenSMS} disabled={!customMessage.trim()}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Open SMS App
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
