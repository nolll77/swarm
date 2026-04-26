# Amaswarn: Autonomous AI Engineering Platform
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)


Amaswarn is an enterprise-grade AI software engineering platform that orchestrates a multi-agent swarm to transform GitHub issues into validated, production-ready pull requests. It is built on a sovereign infrastructure with strict security, compliance, and self-healing capabilities.

## 1. System Architecture

The platform follows a distributed, event-driven microservices architecture:

- **Ingestion Layer**: API Gateway handles GitHub webhooks and tenant authentication.
- **Cognitive Routing**: Task Router classifies risk levels and enforces budget hard-gates.
- **Swarm Orchestration**: The Global Orchestrator manages the asynchronous state machine for task execution.
- **Agent Swarm**: 22 specialized agents (Planner, Coder, Reviewer, SRE, GDPR, etc.) execute autonomous workflows.
- **Persistence & Context**: PostgreSQL for metadata, Redis for event streaming, and Vector Memory (RAG) for long-term codebase understanding.

## 2. Sovereignty by Design

Sovereignty is not an afterthought or a "feature" added at the end; it is encoded in the platform's DNA.

1. **Architecture as Proof**: Unlike trust-based systems, Amaswarn implements hard multi-tenant isolation (mandatory `tenantId` mapping) and autonomous GDPR auditors that scan every diff for PII before it leaves the cluster.
2. **True Independence**: The system is designed to be cloud and LLM agnostic. By decoupling logic from specific providers (OpenAI, AWS), Amaswarn ensures that the customer remains the master of their intelligence, ready to pivot to local models or alternative clouds without friction.
3. **Control over Freedom**: Every "agentic" decision is governed by a deterministic Policy Engine. We prioritize engineering reliability and legal compliance over unconstrained AI autonomy.

## 3. Competitive Moats (Why we win)

Amaswarn is built with structural defensive barriers that distinguish it from standard AI assistants:
1. **The Binding Moat (End-to-End)**: While others just write code, Amaswarn is the only platform that binds code generation to **real CI validation, GDPR audit, and automated canary rollouts**. We don't just suggest; we deliver validated PRs.
2. **The Control Moat (Strategic Isolation)**: Our "Policy Engine" architecture ensures that AI never touches critical core modules (Auth, Billing) unless explicitly allowed, offering the governance level required by regulated industries.
3. **The Sovereignty Moat (Privacy-First)**: Native multi-tenant isolation and EU-centric GDPR auditing ensure data never leaks between tenants, a mandatory requirement for Enterprise SaaS.

## 4. Native Orchestration vs. AI Frameworks

Unlike typical AI projects, Amaswarn **does not use LangChain or LangGraph**. This is a deliberate engineering choice to ensure industrial-grade reliability:
1. **Zero-Abstraction Traceability**: Direct OpenAI integration allows 100% visibility into every payload, avoiding the "black box" debugging nightmare of heavy frameworks.
2. **Strict Deterministic Control**: The swarm's transitions are governed by a TypeScript state machine (The Orchestrator), not by an autonomous LLM deciding its own path. This prevents uncontrolled API costs and infinite loops.
3. **Decentralized Scaling**: Built on a pure Event-Bus architecture, agents act as independent microservices. This allows for sovereign deployment where sensitive agents (like GDPR) can run on strictly localized clusters.

## 5. The Agentic Workflow (Why it's not a Copilot)

Amaswarn is a true **Agentic AI** system. Unlike passive Generative AI that only responds to immediate human prompts, Amaswarn possesses autonomous agency:
1. **Asynchronous Initiative**: Agents wake up autonomously based on cluster events (e.g., CI failures immediately trigger the SRE-Agent).
2. **Tool Calling & Execution**: The cognitive layer does not just generate text; it requests terminal execution, inspects logs, and interacts with GitHub APIs.
3. **Iterative Self-Correction**: The swarm functions in a closed loop. If the Reviewer-Agent detects a flaw in the Coder-Agent's output, it routes the task back for correction without requiring human supervision.

## 6. Long-Term Vector Memory (RAG)

To ensure the swarm understands the global context of a customer's codebase rather than just the isolated files modified in a PR, Amaswarn implements a native Retrieval-Augmented Generation (RAG) microservice (`services/vector-memory`):
1. **Repository Indexing**: Listens to indexing events, chunks the codebase, and generates Vector Embeddings (via OpenAI).
2. **Semantic Querying**: Cognitive agents (like the Coder-Agent) emit queries on the Event Bus (e.g., "How does this tenant handle date formatting?") and receive precisely matching code snippets and similarity scores.
3. **Pluggable Persistence**: Deployed natively with an `InMemoryVectorStore` for rapid development, built behind standard interfaces ready to be instantly swapped to **ChromaDB, Pinecone, or Weaviate** for high-volume enterprise production.

## 7. The 22 Autonomous Agents Swarm

To ensure strict security and prevent LLM hallucinations, the swarm is strictly divided into Cognitive (AI) and Deterministic (Code) agents.

### Cognitive Agents (LLM-Driven)
Execute probabilistic reasoning via Large Language Models.

| Agent | Responsibility |
|---|---|
| Planner-Agent | Generates technical implementation plans based on repository context. |
| Coder-Agent | High-fidelity code generation and minimal diff production. |
| Reviewer-Agent | Architectural audit, security scanning, and quality gate enforcement. |
| UI-Agent | Frontend component generation with React, Tailwind, and Storybook. |
| SRE-Agent | Automated diagnostics, Root Cause Analysis (RCA), and post-mortems. |
| Evolve-Agent | Meta-learning system that evolves agent prompts based on failure patterns. |
| GDPR-Agent | Data protection audit (PII) and multi-tenant isolation compliance. |

### Deterministic Agents (Code-Driven)
Execute math, API routing, and infrastructure logic with 100% predictability (No AI).

| Agent | Responsibility |
|---|---|
| Gateway-Agent | Ingress, authentication, and webhook management. |
| Router-Agent | Automated triage, risk scoring, and budget enforcement. |
| Orchestrator-Agent | Global state machine and cross-agent coordination. |
| PR-Agent | Automated GitHub lifecycle management and branch orchestration. |
| CI-Agent | Passive monitoring of build health and testing suites. |
| Notify-Agent | Intelligent routing for Slack, Email, and Webhook notifications. |
| Metrics-Agent | Real-time Prometheus metrics and infrastructure health monitoring. |
| Billing-Agent | Stripe synchronization and real-time financial quota management. |
| SOC2-Agent | Automated generation of audit evidence packs for security compliance. |
| Memory-Agent | Long-term RAG indexing and semantic repository retrieval. |
| Chaos-Agent | Resilience testing through controlled fault injection (Chaos Engineering). |
| Vault-Agent | Zero-secret management via AWS Secrets Manager and HashiCorp Vault. |
| Canary-Agent | Progressive rollout controller with automated rollback capabilities. |
| RBAC-Agent | Granular access control and agent privilege governance. |
| Patch-Agent | Proactive vulnerability correction and CVE remediation. |

## 8. Sovereign Deployment & Infrastructure

Amaswarn is designed for total infrastructure sovereignty. The entire stack is provisioned as code:

- **Terraform**: Automated provisioning of AWS VPC, EKS clusters, RDS instances, and MSK (Kafka) backbones.
- **GitOps (ArgoCD)**: Continuous state synchronization between the repository and Kubernetes clusters for staging and production.
- **Multi-Tenant Isolation**: Hard isolation at the database, event bus, and network layers per tenant.
- **Cloud Agnostic**: Support for AWS, GCP, and Azure through the Multi-Cloud Controller factory.

## 9. Security & Compliance

- **SOC2 Ready**: Automated audit trails, immutable logging, and RBAC governance.
- **GDPR Compliant**: Explicit PII detection and autonomous data isolation enforcement.
- **Zero Trust**: Every internode communication is authenticated; secrets are protected by hardware vaults.
- **Privacy by Design**: Mandatory tenantId mapping at the data-access layer.

## 10. Industrial Performance & Resilience

- **Self-Healing**: Automated fix loops that repair broken builds without human intervention.
- **Chaos-Tested**: Weekly resilience experiments ensuring a 99.9% recovery rate.
- **Prompt Evolution**: Systemic performance improvement through automated prompt mutations.

## 11. Quick Start

### Prerequisites
- Node.js 20+
- Docker & Kubernetes
- Terraform 1.6+
- OpenAI API Key

### Configuration
Configure the environment via `services/secret-vault/` or the `.env.example` file. 

### Deployment
Apply the sovereign infrastructure via Terraform and bootstrap the ArgoCD root application:
```bash
make init
make apply
make deploy-staging
```

## 12. Strategic Governance & Business Vision

Amaswarn is governed by a strict collaboration framework and a sovereign business strategy. Detailed models are available in the dedicated governance directory:

- **[AI-Human Collaboration Manifesto](./governance/ai_colab_manifesto.md)**: Our core operational contract.
- **[Expansion Roadmap](./governance/roadmap_expansion.md)**: Technical strategy for 100M ARR scale.
- **[Business Case & Strategy](./governance/pitch_deck_notion.md)**: ROI analysis and market differentiation.
- **[Monorepo Playbook](./governance/monorepo_playbook.md)**: Engineering resilience and CI/CD rules.

## 13. Licensing

Amaswarn is open-source software licensed under the **GNU Affero General Public License v3.0**. 

**Important for SaaS providers:** In accordance with the AGPL-3.0 terms, if you modify this software and run it as a network service, you MUST make your source code available to your users. See the [LICENSE](./LICENSE) and [NOTICE](./NOTICE) files for details.

## 14. Author & Project History

- **Original Author & Lead Architect:** [Noël Ching](https://github.com/nolll77)
- **Project Inception:** April 2026
- **Vision:** To bridge the gap between autonomous AI reasoning and industrial-grade software reliability.

**P.S. Project Status:** The core sovereign architecture and multi-agent swarm are now considered stable and complete. While an ambitious long-term [Expansion Roadmap](./governance/roadmap_expansion.md) exists, the project has reached its primary industrial objective and will remain in this stable state for the foreseeable future.


---
Sovereignty by Design.


