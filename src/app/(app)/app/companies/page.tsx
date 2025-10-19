'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { useCompanyColumns } from '@/hooks/use-table-columns'
import { Plus } from 'lucide-react'
import { CreateCompanyDialog } from '@/components/companies/CreateCompanyDialog'

export default function CompaniesPage() {
  const columns = useCompanyColumns()
  const [createOpen, setCreateOpen] = useState(false)

  const handleCreate = () => {
    setCreateOpen(true)
  }

  const handleImport = () => {
    // TODO: Open CSV import dialog
    console.log('Import companies')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">
            Manage your business relationships and organizations
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </div>

      <DataTable
        entity="companies"
        columns={columns}
        searchPlaceholder="Search companies..."
        onCreate={handleCreate}
        onImport={handleImport}
      />

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
