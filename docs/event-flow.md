# Event Flow Reference

## Topics

| Topic | Producer | Consumer(s) |
|---|---|---|
| `task.created` | API Gateway | Task Router |
| `task.routed` | Task Router | Orchestrator |
| `pipeline.plan_requested` | Orchestrator | Agent Planner |
| `plan.generated` | Agent Planner | Orchestrator |
| `pipeline.code_requested` | Orchestrator | Agent Coder |
| `code.generated` | Agent Coder | Orchestrator |
| `pipeline.review_requested` | Orchestrator | Agent Reviewer |
| `review.completed` | Agent Reviewer | Orchestrator |
| `pipeline.pr_requested` | Orchestrator | PR Service |
| `pr.created` | PR Service | CI Monitor, Metrics |
| `ci.check_received` | API Gateway | CI Monitor |
| `ci.passed` | CI Monitor | Orchestrator |
| `ci.failed` | CI Monitor | Orchestrator |
| `pipeline.completed` | Orchestrator | Notification, Metrics |
| `pipeline.failed` | Orchestrator | Notification, Metrics |
| `notification.send` | Various | Notification |
| `metric.recorded` | Various | Metrics Collector |

## Event Schema

All events follow the `DomainEvent<T>` format:

```typescript
{
  id: string;          // unique event ID
  type: string;        // topic name
  tenantId: string;    // tenant scope
  payload: T;          // event-specific data
  timestamp: Date;     // when published
  correlationId: string; // trace ID across pipeline
}
```

## Pipeline State Transitions

```
pending --> triaging --> planning --> coding --> reviewing
                                       ^            |
                                       |            v
                                     fixing <-- [FAIL]
                                       |
                                    [max retries?]
                                       |
                                  yes: failed
                                   no: coding
                                       
reviewing --> [PASS] --> pr_creating --> ci_monitoring --> completed
```
