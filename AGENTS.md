# AssetHub development instructions

Use Sauron for relevant work in this repository. This is the persistent entrypoint;
read scoped AGENTS.md files when working in the frontend or backend.
The capability map and architecture are in docs/development/sauron.md.

## Start each task

1. Inspect the request, Git state and affected source. Preserve unrelated edits.
2. For substantial work, consult the architecture map and run
   `npm run ai:find -- "<task>"`. Read only the matching skill and necessary
   references. For small, obvious fixes, inspect relevant code directly.
3. State a short scope and verification plan, implement, review, then run affected
   checks. Apply engineering-loop stages selectively: blueprint, UI tokens for
   design, inspection, checkpoint for long tasks, triage on failure. Existing
   authorization covers routine reversible implementation.
4. Report actual changes and checks, including skipped tests and unavailable
   tools. Historical evidence is not a fresh verification result.

Read .agents/skills/assethub-workflow/SKILL.md for task routing. The pinned
ecosystem lives under node_modules/sauron-ai/; install it with root `npm ci`
if missing. Do not depend on a global CLI version. Upstream skills/..., core/...,
references/... and rules/... resolve inside that package. Older ignored local
skill copies and generic runtime adapters are legacy; use the pinned package.

## Preserve the architecture

- React 19 + Vite, JavaScript/JSX and plain CSS. frontend/src/App.jsx owns hash
  navigation, sessions and workspaces. Reuse api/client.js and shared UI.
- Express 5/CommonJS controllers use Prisma 6/PostgreSQL directly through
  backend/src/db/prisma.js. Preserve controller and validation patterns;
  do not introduce service layers or another framework incidentally.
- api/index.js exposes Express to Vercel. Vite proxies /api locally. Preserve
  the same-origin API, deployment settings and two-connection pool.
- Every workspace request checks ACTIVE membership and role. Preserve tenant
  scoping, composite foreign keys, cross-tenant 404s and secret-safe errors.
- Lifecycle transitions and history are atomic. Preserve concurrency guards,
  audit snapshots/version checks, the last active owner and asset retirement.
- Migrations contain constraints absent from schema.prisma, including one
  open checkout per asset. Review SQL and schema. Use additive migrations;
  never reset, reseed or baseline an existing database implicitly.
- Generic TypeScript, Next.js, Tailwind, server-component or brand templates do
  not change our stack, functionality or current design.

## Fellowship routing

Use real runtime delegation tools when independent work benefits from another
specialist. Assign file ownership for edits, tell workers they share the workspace
and cannot revert others' changes. A small task stays with one agent. Apply roles
as review perspectives when delegation is unavailable.

| Trigger | Specialist |
| --- | --- |
| Substantial planning or coordination | Gandalf |
| Contracts, schema, architecture, impact analysis | Aragorn |
| Implementation | Frodo |
| Authentication, tenancy, permissions, unsafe input | Boromir |
| Regression strategy and behavior verification | Merry |
| Concurrency, malformed input, foreign IDs, edge cases | Pippin |
| Syntax, lint, hooks and focused bugs | Legolas |
| Bounded cleanup and maintainability | Gimli |
| Git state, handoff and release preparation | Samwise |

Persona configuration is not proof of execution. Do not invent slash commands,
MCP servers, tracing, browser checks or specialist reviews. Commits, pushes,
deployments and destructive operations follow the current task's authority;
historical release notes do not grant standing permission.

## Commands from the repository root

| Purpose | Command |
| --- | --- |
| Install harness | `npm ci` |
| Check integration | `npm run ai:check` |
| Rank applicable skills | `npm run ai:find -- "<task>"` |
| Optional source sink scan | `npm run ai:scan` |
| Workflow regression tests | `npm run test:workflow` |
| AST dependency analysis | `npm run ai:architecture` |
| Architecture/formatting regressions | `npm run test:architecture` and `npm run test:frontend` |
| Rendered UI/axe/lifecycle checks | `npm run test:browser` with a dedicated local database in AUDIT_DATABASE_URL |
| Frontend checks | `npm run lint --prefix frontend` and `npm run build --prefix frontend` |
| Schema validation/client generation | `npm run build --prefix backend` |
| Combined non-database checks | `npm run verify` |
| API tests | `npm test --prefix backend` with RUN_DB_TESTS=1 and a dedicated development database |

There is no TypeScript check. Backend tests skip database
coverage without RUN_DB_TESTS=1; skipped tests are not API validation. Use
meaningful regression tests for behavior changes and scoped checks for small
reversible edits. Do not print credentials or read environment files into logs.
