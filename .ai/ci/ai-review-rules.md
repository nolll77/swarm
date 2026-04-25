# AI REVIEW RULES (PRODUCTION GRADE)

Mandatory checklist for the Reviewer Agent before approving any PR.

## 1. ARCHITECTURAL INTEGRITY
- [ ] No circular dependencies introduced.
- [ ] Service boundaries respected (no cross-module pollution).
- [ ] Event schemas maintained in the `shared/` package.

## 2. SECURITY (SOC2/RGPD)
- [ ] No PII (Personally Identifiable Information) logged in plain text.
- [ ] All inputs validated/sanitized.
- [ ] RBAC checks present for every new endpoint.
- [ ] No hardcoded secrets or credentials.

## 3. CODE QUALITY
- [ ] 0 Linting errors.
- [ ] Minimal Git Diff (focused change).
- [ ] Unit tests covering the new logic + edge cases.
- [ ] Error handling is explicit (no try-catch-ignore).

## 4. PERFORMANCE
- [ ] No N+1 database queries.
- [ ] Efficient event payload size (minimal data overhead).
- [ ] Correct use of Redis caching where applicable.
