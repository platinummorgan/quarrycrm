'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { Users, Building2, Target, Activity, Settings } from 'lucide-react'

const navigation = [
  { name: 'Contacts', href: '/app/contacts', icon: Users },
  { name: 'Companies', href: '/app/companies', icon: Building2 },
  { name: 'Leads', href: '/app/deals', icon: Target },
  { name: 'Activities', href: '/app/activities', icon: Activity },
  { name: 'Settings', href: '/app/settings', icon: Settings },
]

export default function AppNav() {
  const pathname = usePathname()

  return (
    <>
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Button
            key={item.name}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link href={item.href} className="flex items-center space-x-2">
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          </Button>
        )
      })}
    </>
  )
}
