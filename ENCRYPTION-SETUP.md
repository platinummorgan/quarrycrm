# Encryption Setup Steps

## Current Status

✅ **Implementation Complete**
- All 41 tests passing
- AES-256-GCM encryption working
- Prisma middleware ready
- Documentation complete

⚠️ **Pending Setup**
- Database migration not applied (to avoid resetting your DB)
- Prisma client not regenerated (file lock issue)

## How to Complete Setup

### Step 1: Stop All Running Processes

**Close these if running:**
1. Next.js dev server (`npm run dev`)
2. Any Prisma Studio instances
3. Any running test watchers
4. Any other processes using the database

### Step 2: Regenerate Prisma Client

Once all processes are stopped:

```powershell
npx prisma generate
```

This will update TypeScript types to include the new fields:
- `Contact.notes` (TEXT)
- `Contact.email_hash` (TEXT)
- `Contact.phone_hash` (TEXT)

### Step 3: Apply Migration (When Ready)

⚠️ **WARNING**: This will modify your production database schema.

**Only run this when you're ready to apply the schema changes:**

```powershell
# For production/deployed database
npx prisma migrate deploy

# OR for development with migration creation
npx prisma migrate dev --name add_contact_encryption
```

**What the migration does:**
- Adds `notes` column (nullable TEXT)
- Adds `email_hash` column (nullable TEXT)
- Adds `phone_hash` column (nullable TEXT)
- Creates indexes on the hash columns
- Does NOT modify existing data

### Step 4: Generate Encryption Keys

```powershell
# Generate keys using Node.js
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SEARCH_SALT=' + require('crypto').randomBytes(32).toString('hex'))"
```

Add these to your `.env.local`:

```bash
ENCRYPTION_KEY=<generated-key>
SEARCH_SALT=<generated-salt>
```

### Step 5: Enable Encryption Middleware

In your `prisma/client.ts` or main app entry point:

```typescript
import { applyEncryptionMiddleware } from '@/lib/crypto/middleware'

// After creating your Prisma client
applyEncryptionMiddleware(prisma)
```

### Step 6: Encrypt Existing Data (Optional)

If you have existing contacts with plaintext email/phone:

```powershell
# Dry run first to see what would change
tsx scripts/encrypt-existing-contacts.ts --dry-run

# Then encrypt for real
tsx scripts/encrypt-existing-contacts.ts
```

## File Lock Troubleshooting

If you get `EPERM: operation not permitted` errors:

### Option 1: Close Running Processes (Recommended)
1. Stop dev server (Ctrl+C in terminal)
2. Close VS Code terminal tabs using Prisma
3. Close Prisma Studio if open
4. Try `npx prisma generate` again

### Option 2: Force Kill Node Processes
```powershell
# Find processes using port 3000 (or your dev server port)
netstat -ano | findstr :3000

# Kill the process (replace PID with the number from above)
taskkill /F /PID <PID>

# Or kill all node processes (WARNING: stops ALL Node.js processes)
taskkill /F /IM node.exe
```

### Option 3: Restart VS Code
Sometimes VS Code's TypeScript server holds file locks. Fully restart VS Code.

### Option 4: Restart Your Computer
Nuclear option if nothing else works.

## Testing Without Database Changes

You can test the encryption system without applying migrations:

```powershell
# Run the test suite
npx vitest run __tests__/field-encryption.test.ts
```

All 41 tests should pass, proving the encryption works correctly.

## What's Been Built

### Core Files Created
1. **src/lib/crypto/fields.ts** - Encryption library (311 lines)
   - `encryptField()` / `decryptField()`
   - `makeSearchToken()` for searchable hashing
   - Key rotation support
   - AES-256-GCM AEAD

2. **src/lib/crypto/middleware.ts** - Prisma middleware (165 lines)
   - Auto-encrypt on write
   - Auto-decrypt on read
   - Hash generation for searchable fields

3. **prisma/schema.prisma** - Updated Contact model
   - Added encrypted field columns
   - Added hash columns for search

4. **Migration SQL** - Database schema changes
   - `prisma/migrations/20251016115136_add_contact_encryption/`

5. **scripts/encrypt-existing-contacts.ts** - Data migration (220 lines)
   - Batch encrypt existing records
   - Dry-run support

6. **__tests__/field-encryption.test.ts** - Test suite (339 lines)
   - 41 comprehensive tests
   - All passing ✅

7. **docs/FIELD-ENCRYPTION.md** - Complete documentation (800+ lines)
8. **docs/FIELD-ENCRYPTION-SUMMARY.md** - Quick reference

## Security Notes

🔐 **Never commit encryption keys to git**
- Use environment variables only
- Add to `.gitignore`: `.env.local`, `.env.production.local`

💾 **Back up your keys securely**
- Lost keys = permanently lost data
- Store in password manager or secret management service

🔄 **Key rotation is supported**
- Add `ENCRYPTION_KEY_V2` when ready to rotate
- Old encrypted data still decrypts with v1 key
- New data encrypts with v2 key

## Questions?

Check the full documentation: `docs/FIELD-ENCRYPTION.md`

Or the implementation: `src/lib/crypto/fields.ts`
