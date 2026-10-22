# Executed Sauron audit and improvements

Run date: 2026-10-23, Asia/Manila. Environment: Windows, Node 24.12.0, npm 11.17.0,
PostgreSQL 18, pinned Sauron 3.0.0, Playwright 1.64.1 and Chromium headless.

Three confirmed bugs were fixed and shared formatting work was reduced. No visual
redesign, schema migration, architecture replacement or production data change was
introduced. Existing unrelated workspace changes were preserved.

## Execution and engineering loop

- The tracked AssetHub workflow routed architecture, security, frontend and test
  work. Sauron's ranked skill search ran against the pinned catalog.
- Real Aragorn, Boromir and Legolas sessions were launched. Aragorn confirmed the
  AST analysis scope; Boromir identified the two race candidates. All three sessions
  then stopped at the account usage limit before completing their delegated work.
  The parent completed implementation and verification directly. These partial
  sessions are not claimed as completed independent specialist reviews.
- Blueprint: `execution-blueprint.md` records scope and acceptance before code fixes.
  Implementation followed reproduction. Final inspection checked requirements,
  architecture boundaries and production readiness separately.
- Applied upstream skills: engineering-loop/blueprint-session, code-inspection,
  codebase-knowledge-graph, module-organization, security-auditor,
  multi-tenancy-architecture, design-engineering/component-audit-and-fix,
  responsive-screenshot-check, accessibility-auditor, ui-snapshot-tokens and
  write-a-test. The React, accessibility, motion and testing-pyramid references
  informed their respective checks. All paths resolve inside node_modules/sauron-ai.
- Project scope overrides generic framework migrations and repeated approval gates.
  All fixes were authorized by the request for actual improvements.

## Verified security findings

Target: Express 5/CommonJS, Prisma/PostgreSQL, JWT HS256 and bcrypt. Scope includes
authentication, membership, asset transitions, tenant lookups, input serialization,
CSV exports and dependency manifests. This was a source review plus local regression
tests, not a production penetration test.

| Finding | Severity and mapping | Before | Fix and proof |
| --- | --- | --- | --- |
| Invitation acceptance can override a concurrent membership suspension | Medium, CWE-367 / OWASP A01; requires a valid invitation and concurrent revocation | Real suspension committed during password verification; acceptance returned 200 and reactivated membership | Conditional INVITED-to-ACTIVE update scoped to organization; returns 400, leaves membership suspended and rolls back the invitation claim |
| Transfer can move an asset concurrently retired after the read | Medium, CWE-367; violates lifecycle integrity | Real retirement committed after transfer read; transfer still returned 200 | Tenant-scoped conditional update rejects RETIRED state; returns 409, retains original location and appends no transfer activity |

Fixes are in `backend/src/controllers/authController.js` and
`backend/src/controllers/workspaceController.js`. Tests in
`backend/test/api.integration.test.js` interleave real HTTP/SQL operations through
controlled test seams rather than arbitrary timer races. The two regressions failed
with 200 instead of the required 400/409 before the fixes; all 10 API tests pass
afterward with no skips.
The captured pre-fix failure output is in `security-regressions-before.txt`.

Reviewed safeguards retained: ACTIVE membership per request, OWNER/MANAGER/MEMBER
checks, cross-tenant 404s, tenant composite foreign keys, atomic history,
compare-and-set checkout, stale audit rejection, last-owner protection, invite
single-use claims, existing-account password preservation and demo expiry.
CSV exports neutralize spreadsheet formula prefixes. No hardcoded production
credential or unsafe query construction was found in the reviewed paths.

Residual security work: no application-level login/register throttle was found
in server.js/authController.js (CWE-307/CWE-770). Hosting-level rate limits were
not inspected, so effective production abuse protection remains unverified.
No distributed limiter or new infrastructure was introduced incidentally. Overall
residual risk assessment: Medium pending confirmation of production abuse controls.

## Frontend design engineering

Target: browser-based React 19, JSX and plain CSS. A real Chromium run reproduced
the shared Dialog disappearing after opening under StrictMode: cleanup queued a
close event, replay reopened the element, then the stale event dismissed it.
The failed rendered baseline is retained in `browser-before.json`.
`frontend/src/components/UI.jsx` now ignores a close event while that element is
currently open. The same component and native dialog semantics remain in use.

The browser regression now proves the dialog stays open, Shift+Tab wraps to its
last button, Tab returns to Close, Escape dismisses it and focus returns to Add
asset. Mobile navigation focus and Escape restoration also pass in both themes.
Both themes complete real UI creation, checkout, return, transfer and retirement.

The audit produced 68 rendered checks with zero reported axe violations and zero
page overflow. Access, dashboard and inventory cover 320/375/425/768/1024/1440px;
locations, people, maintenance, audits, categories, reports and settings cover
320/1440px. Both themes and add-asset/mobile-navigation dialogs are included.

Six contact sheets were opened and visually inspected. Existing hierarchy,
collapsed navigation, local table scrolling and typography remain intact:

- [Access light](browser/access-light-contact.jpg) and [dark](browser/access-dark-contact.jpg).
- [Dashboard light](browser/dashboard-light-contact.jpg) and [dark](browser/dashboard-dark-contact.jpg).
- [Inventory light](browser/assets-light-contact.jpg) and [dark](browser/assets-dark-contact.jpg).

The [machine report](browser/report.json) contains actual viewport widths, semantic
token snapshots, axe results, overflow measurements and interaction verdicts.
The UI snapshot preserves light canvas #f4f3ee, surface #fbfaf6, text #23342d and
accent #315e4d; dark canvas #171f1d, surface #202a26, text #e8ece4 and accent
#a7c6aa. Newsreader/DM Sans, existing shared components, focus styles and reduced
motion rules remain unchanged. No stylesheet was modified.

Limits: automated axe results do not establish complete WCAG compliance. Its
incomplete checks include color-contrast and aria-prohibited-attr; small control
bounding boxes are recorded as review hints, not certified touch-target passes.
No physical-device or human screen-reader review was performed. The run used
reduced motion; it did not evaluate the aesthetics of animated transitions.

## Architecture and optimization

Native `sauron graph .` was executed and failed because the published package
omits scripts/graph/generate-graph.mjs. A project-owned, explicitly labeled Babel
AST fallback now executes with `npm run ai:architecture`.

The [graph report](architecture/graph-report.md) and [JSON](architecture/graph.json)
cover 19 JavaScript/JSX modules, 41 internal edges and 22 external import references.
There are no detected cycles, unresolved relative imports or frontend/backend
boundary violations. API entrypoint-to-backend imports are allowed. Large existing
App/Operations/controllers are documented as review candidates; no broad rewrite
was justified by this analysis. Computed imports and runtime/SQL relationships
are outside the graph's coverage.

`frontend/src/lib/format.js` now reuses the date formatter and one current currency
formatter instead of constructing them for each table cell. Currency switches,
locale formatting, timezone-sensitive dates and missing values retain their output.
The [benchmark](formatter-benchmark.json) compares committed source with the change
over three samples of 3,000 date/currency pairs: median 351.89ms before, 6.52ms after
on this machine. This is a formatting microbenchmark, not a page-speed claim.

## Verification and repeatability

| Executed check | Result |
| --- | --- |
| Existing migrations on a fresh local cluster | All 4 applied |
| Existing API baseline | 8 passed, no skips |
| New race regressions before fix | Both failed with incorrect successful responses |
| API tests after fix, RUN_DB_TESTS=1 | 10 passed, no skips |
| Workflow regression tests | 14 passed |
| AST analyzer regression tests | 3 passed |
| Frontend formatter regressions | 2 passed |
| Chromium rendered audit | 68 checks and 6 interaction verdicts passed |
| Frontend lint/build and Prisma validation/generation | Passed |
| Sauron heuristic source scan | 19 files, zero findings |
| npm audits: root/frontend/backend | Zero reported dependency vulnerabilities |

The 29 automated tests and browser run use synthetic data. Database testing ran
against a newly initialized loopback-only cluster on port 55439, not the existing
project connection. The audit manages its own frontend/API ports 50582/50581 and
cleans only its own synthetic fixture IDs. Test services are stopped after use.
Automatic approval review rejected removal of the stopped cluster directory with
the reason "blocked by policy". Its data files remain ignored under
`.sauron/runtime/execution-pg`; no test database server remains running.

`npm run verify` now includes architecture and formatter regressions. GitHub Actions
adds a disposable PostgreSQL service, migrations, real API tests, Chromium checks
and uploaded evidence. That workflow was inspected locally; its remote execution
has not been observed in this task. No application deployment was performed.

Native Sauron tracing summarizes the benchmark/browser tool spans in
execution-trace.json. Those events report zero model tokens because the measured
commands make no model calls; they are not estimates of this conversation's usage.
No external telemetry service is connected.

Final inspection: requirements met by reproduced fixes and executed checks;
system integrity retains the existing client/controller/Prisma boundaries;
production readiness retains the explicitly documented limitations above.
