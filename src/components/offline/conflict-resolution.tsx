'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { DataConflict } from '@/lib/offline-storage'

interface ConflictResolutionModalProps {
  conflict: DataConflict
  onResolve: (
    id: string,
    resolution: 'local' | 'remote' | 'merged',
    auditEntry?: any
  ) => void
  onClose: () => void
}

export function ConflictResolutionModal({
  conflict,
  onResolve,
  onClose,
}: ConflictResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<
    'local' | 'remote' | 'merged'
  >('local')

  const handleResolve = () => {
    onResolve(conflict.id, selectedResolution)
    onClose()
  }

  const renderFieldComparison = (
    field: string,
    localValue: any,
    remoteValue: any
  ) => {
    const isDifferent =
      JSON.stringify(localValue) !== JSON.stringify(remoteValue)

    return (
      <div
        key={field}
        className="grid grid-cols-3 gap-4 border-b border-gray-100 py-2 last:border-b-0"
      >
        <div className="text-sm font-medium">{field}</div>
        <div
          className={`rounded p-2 text-sm ${isDifferent ? 'bg-red-50 text-red-700' : 'bg-gray-50'}`}
        >
          {JSON.stringify(localValue)}
        </div>
        <div
          className={`rounded p-2 text-sm ${isDifferent ? 'bg-green-50 text-green-700' : 'bg-gray-50'}`}
        >
          {JSON.stringify(remoteValue)}
        </div>
      </div>
    )
  }

  const getEntityFields = (data: any) => {
    return Object.keys(data || {}).filter(
      (key) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt'
    )
  }

  const localFields = getEntityFields(conflict.localData)
  const remoteFields = getEntityFields(conflict.remoteData)
  const allFields = Array.from(new Set([...localFields, ...remoteFields]))

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Data Conflict Resolution</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conflict Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Entity:</span> {conflict.entity}
                </div>
                <div>
                  <span className="font-medium">Entity ID:</span>{' '}
                  {conflict.entityId}
                </div>
                <div>
                  <span className="font-medium">Local Timestamp:</span>{' '}
                  {new Date(conflict.localTimestamp).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Remote Timestamp:</span>{' '}
                  {new Date(conflict.remoteTimestamp).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare local changes with remote data. Fields with differences
                are highlighted.
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-3 gap-4 text-sm font-medium">
                <div>Field</div>
                <div className="flex items-center space-x-2">
                  <span>Local Data</span>
                  <Badge variant="outline" className="text-xs">
                    Your Changes
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span>Remote Data</span>
                  <Badge variant="outline" className="text-xs">
                    Server Data
                  </Badge>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border">
                {allFields.map((field) =>
                  renderFieldComparison(
                    field,
                    conflict.localData[field],
                    conflict.remoteData[field]
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resolution Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resolution Strategy</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose how to resolve this conflict. Last-write-wins policy will
                be applied.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="local"
                    name="resolution"
                    value="local"
                    checked={selectedResolution === 'local'}
                    onChange={(e) =>
                      setSelectedResolution(e.target.value as 'local')
                    }
                    className="h-4 w-4"
                  />
                  <label htmlFor="local" className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Keep Local Changes</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use your local data. Remote changes will be overwritten.
                    </p>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="remote"
                    name="resolution"
                    value="remote"
                    checked={selectedResolution === 'remote'}
                    onChange={(e) =>
                      setSelectedResolution(e.target.value as 'remote')
                    }
                    className="h-4 w-4"
                  />
                  <label htmlFor="remote" className="flex-1">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Use Remote Data</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Discard local changes and use the server data.
                    </p>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="merged"
                    name="resolution"
                    value="merged"
                    checked={selectedResolution === 'merged'}
                    onChange={(e) =>
                      setSelectedResolution(e.target.value as 'merged')
                    }
                    disabled={true} // Not implemented yet
                    className="h-4 w-4"
                  />
                  <label htmlFor="merged" className="flex-1 opacity-50">
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">
                        Merge Data (Coming Soon)
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Intelligently merge conflicting fields (not yet
                      available).
                    </p>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>Resolve Conflict</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Conflict badge component for displaying conflicts in lists
interface ConflictBadgeProps {
  conflict: DataConflict
  onClick: () => void
}

export function ConflictBadge({ conflict, onClick }: ConflictBadgeProps) {
  return (
    <Badge
      variant="destructive"
      className="cursor-pointer transition-colors hover:bg-red-600"
      onClick={onClick}
    >
      <AlertTriangle className="mr-1 h-3 w-3" />
      Conflict
    </Badge>
  )
}
