'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Command, Search, Plus, Save, Keyboard } from 'lucide-react'

interface ShortcutGroup {
  title: string
  shortcuts: Array<{
    keys: string[]
    description: string
  }>
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open Spotlight Search' },
      { keys: ['Shift', '?'], description: 'Show Keyboard Shortcuts' },
      { keys: ['Esc'], description: 'Close Dialog / Clear Search' },
      { keys: ['/'], description: 'Focus Search Input' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['g', 'h'], description: 'Go to Home' },
      { keys: ['g', 'c'], description: 'Go to Contacts' },
      { keys: ['g', 'o'], description: 'Go to Companies' },
      { keys: ['g', 'd'], description: 'Go to Deals' },
      { keys: ['g', 'a'], description: 'Go to Activities' },
      { keys: ['g', 's'], description: 'Go to Settings' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['n'], description: 'New Item (context-dependent)' },
      { keys: ['e'], description: 'Edit Selected Item' },
      { keys: ['Ctrl', 'S'], description: 'Save Changes' },
      { keys: ['Ctrl', 'Enter'], description: 'Submit Form' },
    ],
  },
  {
    title: 'Spotlight Search',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Navigate Results' },
      { keys: ['Enter'], description: 'Open Selected Result' },
      { keys: ['→'], description: 'Show Quick Actions' },
      { keys: ['Tab'], description: 'Switch Between Groups' },
    ],
  },
  {
    title: 'Accessibility',
    shortcuts: [
      { keys: ['Tab'], description: 'Next Interactive Element' },
      { keys: ['Shift', 'Tab'], description: 'Previous Interactive Element' },
      { keys: ['Space'], description: 'Toggle Checkbox / Button' },
      { keys: ['Enter'], description: 'Activate Button / Link' },
    ],
  },
]

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + ?
      if (e.shiftKey && e.key === '?') {
        e.preventDefault()
        setIsOpen(true)
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and interact with the app more
            efficiently
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {shortcutGroups.map((group, groupIndex) => (
            <div key={group.title}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span
                          key={keyIndex}
                          className="flex items-center gap-1"
                        >
                          <kbd className="min-w-[2rem] rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-center text-xs font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">
                              +
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {groupIndex < shortcutGroups.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Tip:</span> Press{' '}
            <kbd className="rounded border bg-background px-1.5 py-0.5 text-xs font-semibold">
              Shift
            </kbd>{' '}
            +{' '}
            <kbd className="rounded border bg-background px-1.5 py-0.5 text-xs font-semibold">
              ?
            </kbd>{' '}
            anytime to view this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
