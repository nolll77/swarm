# AMASWARN EVENT MAP (REACTIVE FLOWS)

Mapping of Event Producers to Consumers in the Swarm Bus.

| Event Topic              | Producer Service | Expected Consumers               |
|--------------------------|------------------|----------------------------------|
| `tenant.created`         | api-gateway      | orchestrator, rbac, billing      |
| `issue.detected`         | github-webhook   | orchestrator, memory             |
| `patch.proposed`         | agent-coder      | agent-reviewer, orchestrator      |
| `review.passed`          | agent-reviewer   | agent-coder, github-app          |
| `subscription.failed`    | billing-stripe   | rbac-controller, api-gateway     |
| `infra.drift.detected`  | multi-cloud-ctrl | agent-sre, orchestrator          |

---

## CONSTRAINTS:
- No service should produce an event without at least one defined consumer.
- Infinite event loops (Service A -> Service B -> Service A) are strictly monitored and forbidden.
