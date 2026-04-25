# Architecture Overview: Amaswarn Elite Swarm

## High-Level Vision
Amaswarn is a distributed সফটওয়্যার factory composed of 22 microservices. The system is entirely event-driven, leveraging the "Swarm Intelligence" pattern where specialized agents collaborate via a central Event Bus.

## Layers
1. **Gateway Layer:** `api-gateway` handles ingress, SSL, and tenant routing.
2. **Orchestration Layer:** `orchestrator` manages the AI state machine.
3. **Execution Layer:** Specialized agents (`agent-coder`, `agent-ui`, `agent-sre`) execute specific engineering tasks.
4. **Data Layer:** Isolated PostgreSQL instances per tenant + global Vector Storage.
5. **Infrastructure Layer:** Multi-cloud abstraction via Terraform and the `multi-cloud-controller`.

## Critical Path
`GitHub Webhook` -> `api-gateway` -> `orchestrator` -> `vector-memory` -> `agent-planner` -> `agent-coder` -> `pr-service`.
