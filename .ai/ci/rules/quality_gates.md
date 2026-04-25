# QUALITY GATES (PRODUCTION HARD BLOCKERS)

These gates are enforced by the CI Orchestrator and cannot be bypassed by any agent.

## CRITICAL FAILURES (BLOCK MERGE)
- **Service Leakage:** Any direct DB access or HTTP bypass of the Event Bus.
- **Security Breach:** Detection of plain-text secrets or PII logging.
- **Contract Violation:** Breaking change to `index/service_contracts.md` without a transition plan.
- **Zero Coverage:** New business logic without accompanying unit tests.
- **Regression:** Failure of any existing critical test suite.

---

## AI OVERRIDE PERMISSION: DENIED
In a production environment, Safety > Autonomy.
