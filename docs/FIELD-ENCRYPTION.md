# Field-Level Encryption

## Overview

Field-level encryption for sensitive Contact data using **AES-256-GCM AEAD** (Authenticated Encryption with Associated Data). Provides strong encryption, searchable encrypted fields via deterministic hashing, and seamless key rotation.

## Features

- **🔐 Strong Encryption**: AES-256-GCM with 256-bit keys
- **🔍 Searchable**: BLAKE2b hash tokens for exact-match lookups
- **🔄 Key Rotation**: Version-prefixed format supports seamless key rotation
- **✅ Authenticated**: AEAD provides tamper detection
- **⚡ Fast**: AES-NI hardware acceleration on modern CPUs
- **🛡️ Compliant**: FIPS 140-2 approved, industry-standard cipher
- **🎯 Transparent**: Prisma middleware auto-encrypts/decrypts

## Encrypted Fields

### Contact Model

| Field | Encrypted | Searchable | Notes |
|-------|-----------|------------|-------|
| `email` | ✅ | ✅ | Exact match via `email_hash` |
| `phone` | ✅ | ✅ | Exact match via `phone_hash` |
| `notes` | ✅ | ❌ | Full encryption only |

## Architecture

### Encryption Format

```
{version}:{nonce}:{ciphertext}:{authTag}
v1:a1b2c3d4e5f6...789abc:1a2b3c4d5e6f...890abc:9f8e7d6c5b4a...321098
```

**Components**:
- **version**: Key version (e.g., `v1`, `v2`) - enables rotation
- **nonce**: 96-bit random nonce (12 bytes = 24 hex chars)
- **ciphertext**: Encrypted data (variable length)
- **authTag**: 128-bit authentication tag (16 bytes = 32 hex chars)

### Search Hash Format

```
BLAKE2b-256(salt + normalize(value))
```

**Properties**:
- Deterministic: Same input → same hash
- Case-insensitive: Values normalized before hashing
- Fast: BLAKE2b is faster than SHA-256
- Secure: 256-bit output prevents rainbow tables

## Setup

### 1. Generate Keys

```bash
# Generate encryption key (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate search salt (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use the helper functions:

```typescript
import { generateEncryptionKey, generateSearchSalt } from '@/lib/crypto/fields'

console.log('ENCRYPTION_KEY=' + generateEncryptionKey())
console.log('SEARCH_SALT=' + generateSearchSalt())
```

### 2. Set Environment Variables

```bash
# .env.local
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
SEARCH_SALT=fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210

# For key rotation (optional)
ENCRYPTION_KEY_V2=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789
```

⚠️ **CRITICAL**: Store keys securely:
- Use environment variables (never commit to git)
- Use secret management (AWS Secrets Manager, Vault, etc.)
- Back up keys securely (lost keys = lost data)
- Rotate keys periodically

### 3. Run Database Migration

```bash
# Apply schema changes
npx prisma migrate deploy

# Or in development
npx prisma migrate dev
```

This adds:
- `notes` column (TEXT)
- `email_hash` column (TEXT)
- `phone_hash` column (TEXT)
- Indexes on hash columns

### 4. Encrypt Existing Data

```bash
# Dry run (preview changes)
tsx scripts/encrypt-existing-contacts.ts --dry-run

# Encrypt data
tsx scripts/encrypt-existing-contacts.ts

# Custom batch size
tsx scripts/encrypt-existing-contacts.ts --batch-size=50
```

### 5. Enable Middleware

```typescript
// src/lib/db.ts or app initialization
import { applyEncryptionMiddleware } from '@/lib/crypto/middleware'

applyEncryptionMiddleware()
```

Or manually:

```typescript
import { prisma } from '@/lib/db'
import { contactEncryptionMiddleware } from '@/lib/crypto/middleware'

prisma.$use(contactEncryptionMiddleware)
```

## Usage

### Automatic (Recommended)

Prisma middleware handles encryption/decryption transparently:

```typescript
import { prisma } from '@/lib/db'

// CREATE - Automatically encrypts
const contact = await prisma.contact.create({
  data: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com', // Encrypted automatically
    phone: '+1234567890',       // Encrypted automatically
    notes: 'Important notes',   // Encrypted automatically
    organizationId: 'org123',
    ownerId: 'user123',
  },
})

console.log(contact.email) // "john@example.com" (decrypted automatically)

// READ - Automatically decrypts
const found = await prisma.contact.findUnique({
  where: { id: contact.id },
})

console.log(found.email) // "john@example.com" (decrypted)

// SEARCH - Uses hash automatically
const results = await prisma.contact.findMany({
  where: {
    organizationId: 'org123',
    email: 'john@example.com', // Converted to email_hash lookup
  },
})

// UPDATE - Automatically encrypts
await prisma.contact.update({
  where: { id: contact.id },
  data: {
    phone: '+9876543210', // Encrypted automatically
  },
})
```

### Manual Encryption

Use the crypto functions directly when needed:

```typescript
import {
  encryptField,
  decryptField,
  makeSearchToken,
  isEncrypted,
} from '@/lib/crypto/fields'

// Encrypt
const encrypted = encryptField('john@example.com')
console.log(encrypted)
// v1:a1b2c3d4e5f6...

// Decrypt
const decrypted = decryptField(encrypted)
console.log(decrypted)
// john@example.com

// Search token
const hash = makeSearchToken('john@example.com')
console.log(hash)
// 9f8e7d6c5b4a3210...

// Check if encrypted
console.log(isEncrypted(encrypted)) // true
console.log(isEncrypted('plaintext')) // false

// Batch operations
import { encryptFields, decryptFields } from '@/lib/crypto/fields'

const encrypted = encryptFields({
  email: 'test@example.com',
  phone: '+1234567890',
})

const decrypted = decryptFields(encrypted)
```

## Search Capabilities

### ✅ Supported Queries

```typescript
// Exact match
await prisma.contact.findMany({
  where: {
    email: 'john@example.com', // Works
  },
})

// Equals
await prisma.contact.findMany({
  where: {
    email: { equals: 'john@example.com' }, // Works
  },
})

// IN clause
await prisma.contact.findMany({
  where: {
    email: {
      in: ['john@example.com', 'jane@example.com'], // Works
    },
  },
})

// Combined with other filters
await prisma.contact.findMany({
  where: {
    organizationId: 'org123',
    email: 'john@example.com', // Works
    firstName: 'John',
  },
})
```

### ❌ Unsupported Queries

```typescript
// Contains (partial match)
await prisma.contact.findMany({
  where: {
    email: { contains: 'example' }, // ❌ Won't work
  },
})

// Starts with
await prisma.contact.findMany({
  where: {
    email: { startsWith: 'john' }, // ❌ Won't work
  },
})

// Case-insensitive (mode: 'insensitive')
await prisma.contact.findMany({
  where: {
    email: { equals: 'JOHN@EXAMPLE.COM', mode: 'insensitive' }, // ❌ Won't work
  },
})
```

**Why?** These require plaintext or specialized encryption (e.g., prefix-preserving encryption). For full-text search, use a separate search index (Elasticsearch, Algolia) with encrypted data.

**Workaround**: Search is case-insensitive by default (hash normalizes input).

## Key Rotation

### When to Rotate

- **Regular schedule**: Every 12-24 months
- **Compliance requirements**: PCI DSS, HIPAA, etc.
- **Security incident**: Suspected key compromise
- **Employee departure**: Access to keys revoked

### Rotation Process

#### 1. Generate New Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. Add to Environment

```bash
# .env.local
ENCRYPTION_KEY_V2=newkey1234567890abcdef...
```

#### 3. Update Default Version

```typescript
// src/lib/crypto/fields.ts
const KEY_VERSION = 'v2' // Change from v1 to v2
```

#### 4. Re-encrypt Existing Data

```typescript
import { prisma } from '@/lib/db'
import { rotateFieldKey, isEncrypted, getEncryptionVersion } from '@/lib/crypto/fields'

async function rotateContactKeys() {
  const contacts = await prisma.contact.findMany()
  
  for (const contact of contacts) {
    const updates: any = {}
    
    if (contact.email && getEncryptionVersion(contact.email) === 'v1') {
      updates.email = rotateFieldKey(contact.email, 'v2')
      updates.email_hash = makeSearchToken(decryptField(contact.email))
    }
    
    if (contact.phone && getEncryptionVersion(contact.phone) === 'v1') {
      updates.phone = rotateFieldKey(contact.phone, 'v2')
      updates.phone_hash = makeSearchToken(decryptField(contact.phone))
    }
    
    if (contact.notes && getEncryptionVersion(contact.notes) === 'v1') {
      updates.notes = rotateFieldKey(contact.notes, 'v2')
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: updates,
      })
    }
  }
}
```

#### 5. Remove Old Key (After Migration)

⚠️ **Wait 30+ days** before removing old key (allow for rollback).

```bash
# .env.local
# ENCRYPTION_KEY=oldkey... (remove after safe)
ENCRYPTION_KEY_V2=newkey...
```

## Security Best Practices

### ✅ Do

- **Use strong keys**: 32 bytes (256 bits) minimum
- **Store keys securely**: Secret management, not in code
- **Back up keys**: Encrypted, offsite backups
- **Rotate keys**: Regular schedule (12-24 months)
- **Audit access**: Log who accesses encrypted data
- **Test recovery**: Verify backups work before disaster
- **Monitor failures**: Alert on decryption errors

### ❌ Don't

- **Don't commit keys**: Never in git, even private repos
- **Don't log keys**: Redact from logs/errors
- **Don't share keys**: Each environment has unique keys
- **Don't reuse keys**: Different keys for dev/staging/prod
- **Don't skip backups**: Lost keys = lost data forever
- **Don't trust defaults**: Review crypto config carefully

## Performance

### Encryption Overhead

| Operation | Overhead | Notes |
|-----------|----------|-------|
| INSERT | ~0.5-1ms | Per contact (3 fields) |
| SELECT | ~0.3-0.7ms | Per contact (3 fields) |
| SEARCH | ~0ms | Uses indexed hash |
| UPDATE | ~0.5-1ms | Only encrypted fields |

**Batching**: Process 100-1000 records per batch for optimal performance.

### Optimization Tips

1. **Index hash columns**: Already done in migration
2. **Batch operations**: Use `createMany`, `updateMany`
3. **Cache decrypted data**: In-memory cache for frequently accessed
4. **Async processing**: Encrypt in background jobs
5. **Lazy decryption**: Only decrypt when displayed to user

## Monitoring

### Metrics to Track

```typescript
// Log encryption/decryption events
console.log('🔒 Encrypted contact email:', contactId)
console.log('🔓 Decrypted contact email:', contactId)
console.log('❌ Decryption failed:', contactId, error)
```

### Alerts

- **High decryption failure rate**: Key mismatch or corruption
- **Slow encryption**: Performance degradation
- **Missing keys**: Environment config issue

## Testing

### Run Tests

```bash
# All tests
npm test

# Encryption tests only
npx vitest run __tests__/field-encryption.test.ts

# Watch mode
npx vitest watch __tests__/field-encryption.test.ts
```

### Test Coverage

- ✅ Encryption/decryption roundtrip
- ✅ Search token determinism
- ✅ Key rotation
- ✅ Tamper detection (authentication)
- ✅ Unicode handling
- ✅ Edge cases (empty, long strings)
- ✅ Error handling

## Troubleshooting

### Decryption Fails

**Symptoms**: "Field decryption failed" error

**Causes**:
1. Wrong encryption key
2. Corrupted data
3. Key version mismatch

**Solutions**:
```typescript
// Check key version
import { getEncryptionVersion } from '@/lib/crypto/fields'
console.log(getEncryptionVersion(encrypted)) // v1, v2, etc.

// Verify key exists
console.log(process.env.ENCRYPTION_KEY ? '✅' : '❌')

// Test encryption/decryption
const test = encryptField('test')
console.log(decryptField(test)) // Should print 'test'
```

### Search Not Working

**Symptoms**: `findMany` with email filter returns no results

**Causes**:
1. Hash not generated
2. Case mismatch
3. Whitespace differences

**Solutions**:
```typescript
// Manually check hash
import { makeSearchToken } from '@/lib/crypto/fields'

const email = 'john@example.com'
const hash = makeSearchToken(email)

const contact = await prisma.contact.findFirst({
  where: { email_hash: hash },
})

console.log(contact ? '✅ Found' : '❌ Not found')
```

### Performance Issues

**Symptoms**: Slow queries after encryption

**Solutions**:
1. Verify indexes exist:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'contacts';
   ```

2. Check query uses hash:
   ```typescript
   // Enable query logging
   const prisma = new PrismaClient({ log: ['query'] })
   ```

3. Batch operations:
   ```typescript
   // Instead of N queries
   for (const contact of contacts) {
     await prisma.contact.update({ where: { id: contact.id }, data: {...} })
   }
   
   // Use bulk update
   await prisma.contact.updateMany({
     where: { id: { in: contactIds } },
     data: {...},
   })
   ```

## Compliance

### PCI DSS

- ✅ **Requirement 3.4**: Encryption at rest
- ✅ **Requirement 3.5**: Key management
- ✅ **Requirement 3.6**: Key rotation

### HIPAA

- ✅ **§164.312(a)(2)(iv)**: Encryption
- ✅ **§164.312(e)(2)(ii)**: Encryption in transit (use HTTPS)

### GDPR

- ✅ **Article 32**: Technical measures (encryption)
- ✅ **Article 25**: Data protection by design

## API Reference

See inline documentation in `src/lib/crypto/fields.ts` for detailed API reference.

---

## FAQ

**Q: Can I search for partial matches (contains, startsWith)?**  
A: No, AEAD encryption doesn't support partial searches. Use a separate search index or prefix-preserving encryption.

**Q: What happens if I lose the encryption key?**  
A: Data is permanently unrecoverable. Always back up keys securely.

**Q: Can I use this for other models (Deal, Company)?**  
A: Yes, create similar middleware for other models. See `src/lib/crypto/middleware.ts` as template.

**Q: Is this FIPS 140-2 compliant?**  
A: Node.js crypto uses OpenSSL. Use FIPS-enabled OpenSSL build for compliance.

**Q: How do I export encrypted data?**  
A: Middleware decrypts on read, so exports will contain plaintext. Control access via permissions.

**Q: Can I disable encryption temporarily?**  
A: Remove middleware registration. But encrypted data in DB will stay encrypted until decrypted.

---

## Resources

- [XChaCha20-Poly1305](https://tools.ietf.org/html/rfc8439)
- [BLAKE2b](https://www.blake2.net/)
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)
