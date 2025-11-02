'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Camera,
  Upload,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

const PHOTO_LABELS = [
  'Before',
  'After',
  'Damage',
  'Progress',
  'Completed Work',
  'Measurements',
  'Materials',
  'Other',
]

interface Photo {
  id: string
  url: string
  thumbnailUrl: string | null
  label: string | null
  createdAt: Date
  uploadedBy: {
    user: {
      name: string | null
    } | null
  }
}

interface PhotoGalleryProps {
  dealId: string
  photos: Photo[]
}

// Compress image to max 2000px width
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Calculate dimensions
        let width = img.width
        let height = img.height
        const maxWidth = 2000

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          'image/jpeg',
          0.85
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

export function PhotoGallery({ dealId, photos }: PhotoGalleryProps) {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)
  const [photoLabel, setPhotoLabel] = useState<string>('Other')

  const utils = trpc.useUtils()

  const uploadPhoto = trpc.photos.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Photo uploaded' })
      utils.photos.invalidate()
      router.refresh()
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deletePhoto = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Photo deleted' })
      utils.photos.invalidate()
      router.refresh()
      setSelectedPhoto(null)
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setUploading(true)

      try {
        // Process each file
        for (let i = 0; i < files.length; i++) {
          const file = files[i]

          // Check if it's an image
          if (!file.type.startsWith('image/')) {
            toast({
              title: 'Invalid file',
              description: `${file.name} is not an image`,
              variant: 'destructive',
            })
            continue
          }

          // Compress image
          const compressedBlob = await compressImage(file)

          // Convert to base64 for upload
          const reader = new FileReader()
          reader.readAsDataURL(compressedBlob)
          await new Promise<void>((resolve) => {
            reader.onload = async () => {
              const base64 = reader.result as string

              // Upload to server
              await uploadPhoto.mutateAsync({
                dealId,
                imageData: base64,
                label: photoLabel,
              })

              resolve()
            }
          })
        }
      } catch (error: any) {
        toast({
          title: 'Upload error',
          description: error.message,
          variant: 'destructive',
        })
      } finally {
        setUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [dealId, photoLabel, uploadPhoto, toast]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(file)
            handleFiles(dataTransfer.files)
          }
        }
      }
    },
    [handleFiles]
  )

  // Setup paste listener
  useState(() => {
    document.addEventListener('paste', handlePaste as any)
    return () => {
      document.removeEventListener('paste', handlePaste as any)
    }
  })

  const handleDownload = (photo: Photo) => {
    const link = document.createElement('a')
    link.href = photo.url
    link.download = `photo-${format(new Date(photo.createdAt), 'yyyy-MM-dd-HHmmss')}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const currentPhoto = selectedPhoto !== null ? photos[selectedPhoto] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
        <CardDescription>
          Job documentation with before, after, and progress photos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`relative rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              <Camera className="h-8 w-8 text-muted-foreground" />
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>

            <div className="text-center">
              <p className="text-sm font-medium">
                Drop photos here or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports drag & drop, paste from clipboard, or mobile camera
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-48">
                <Label htmlFor="photo-label" className="text-xs">
                  Label
                </Label>
                <Select value={photoLabel} onValueChange={setPhotoLabel}>
                  <SelectTrigger id="photo-label" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHOTO_LABELS.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="lg"
                className="w-full sm:w-auto mt-6"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Select Photos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Photo Grid */}
        {photos.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed">
            <div className="text-center">
              <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No photos yet. Upload your first photo above.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted transition-all hover:ring-2 hover:ring-primary"
                onClick={() => setSelectedPhoto(index)}
              >
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.label || 'Photo'}
                  className="h-full w-full object-cover"
                />
                {photo.label && (
                  <Badge className="absolute top-2 left-2 text-xs">
                    {photo.label}
                  </Badge>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="text-xs text-white">
                    {format(new Date(photo.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full Size Photo Dialog */}
        <Dialog
          open={selectedPhoto !== null}
          onOpenChange={(open) => !open && setSelectedPhoto(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>
                  {currentPhoto?.label || 'Photo'} -{' '}
                  {currentPhoto &&
                    format(new Date(currentPhoto.createdAt), 'MMM d, yyyy')}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => currentPhoto && handleDownload(currentPhoto)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (currentPhoto && confirm('Delete this photo?')) {
                        deletePhoto.mutate({ id: currentPhoto.id })
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            {currentPhoto && (
              <div className="space-y-4">
                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedPhoto === 0}
                    onClick={() =>
                      setSelectedPhoto((prev) => (prev! > 0 ? prev! - 1 : 0))
                    }
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedPhoto! + 1} of {photos.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedPhoto === photos.length - 1}
                    onClick={() =>
                      setSelectedPhoto((prev) =>
                        prev! < photos.length - 1 ? prev! + 1 : prev!
                      )
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {/* Full Size Image */}
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    src={currentPhoto.url}
                    alt={currentPhoto.label || 'Photo'}
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Photo Info */}
                <div className="text-sm">
                  <p>
                    <span className="font-medium">Uploaded by:</span>{' '}
                    {currentPhoto.uploadedBy?.user?.name || 'Unknown'}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {format(
                      new Date(currentPhoto.createdAt),
                      'MMMM d, yyyy h:mm a'
                    )}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
