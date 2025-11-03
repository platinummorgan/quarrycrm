'use client'

import { Phone, MessageSquare, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatPhoneNumber, getTelLink, getSmsLinkWithMessage } from '@/lib/format-phone'
import { toast } from 'sonner'

interface PhoneNumberProps {
  phone: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Common contractor SMS templates
const DEFAULT_SMS_TEMPLATES = [
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

export function PhoneNumber({ phone, size = 'md', className = '' }: PhoneNumberProps) {
  const formattedPhone = formatPhoneNumber(phone)
  const telLink = getTelLink(phone)
  
  const handleCopyNumber = () => {
    navigator.clipboard.writeText(phone)
    toast.success('Phone number copied!')
  }
  
  const handleTextTemplate = (message: string) => {
    const smsLink = getSmsLinkWithMessage(phone, message)
    window.location.href = smsLink
  }
  
  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-2',
    lg: 'text-lg gap-2',
  }
  
  return (
    <div className={`flex items-center $content{sizeClasses[size]} $content{className}`}>
      {/* Click-to-call phone number */}
      <a
        href={telLink}
        className="flex items-center gap-1 hover:underline text-primary"
      >
        <Phone className="h-4 w-4" />
        <span>{formattedPhone}</span>
      </a>
      
      {/* Text message dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Send Text Message</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {DEFAULT_SMS_TEMPLATES.map((template) => (
            <DropdownMenuItem
              key={template.label}
              onClick={() => handleTextTemplate(template.message)}
              className="flex flex-col items-start gap-1"
            >
              <div className="font-medium">{template.label}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {template.message}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyNumber}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Number
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
