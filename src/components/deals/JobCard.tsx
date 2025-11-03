'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, Mail, ExternalLink, Calendar, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { formatPhoneNumber, getTelLink, getSmsLink } from '@/lib/format-phone'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface JobCardProps {
  job: {
    id: string
    title: string
    value: number | null
    contact: {
      firstName: string | null
      lastName: string | null
      email: string | null
      phone?: string | null
    } | null
    company?: {
      name: string
    } | null
    stage: {
      name: string
      color: string | null
    } | null
    jobType?: string | null
    status?: string | null
    nextFollowupDate?: Date | null
    updatedAt: Date
    activities?: Array<{
      createdAt: Date
      type: string
    }>
  }
  showDaysSinceContact?: boolean
}

export function JobCard({ job, showDaysSinceContact = true }: JobCardProps) {
  const contactName = job.contact
    ? `${job.contact.firstName || ''} ${job.contact.lastName || ''}`.trim() || 'No name'
    : 'No contact'

  const contactInitials = job.contact
    ? `${job.contact.firstName?.[0] || ''}${job.contact.lastName?.[0] || ''}`.toUpperCase() || '?'
    : '?'

  const lastActivity = job.activities?.[0]
  const daysSinceContact = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Contact Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {contactInitials}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <Link 
                  href={`/app/deals/${job.id}`}
                  className="font-semibold hover:text-primary transition-colors line-clamp-1"
                >
                  {job.title}
                </Link>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {contactName}
                  {job.company && ` • ${job.company.name}`}
                </p>
              </div>
              
              {/* Value */}
              {job.value && (
                <div className="text-lg font-bold text-primary flex-shrink-0">
                  {formatCurrency(job.value)}
                </div>
              )}
            </div>

            {/* Tags Row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* Job Type */}
              {job.jobType && (
                <Badge variant="secondary" className="text-xs">
                  {job.jobType}
                </Badge>
              )}
              
              {/* Stage */}
              {job.stage && (
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{
                    borderColor: job.stage.color || undefined,
                    color: job.stage.color || undefined
                  }}
                >
                  {job.stage.name}
                </Badge>
              )}

              {/* Days Since Contact */}
              {showDaysSinceContact && daysSinceContact !== null && (
                <Badge 
                  variant={daysSinceContact > 7 ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {daysSinceContact === 0 ? 'Today' : `${daysSinceContact}d ago`}
                </Badge>
              )}

              {/* Activity Count */}
              {job.activities && job.activities.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {job.activities.length} {job.activities.length === 1 ? 'activity' : 'activities'}
                </Badge>
              )}

              {/* Next Follow-up */}
              {job.nextFollowupDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(job.nextFollowupDate), { addSuffix: true })}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {job.contact?.phone && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8"
                  asChild
                >
                  <a href={`tel:${job.contact.phone}`}>
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    Call
                  </a>
                </Button>
              )}
              
              {job.contact?.email && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8"
                  asChild
                >
                  <a href={`mailto:${job.contact.email}`}>
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Email
                  </a>
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 ml-auto"
                asChild
              >
                <Link href={`/app/deals/${job.id}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  View
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
