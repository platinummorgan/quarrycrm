'use client'

import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Loader2, Check, Zap, Users, Webhook, Key } from 'lucide-react'
import { toast } from 'sonner'

export function BillingSettings() {
  const { data: planUsage, isLoading } = trpc.settings.getPlanUsage.useQuery()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!planUsage) return null

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out Quarry CRM',
      current: planUsage.plan === 'FREE',
      features: [
        '100 contacts',
        '50 companies',
        '25 deals',
        '2 team members',
        '1 API key',
        '2 webhooks',
        '1 GB storage',
        '1,000 API calls/day',
      ],
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'For growing teams and businesses',
      current: planUsage.plan === 'PRO',
      popular: true,
      features: [
        '10,000 contacts',
        '5,000 companies',
        '1,000 deals',
        '10 team members',
        '5 API keys',
        '10 webhooks',
        '50 GB storage',
        '10,000 API calls/day',
      ],
    },
    {
      name: 'Team',
      price: '$99',
      period: 'per month',
      description: 'For larger teams with advanced needs',
      current: planUsage.plan === 'TEAM',
      features: [
        'Unlimited contacts',
        'Unlimited companies',
        'Unlimited deals',
        'Unlimited team members',
        '20 API keys',
        '50 webhooks',
        '500 GB storage',
        '100,000 API calls/day',
      ],
    },
  ]

  const usageItems = [
    {
      icon: Users,
      label: 'Contacts',
      used: planUsage.usage.contacts,
      limit: planUsage.limits.contacts,
    },
    {
      icon: Users,
      label: 'Companies',
      used: planUsage.usage.companies,
      limit: planUsage.limits.companies,
    },
    {
      icon: Zap,
      label: 'Deals',
      used: planUsage.usage.deals,
      limit: planUsage.limits.deals,
    },
    {
      icon: Users,
      label: 'Team Members',
      used: planUsage.usage.users,
      limit: planUsage.limits.users,
    },
    {
      icon: Key,
      label: 'API Keys',
      used: planUsage.usage.apiKeys,
      limit: planUsage.limits.apiKeys,
    },
    {
      icon: Webhook,
      label: 'Webhooks',
      used: planUsage.usage.webhooks,
      limit: planUsage.limits.webhooks,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Current Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan & Usage
          </CardTitle>
          <CardDescription>
            You're currently on the {planUsage.planName} plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usageItems.map((item) => {
              const percentage = getUsagePercentage(item.used, item.limit)
              const limitText = item.limit === -1 ? '∞' : item.limit.toLocaleString()

              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {item.used.toLocaleString()} / {limitText}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-2 ${getUsageColor(percentage)}`}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={
              plan.current
                ? 'border-primary shadow-lg'
                : plan.popular
                ? 'border-primary/50'
                : ''
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.current && (
                  <Badge>Current Plan</Badge>
                )}
                {plan.popular && !plan.current && (
                  <Badge variant="secondary">Popular</Badge>
                )}
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/{plan.period}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.current ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => toast.info('Payment integration coming soon!')}
                  >
                    {plan.name === 'Free' ? 'Downgrade' : 'Upgrade'} to {plan.name}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Billing Info */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>
            Payment processing and billing management coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p>
              We're currently working on integrating payment processing. For now, all workspaces
              start on the Free plan. Contact sales@quarry-crm.com to discuss enterprise plans.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
