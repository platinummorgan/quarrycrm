'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { QuickAddLeadDialog } from '@/components/contacts/QuickAddLeadDialog'

export function QuickAddLeadFAB() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Only show on the contacts/leads page
  if (!pathname?.includes('/contacts')) {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg md:h-14 md:w-auto md:rounded-md md:px-6 z-50"
        aria-label="Add new lead"
      >
        <Plus className="h-6 w-6 md:mr-2" />
        <span className="hidden md:inline">New Lead</span>
      </Button>

      <QuickAddLeadDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
