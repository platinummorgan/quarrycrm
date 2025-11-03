'use client'

import { useState } from 'react'
import { ActivityComposer } from './activity-composer'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Search, X, Briefcase, User, Building2, Check } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'jobs' | 'contacts' | 'companies'>('jobs')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string } | null>(null)
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null)

  // Fetch all jobs (with search)
  const { data: jobsData, isLoading: jobsLoading } = trpc.deals.list.useQuery(
    {
      q: searchQuery,
      limit: 20,
    },
    {
      enabled: step === 'link' && activeTab === 'jobs',
    }
  )

  // Fetch all contacts (with search)
  const { data: contactsData, isLoading: contactsLoading } = trpc.contacts.list.useQuery(
    {
      q: searchQuery,
      limit: 20,
    },
    {
      enabled: step === 'link' && activeTab === 'contacts',
    }
  )

  // Fetch all companies (with search)
  const { data: companiesData, isLoading: companiesLoading } = trpc.companies.list.useQuery(
    {
      q: searchQuery,
      limit: 20,
    },
    {
      enabled: step === 'link' && activeTab === 'companies',
    }
  )

  const updateActivityMutation = trpc.activities.update.useMutation({
    onSuccess: () => {
      onSuccess?.()
    },
  })

  const handleActivityCreated = () => {
    setStep('link')
  }

  const handleSelectJob = (job: { id: string; title: string }) => {
    setSelectedJob(job)
    setSelectedContact(null)
    setSelectedCompany(null)
  }

  const handleSelectContact = (contact: { id: string; firstName: string; lastName: string }) => {
    setSelectedContact({
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
    })
    setSelectedJob(null)
    setSelectedCompany(null)
  }

  const handleSelectCompany = (company: { id: string; name: string }) => {
    setSelectedCompany(company)
    setSelectedJob(null)
    setSelectedContact(null)
  }

  const handleSaveLink = () => {
    if (!createdActivityId) {
      onSuccess?.()
      return
    }

    updateActivityMutation.mutate({
      id: createdActivityId,
      data: {
        dealId: selectedJob?.id || null,
        contactId: selectedContact?.id || null,
        companyId: selectedCompany?.id || null,
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

  const selectedItem = selectedJob || selectedContact || selectedCompany

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Link to Job, Contact, or Company? (Optional)</CardTitle>
          <CardDescription>
            Choose a category below, then select an item to link this activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Item Display */}
          {selectedItem && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary">
              <div className="flex items-center gap-2">
                {selectedJob && <Briefcase className="h-4 w-4 text-primary" />}
                {selectedContact && <User className="h-4 w-4 text-primary" />}
                {selectedCompany && <Building2 className="h-4 w-4 text-primary" />}
                <span className="font-medium">
                  {selectedJob?.title || selectedContact?.name || selectedCompany?.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedJob(null)
                  setSelectedContact(null)
                  setSelectedCompany(null)
                }}
                className="hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Category Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="jobs" className="gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Jobs</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
              <TabsTrigger value="companies" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Companies</span>
              </TabsTrigger>
            </TabsList>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Jobs List */}
            <TabsContent value="jobs" className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
              {jobsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading jobs...</p>
              ) : jobsData && jobsData.items.length > 0 ? (
                jobsData.items.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => handleSelectJob(job)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedJob?.id === job.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{job.title}</p>
                        {job.contact && (
                          <p className="text-sm text-muted-foreground">
                            {job.contact.firstName} {job.contact.lastName}
                          </p>
                        )}
                        {job.company && (
                          <p className="text-xs text-muted-foreground">{job.company.name}</p>
                        )}
                      </div>
                      {selectedJob?.id === job.id && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searchQuery ? 'No jobs found' : 'No jobs available'}
                </p>
              )}
            </TabsContent>

            {/* Contacts List */}
            <TabsContent value="contacts" className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
              {contactsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading contacts...</p>
              ) : contactsData && contactsData.items.length > 0 ? (
                contactsData.items.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedContact?.id === contact.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.email && (
                          <p className="text-sm text-muted-foreground">{contact.email}</p>
                        )}
                        {contact.phone && (
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                        )}
                      </div>
                      {selectedContact?.id === contact.id && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searchQuery ? 'No contacts found' : 'No contacts available'}
                </p>
              )}
            </TabsContent>

            {/* Companies List */}
            <TabsContent value="companies" className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
              {companiesLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading companies...</p>
              ) : companiesData && companiesData.items.length > 0 ? (
                companiesData.items.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleSelectCompany(company)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedCompany?.id === company.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{company.name}</p>
                        {company.website && (
                          <p className="text-sm text-muted-foreground">{company.website}</p>
                        )}
                      </div>
                      {selectedCompany?.id === company.id && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searchQuery ? 'No companies found' : 'No companies available'}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={handleSkipLink}>
          Skip
        </Button>
        <Button 
          onClick={handleSaveLink}
          disabled={!selectedItem || updateActivityMutation.isLoading}
        >
          {updateActivityMutation.isLoading ? 'Saving...' : 'Save & Link'}
        </Button>
      </div>
    </div>
  )
}
