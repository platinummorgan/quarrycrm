import { Suspense } from 'react'
import { ContactsTable } from '@/components/contacts/ContactsTable'
import { getContacts } from '@/server/contacts'
import { Skeleton } from '@/components/ui/skeleton'

interface ContactsPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

async function ContactsTableWrapper({ searchParams }: ContactsPageProps) {
  const q = typeof searchParams.q === 'string' ? searchParams.q : undefined
  const cursor = typeof searchParams.cursor === 'string' ? searchParams.cursor : undefined

  const contactsData = await getContacts({ q, cursor })

  return (
    <ContactsTable
      initialData={contactsData}
      initialQuery={q}
      initialCursor={cursor}
    />
  )
}

function ContactsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search and Actions Skeleton */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-300px)]">
          <table className="w-full">
            <thead className="sticky top-0 bg-background border-b shadow-sm">
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Email</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Owner</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ContactsPage({ searchParams }: ContactsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground">
          Manage your contacts and relationships
        </p>
      </div>

      <Suspense fallback={<ContactsTableSkeleton />}>
        <ContactsTableWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
