# TASK DISPATCHER (PR BOT ENTRYPOINT)

Input: GitHub issue with label `ai-request`, manual workflow trigger, or external SaaS event.

---

## STEPS
1. **ANALYZE:** Parse the issue title and body to extract intent.
2. **MAP:** Identify the target microservice using the `.ai/index/codebase_map.md`.
3. **SELECT:** Load the corresponding Agent from `.ai/agents/`.
4. **LOAD:** Aggregate necessary context via `.ai/context/`.
5. **DISPATCH:** Initialize the `bot/executor.md` with the task payload.

---

## RULES
- **Primary Ownership:** One task = One primary module agent.
- **Architectural Check:** If the task involves >1 module, escalate to 'orchestrator'.
- **Sanitization:** Strip any sensitive PII from the task prior to AI processing.
