# GIT ENGINE (INFRASTRUCTURE LAYER)

Responsible for all local and remote Git operations within the Amaswarn Swarm.

---

## RESPONSIBILITIES
- **Branching:** Create feature branches following the pattern `feat/ai/{task-id}`.
- **Committing:** Apply atomic patches using Conventional Commits (`feat(auth): add password reset`).
- **Syncing:** Pull latest `main` before branching; push feature branch to remote.

---

## CONVENTIONAL COMMIT TEMPLATE
`<type>(<scope>): <subject>`

Example: `fix(billing): correct vat calculation for EU tenants`

---

## SAFETY
- Never force-push to `main`.
- All AI pushes must be signed or traceable to the bot ID.
