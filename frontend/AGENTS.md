# Frontend instructions

Read root AGENTS.md. Preserve React 19, Vite, JSX, plain CSS, hash routing and
the API client. The visual contract is docs/overhaul/design.md; its historical
deployment instructions are not standing authorization.

For structured UI work, load
node_modules/sauron-ai/skills/frontend/design-engineering/SKILL.md, then the
single matching stage. Resolve its skills/... paths inside the pinned package.
Consult its foundations index and the references needed for the task. Existing
AssetHub tokens override upstream palette defaults. Trivial CSS corrections
do not need a design pipeline.

- Reuse src/index.css semantic light/dark tokens: canvas, surface, text, muted,
  border, accent and status pairs. Preserve DM Sans text and Newsreader headings.
- Reuse src/components/UI.jsx, Icon.jsx and AssetVisual.jsx. Dialogs already
  handle labels, focus trapping and focus restoration. Avoid parallel primitives.
- Preserve light, dark and system appearance and the assethub.theme preference.
- Keep loading, empty, error, validation, disabled and success states functional.
  Use real API data and actions; do not invent activity to fill gaps.
- Preserve native semantics, visible labels, focus rings, status text, error
  announcements, mobile navigation isolation and 44px touch targets.
- Keep tables scrollable locally and pages usable at 320px. For material layout
  changes, inspect 320, 375, 425, 768, 1024 and 1440px in both themes. For a small
  fix, cover the affected breakpoint plus mobile and desktop.
- Review keyboard flow for interactive changes. Run browser/axe checks when tools
  are available; report unavailable browser verification explicitly.
- Existing motion uses 160ms feedback, 220ms dialogs/drawers and --ease-out.
  Preserve reduced motion. Use motion skills when interaction timing changes.
- Brand presets, alternative styles, image prompts, image-to-code and variant
  prototypes apply to matching requests. Do not auto-redesign existing pages or
  add a UI/motion library just because an upstream example uses one.

Run `npm run lint --prefix frontend` and `npm run build --prefix frontend` from
root. Build success does not prove visual or accessibility correctness.
Use `npm run test:frontend` for formatting regressions and `npm run test:browser`
for rendered accessibility, responsive, focus and asset lifecycle checks against
a dedicated local test database. Browser checks manage their own servers on
50581/50582 and must not target existing or production tenant data.
