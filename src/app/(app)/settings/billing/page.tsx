'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Crown, Users, Zap } from 'lucide-react'
import { PLAN_LIMITS, PLAN_NAMES, PLAN_PRICES } from '@/lib/plans'
import { OrganizationPlan } from '@prisma/client'

interface Organization {
  id: string
  name: string
  plan: OrganizationPlan
}

interface UsageStats {
  contacts: number
  pipelines: number
  companies: number
  deals: number
  users: number
}

export default function BillingPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrganization()
    fetchUsage()
  }, [])

  const fetchOrganization = async () => {
    try {
      const response = await fetch('/api/organizations/current')
      const data = await response.json()
      setOrganization(data)
    } catch (error) {
      console.error('Failed to fetch organization:', error)
    }
  }

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/organizations/usage')
      const data = await response.json()
      setUsage(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch usage:', error)
      setLoading(false)
    }
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!organization || !usage) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load billing information.</p>
        </div>
      </div>
    )
  }

  const currentPlan = organization.plan
  const limits = PLAN_LIMITS[currentPlan]

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-muted-foreground">
          Manage your plan and monitor usage
        </p>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {currentPlan === 'FREE' && <Zap className="h-5 w-5 text-yellow-500" />}
                {currentPlan === 'PRO' && <Crown className="h-5 w-5 text-purple-500" />}
                {currentPlan === 'TEAM' && <Users className="h-5 w-5 text-blue-500" />}
                Current Plan: {PLAN_NAMES[currentPlan]}
              </CardTitle>
              <CardDescription>
                {PLAN_PRICES[currentPlan].monthly === 0
                  ? 'Free forever'
                  : `$${PLAN_PRICES[currentPlan].monthly}/month`}
              </CardDescription>
            </div>
            <Badge variant={currentPlan === 'FREE' ? 'secondary' : 'default'}>
              {PLAN_NAMES[currentPlan]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{usage.contacts.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">
                {limits.contacts === -1 ? 'unlimited' : `of ${limits.contacts.toLocaleString()}`}
              </span>
            </div>
            {limits.contacts !== -1 && (
              <Progress
                value={getUsagePercentage(usage.contacts, limits.contacts)}
                className="h-2"
              />
            )}
            {limits.contacts !== -1 && getUsagePercentage(usage.contacts, limits.contacts) >= 90 && (
              <p className="text-sm text-red-600 mt-2">
                You're approaching your contact limit
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{usage.pipelines}</span>
              <span className="text-sm text-muted-foreground">
                {limits.pipelines === -1 ? 'unlimited' : `of ${limits.pipelines}`}
              </span>
            </div>
            {limits.pipelines !== -1 && (
              <Progress
                value={getUsagePercentage(usage.pipelines, limits.pipelines)}
                className="h-2"
              />
            )}
            {limits.pipelines !== -1 && getUsagePercentage(usage.pipelines, limits.pipelines) >= 90 && (
              <p className="text-sm text-red-600 mt-2">
                You're approaching your pipeline limit
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{usage.companies.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">
                {limits.companies === -1 ? 'unlimited' : `of ${limits.companies.toLocaleString()}`}
              </span>
            </div>
            {limits.companies !== -1 && (
              <Progress
                value={getUsagePercentage(usage.companies, limits.companies)}
                className="h-2"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{usage.deals.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">
                {limits.deals === -1 ? 'unlimited' : `of ${limits.deals.toLocaleString()}`}
              </span>
            </div>
            {limits.deals !== -1 && (
              <Progress
                value={getUsagePercentage(usage.deals, limits.deals)}
                className="h-2"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Upgrade your plan to unlock more features and higher limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free Plan */}
            <div className={`border rounded-lg p-4 ${currentPlan === 'FREE' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Free</h3>
                {currentPlan === 'FREE' && <Badge variant="secondary">Current</Badge>}
              </div>
              <p className="text-2xl font-bold mb-4">$0<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  2,000 contacts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  2 pipelines
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  500 companies
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  100 deals
                </li>
              </ul>
              {currentPlan === 'FREE' && (
                <Button disabled className="w-full">
                  Current Plan
                </Button>
              )}
            </div>

            {/* Pro Plan */}
            <div className={`border rounded-lg p-4 ${currentPlan === 'PRO' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Pro</h3>
                {currentPlan === 'PRO' && <Badge variant="secondary">Current</Badge>}
              </div>
              <p className="text-2xl font-bold mb-4">$29<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  10,000 contacts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  10 pipelines
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  5,000 companies
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  1,000 deals
                </li>
              </ul>
              {currentPlan !== 'PRO' && (
                <Button className="w-full">
                  Upgrade to Pro
                </Button>
              )}
              {currentPlan === 'PRO' && (
                <Button disabled className="w-full">
                  Current Plan
                </Button>
              )}
            </div>

            {/* Team Plan */}
            <div className={`border rounded-lg p-4 ${currentPlan === 'TEAM' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Team</h3>
                {currentPlan === 'TEAM' && <Badge variant="secondary">Current</Badge>}
              </div>
              <p className="text-2xl font-bold mb-4">$99<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Unlimited contacts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Unlimited pipelines
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Unlimited companies
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Unlimited deals
                </li>
              </ul>
              {currentPlan !== 'TEAM' && (
                <Button className="w-full">
                  Upgrade to Team
                </Button>
              )}
              {currentPlan === 'TEAM' && (
                <Button disabled className="w-full">
                  Current Plan
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}