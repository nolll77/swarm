# Architecture Rules (Elite SaaS Scale)

- **Microservices Independency:** Services must be able to run and fail independently.
- **Event-Driven Only:** No direct HTTP calls between internal services. All communication via Redis/Kafka.
- **Shared Package constraint:** Only event topics and global constants belong in `packages/shared`. No business logic.

## Forbidden

- **Cross-module shortcuts:** Do not bypass the orchestrator.
- **Direct DB access:** A service must never access another service's database.
- **Hidden side effects:** No global state mutation outside of events.
