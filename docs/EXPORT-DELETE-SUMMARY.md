# Workspace Export & Delete Implementation

## Overview

Implemented async workspace data export to S3/R2 with signed URLs, and comprehensive workspace deletion with soft-delete and recovery period.

## What Was Implemented

### 1. Workspace Export to S3/R2

**Features:**

- ✅ Async job processing for large exports
- ✅ Upload to S3 or Cloudflare R2
- ✅ Signed URLs with 24-hour expiry
- ✅ JSON and CSV format support
- ✅ Selective data export (contacts, companies, deals, activities, pipelines)
- ✅ Real-time job status polling
- ✅ File size and record count tracking

**API Endpoints:**

```
POST /api/export - Start export job
GET /api/export?jobId=<id> - Check export status
```

### 2. Workspace Deletion

**Features:**

- ✅ Soft delete with 30-day recovery period
- ✅ Immediate permanent delete with confirmation phrase
- ✅ Recovery/restore during grace period
- ✅ Automatic purge scheduling
- ✅ Record count reporting
- ✅ Owner-only access control

**API Endpoints:**

```
DELETE /api/workspace/delete - Soft delete or permanent delete
POST /api/workspace/delete - Restore workspace
```

## Files Created/Modified

### Backend

1. **Storage Library** (`src/lib/storage.ts` - 155 lines)
   - S3/R2 client configuration
   - File upload with metadata
   - Signed URL generation (24h expiry)
   - Support for both AWS S3 and Cloudflare R2

2. **Export Job Processor** (`src/lib/jobs/export.ts` - 256 lines)
   - Async job processing
   - Database queries for export data
   - JSON and CSV formatting
   - Error handling and status updates

3. **Export API** (`src/app/api/export/route.ts` - 128 lines)
   - POST: Create export job
   - GET: Check job status
   - Authorization (owner/admin only)
   - Job result delivery

4. **Workspace Delete API** (`src/app/api/workspace/delete/route.ts` - 197 lines)
   - DELETE: Soft delete or permanent delete
   - POST: Restore workspace
   - Confirmation phrase validation
   - Purge scheduling (30 days)

5. **Migration SQL** (`prisma/migrations/add_export_and_purge_fields.sql`)
   - Added Organization.deletedAt
   - Added Organization.scheduledPurgeAt
   - Added Organization.deletedBy
   - Created purge index

### Frontend

6. **Export UI** (`src/components/settings/WorkspaceExport.tsx` - 185 lines)
   - Format selector (JSON/CSV)
   - Export button with loading state
   - Real-time job status polling
   - Download link with expiry timer
   - Record count display
   - File size formatting

7. **Delete UI** (`src/components/settings/WorkspaceDelete.tsx` - 280 lines)
   - Soft delete with confirmation
   - Restore functionality
   - Permanent delete with typed confirmation phrase
   - Record count warnings
   - Clear danger zone styling
   - Recovery period countdown

## Environment Variables Required

### For S3/R2 Storage

```bash
# Storage Provider ('r2' or 's3')
STORAGE_PROVIDER=r2

# Cloudflare R2 (recommended)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
EXPORT_BUCKET_NAME=crm-exports

# OR AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
EXPORT_BUCKET_NAME=crm-exports
```

### Required Packages

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## API Reference

### Export API

#### Start Export

```http
POST /api/export
Content-Type: application/json

{
  "organizationId": "org-123",
  "format": "json",
  "includeContacts": true,
  "includeCompanies": true,
  "includeDeals": true,
  "includeActivities": true,
  "includePipelines": true
}
```

**Response:**

```json
{
  "jobId": "job-abc123",
  "status": "PENDING",
  "message": "Export job started. Check status using GET /api/export/:jobId"
}
```

#### Check Export Status

```http
GET /api/export?jobId=job-abc123
```

**Response (Completed):**

```json
{
  "jobId": "job-abc123",
  "status": "COMPLETED",
  "type": "EXPORT",
  "createdAt": "2025-01-16T12:00:00Z",
  "completedAt": "2025-01-16T12:02:30Z",
  "result": {
    "downloadUrl": "https://bucket.r2.dev/exports/org-123/export-2025-01-16.json?X-Amz-...",
    "expiresAt": "2025-01-17T12:02:30Z",
    "fileSize": 1048576,
    "recordCounts": {
      "contacts": 1500,
      "companies": 300,
      "deals": 450,
      "activities": 2000,
      "pipelines": 5
    }
  }
}
```

### Workspace Delete API

#### Soft Delete (30-day recovery)

```http
DELETE /api/workspace/delete
Content-Type: application/json

{
  "organizationId": "org-123",
  "immediate": false
}
```

**Response:**

```json
{
  "success": true,
  "action": "soft_delete",
  "message": "Workspace scheduled for deletion. Data will be permanently removed on 2025-02-15.",
  "deletedAt": "2025-01-16T12:00:00Z",
  "scheduledPurgeAt": "2025-02-15T12:00:00Z",
  "recoveryPeriod": "30 days",
  "recordCounts": {
    "contacts": 1500,
    "companies": 300,
    "deals": 450,
    "members": 5
  }
}
```

#### Permanent Delete (immediate)

```http
DELETE /api/workspace/delete
Content-Type: application/json

{
  "organizationId": "org-123",
  "immediate": true,
  "confirmationPhrase": "delete my workspace"
}
```

**Response:**

```json
{
  "success": true,
  "action": "permanent_delete",
  "message": "Workspace permanently deleted",
  "deletedCounts": {
    "contacts": 1500,
    "companies": 300,
    "deals": 450,
    "members": 5
  }
}
```

#### Restore Workspace

```http
POST /api/workspace/delete
Content-Type: application/json

{
  "organizationId": "org-123"
}
```

**Response:**

```json
{
  "success": true,
  "action": "restore",
  "message": "Workspace deletion cancelled. Data has been restored.",
  "restoredAt": "2025-01-16T12:00:00Z"
}
```

## Export Formats

### JSON Format

Structured data with full relationships:

```json
{
  "exportedAt": "2025-01-16T12:00:00.000Z",
  "organizationId": "org-123",
  "organization": {
    "id": "org-123",
    "name": "Acme Corp",
    "domain": "acme.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "contacts": [
    {
      "id": "contact-1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "company": {
        "id": "company-1",
        "name": "Example Inc"
      },
      "owner": {
        "id": "user-1",
        "name": "Admin User",
        "email": "admin@acme.com"
      },
      "createdAt": "2024-06-01T00:00:00.000Z"
    }
  ],
  "companies": [...],
  "deals": [...],
  "activities": [...],
  "pipelines": [...]
}
```

### CSV Format

Separate sections for each entity type with headers:

```csv
Organization: Acme Corp
Exported: 2025-01-16T12:00:00.000Z

### Contacts ###
"id","firstName","lastName","email","company","owner","createdAt"
"contact-1","John","Doe","john@example.com","{""id"":""company-1""}","{""id"":""user-1""}","2024-06-01T00:00:00.000Z"

### Companies ###
"id","name","domain","owner","createdAt"
...
```

## Security

### Export Access Control

- Only OWNER and ADMIN roles can export
- User must be active member of organization
- Exports are scoped to single organization

### Delete Access Control

- Only OWNER role can delete workspace
- Only OWNER role can restore workspace
- Permanent delete requires exact confirmation phrase: `"delete my workspace"`

### Data Security

- Signed URLs expire after 24 hours
- Files auto-delete from storage after 30 days
- No public access to exported files
- All API endpoints require authentication

## User Experience

### Export Flow

1. User clicks "Start Export" button
2. Selects format (JSON or CSV)
3. Export job starts (status: PENDING)
4. UI polls every 2 seconds for status
5. Progress indicator shows during PROCESSING
6. Download button appears when COMPLETED
7. Shows record counts and file size
8. Displays expiry countdown (24 hours)

### Delete Flow (Soft Delete)

1. User clicks "Delete Workspace"
2. Dialog shows:
   - Record counts (contacts, companies, deals, members)
   - What happens during soft delete
   - 30-day recovery period
3. User confirms deletion
4. Workspace hidden from account
5. Toast shows deletion date
6. Banner appears with "Restore" button
7. Shows days until permanent deletion

### Delete Flow (Permanent)

1. User clicks "Permanently Delete Now" (only if soft-deleted)
2. Dialog shows severe warnings:
   - IRREVERSIBLE action
   - List of all data to be deleted
   - No recovery period
3. User must type exact phrase: `"delete my workspace"`
4. Button disabled until phrase matches
5. Confirmation triggers immediate deletion
6. Redirects to home page

## UI/UX Improvements

### Export Component

- ✅ Clear format selection with icons
- ✅ Format descriptions (JSON vs CSV)
- ✅ Real-time status updates
- ✅ Progress indicator during processing
- ✅ Detailed record counts
- ✅ Human-readable file sizes
- ✅ Expiry countdown timer
- ✅ Error handling with user-friendly messages

### Delete Component

- ✅ Clear "Danger Zone" section
- ✅ Prominent warning icons
- ✅ Record count display before deletion
- ✅ Differentiated soft/permanent actions
- ✅ Clear recovery period messaging
- ✅ Restoration banner when soft-deleted
- ✅ Countdown to permanent deletion
- ✅ Typed confirmation for permanent delete
- ✅ Descriptive error messages

## Error Handling

### Export Errors

- Storage not configured
- Insufficient permissions
- Organization not found
- Export job failures
- Network errors during polling

### Delete Errors

- Insufficient permissions (not owner)
- Workspace not found
- Already deleted
- Invalid confirmation phrase
- Database errors

All errors return user-friendly messages with actionable guidance.

## Performance Considerations

### Export

- Async job processing prevents timeout
- Large datasets handled in single query per entity
- Streaming JSON/CSV generation for memory efficiency
- S3/R2 for scalable storage

### Delete

- Soft delete is instant (single UPDATE)
- Permanent delete cascades via database constraints
- Scheduled purge runs as background job (not implemented in this PR)

## Future Enhancements

### Export

- [ ] Email notification when export completes
- [ ] Queue system (BullMQ, Inngest) for production
- [ ] Incremental exports (last 30 days, etc.)
- [ ] Custom field selection
- [ ] Scheduled automatic backups
- [ ] Export encryption at rest

### Delete

- [ ] Background job for automatic purges
- [ ] Email notifications before purge
- [ ] Audit trail of deletions
- [ ] Bulk workspace deletion (multi-tenant admin)
- [ ] Selective data deletion (e.g., delete contacts only)

## Testing Checklist

### Export

- [ ] Start export with JSON format
- [ ] Start export with CSV format
- [ ] Check job status polling
- [ ] Download exported file
- [ ] Verify file contents
- [ ] Test access control (non-owner)
- [ ] Test with empty workspace
- [ ] Test with large workspace (10k+ records)
- [ ] Test signed URL expiry
- [ ] Test concurrent exports

### Delete

- [ ] Soft delete workspace
- [ ] Restore soft-deleted workspace
- [ ] Verify 30-day purge date
- [ ] Permanent delete with wrong phrase
- [ ] Permanent delete with correct phrase
- [ ] Test access control (non-owner, admin)
- [ ] Verify cascade deletion of related data
- [ ] Test delete of active workspace
- [ ] Test delete of already-deleted workspace

## Deployment Notes

### 1. Install Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Set Environment Variables

See "Environment Variables Required" section above.

### 3. Apply Database Migration

```bash
# NOT recommended yet - will modify production DB
npx prisma migrate deploy
npx prisma generate
```

### 4. Configure S3/R2 Bucket

**Cloudflare R2:**

1. Create bucket named `crm-exports`
2. Create API token with read/write permissions
3. Set bucket lifecycle rule: delete after 30 days

**AWS S3:**

1. Create bucket named `crm-exports`
2. Create IAM user with S3 permissions
3. Add bucket policy for private access
4. Configure lifecycle rule: delete after 30 days

### 5. Test in Staging

- Export small workspace
- Verify download link works
- Test soft delete and restore
- Test permanent delete (with test data only!)

## Summary

**Total Implementation:**

- 7 files created/modified
- ~1,200 lines of production code
- 2 API routes with 4 endpoints
- 2 major UI components
- S3/R2 integration
- Comprehensive error handling
- Full UX with confirmations

**Status**: ✅ Complete but not deployed (awaiting environment setup and testing)

**Next Steps:**

1. Install AWS SDK packages
2. Configure R2/S3 credentials
3. Apply database migration
4. Test exports in development
5. Test deletion flows
6. Deploy to staging
