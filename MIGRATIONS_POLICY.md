Migrations Policy

- CI: use the direct Neon endpoint (no `-pooler`) via secret `NEON_DIRECT_DATABASE_URL`. Run `npx prisma migrate deploy` then `npx prisma generate` to apply migrations and produce the client.
- Local/dev: prefer `npx prisma db push --accept-data-loss` for iterative development to avoid advisory lock timeouts; do not run `prisma migrate reset` automatically.
- Always keep migration SQL files under version control and review migrations in PRs before CI deploy.
- CI should serialize deploys for a branch (single runner) to reduce lock contention. Implement a small retry/backoff on advisory-lock/timeouts.
- For test DBs, use `TEST_DATABASE_URL` and require `_test` in URLs or explicit opt-in (ALLOW_UNSAFE_TEST_DB) to guard destructive operations.
- If `prisma migrate deploy` repeatedly fails due to locks, troubleshoot lock holders or schedule deploy when DB is quiet; avoid permanent manual ALTER TABLE fixes.

Safety note

- Using the direct Neon hostname (no `-pooler`) is required by Prisma for migrations. Treat the direct host as sensitive: store credentials in CI secrets, use SSL (`?sslmode=require`), grant minimal privileges to CI roles, and rotate credentials if exposed.
