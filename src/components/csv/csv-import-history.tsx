'use client'

import { useState, useEffect } from 'react'
import { EntityType } from '@/lib/csv-processor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  History,
  Undo2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

type ImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ROLLED_BACK'

type ImportHistory = {
  id: string
  entityType: EntityType
  status: ImportStatus
  totalRows: number
  processedRows: number
  skippedRows: number
  errorRows: number
  createdAt: string
  completedAt?: string
  rollbackAvailable: boolean
  rollbackData?: {
    affectedIds: string[]
    rollbackAction: 'DELETE' | 'UPDATE'
  }
  errors?: string[]
}

interface CsvImportHistoryProps {
  onRollback?: (importId: string) => void
}

export function CsvImportHistory({ onRollback }: CsvImportHistoryProps) {
  const [imports, setImports] = useState<ImportHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  // Load import history
  const loadHistory = async () => {
    try {
      // This would be a real API call to get import history
      // For now, we'll simulate with empty data
      setImports([])
    } catch (error) {
      console.error('Failed to load import history:', error)
      toast.error('Failed to load import history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // Handle rollback
  const handleRollback = async (importId: string) => {
    setRollingBack(importId)
    try {
      const response = await fetch(`/api/csv/import/${importId}/rollback`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Import rolled back successfully')
        onRollback?.(importId)
        loadHistory()
      } else {
        throw new Error('Failed to rollback import')
      }
    } catch (error) {
      console.error('Rollback error:', error)
      toast.error('Failed to rollback import')
    } finally {
      setRollingBack(null)
    }
  }

  // Get status icon and color
  const getStatusInfo = (status: ImportStatus) => {
    switch (status) {
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        }
      case 'FAILED':
        return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' }
      case 'ROLLED_BACK':
        return {
          icon: Undo2,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        }
      case 'PROCESSING':
        return { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50' }
      default:
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
        }
    }
  }

  // Format status for display
  const formatStatus = (status: ImportStatus) => {
    switch (status) {
      case 'ROLLED_BACK':
        return 'Rolled Back'
      case 'PENDING':
        return 'Pending'
      case 'PROCESSING':
        return 'Processing'
      case 'COMPLETED':
        return 'Completed'
      case 'FAILED':
        return 'Failed'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading import history...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <History className="h-5 w-5" />
          <span>Import History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {imports.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <History className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No imports yet</p>
            <p className="text-sm">
              Import history will appear here after your first CSV import
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {imports.map((importItem) => {
              const statusInfo = getStatusInfo(importItem.status)
              const StatusIcon = statusInfo.icon

              return (
                <div key={importItem.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`rounded-full p-2 ${statusInfo.bgColor}`}>
                        <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">
                            {importItem.entityType} Import
                          </h4>
                          <Badge variant="outline">
                            {formatStatus(importItem.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(importItem.createdAt).toLocaleString()}
                          {importItem.completedAt &&
                            importItem.completedAt !== importItem.createdAt && (
                              <>
                                {' '}
                                • Completed{' '}
                                {new Date(
                                  importItem.completedAt
                                ).toLocaleString()}
                              </>
                            )}
                        </p>
                      </div>
                    </div>

                    {importItem.rollbackAvailable &&
                      importItem.status === 'COMPLETED' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rollingBack === importItem.id}
                            >
                              {rollingBack === importItem.id ? (
                                <>
                                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                                  Rolling back...
                                </>
                              ) : (
                                <>
                                  <Undo2 className="mr-2 h-4 w-4" />
                                  Rollback
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Rollback Import
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to rollback this import?
                                This will{' '}
                                {importItem.rollbackData?.rollbackAction ===
                                'DELETE'
                                  ? 'delete'
                                  : 'restore'}{' '}
                                {importItem.rollbackData?.affectedIds.length ||
                                  0}{' '}
                                records. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRollback(importItem.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Rollback Import
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                  </div>

                  {/* Import Statistics */}
                  <div className="mb-3 grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {importItem.processedRows}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Processed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {importItem.totalRows}
                      </div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {importItem.skippedRows}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Skipped
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {importItem.errorRows}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Errors
                      </div>
                    </div>
                  </div>

                  {/* Errors */}
                  {importItem.errors && importItem.errors.length > 0 && (
                    <Alert className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="mb-1 font-medium">Import Errors:</div>
                        <ul className="space-y-1 text-sm">
                          {importItem.errors.slice(0, 3).map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                          {importItem.errors.length > 3 && (
                            <li className="text-muted-foreground">
                              • ...and {importItem.errors.length - 3} more
                              errors
                            </li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
