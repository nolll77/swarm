# TASK ROUTER (AI RUNTIME)

The Router is the cognitive entry point for any incoming engineering task.

## ROUTING LOGIC:

1. **ANALYZE:** Identify the primary microservice or package impacted by the task.
2. **SELECT:** Load the corresponding agent from `.ai/agents/`.
3. **ISOLATE:** Load the module-specific context from `.ai/context/modules/`.
4. **EXECUTE:** Invoke the Agent with the TASK and its SPECIFIC rules.

---

## CONFLICT RESOLUTION:
If a task impacts multiple services, the Router MUST invoke the **Orchestrator Agent** to plan a multi-agent choreography before execution.
