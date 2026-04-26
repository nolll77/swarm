# Amaswarn: Autonomous AI Engineering Platform
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)


Amaswarn is an enterprise-grade AI software engineering platform that orchestrates a multi-agent swarm to transform GitHub issues into validated, production-ready pull requests. It is built on a sovereign infrastructure with strict security, compliance, and self-healing capabilities.

> <font size="4">Amaswarn est une plateforme d'ingénierie logicielle basée sur l'IA destinée aux entreprises, qui coordonne un essaim multi-agents afin de transformer les tickets GitHub en pull requests validées et prêtes à être déployées en production.
>
> Amaswarn repose sur une infrastructure souveraine dotée de capacités rigoureuses en matière de sécurité, de conformité et d'auto-réparation.</font>



## 1. System Architecture

The platform follows a distributed, event-driven microservices architecture:

- **Ingestion Layer**: API Gateway handles GitHub webhooks and tenant authentication.
- **Cognitive Routing**: Task Router classifies risk levels and enforces budget hard-gates.
- **Swarm Orchestration**: The Global Orchestrator manages the asynchronous state machine for task execution.
- **Agent Swarm**: 22 specialized agents (Planner, Coder, Reviewer, SRE, GDPR, etc.) execute autonomous workflows.
- **Persistence & Context**: PostgreSQL for metadata, Redis for event streaming, and Vector Memory (RAG) for long-term codebase understanding.

> <font size="4">La plateforme repose sur une architecture de microservices distribuée et pilotée par les événements :
>
> - Couche d'ingestion : API Gateway gère les webhooks GitHub et l'authentification des clients.
>  **↓**
> - Routing cognitif : Task Router classe les niveaux de risque et applique les limites de budget strictes.
>  **↓**
> - Orchestration Agentique : Global Orchestrator gère la machine à états asynchrone pour l'exécution des tâches.
>  **↓**
> - Agent Swarm : 22 agents spécialisés (Planner, Coder, Reviewer, SRE, GDPR, etc.) exécutent des workflows indépendants et autonomes.
>  **↓**
> - Persistance et contexte : PostgreSQL pour les métadonnées, Redis pour le streaming d'événements, la base de donnée vectorielle (RAG) pour la compréhension long terme du code source du projet.</font>

## 2. Technical Stack: Industrial-Grade TypeScript

While the AI ecosystem favors Python for rapid prototyping, Amaswarn is built on a **Unified TypeScript Monorepo** for industrial stability. This ensures our 22-agent swarm operates as resilient microservices with end-to-end type safety, sharing a single source of truth across the entire platform. By leveraging Node.js's non-blocking I/O, our orchestrator manages hundreds of parallel agentic events simultaneously—handling the load where traditional Python-based scripts would hit concurrency bottlenecks (GIL).

> <font size="4">Alors que l'écosystème IA, la tendance, 'la hype' privilégient Python, Amaswarn repose sur un mono-repo écrit en TypeScript afin de privilégier la stabilité architecturale et la sécurité du typage.
>
> Cette approche industrielle garantit que notre essaim d'agents fonctionne comme des microservices résilients, partageant une source unique de vérité.
>
> En exploitant la gestion asynchrone massive de Node.js, l'orchestrateur agentique peut traiter plusieurs centaines d'événements en parallèle sans jamais bloquer, là où des scripts Python traditionnels atteindraient leurs limites de montée en charge (cf. GIL).</font>
>
> <font size="2.5">[What Is the Python Global Interpreter Lock?](https://realpython.com/python-gil/)</font>
>
> <font size="2.5">[Décryptage du Global Interpreter Lock](https://datascientist.fr/blog/tutoriel-python-decryptage-du-global-interpreter-lock-gil)</font>


## 3. Sovereignty by Design

Sovereignty is not an afterthought or a "feature" added at the end; it is encoded in the platform's DNA.

- **Architecture as Proof**: Unlike trust-based systems, Amaswarn implements hard multi-tenant isolation (mandatory `tenantId` mapping) and autonomous GDPR auditors that scan every diff for PII before it leaves the cluster.
- **True Independence**: The system is designed to be cloud and LLM agnostic. By decoupling logic from specific providers (OpenAI, AWS), Amaswarn ensures that the customer remains the master of their intelligence, ready to pivot to local models or alternative clouds without friction.
- **Control over Freedom**: Every "agentic" decision is governed by a deterministic Policy Engine. We prioritize engineering reliability and legal compliance over unconstrained AI autonomy.

> <font size="4">La souveraineté n'est pas une réflexion qui est venue par la suite, ni une « fonctionnalité » ajoutée en fin de projet : la souveraineté est inscrite dans l'ADN de la plateforme.
>
> - Architecture as Proof : contrairement aux systèmes basés sur la confiance (ou un défaut de parfaite compréhension des systèmes), Amaswarn met en œuvre une isolation stricte des multiples parties prenantes (ex : mapping obligatoire des identifiants d'accès) et des agents auditeurs RGPD autonomes, ceux-ci iront pister et analyser chaque modification de données à caractère personnel avant qu'elle ne quitte le cluster.
>
> - Une véritable indépendance : le système est conçu pour être indépendant du cloud et des LLM : en dissociant les services spécifiques (tels OpenAI, AWS, etc), Amaswarn garantit que le client, les utilisateurs restent maîtres : la plateforme est prête à basculer vers des modèles locaux, développés soi-même, ou passer à d'autres clouds sans friction.
>
> - Le contrôle préféré à la liberté/hallucination : chaque décision « agentique » est régie par un moteur de politiques déterministe. Nous privilégions la fiabilité technique et la conformité juridique plutôt qu'une autonomie illimitée de l'IA.</font>

## 4. Competitive Moats (Why we win)

Amaswarn is built with structural defensive barriers that distinguish it from standard AI assistants:
- **The Binding Moat (End-to-End)**: While others just write code, Amaswarn is the only platform that binds code generation to **real CI validation, GDPR audit, and automated canary rollouts**. We don't just suggest; we deliver validated PRs.
- **The Control Moat (Strategic Isolation)**: Our "Policy Engine" architecture ensures that AI never touches critical core modules (Auth, Billing) unless explicitly allowed, offering the governance level required by regulated industries.
- **The Sovereignty Moat (Privacy-First)**: Native multi-tenant isolation and EU-centric GDPR auditing ensure data never leaks between tenants, a mandatory requirement for Enterprise SaaS.

> <font size="4">Amaswarn s'appuie sur des barrières défensives structurelles qui le distinguent des assistants IA classiques :
>
> - Le Binding Moat (barrer la route) : alors que d'autres copilots ne font que suggérer du code, Amaswarn est une plateforme qui relie la génération de code à :
>   - une validation CI réelle ;
>   - à un audit RGPD ;
>   - à des déploiements canary automatisés.
>
> --> Nous ne nous contentons pas de faire des suggestions : nous fournissons des PR validées.
>
> - Le Control Moat (segmentation stratégique) : notre architecture « Policy Engine » garantit que l'IA n'accède jamais aux modules d'importance capitale et critiques (ex : authentification, facturation) sauf autorisation explicite, offrant ainsi le niveau de gouvernance requis par les secteurs réglementés.
>
> - Le Sovereignty Moat (priorité à la confidentialité) : l'isolation native des clients multiples et l'audit RGPD garantissent qu'aucune fuite de données ne se produit entre les clients, une exigence obligatoire pour le SaaS d'entreprise.</font>

## 5. Native Orchestration vs. AI Frameworks

Unlike typical AI projects, Amaswarn **does not use LangChain or LangGraph**. This is a deliberate engineering choice to ensure industrial-grade reliability:
- **Zero-Abstraction Traceability**: Direct OpenAI integration allows 100% visibility into every payload, avoiding the "black box" debugging nightmare of heavy frameworks.
- **Strict Deterministic Control**: The swarm's transitions are governed by a TypeScript state machine (The Orchestrator), not by an autonomous LLM deciding its own path. This prevents uncontrolled API costs and infinite loops.
- **Decentralized Scaling**: Built on a pure Event-Bus architecture, agents act as independent microservices. This allows for sovereign deployment where sensitive agents (like GDPR) can run on strictly localized clusters.

> <font size="4">Orchestration agentique native vs. Frameworks IA
>
> Contrairement aux projets d'IA classiques, Amaswarn n'utilise ni **LangChain ni LangGraph** ; en effet, il s'agit d'un choix technique délibéré visant à garantir **une fiabilité de niveau industriel** :
>
> - Traçabilité sans abstraction : l'intégration directe d'OpenAI offre une visibilité totale sur chaque charge utile, évitant ainsi le cauchemar d'un capharnaüm pour déboguer, préoccupation propre aux frameworks lourds.
>
> - Contrôle déterministe strict : les transitions de l'essaim multi-agents sont régies par une machine à états TypeScript (l'Orchestrateur), et non par un LLM autonome décidant de son propre chemin : cela évite les coûts d'API incontrôlés et des boucles infinies.
>
> - Évolutivité décentralisée : construits sur une architecture en Bus d'Événements pure, les agents agissent comme des microservices indépendants : cela permet un déploiement souverain où les agents sensibles (comme le RGPD) peuvent s'exécuter sur des clusters strictement localisés.</font>

## 6. The Agentic Workflow (Why it's not a Copilot)

Amaswarn is a true **Agentic AI** system. Unlike passive Generative AI that only responds to immediate human prompts, Amaswarn possesses autonomous agency:
- **Asynchronous Initiative**: Agents wake up autonomously based on cluster events (e.g., CI failures immediately trigger the SRE-Agent).
- **Tool Calling & Execution**: The cognitive layer does not just generate text; it requests terminal execution, inspects logs, and interacts with GitHub APIs.
- **Iterative Self-Correction**: The swarm functions in a closed loop. If the Reviewer-Agent detects a flaw in the Coder-Agent's output, it routes the task back for correction without requiring human supervision.

> <font size="4">Amaswarn est un véritable système d'IA agentique : contrairement à l'IA générative passive qui ne se contente que de répondre aux demandes immédiates des utilisateurs, Amaswarn dispose d'une capacité d'action autonome.
>
> - Initiative asynchrone : les agents se déclenchent de manière autonome en fonction d'événements au sein du cluster (par exemple, les échecs de CI déclenchent immédiatement l'agent SRE).
>
> - Appel et exécution d'outils : la couche cognitive ne se contente pas de générer du texte ; elle demande l'exécution de commandes sur le terminal, inspecte les journaux et interagit avec les API GitHub.
>
> - Autocorrection itérative : l'essaim agentic fonctionne en boucle fermée : si l'agent de review détecte une erreur dans la sortie de l'agent de coding, il renvoie la tâche pour correction sans nécessiter une intervention humaine.</font>

## 7. Long-Term Vector Memory (RAG)

To ensure the swarm understands the global context of a customer's codebase rather than just the isolated files modified in a PR, Amaswarn implements a native Retrieval-Augmented Generation (RAG) microservice (`services/vector-memory`):
- **Repository Indexing**: Listens to indexing events, chunks the codebase, and generates Vector Embeddings (via OpenAI).
- **Semantic Querying**: Cognitive agents (like the Coder-Agent) emit queries on the Event Bus (e.g., "How does this tenant handle date formatting?") and receive precisely matching code snippets and similarity scores.
- **Pluggable Persistence**: Deployed natively with an `InMemoryVectorStore` for rapid development, built behind standard interfaces ready to be instantly swapped to **ChromaDB, Pinecone, or Weaviate** for high-volume enterprise production.

>  <font size="4">Pour s'assurer que l'essaim comprenne le contexte global du code d'un développeur plutôt que des fichiers isolés seuls et modifiés dans une PR, Amaswarn met en œuvre un microservice natif de génération augmentée par retrieval (**RAG**) :
>
> - Indexation du référentiel : écoute les événements d'indexation, découpe le code en segments et génère des vecteurs d'encodage (via l'API OpenAI).
>
> - Requêtes sémantiques : les agents cognitifs (tels que le Coder-Agent) émettent des requêtes sur le bus d'événements (par exemple, « Comment ce tenant gère-t-il le formatage des dates ? ») et reçoivent des extraits de code correspondant précisément ainsi que des scores de similarité.
>
> - Persistance modulaire : déployée en natif avec un InMemoryVectorStore pour un développement rapide, elle s'appuie sur des interfaces standardisées, prêtes à être instantanément remplacées par ChromaDB, Pinecone ou Weaviate pour une production d'entreprise à haute volumétrie.</font>

## 8. The 22 Autonomous Agents Swarm (l'**Essaim** d'agents)

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

## 9. Sovereign Deployment & Infrastructure

Amaswarn is designed for total infrastructure sovereignty. The entire stack is provisioned as code:

- **Terraform**: Automated provisioning of AWS VPC, EKS clusters, RDS instances, and MSK (Kafka) backbones.
- **GitOps (ArgoCD)**: Continuous state synchronization between the repository and Kubernetes clusters for staging and production.
- **Multi-Tenant Isolation**: Hard isolation at the database, event bus, and network layers per tenant.
- **Cloud Agnostic**: Support for AWS, GCP, and Azure through the Multi-Cloud Controller factory.

## 10. Security & Compliance

- **SOC2 Ready**: Automated audit trails, immutable logging, and RBAC governance.
- **GDPR Compliant**: Explicit PII detection and autonomous data isolation enforcement.
- **Zero Trust**: Every internode communication is authenticated; secrets are protected by hardware vaults.
- **Privacy by Design**: Mandatory tenantId mapping at the data-access layer.
- **Real-time Alerts**: Every security or compliance incident triggers an immediate Slack alert, ensuring total auditability and zero-delay response.

## 11. Industrial Performance & Resilience

- **Self-Healing**: Automated fix loops that repair broken builds without human intervention.
- **Chaos-Tested**: Weekly resilience experiments ensuring a 99.9% recovery rate.
- **Prompt Evolution**: Systemic performance improvement through automated prompt mutations.

## 12. Quick Start

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

## 13. Strategic Governance & Business Vision

Amaswarn is governed by a strict collaboration framework and a sovereign business strategy. Detailed models are available in the dedicated governance directory:

- [AI-Human Collaboration Manifesto](./governance/ai_colab_manifesto.md): Our core operational contract.
- [Expansion Roadmap](./governance/roadmap_expansion.md): Technical strategy for 100M ARR scale.
- [Business Case & Strategy](./governance/pitch_deck_notion.md): ROI analysis and market differentiation.
- [Monorepo Playbook](./governance/monorepo_playbook.md): Engineering resilience and CI/CD rules.

## 14. Licensing

Amaswarn is open-source software licensed under the **GNU Affero General Public License v3.0**. 

**Important for SaaS providers:** In accordance with the AGPL-3.0 terms, if you modify this software and run it as a network service, you MUST make your source code available to your users. See the [LICENSE](./LICENSE) and [NOTICE](./NOTICE) files for details.

## 15. Author & Project History

- Original Author & Lead Architect: **[Noël Ching](https://github.com/nolll77)**
- Project Inception: April 2026
- Vision: To bridge the gap between autonomous AI reasoning and industrial-grade software reliability.

P.S. Project Status: The core sovereign architecture and multi-agent swarm are now considered stable and complete. While an ambitious long-term [Expansion Roadmap](./governance/roadmap_expansion.md) exists, the project has reached its primary industrial objective and will remain in this stable state for the foreseeable future.

---




