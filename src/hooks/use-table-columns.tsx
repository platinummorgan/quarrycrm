import { Column } from '@/components/data-table'
import { maskPII } from '@/lib/mask-pii'

// Contact columns configuration
export const useContactColumns = (isDemo: boolean = false) => {
  const columns: Column<any>[] = [
    {
      id: 'firstName',
      label: 'First Name',
      accessor: 'firstName',
      sortable: true,
      filterable: true,
      editable: true,
      width: 150,
      render: (value) => value || '-',
      editRender: (value, item, onChange) => (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'lastName',
      label: 'Last Name',
      accessor: 'lastName',
      sortable: true,
      filterable: true,
      editable: true,
      width: 150,
      render: (value) => value || '-',
      editRender: (value, item, onChange) => (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'email',
      label: 'Email',
      accessor: 'email',
      sortable: true,
      filterable: true,
      editable: true,
      width: 200,
      render: (value) => (isDemo ? maskPII(value) : value || '-'),
      editRender: (value, item, onChange) => (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'phone',
      label: 'Phone',
      accessor: 'phone',
      editable: true,
      width: 150,
      render: (value) => (isDemo ? maskPII(value) : value || '-'),
      editRender: (value, item, onChange) => (
        <input
          type="tel"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'company',
      label: 'Company',
      accessor: (item) => item.company?.name,
      width: 200,
      render: (value, item) => item.company?.name || '-',
    },
    {
      id: 'updatedAt',
      label: 'Last Updated',
      accessor: 'updatedAt',
      sortable: true,
      width: 150,
      render: (value) => {
        if (!value) return '-'
        return new Date(value).toLocaleDateString()
      },
    },
  ]

  return columns
}

// Company columns configuration
export const useCompanyColumns = (isDemo: boolean = false) => {
  const columns: Column<any>[] = [
    {
      id: 'name',
      label: 'Company Name',
      accessor: 'name',
      sortable: true,
      filterable: true,
      editable: true,
      width: 200,
      render: (value) => value || '-',
      editRender: (value, item, onChange) => (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'website',
      label: 'Website',
      accessor: 'website',
      editable: true,
      width: 200,
      render: (value) =>
        value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        ) : (
          '-'
        ),
      editRender: (value, item, onChange) => (
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'domain',
      label: 'Domain',
      accessor: 'domain',
      editable: true,
      width: 150,
      render: (value) => value || '-',
      editRender: (value, item, onChange) => (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'contacts',
      label: 'Contacts',
      accessor: (item) => item._count?.contacts || 0,
      width: 100,
      render: (value) => `${value} contacts`,
    },
    {
      id: 'deals',
      label: 'Deals',
      accessor: (item) => item._count?.deals || 0,
      width: 100,
      render: (value) => `${value} deals`,
    },
    {
      id: 'updatedAt',
      label: 'Last Updated',
      accessor: 'updatedAt',
      sortable: true,
      width: 150,
      render: (value) => {
        if (!value) return '-'
        return new Date(value).toLocaleDateString()
      },
    },
  ]

  return columns
}
