---
name: assethub-workflow
description: Route AssetHub development tasks to the pinned Sauron Fellowship, architecture, backend, database, frontend design engineering, quality, security and workflow capabilities while preserving the existing project. Use for substantial changes, audits and task planning; keep small fixes lightweight.
---

# AssetHub Sauron workflow

Read root and scoped AGENTS.md first. Use the pinned node_modules/sauron-ai
ecosystem, not old ignored local copies. If missing, run root `npm ci`.

## Selective engineering loop

1. Inspect affected files and identify the smallest useful scope.
2. For substantial work, run `npm run ai:find -- "<task>"`. Read the matching
   skill and required references. Results are suggestions; verify project fit.
3. Apply the relevant stage from skills/workflow/engineering-loop/: blueprint
   before implementation, UI tokens for frontend work, inspection before
   completion, checkpoint for long work and failure triage when needed.
4. Delegate independent tasks only when useful. Follow root ownership rules.
5. Implement within existing boundaries, run scoped checks and report evidence.
   Avoid repeated review loops or persistent artifacts for trivial edits.

## Task map

Paths below are relative to node_modules/sauron-ai/skills/. Each capability
folder contains SKILL.md; read it before applying it.

| Task | Starting capability |
| --- | --- |
| Architecture/impact | architecture/architecture-documentation, architecture/module-organization |
| Tenant boundary | architecture/multi-tenancy-architecture, architecture/auth-architecture |
| API work | architecture/api-design, backend/backend-development |
| Database | database/prisma-drizzle-orm, database/database-migration |
| PostgreSQL performance | database/postgres-query-planner-optimization |
| Frontend | frontend/design-engineering, frontend/react-principles, frontend/vite-principles |
| Forms/accessibility | frontend/forms-validation, frontend/accessibility-auditor |
| Behavioral regression | quality/write-a-test, quality/testing-principles |
| Visual regression | quality/playwright-visual-testing-fixtures |
| Security review | security/security-auditor, frontend/frontend-security |
| CI/deployment | devops/cicd-deployment, architecture/serverless-patterns |
| Refactor | workflow/lean-code, architecture/module-organization |
| Windows tooling | devops/powershell-principles |

Project JavaScript, CSS, component contracts and user authorization take precedence
over generic upstream templates. Do not introduce RSC, TypeScript, Tailwind, new
architecture layers or boilerplate approval gates as incidental changes. Honor
task-specific destructive/release boundaries.

## Complete design-engineering coverage

Load frontend/design-engineering/SKILL.md to resolve current stage names:
foundations/critique, styles, brand, motion, image-to-code, or audit. The package
also provides foundation references, style token packs and frontend/brand-presets.
Adapt relevant capabilities to docs/overhaul/design.md and actual tokens/components.
Use image/browser tools only if available; never claim generated images,
screenshots, measurements or accessibility results from text review.

## Verification

Use root AGENTS.md commands. Run `npm run ai:check` for integration/config/pin
changes and `npm run test:workflow` for runner changes. `npm run ai:scan` is an
optional heuristic source scan, not a tenant/authentication/full security audit.
Record skipped database and browser checks.
