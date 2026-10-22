# Codex compatibility entrypoint

Read repository-root AGENTS.md and scoped frontend/backend AGENTS.md files
for current commands, architecture, Sauron routing and verification rules.

The project skill is .agents/skills/assethub-workflow/SKILL.md. Upstream skills
and Fellowship specifications come from the pinned sauron-ai development
dependency, installed with root npm ci. See docs/development/sauron.md.

This compatibility file is not Codex's automatic instruction entrypoint;
AGENTS.md provides that integration. No model, permission or MCP settings
are overridden by this project.
