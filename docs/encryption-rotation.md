# Encryption Key Management & Rotation

## Environment Variables

Add these to your `.env`:

```
# Encryption Key Management
KMS_KEY_ID="v2"  # Latest key version for encryption
ENCRYPTION_KEY="v2:base64key2,v1:base64key1"  # Comma-separated, newest first
```
- `KMS_KEY_ID`: The current key ID for new encryption.
- `ENCRYPTION_KEY`: Comma-separated list of key IDs and base64-encoded keys, e.g. `v2:base64key2,v1:base64key1`.

## Key Rotation
- To rotate:
  1. Generate a new key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  2. Prepend to `ENCRYPTION_KEY` with a new version, e.g. `v3:newkey,v2:oldkey,v1:olderkey`
  3. Set `KMS_KEY_ID` to the new version (e.g. `v3`).
- Old keys remain for decryption of legacy data.
- Data is always encrypted with the latest key; decryption supports all listed keys.

## Decryption Logic
- Decrypt attempts the key for the version prefix first.
- If that fails, all keys in `ENCRYPTION_KEY` are tried (legacy/rotation support).

## CLI: Rotate Keys

Use `scripts/rotate-keys.ts` to re-encrypt sample rows with the latest key:

```
tsx scripts/rotate-keys.ts --limit=10 --dry-run
```
- Use without `--dry-run` to apply changes.
- Only records with legacy key IDs are updated.

## Example

Before rotation:
```
KMS_KEY_ID="v1"
ENCRYPTION_KEY="v1:base64key1"
```
After rotation:
```
KMS_KEY_ID="v2"
ENCRYPTION_KEY="v2:base64key2,v1:base64key1"
```

See `/docs/security.md` for more.
