export const metadata = {
  title: 'Offline - Quarry CRM',
  description: 'You are currently offline',
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>
        
        <h1 className="mb-4 text-3xl font-bold">You&apos;re Offline</h1>
        
        <p className="mb-8 text-lg text-muted-foreground">
          You&apos;re not connected to the internet. Some features may not be available,
          but you can still:
        </p>

        <div className="mb-8 space-y-3 text-left">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <h3 className="font-semibold">View Cached Leads & Jobs</h3>
              <p className="text-sm text-muted-foreground">
                Access recently viewed contacts and deals
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <h3 className="font-semibold">Add Notes & Follow-ups</h3>
              <p className="text-sm text-muted-foreground">
                Changes will sync when you&apos;re back online
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <h3 className="font-semibold">Update Lead Status</h3>
              <p className="text-sm text-muted-foreground">
                Mark leads as contacted, quoted, won, or lost
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border-2 border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
          <p>
            Your changes will be automatically synced when your connection is
            restored.
          </p>
        </div>
      </div>
    </div>
  )
}
