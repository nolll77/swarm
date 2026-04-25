# AMASWARN SERVICE CONTRACTS

Formal API and Event expectations between microservices.

| Providing Service   | Contract Type | Promise                                      |
|---------------------|---------------|----------------------------------------------|
| api-gateway         | HTTP/JWT      | Validates Tenant sessions and routes traffic |
| rbac-controller     | GRPC/Event    | Provides granular permissions for identities |
| billing-stripe      | Event/Webhook | emits `subscription.updated` / `payment.ok`  |
| user-service        | Database      | Single Source of Truth for identity and orgs |
| vector-memory       | Semantic      | Provides code snippets and vector lookups    |
| multi-cloud-ctrl    | Provider API  | abstracts Cloud-specific provisioning        |

---

## RULE:
Any modification to a "Promised" contract requires a mandatory re-validation by ALL potentially impacted subscriber agents.
