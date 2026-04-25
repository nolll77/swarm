# CONFLICT RESOLUTION (AI RUNTIME)

Strategy for resolving overlapping modifications in the SaaS monorepo.

---

## RULES

1. **Ownership Priority:** The agent defined as 'Owner' in `ownership_map.md` has the final say on file modifications.
2. **Backward Compatibility:** If an agent modification breaks a downstream service, it is REJECTED by default.
3. **Merge Strategy:** The resolver suggests an "Intermediate Schema" or "Dual Support" phase for breaking changes.

---

## RESOLUTION FLOW

1. Identify conflicting modules/files.
2. Compare functional intent of both changes.
3. Reject unsafe or architectural-violating modifications.
4. Suggest a unified merge strategy to the Orchestrator.
