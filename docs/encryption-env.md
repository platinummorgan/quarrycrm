# Encryption Key Environment Variables

Add the following to your `.env` and deployment environment:

```
# Encryption Key Management
# Comma-separated list of key IDs and base64-encoded keys, newest first
KMS_KEY_ID="v2"
ENCRYPTION_KEY="v2:base64key2,v1:base64key1"
```

- `KMS_KEY_ID`: The current (latest) key ID to use for new encryption.
- `ENCRYPTION_KEY`: Comma-separated list of key IDs and their base64-encoded keys, in the format `id:key`. The first entry is used for encryption; all are used for decryption.

## Key Rotation

- To rotate keys, generate a new key, prepend it to `ENCRYPTION_KEY`, and update `KMS_KEY_ID` to the new key's ID.
- Old keys remain in the list for decryption of legacy data.
- Example:
  - Before rotation: `KMS_KEY_ID="v1"`, `ENCRYPTION_KEY="v1:base64key1"`
  - After rotation: `KMS_KEY_ID="v2"`, `ENCRYPTION_KEY="v2:base64key2,v1:base64key1"`
- Data encrypted with `v1` will still be decrypted; new data uses `v2`.

See `/docs/security.md` for more details.
