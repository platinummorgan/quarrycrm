'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  ChevronDownIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'

export default function OrgSwitcher() {
  const { data: session, update } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (!session?.user?.organizations || session.user.organizations.length <= 1) {
    return null
  }

  const currentOrg = session.user.currentOrg
  const organizations = session.user.organizations

  const switchOrg = async (orgId: string) => {
    // Update session with new current org
    const newCurrentOrg = organizations.find((org) => org.id === orgId)
    if (newCurrentOrg) {
      await update({
        currentOrg: newCurrentOrg,
      })
    }
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <BuildingOfficeIcon className="h-4 w-4" />
        <span>{currentOrg?.name}</span>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-3">
            <p className="text-sm text-gray-500">Switch organization</p>
          </div>
          <div className="py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => switchOrg(org.id)}
                className={`flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900 ${
                  org.id === currentOrg?.id
                    ? 'bg-gray-50 text-gray-900'
                    : 'text-gray-700'
                }`}
              >
                <BuildingOfficeIcon className="mr-2 h-4 w-4" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{org.name}</div>
                  <div className="text-xs capitalize text-gray-500">
                    {org.role.toLowerCase()}
                  </div>
                </div>
                {org.id === currentOrg?.id && (
                  <div className="ml-2 h-2 w-2 rounded-full bg-indigo-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
