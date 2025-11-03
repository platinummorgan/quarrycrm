'use client'

import { useState } from 'react'
import { Phone, MessageSquare, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatPhoneNumber, getTelLink, getSmsLinkWithMessage } from '@/lib/format-phone'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import { ActivityType } from '@prisma/client'

interface ContactActionsProps {
  contactId: string
  contactName: string
  phone?: string | null
  email?: string | null
  dealId?: string | null
  onActivityCreated?: () => void
}

// Common contractor SMS templates
const SMS_TEMPLATES = [
  {
    label: 'Initial Response',
    message: 'Hi! Thanks for reaching out. I got your message and will get back to you shortly with details.',
  },
  {
    label: 'Quote Ready',
    message: 'Hi! Your quote is ready. When would be a good time to discuss the details?',
  },
  {
    label: 'Follow Up',
    message: 'Hi! Just checking in on our conversation. Do you have any questions or ready to move forward?',
  },
  {
    label: 'Schedule Confirmation',
    message: 'Hi! Confirming our appointment. See you soon!',
  },
  {
    label: 'On My Way',
    message: 'Hi! I''m on my way and should arrive in about 15 minutes.',
  },
]

export function ContactActions({
  contactId,
  contactName,
  phone,
  email,
  dealId,
  onActivityCreated,
}: ContactActionsProps) {
  const [textDialogOpen, setTextDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  
  const createActivity = trpc.activities.create.useMutation({
    onSuccess: () => {
      onActivityCreated?.()
    },
  })
  
  const handleCall = () => {
    // Log the call activity
    createActivity.mutate({
      type: ActivityType.CALL,
      description: `Called d:\Dev\CRM\src\components\ui\phone-number.tsx{contactName}d:\Dev\CRM\src\components\ui\phone-number.tsx{phone ? ` at d:\Dev\CRM\src\components\ui\phone-number.tsx{formatPhoneNumber(phone)}` : ''}` ,
      subject: 'Phone call',
      contactId,
      dealId: dealId || undefined,
    })
    
    // Open phone dialer
    if (phone) {
      window.location.href = getTelLink(phone)
    }
    
    toast.success('Call logged')
  }
  
  const handleText = (message: string) => {
    if (!phone) return
    
    // Log the text message activity
    createActivity.mutate({
      type: ActivityType.MESSAGE,
      description: `Sent text to d:\Dev\CRM\src\components\ui\phone-number.tsx{contactName}: "d:\Dev\CRM\src\components\ui\phone-number.tsx{message.substring(0, 100)}d:\Dev\CRM\src\components\ui\phone-number.tsx{message.length > 100 ? '...' : ''}"` ,
      subject: 'Text message',
      contactId,
      dealId: dealId || undefined,
    })
    
    // Open SMS app with pre-filled message
    window.location.href = getSmsLinkWithMessage(phone, message)
    
    setTextDialogOpen(false)
    setCustomMessage('')
    setSelectedTemplate('')
    toast.success('Text message logged')
  }
  
  const handleEmail = () => {
    // Log the email activity
    createActivity.mutate({
      type: ActivityType.EMAIL,
      description: `Sent email to d:\Dev\CRM\src\components\ui\phone-number.tsx{contactName}d:\Dev\CRM\src\components\ui\phone-number.tsx{email ? ` at d:\Dev\CRM\src\components\ui\phone-number.tsx{email}` : ''}` ,
      subject: 'Email',
      contactId,
      dealId: dealId || undefined,
    })
    
    // Open email client
    if (email) {
      window.location.href = `mailto:d:\Dev\CRM\src\components\ui\phone-number.tsx{email}`
    }
    
    toast.success('Email logged')
  }
  
  return (
    <>
      <div className="flex flex-wrap gap-3">
        {/* Call Button */}
        {phone && (
          <Button
            size="lg"
            onClick={handleCall}
            className="text-lg px-6"
          >
            <Phone className="mr-2 h-5 w-5" />
            Call {formatPhoneNumber(phone)}
          </Button>
        )}
        
        {/* Text Button */}
        {phone && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setTextDialogOpen(true)}
            className="text-lg px-6"
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Send Text
          </Button>
        )}
        
        {/* Email Button */}
        {email && (
          <Button
            size="lg"
            variant="outline"
            onClick={handleEmail}
            className="text-lg px-6"
          >
            <Mail className="mr-2 h-5 w-5" />
            Email
          </Button>
        )}
      </div>
      
      {/* Text Message Template Dialog */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Text Message</DialogTitle>
            <DialogDescription>
              Choose a template or write a custom message to send to {contactName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Templates */}
            <div className="space-y-2">
              <Label>Quick Templates</Label>
              <div className="space-y-2">
                {SMS_TEMPLATES.map((template) => (
                  <Button
                    key={template.label}
                    variant={selectedTemplate === template.message ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => {
                      setSelectedTemplate(template.message)
                      setCustomMessage('')
                    }}
                  >
                    <div className="flex flex-col items-start">
                      <div className="font-medium">{template.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {template.message}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Custom Message */}
            <div className="space-y-2">
              <Label>Or write a custom message</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value)
                  setSelectedTemplate('')
                }}
                placeholder="Type your message..."
                rows={4}
              />
            </div>
            
            {/* Send Button */}
            <Button
              className="w-full"
              onClick={() => handleText(selectedTemplate || customMessage)}
              disabled={!selectedTemplate && !customMessage.trim()}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Text
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
