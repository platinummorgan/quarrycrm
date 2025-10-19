import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X, Building2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface CompanySelectProps {
  value?: string
  onChange: (id?: string) => void
}

export function CompanySelect({ value, onChange }: CompanySelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const { data: companies = [] } = trpc.companies.search.useQuery(
    { q: query, limit: 10 },
    { enabled: isOpen || !!query }
  )

  const selectedCompany = companies.find((c) => c.id === value)

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        Company (optional)
      </Label>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              placeholder="Search companies..."
              value={selectedCompany ? selectedCompany.name : query}
              onChange={(e) => {
                setQuery(e.target.value)
                setIsOpen(true)
                if (
                  selectedCompany &&
                  e.target.value !== selectedCompany.name
                ) {
                  onChange(undefined)
                }
              }}
              onFocus={() => setIsOpen(true)}
              className="pr-8"
            />

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(undefined)
                  setQuery('')
                  setIsOpen(false)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <div className="max-h-48 overflow-auto">
            {companies.length > 0 ? (
              companies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className={`w-full px-3 py-2 text-left transition-colors hover:bg-muted ${
                    value === company.id ? 'bg-muted font-medium' : ''
                  }`}
                  onClick={() => {
                    onChange(company.id)
                    setQuery('')
                    setIsOpen(false)
                  }}
                >
                  {company.name}
                </button>
              ))
            ) : query ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No companies found
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Start typing to search companies
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
