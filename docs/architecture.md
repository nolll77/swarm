# Architecture Overview

## System Design

AI Dev Platform is a multi-tenant SaaS system that transforms GitHub issues into validated 
pull requests using autonomous AI agents with CI safety gates.

## Core Principles

1. **Event-Driven**: All inter-service communication happens via Redis Streams.
2. **Multi-Tenant Isolation**: Every query, event, and execution is scoped to a tenant.
3. **Controlled Autonomy**: AI agents operate within strict policy boundaries.
4. **Audit Trail**: Every action is logged for compliance and debugging.

## Service Architecture

```
GitHub --> API Gateway --> Event Bus (Redis Streams)
                               |
           +-------------------+--------------------+
           |                   |                    |
      Task Router        Orchestrator          CI Monitor
           |                   |                    |
           |        +----------+----------+         |
           |        |          |          |         |
        Planner   Coder    Reviewer    PR Service  |
           |        |          |          |         |
           +--------+----------+----------+---------+
                               |
                        Notification
                         + Metrics
```

## Data Flow

1. GitHub webhook arrives at API Gateway  
2. API Gateway creates Task in DB, publishes `task.created`  
3. Task Router classifies risk and type, publishes `task.routed`  
4. Orchestrator starts pipeline state machine  
5. Agents execute sequentially: Plan -> Code -> Review  
6. If review fails, auto-fix loop (max 3 iterations)  
7. PR Service creates GitHub PR  
8. CI Monitor watches for CI results  
9. Notifications sent on completion/failure  
10. Metrics recorded for observability  

## Database Schema

- **Tenant**: Multi-tenant root entity with plan and settings  
- **Repository**: GitHub repos linked to tenants  
- **Task**: Pipeline tasks with status tracking  
- **Execution**: Individual step results (plan, code, review, fix)  
- **PullRequest**: GitHub PR records  
- **AuditLog**: Full action audit trail  
- **Metric**: Time-series observability data  
- **ApiKey**: Tenant API authentication  

## Scaling Strategy

- API Gateway: 2-5 pods (stateless HTTP)  
- Agents: 1-20 pods each (HPA on CPU)  
- Orchestrator: 2-3 pods  
- Redis Streams: consumer groups for horizontal scaling  
- Postgres: RDS with read replicas for analytics  
