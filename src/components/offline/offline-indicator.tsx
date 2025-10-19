'use client'

import { useOffline } from '@/hooks/use-offline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'

interface OfflineIndicatorProps {
  className?: string
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { networkState, isOnline, hasPendingWork, unresolvedConflicts } =
    useOffline()

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        label: 'Offline',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        description: 'You are currently offline. Changes will be queued.',
      }
    }

    switch (networkState) {
      case 'syncing':
        return {
          icon: RefreshCw,
          label: 'Syncing',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          description: 'Synchronizing data with server...',
        }
      case 'online':
        return {
          icon: Wifi,
          label: 'Online',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'Connected and synchronized.',
        }
      default:
        return {
          icon: AlertTriangle,
          label: 'Unknown',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          description: 'Connection status unknown.',
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center space-x-2 ${className}`}
            data-tour="offline-indicator"
          >
            <Badge
              variant="outline"
              className={`flex items-center space-x-1 px-2 py-1 ${statusInfo.bgColor} ${statusInfo.color} border-current`}
            >
              <StatusIcon
                className={`h-3 w-3 ${networkState === 'syncing' ? 'animate-spin' : ''}`}
              />
              <span className="text-xs font-medium">{statusInfo.label}</span>
              {hasPendingWork && (
                <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
              )}
              {unresolvedConflicts > 0 && (
                <Badge variant="destructive" className="px-1 py-0 text-xs">
                  {unresolvedConflicts}
                </Badge>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{statusInfo.description}</p>
            {hasPendingWork && (
              <p className="text-sm text-orange-600">
                • Pending changes will sync when online
              </p>
            )}
            {unresolvedConflicts > 0 && (
              <p className="text-sm text-red-600">
                • {unresolvedConflicts} data conflict
                {unresolvedConflicts > 1 ? 's' : ''} need resolution
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Network status hook for more detailed status
export function useNetworkStatus() {
  const { networkState, isOnline, offlineState } = useOffline()

  return {
    isOnline,
    networkState,
    lastOnline: offlineState?.lastOnline,
    connectionQuality: isOnline ? 'good' : 'offline',
    timeSinceLastSync: offlineState?.lastOnline
      ? Date.now() - offlineState.lastOnline
      : null,
  }
}
