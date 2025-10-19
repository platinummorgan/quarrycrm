'use client'

import { useState } from 'react'
import { useOutbox, useNetworkState } from '@/hooks/use-offline'
import { outboxManager } from '@/lib/outbox-manager'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  RefreshCw,
  Trash2,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { OfflineStorage } from '@/lib/offline-storage'

interface OutboxBannerProps {
  className?: string
}

export function OutboxBanner({ className }: OutboxBannerProps) {
  const { stats } = useOutbox()
  const { isOnline } = useNetworkState()
  const [isExpanded, setIsExpanded] = useState(false)
  const [outboxItems, setOutboxItems] = useState<any[]>([])

  const hasPendingWork = stats.total > 0

  if (!hasPendingWork) {
    return null
  }

  const loadOutboxItems = async () => {
    const items = await OfflineStorage.getOutbox()
    setOutboxItems(items)
  }

  const handleRetryAll = async () => {
    await outboxManager.retryFailedMutations()
    await loadOutboxItems()
  }

  const handleClearAll = async () => {
    await OfflineStorage.clearOutbox()
    setOutboxItems([])
  }

  const getStatusIcon = (item: any) => {
    if (item.error) {
      return item.retryCount >= 3 ? (
        <XCircle className="h-4 w-4 text-red-500" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
      )
    }
    return <Clock className="h-4 w-4 text-blue-500" />
  }

  const getStatusText = (item: any) => {
    if (item.error) {
      return item.retryCount >= 3 ? 'Failed' : `Retry ${item.retryCount}/3`
    }
    return 'Pending'
  }

  return (
    <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {!isOnline ? (
            <WifiOff className="h-5 w-5 text-orange-600" />
          ) : (
            <RefreshCw className="h-5 w-5 animate-spin text-orange-600" />
          )}

          <AlertDescription className="flex items-center space-x-2">
            <span>
              {stats.total} pending change{stats.total > 1 ? 's' : ''} in outbox
              {!isOnline && ' (will sync when online)'}
            </span>

            <div className="flex space-x-1">
              {stats.pending > 0 && (
                <Badge variant="outline" className="text-xs">
                  {stats.pending} pending
                </Badge>
              )}
              {stats.failed > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.failed} failed
                </Badge>
              )}
              {stats.retrying > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.retrying} retrying
                </Badge>
              )}
            </div>
          </AlertDescription>
        </div>

        <div className="flex items-center space-x-2">
          {stats.failed > 0 && isOnline && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryAll}
              className="h-8"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry Failed
            </Button>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={loadOutboxItems}
                className="h-8"
              >
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5" />
                  <span>Outbox Details</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {stats.total} item{stats.total > 1 ? 's' : ''} in outbox
                  </div>
                  <div className="flex space-x-2">
                    {stats.failed > 0 && isOnline && (
                      <Button size="sm" onClick={handleRetryAll}>
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Retry All Failed
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleClearAll}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {outboxItems.map((item, index) => (
                      <div key={item.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            {getStatusIcon(item)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">
                                  {item.type.toUpperCase()} {item.entity}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {getStatusText(item)}
                                </Badge>
                              </div>

                              <div className="mt-1 text-xs text-muted-foreground">
                                {new Date(item.timestamp).toLocaleString()}
                                {item.lastAttempt && (
                                  <>
                                    {' '}
                                    • Last attempt:{' '}
                                    {new Date(
                                      item.lastAttempt
                                    ).toLocaleString()}
                                  </>
                                )}
                              </div>

                              {item.error && (
                                <div className="mt-1 text-xs text-red-600">
                                  Error: {item.error}
                                </div>
                              )}

                              <div className="mt-2 text-xs text-muted-foreground">
                                Procedure: {item.procedure}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  )
}
