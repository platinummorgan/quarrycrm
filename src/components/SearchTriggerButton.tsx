"use client"

import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import React from 'react'

export default function SearchTriggerButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-muted-foreground"
      onClick={() => {
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          bubbles: true,
        })
        document.dispatchEvent(event)
      }}
    >
      <Search className="h-4 w-4" />
      <span className="hidden md:inline">Command...</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium md:inline-flex">
        ⌘K
      </kbd>
    </Button>
  )
}
