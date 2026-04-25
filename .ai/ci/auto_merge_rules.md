# AUTO-MERGE POLICY (SWARM GOVERNANCE)

Eligibility for a Pull Request to be merged without human intervention.

---

## MANDATORY REQUIREMENTS
- [ ] **CI Passed:** All unit and integration tests are 100% green.
- [ ] **AI Review Passed:** The Reviewer Agent has issued a PASS status.
- [ ] **Risk Score:** Must be LOW.
- [ ] **Scope:** Single microservice modification only.
- [ ] **Coverage:** Zero regression in test coverage.

---

## AUTOMATIC REJECTION FOR AUTO-MERGE
- Any cross-service dependency change.
- Any change to `packages/shared`.
- Modifications to `billing`, `auth`, or `rbac`.
- Security vulnerability detected in dependencies.

---

## HUMAN GATE
When Auto-Merge is blocked, the PR must be explicitly signed by a human Staff Engineer.
