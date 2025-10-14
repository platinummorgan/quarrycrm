'use client'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { useContactColumns } from '@/hooks/use-table-columns'
import { Plus } from 'lucide-react'

export default function ContactsPage() {
  const columns = useContactColumns()

  const handleCreate = () => {
    // TODO: Open create contact dialog
    console.log('Create contact')
  }

  const handleImport = () => {
    // TODO: Open CSV import dialog
    console.log('Import contacts')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your customer and prospect contacts
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
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
