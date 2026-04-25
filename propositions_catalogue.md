# History of Propositions & Decisions

## Proposition 001 - Amaswarn Elite Foundation
**Initial Question:** "Build a production-grade AI SaaS."
**Option Chosen:** Microservices Monorepo (Turborepo) + Event Bus (Redis/Kafka).
**Value Added:** Horizontal scalability, tenant isolation, and total modularity.

## Proposition 014 - Expansion Swarm (GDPR Agent)
**Initial Question:** "Add new skills to your swarm (e.g., GDPR compliance agent)."
**Option Chosen:** Modular architecture driven by events via an Agent Registry.
**Value Added:** Allows injecting compliance safeguards without modifying the central execution engine. Secures the SaaS for the European market and SOC2.

## Proposition 015 - CI/CD Pipeline Stabilization
**Initial Question:** "Why are the pushes failing in GitHub Actions?"
**Option Chosen:** Unified Turbo orchestration and automated Prisma client generation during the build phase.
**Value Added:** Eliminates "missing script" failures in monorepo workspaces and ensures type safety for all agents in CI environments.

## Temporal Progression Summary
| Phase | Components Built | Logic |
|---|---|---|
| Phase 1 | Core Architecture | Establish the data bus and multi-tenancy. |
| Phase 14 | services/agent-gdpr | Automated data protection validation (PII, Isolation). |
| Phase 15 | CI/CD Infrastructure | Stabilization of Turbo pipeline and Prisma auto-generation. |
