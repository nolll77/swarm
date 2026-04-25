# Amaswarn Codebase Map

## Modules (Microservices Swarm)

- **api-gateway** → Entry point, rate limiting, tenant routing.
- **orchestrator** → Event-driven state machine for AI workflows.
- **vector-memory** → RAG system, semantic indexing, codebase embeddings.
- **agent-coder** → Code generation, diff engine, patch application.
- **agent-reviewer** → Quality gates, security analysis, architectural audit.
- **agent-sre** → Failure analysis, automated post-mortems.
- **rbac-controller** → Granular access control, tenant isolation.
- **auto-patcher** → CVE scanning, autonomous dependency updates.
- **multi-cloud-controller** → Infrastructure abstraction (AWS/GCP).
- **billing-stripe** → Token usage tracking and monetisation.

## Dependencies (Core Flow)

- **orchestrator** → Depends on all agents.
- **agents** → Depend on **vector-memory** for context.
- **all services** → Depend on **shared** package (constants, events).
- **multi-cloud** → Depends on **shared/constants**.
