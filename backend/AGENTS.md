# Backend instructions

Read root AGENTS.md. Keep Express 5/CommonJS, Prisma/PostgreSQL and direct
controller access through src/db/prisma.js. Reuse src/lib/api.js validation,
serialization and error conventions, and src/middleware/auth.js authorization.

- Route authentication, membership and permission changes through a Boromir
  review perspective and the relevant security/multi-tenancy skills.
- Scope every lookup and related record to the requested organization. JWT
  identity alone does not establish active organization membership.
- Preserve OWNER/MANAGER/MEMBER permissions and the last active owner guard.
- Keep transitions and history in one transaction, use conditional writes for
  races, preserve fixed audit snapshots and reject stale audit versions.
- Preserve tenant composite relations and SQL CHECK/partial unique constraints.
  Read prisma/migrations/*/migration.sql with prisma/schema.prisma.
- Use additive migrations. Validation/client generation is local; migration
  deployment, data baselining and seeding require task-specific scope.
- Keep the pool limit of two connections and Vercel entrypoint behavior.
- Never log tokens, password hashes, query arguments or database credentials.

Run `npm run build --prefix backend` from root for Prisma validation and client
generation. Behavior changes need a meaningful regression against a dedicated
development database: set RUN_DB_TESTS=1, then `npm test --prefix backend`.
Without that variable, database tests skip. Do not set it against production or
an unverified database. Seeding/reset/baseline are not routine verification.
