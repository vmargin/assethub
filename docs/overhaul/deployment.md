# Deployment and rollback

Production Vercel project: `erlassethub`. GitHub repository: [vmargin/assethub](https://github.com/vmargin/assethub). Current public domain: https://erlassethub.vercel.app/.

## Release procedure

1. Run the build, lint, PostgreSQL tests and browser checks recorded in verification.md.
2. Review and apply the checked-in migrations using `prisma migrate deploy` from backend, with the existing database connection. Do not run a seed, reset, db push or destructive setup SQL.
3. Commit the reviewed source, fast-forward main and push without force. The Vercel install uses both lockfiles; its build validates/generates Prisma and builds Vite. Database migration is deliberately separate from the build.
4. Inspect the production deployment until READY. Verify the public HTML, health endpoint, authenticated workspace reads, demo isolation, key browser screens and theme persistence at the production domain.

The original database had tables but no Prisma migration history. The original schema was inspected before marking `20260108082121_init_tables` and `20260108083405_sync_schema_with_slug` applied. Their historical SQL was not rerun. The two October migrations preserve the original organization/user/category/asset IDs and credentials, add memberships and operational records, normalize legacy active status to AVAILABLE, and preserve maintenance as an IN_PROGRESS request. A schema diff after deployment was empty.

The ignored `.playwright-mcp/database-baseline.json` holds original record fingerprints. `node scripts/migration-proof.cjs check` compares only those original rows. It does not display account credentials.

## Rollback

Local tag `codex/asset-hub-baseline-20261007` preserves the original source at `589f411`. The additive database migration remains in place. Prefer reverting the faulty application change into a compatible forward-fix release. Do not reverse migrations by dropping new tables: they can contain new user records.

Vercel retains previous deployments, but the original application has an older status/API contract. Restoring it alone is not a complete data-compatible rollback. Review compatibility before promoting an old deployment. Never overwrite or delete protected original records to repair a release.

## Search visibility

The entire app is intentionally excluded from search results, including the
anonymous demo root, invitations, APIs and all deployment environments. Every
path receives `X-Robots-Tag: noindex, nofollow` through `vercel.json`; the initial
HTML declares the same policy, which persists through hash navigation without
client-side metadata changes. No sitemap or search canonical is published.

Robots rules allow fetching so crawlers can read the exclusion directives;
blocking crawling would prevent that. Robots directives are not access controls.
Authentication and active workspace membership still protect tenant records.
Social preview URLs use the trusted production origin
https://erlassethub.vercel.app/; update those URLs if the public domain changes.

The initial HTML contains public product/demo copy before React starts, including
an explanation for visitors with JavaScript disabled. React replaces this public
shell with the existing access/session UI; no tenant content is prerendered.
Unknown pathname URLs use the hosting platform's real 404 response. App links
remain root URLs with fragments; do not restore a pathname SPA catch-all.

Generate the 1200 by 630 PNG preview with
`node frontend/scripts/generate-social-preview.mjs` after installing the root and
frontend dependencies and Playwright Chromium. Check real edge status/header
behavior after deployment; Vite preview does not emulate Vercel's routing rules.

## Operational limits

Authentication sessions and demo access last 24 hours. Invitation links last seven days and are one-use. Demo provisioning is capped at 100 sessions per hour with a database advisory lock. This is a volume safeguard rather than a distributed authentication rate limiter. Expired demo access is denied; automatic retention cleanup is not provided. Prisma pools are bounded to two connections per instance; PostgreSQL pool capacity remains a deployment constraint. Email sending and paid infrastructure are not required.
