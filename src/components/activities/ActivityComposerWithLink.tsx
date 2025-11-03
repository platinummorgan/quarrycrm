'use client'

import { useState } from 'react'
import { ActivityComposer } from './activity-composer'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, X, Briefcase, User } from 'lucide-react'
import { ActivityType } from '@prisma/client'

interface ActivityComposerWithLinkProps {
  onSuccess?: () => void
  onCancel?: () => void
  defaultType?: ActivityType
}

export function ActivityComposerWithLink({
  onSuccess,
  onCancel,
  defaultType = ActivityType.NOTE,
}: ActivityComposerWithLinkProps) {
  const [step, setStep] = useState<'create' | 'link'>('create')
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string } | null>(null)
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null)

  // Search for jobs
  const { data: jobResults } = trpc.deals.list.useQuery(
    {
      q: searchQuery,
      limit: 5,
    },
    {
      enabled: step === 'link' && searchQuery.length > 0,
    }
  )

  // Search for contacts
  const { data: contactResults } = trpc.contacts.list.useQuery(
    {
      q: searchQuery,
      limit: 5,
    },
    {
      enabled: step === 'link' && searchQuery.length > 0,
    }
  )

  const updateActivityMutation = trpc.activities.update.useMutation({
    onSuccess: () => {
      onSuccess?.()
    },
  })

  const handleActivityCreated = () => {
    // For now, just complete without linking
    // In a real implementation, we'd capture the activity ID and move to link step
    setStep('link')
  }

  const handleLinkJob = (job: { id: string; title: string }) => {
    setSelectedJob(job)
    setSelectedContact(null)
  }

  const handleLinkContact = (contact: { id: string; firstName: string; lastName: string }) => {
    setSelectedContact({
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
    })
    setSelectedJob(null)
  }

  const handleSaveLink = () => {
    if (!createdActivityId) {
      // If we don't have the activity ID, just complete
      onSuccess?.()
      return
    }

    updateActivityMutation.mutate({
      id: createdActivityId,
      data: {
        dealId: selectedJob?.id || null,
        contactId: selectedContact?.id || null,
      },
    })
  }

  const handleSkipLink = () => {
    onSuccess?.()
  }

  if (step === 'create') {
    return (
      <ActivityComposer
        onSuccess={handleActivityCreated}
        onCancel={onCancel}
        defaultType={defaultType}
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Link to Job or Contact? (Optional)</CardTitle>
          <CardDescription>
            This helps you track activities related to specific jobs or contacts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected */}
          {(selectedJob || selectedContact) && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-2 text-sm py-1.5 px-3">
                {selectedJob && (
                  <>
                    <Briefcase className="h-3 w-3" />
                    {selectedJob.title}
                  </>
                )}
                {selectedContact && (
                  <>
                    <User className="h-3 w-3" />
                    {selectedContact.name}
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedJob(null)
                    setSelectedContact(null)
                  }}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          )}

          {/* Results */}
          {searchQuery.length > 0 && (
            <div className="space-y-2">
              {/* Jobs */}
              {jobResults && jobResults.items.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Jobs</p>
                  {jobResults.items.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => handleLinkJob(job)}
                      className={`w-full text-left p-2 rounded-md hover:bg-muted transition-colors ${
                        selectedJob?.id === job.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{job.title}</p>
                          {job.contact && (
                            <p className="text-xs text-muted-foreground">
                              {job.contact.firstName} {job.contact.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Contacts */}
              {contactResults && contactResults.items.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Contacts</p>
                  {contactResults.items.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleLinkContact(contact)}
                      className={`w-full text-left p-2 rounded-md hover:bg-muted transition-colors ${
                        selectedContact?.id === contact.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.email && (
                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {jobResults?.items.length === 0 && contactResults?.items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No results found
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={handleSkipLink}>
          Skip
        </Button>
        <Button 
          onClick={handleSaveLink}
          disabled={!selectedJob && !selectedContact}
        >
          {updateActivityMutation.isLoading ? 'Saving...' : 'Save & Link'}
        </Button>
      </div>
    </div>
  )
}
