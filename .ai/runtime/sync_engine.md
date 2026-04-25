# SYNC ENGINE (AI RUNTIME)

The Sync Engine ensures logical consistency between parallel agent executions.

---

## FUNCTIONS

- **Conflict Detection:** Identifies when multiple agents attempt to modify shared dependencies or overlapping `shared/` packages.
- **Contract Validation:** Verifies that agent changes comply with `index/service_contracts.md`.
- **Schema Audit:** Validates that event payload changes in one agent are compatible with the consuming agents defined in `index/event_map.md`.

---

## TRIGGERS

- **Multi-Agent Tasks:** Automatically activated for tasks involving >1 microservice.
- **Shared Mod:** Triggered when `packages/shared` or `infra/` files are touched.
- **Breaking Change:** Manual or AI-detected breaking change flag.
