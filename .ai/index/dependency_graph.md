# Amaswarn Swarm Dependency Graph

This graph defines the "Who knows What" in the 22-microservice ecosystem.

```mermaid
graph TD
    Gateway[api-gateway] --> Orchestrator
    Orchestrator --> Memory[vector-memory]
    Orchestrator --> Coder[agent-coder]
    Orchestrator --> Reviewer[agent-reviewer]
    Coder --> Memory
    Reviewer --> Memory
    SRE[agent-sre] --> Orchestrator
    SRE --> Memory
    Billing --> RBAC[rbac-controller]
    
    subgraph Shared
        Constants[packages/shared/constants]
        Schemas[packages/shared/schemas]
    end
    
    AllServices --> Shared
```

## RULES:
- Arrows represent dependency direction.
- Circular dependencies are strictly FORBIDDEN.
- Every service must depend on `shared` for communication schemas.
