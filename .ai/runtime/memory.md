# AGENT MEMORY RULES (ISOLATION)

To prevent cognitive overload and "leaky context," agents follow strict memory isolation rules.

## SEQUESTRATION:
- An agent remembers **only** its own module state and history.
- An agent **cannot** access the source code or secrets of another service directly.
- Cross-service knowledge must be requested via explicit "Interface Requests" (reading `shared/` constants).

---

## CONTEXT PURGING:
Once a task is complete and merged, the agent's specific task-memory is purged. Only the updated "Module State" (context/modules/) persists.

## GLOBAL MEMORY IS FORBIDDEN
Architecture integrity depends on the separation of concerns. Global reasoning is reserved for the Orchestrator.
