'use client'

export const dynamic = 'force-dynamic'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { useContactColumns } from '@/hooks/use-table-columns'
import { Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc'

export default function ContactsPage() {
  const columns = useContactColumns()

  const handleCreate = () => {
    // Dispatch custom event to open the create contact drawer
    window.dispatchEvent(new CustomEvent('contact:create'))
  }

  const handleImport = () => {
    // TODO: Open CSV import dialog
    console.log('Import contacts')
  }

  // Query a single contact to determine whether the list is empty.
  // We keep the top-right CTA visible while loading to avoid layout jump;
  // once we know the list is empty we'll hide the top CTA so the empty-state CTA
  // in the DataTable is the only primary action shown.
  const contactsPresenceQuery = trpc.contacts.list.useQuery({ limit: 1 })
  const hasContacts = (contactsPresenceQuery.data?.items?.length || 0) > 0
  const showTopCTA = contactsPresenceQuery.isLoading || hasContacts

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your customer and prospect contacts</p>
        </div>
        {/* Primary CTA in the top-right. Keep empty-state CTA handled by DataTable */}
        {showTopCTA && (
          <Button onClick={handleCreate} data-testid="add-contact-button">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        )}
      </div>

      <DataTable
        entity="contacts"
        columns={columns}
        searchPlaceholder="Search contacts..."
        onCreate={handleCreate}
        onImport={handleImport}
      />
    </div>
  )
}
