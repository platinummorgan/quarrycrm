'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { Users, Target, Activity, Settings, BarChart3 } from 'lucide-react'

const navigation = [
  { name: 'Leads', href: '/app/contacts', icon: Users },
  { name: 'Jobs', href: '/app/deals', icon: Target },
  { name: 'Follow-ups', href: '/app/activities', icon: Activity },
  { name: 'Reports', href: '/app/reports', icon: BarChart3 },
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
