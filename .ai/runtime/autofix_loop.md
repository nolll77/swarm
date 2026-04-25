# AUTO-FIX LOOP (SELF-HEALING ENGINE)

Triggered automatically when CI checks or AI Review fail.

---

## CONSTRAINTS
- **Iteration Cap:** Maximum 3 attempts.
- **Surgical Precision:** Fix ONLY the reported error. No refactoring or scope creep.
- **Traceability:** Every fix attempt is logged in `.ai/logs/fixes/`.

---

## THE LOOP
1. **Analyze:** Parse failure logs from CI (Jest/ESLint/TSC).
2. **Contextualize:** Identify relevant files via `vector-memory`.
3. **Patch:** Apply minimal Git Unified Diff.
4. **Re-Validate:** Restart the CI pipeline.

---

## TERMINATION CONDITIONS
- SUCCESS: All Quality Gates passed.
- FAILURE: Max retries reached or architectural conflict detected.
