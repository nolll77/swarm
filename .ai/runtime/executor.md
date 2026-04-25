# EXECUTION LOOP (AUTONOMOUS RUNTIME)

The Executor manages the lifecycle of an autonomous task within a single agent scope.

## THE LOOP:

1. **PLAN:** The agent proposes a surgical diff based on the module context.
2. **VALIDATE:** The plan is cross-checked against `.ai/rules/architecture.md`.
3. **IMPLEMENT:** The agent generates the Git Unified Diff.
4. **TEST:** The agent verifies the change (Unit/Integration).
5. **SELF-REVIEW:** The agent performs a security and quality audit.
6. **FIX:** If any step fails, the loop restarts from Step 3 with error logs.

---

## STOP CONDITIONS:
- All tests pass (100% Green).
- Architectural rules are respected (0 Violations).
- Diff is minimal and targeted (Staff Engineer Grade).
