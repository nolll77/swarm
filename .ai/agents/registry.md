# AGENT REGISTRY: Amaswarn Swarm

Each microservice/module in the Amaswarn ecosystem is owned by a specialized Autonomous AI Agent.

| Module (Service)              | Responsible Agent       | Context Scope                      |
|-------------------------------|-------------------------|------------------------------------|
| services/api-gateway          | gateway-agent           | Ingress, Auth, Routing             |
| services/orchestrator         | orchestrator-agent      | State Machine, Events              |
| services/vector-memory        | memory-agent            | Embeddings, Indexing               |
| services/agent-coder          | coder-agent             | Patching, Git Diffs                |
| services/agent-reviewer       | reviewer-agent          | Security, Quality Gates            |
| services/rbac-controller       | rbac-agent              | Multi-tenancy, Permissions         |
| services/multi-cloud-controller| multicloud-agent        | Terraform, Cloud Abstraction       |

---

## EXECUTION RULE:
1. Every task MUST be routed to its specific module agent via the Task Router.
2. Cross-service modifications are FORBIDDEN without an explicit "Orchestrator Union" approval.
3. Agents MUST strictly adhere to their module context.
