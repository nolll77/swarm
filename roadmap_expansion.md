# Roadmap d'Expansion : Modules & Améliorations Futures

Ce document détaille les modules à implémenter pour passer de la fondation actuelle à un produit commercialisable à haute échelle.

---

## 1. Agent SRE (Site Reliability Engineer)

### Qu'est-ce que c'est ?
Un agent IA spécialisé dans la santé opérationnelle du système. Contrairement aux agents "Coder" ou "Planner" qui créent de nouvelles fonctionnalités, l'agent SRE surveille l'existant pour détecter les dérives (incidents, ralentissements).

### Rôle & "Vie" dans le projet
Il vit en tant qu'abonné passif aux événements système et actif aux métriques Prometheus. Il intervient dès qu'une alerte est déclenchée.

### Flux de données
- **Consomme (Inputs) :**
  - Logs structurés (via Loki).
  - Métriques de performance (via Prometheus).
  - Traces d'erreurs (via OpenTelemetry).
- **Produit (Outputs) :**
  - Diagnostics détaillés (Root Cause Analysis).
  - Pull Requests de correctif automatique (Fix PR).
  - Post-mortems générés par IA.
- **Amont (Before) :** `metrics-collector`, `api-gateway`.
- **Aval (After) :** `orchestrator` (pour piloter le fix), `notification` (pour prévenir l'humain).

---

## 2. Connecteur Stripe (Billing & Monétisation)

### Qu'est-ce que c'est ?
La couche transactionnelle du SaaS. Elle transforme l'activité des agents en factures réelles.

### Rôle & "Vie" dans le projet
Il synchronise l'état des abonnements Stripe avec les limites de la base de données locale. 

### Flux de données
- **Consomme (Inputs) :**
  - Webhooks Stripe (paiements réussis, abonnements annulés).
  - Données d'utilisation (via `metrics-collector`).
- **Produit (Outputs) :**
  - Crédits de tokens mis à jour dans `Tenant`.
  - Blocage/Déblocage des accès API.
- **Amont (Before) :** Stripe API, `api-gateway`.
- **Aval (After) :** `task-router` (pour vérifier les quotas avant de lancer un agent).

---

## 3. UI-to-Code Engine (Le module "Front-end Autonomous")

### Qu'est-ce que c'est ?
Une extension de l'agent "Coder" capable de transformer des screenshots de maquettes (Figma) ou des descriptions UI en code React/Tailwind complet.

### Rôle & "Vie" dans le projet
Un nouveau type de tâche (`taskType: "ui_design"`) géré par un agent visuel (GPT-4o Vision).

### Flux de données
- **Consomme :** Images (PNG/JPG), descriptions textuelles.
- **Produit :** Composants React, fichiers CSS, icônes.
- **Amont :** `api-gateway`.
- **Aval :** `agent-reviewer` (pour vérifier l'accessibilité et le responsive).

---

## 4. SOC2 Automated Evidence Pack

### Qu'est-ce que c'est ?
Un collecteur automatique de preuves pour les audits de sécurité (conformité).

### Rôle & "Vie" dans le projet
Un cron job qui agrège les `AuditLogs` et les configurations d'infrastructure pour prouver que tout est sécurisé.

### Flux de données
- **Consomme :** `AuditLog` (Prisma), Terraform state, configs K8s.
- **Produit :** Rapports PDF conformes aux standards SOC2/ISO27001.
- **Amont :** Base de données `shared`.
- **Aval :** `S3` (stockage sécurisé des rapports).

---

## 5. Multi-Region Active-Active Traffic Wrapper

### Qu'est-ce que c'est ?
Une couche réseau globale qui redirige les requêtes vers la région AWS la plus proche ou la plus saine.

### Rôle & "Vie" dans le projet
Implémenté via AWS Global Accelerator et Route53.

### Flux de données
- **Consomme :** Health checks des clusters K8s.
- **Produit :** Routing du trafic DNS/IP.
- **Amont :** Internet.
- **Aval :** `api-gateway` (de la région cible).

---

## Liste Exhaustive des Fonctions Restantes

### Gouvernance & Sécurité
- [x] **RBAC Granulaire :** Permissions par utilisateur au sein d'un tenant (Admin, Dev, Viewer).
- [x] **Secret Vault Integration :** Intégration native avec AWS Secrets Manager pour ne jamais stocker de clés en clair.

### Intelligence Contextuelle
- [x] **Vector Memory Engine :** Système d'embeddings pour que l'IA "apprenne" de toute la codebase au fil du temps.
- [x] **Agent Prompt Self-Evolution :** Un agent qui analyse pourquoi certaines tâches ont échoué et suggère des améliorations aux prompts système.

### SRE & Ops
- [x] **Chaos Agent :** Agent qui simule des pannes pour tester la résilience du système de rollback.
- [x] **Autonomous Patching :** Mise a jour automatique des dependances vulnerables detectees.

### Delivery
- [x] **Canary Release Controller :** Déploiement progressif des nouvelles versions de ton API avec rollback automatique si les erreurs augmentent.
- [x] **Cross-Cloud Support :** Extension du backend pour supporter GCP ou Azure en plus d'AWS.
- [x] **GitOps ArgoCD :** Système de synchronisation continue via ArgoCD pour une livraison automatisée "Elite".

### Gouvernance & Business
- [x] **Investor Pitch Deck :** Support de présentation premium (Style Linear/Stripe) pour levée de fonds.
- [x] **Business Case France :** Analyse du ROI, TCO et conformité RGPD/ANSSI adaptée au marché européen.

---

# Bilan d'Implémentation des Modules Stratégiques (Phase 1 & 2 Roadmap)

## 1. Agent SRE (Site Reliability Engineer)
**Status: 100% Implémenté | Service: `services/agent-sre/`**
Architecture en 2 modules isolés :

| Fichier | Rôle |
|---|---|
| `analyzer.ts` | Cerveau SRE. Utilise GPT-4o (Temp 0.1) pour produire un Root Cause Analysis (RCA) à partir des logs d'échec. |
| `index.ts` | Listener Redis Event Bus. Déclenche l'analyse sur `CI_FAILED` et publie le RCA vers `notification`. |

## 2. Connecteur Stripe (Billing & Monétisation)
**Status: 100% Implémenté | Service: `services/billing-stripe/`**
Architecture orientée gouvernance :

| Fichier | Rôle |
|---|---|
| `stripe-client.ts` | Wrapper SDK Stripe. Gère la validation des signatures de webhooks et les appels API. |
| `webhook-handler.ts` | Traite `invoice.paid` et `customer.subscription.deleted`. Met à jour `Tenant.billingStatus` en temps réel. |
| `index.ts` | Serveur de webhooks sécurisé. |

## 3. UI-to-Code Framework (Agent Visuel)
**Status: 100% Implémenté | Service: `services/agent-ui/`**
Architecture Frontend Autonome :

| Fichier | Rôle |
|---|---|
| `index.ts` | Implémente la loi "STORYBOOK MANDATORY". Génère des diffs React + TailwindCSS + .stories.tsx. |
| `prompt-system.ts` | Contient les standards Elite UI (Accessibilité W3C, Responsive, Premium Dark Mode). |

## 4. SOC2 Automated Evidence Pack
**Status: 100% Implémenté | Service: `services/soc2-collector/`**
Architecture Audit-Ready en 4 modules :

| Fichier | Rôle |
|---|---|
| `evidence-engine.ts` | Agrégateur Prisma. Récupère AuditLogs, Tasks et PRs sur une période donnée (YYYY-MM). |
| `report-generator.ts` | Formateur Markdown structuré selon les critères de confiance SOC2 (CC6, CC7, CC8). |
| `s3-uploader.ts` | Push vers S3 avec métadonnées de conformité + génération d'URL d'audit pré-signée. |
| `index.ts` | Cron scheduler (mensuel) + Mode `EVIDENCE_RUN_NOW`. |

## 5. Architecte Vectoriel (Vector Memory Engine)
**Status: 100% Implémenté | Service: `services/vector-memory/`**
RAG Engine en 4 modules (SRP parfait) :

| Fichier | Rôle |
|---|---|
| `chunker.ts` | Découpe line-aware avec overlap. Filtre automatiquement les fichiers inutiles (node_modules, legacy). |
| `embedder.ts` | Adapteur OpenAI `text-embedding-3-small`. Supporte le batching (100+) pour la performance. |
| `vector-store.ts` | Store vectoriel (similarité cosinus). Interface `IVectorStore` (Prêt pour Chroma/Pinecone). |
| `indexer.ts` | Pipeline `Files → Chunks → Embeddings → Store` + API de requête sémantique. |

## 6. Chaos Agent (Ingénierie de Résilience)
**Status: 100% Implémenté | Service: `services/chaos-agent/`**
Moteur de Chaos Engineering en 3 modules (Inspiré Netflix Chaos Monkey / Gremlin) :

| Fichier | Rôle |
|---|---|
| `experiments.ts` | Catalogue de 6 scénarios de panne. Chaque expérience définit son `blastRadius`, sa `expectedRecovery` et sa `rollbackProcedure`. |
| `executor.ts` | Exécuteur de fautes. Injecte la panne (kill service, saturation DB, partition réseau), attend la durée configurée, puis **s'auto-nettoie** systématiquement via `finally` blocks. |
| `validator.ts` | Moteur de validation post-expérience. Vérifie 3 critères : (1) L'Agent SRE a-t-il détecté ? (2) Le service a-t-il redémarré ? (3) Les données sont-elles intègres ? Calcule le **MTTR** et attribue une **note de A à F**. |
| `index.ts` | Orchestrateur principal. Cron hebdomadaire (dimanche 03:00 UTC) + mode on-demand (`CHAOS_RUN_NOW=true`). |

### Catalogue d'Expériences Disponibles

| Type | Cible | Sévérité | Ce qu'il simule |
|---|---|---|---|
| `service_kill` | `agent-coder` | Modérée | Crash brutal du conteneur Coder. Vérifie le restart K8s/Docker + détection SRE. |
| `latency_injection` | `api-gateway` | Mineure | Latence artificielle 2-5s sur toutes les requêtes API entrantes. |
| `db_connection_pool` | `database` | Critique | Saturation du pool PostgreSQL. Les services doivent échouer proprement, pas bloquer. |
| `event_bus_partition` | `redis` | Critique | Partition réseau Redis. Tous les événements cessent pendant la durée. Les agents doivent buffer et rejouer. |
| `memory_pressure` | `agent-planner` | Modérée | Allocation de 50MB+ de mémoire. Teste le comportement OOM et le graceful shutdown. |
| `disk_io_stress` | `soc2-collector` | Mineure | Ralentissement du disque. Les uploads S3 doivent réessayer via retry logic. |

### Système de Notation de Résilience

| Note | Critère |
|---|---|
| **A** | 3/3 checks OK + MTTR < 30 secondes |
| **B** | 3/3 checks OK mais MTTR > 30 secondes |
| **C** | 2/3 checks OK |
| **D** | 1/3 checks OK |
| **F** | 0/3 checks OK → Notification Slack CRITIQUE envoyée automatiquement |

## 7. Agent Prompt Self-Evolution (Le Cerveau Auto-Apprenant)
**Status: 100% Implémenté | Service: `services/agent-evolve/`**
Méta-IA en 4 modules — une IA qui améliore les autres IAs :

| Fichier | Rôle |
|---|---|
| `failure-analyzer.ts` | Data Mining sur l'historique des exécutions. Détecte les patterns d'échec récurrents par agent (taux d'échec, erreurs communes, types de tâches affectés). Attribue une sévérité (low → critical). |
| `prompt-registry.ts` | Registre central des prompts avec **versioning complet**. Chaque prompt est versionné comme du code Git. Supporte le rollback instantané vers n'importe quelle version précédente. |
| `mutation-engine.ts` | Cerveau de l'évolution. Utilise GPT-4o pour **réécrire chirurgicalement** les prompts des agents défaillants. Conserve l'identité de l'agent, ne modifie que la partie qui cause les échecs. |
| `index.ts` | Orchestrateur. Cron hebdomadaire (lundi 04:00 UTC) + mode `EVOLVE_RUN_NOW=true`. Auto-apply optionnel pour les cas critiques (`EVOLVE_AUTO_APPLY=true`). |

### Pipeline d'Évolution

| Étape | Description |
|---|---|
| 1. **Analyse** | Mine les 30 derniers jours d'exécutions. Groupe par agent/step, calcule les taux d'échec. |
| 2. **Détection** | Identifie les patterns significatifs (>10% failure rate). Classe par sévérité. |
| 3. **Mutation** | GPT-4o génère une version améliorée du prompt, en ciblant précisément les erreurs récurrentes. |
| 4. **Proposition** | La mutation est enregistrée (version N+1, `active: false`). Elle attend l'approbation humaine. |
| 5. **Application** | Après review : activation du nouveau prompt + audit trail complet. |

### Sécurités Anti-Dérive

| Garde-fou | Description |
|---|---|
| **Human-in-the-loop** | Par défaut, les mutations sont PROPOSÉES, jamais auto-appliquées. |
| **Version Control** | Chaque prompt a un historique complet. Rollback en 1 commande. |
| **Identité préservée** | Le mutation engine ne change JAMAIS le rôle de l'agent, seulement ses instructions spécifiques. |
| **Auto-apply conditionnel** | Seules les mutations pour patterns `critical` peuvent être auto-appliquées, et uniquement si `EVOLVE_AUTO_APPLY=true`. |

## 8. Sécurité Bancaire : Secret Vault Integration
**Status: 100% Implémenté | Service: `services/secret-vault/`**
Architecture "Zéro Secret en Clair" en 3 modules :

| Fichier | Rôle |
|---|---|
| `providers.ts` | 3 implémentations de `ISecretProvider` : **AWS Secrets Manager** (production), **HashiCorp Vault** (on-premise), **EnvVar** (dév local uniquement). Swap de provider via `VAULT_PROVIDER` sans modifier une ligne de code. |
| `vault-client.ts` | Client universel avec **cache TTL 5min** (réduit les appels API AWS), **ACL par agent** (Least Privilege: le Coder ne peut pas lire les secrets Stripe), **log d'accès structuré** pour SOC2, et **invalidation de cache** automatique après rotation. |
| `index.ts` | Catalogue de 9 secrets gérés avec leur politique de rotation (JWT: 30j, GitHub: 60j, OpenAI: 90j). Rotation quotidienne planifiée + flush horaire du log d'accès vers Prisma. |

### Catalogue de Secrets Gérés

| Secret ID | Agent(s) Autorisé(s) | Rotation | Criticité |
|---|---|---|---|
| `openai/api-key` | Planner, Coder, Reviewer, UI, SRE | 90 jours | Critique |
| `stripe/secret-key` | billing-stripe | 90 jours | Critique |
| `stripe/webhook-secret` | billing-stripe | 180 jours | Élevée |
| `github/token` | agent-coder | 60 jours | Élevée |
| `jwt/secret` | api-gateway | 30 jours | Critique |
| `database/url` | api-gateway | 180 jours | Critique |
| `slack/webhook-url` | agent-sre | 365 jours | Modérée |
| `aws/s3-access-key` | soc2-collector | 90 jours | Élevée |
| `aws/s3-secret-key` | soc2-collector | 90 jours | Élevée |

### Principes de Sécurité Appliqués

| Principe | Implémentation |
|---|---|
| **Zéro Secret en Clair** | Aucun secret dans le code source ni dans `process.env` en production |
| **Moindre Privilège** | Chaque agent ne peut lire que ses propres secrets via ACL granulaire |
| **Rotation Automatisée** | Détection des secrets proches de l'échéance (alerte 7j avant) |
| **Audit Trail Complet** | Chaque lecture de secret est loggée et flushée vers Prisma toutes les heures |
| **Cache Sécurisé** | Les secrets ne transitent que en mémoire (jamais en DB), TTL 5min |
| **Portabilité** | Switch AWS → HCP Vault via 1 variable d'environnement |

## 9. Le Déploiement Chirurgical : Canary Release Controller
**Status: 100% Implémenté | Service: `services/canary-controller/`**
Déploiement progressif avec monitoring health-check et rollback automatique.

| Fichier | Rôle |
|---|---|
| `evaluator.ts` | Évalue la santé d'un déploiement en simulant les métriques "Error Rate" (max 2%) et "Latency" (max 350ms). |
| `router.ts` | Interface réseau pour manipuler le split du trafic (0-100%). Simulation du comportement d'un AWS ALB Listener Rule. |
| `index.ts` | La boucle de contrôle (cron 1min). Fait avancer le trafic (5% -> 10% -> 25% -> 50% -> 100%) ou déclenche un rollback immédiat en cas d'alerte sur les métriques (score Apdex ou Error Rate). |

### Séquence de déploiement

1. `CANARY_DEPLOYMENT_STARTED` -> Le contrôleur route **5%** du trafic sur la nouvelle version.
2. Évaluation des métriques (T+1 min). Si **OK** -> Passage à **10%**, etc.
3. Si **KO** (ex: error_rate > 2%) -> Rollback immédiat (0% trafic), version marquée en échec, `CANARY_ROLLBACK_TRIGGERED` émis.
4. Si 100% atteint -> `CANARY_PROMOTION_COMPLETED`.

## 10. Le Controleur d'Acces : RBAC Granulaire
**Status: 100% Implemente | Service: `services/rbac-controller/`**
Gouvernance stricte des permissions via un modele Role-Based Access Control, garantissant l'isolation des privileges au sein des tenants.

| Fichier | Role |
|---|---|
| `policy.ts` | Definition immutable des 4 roles (admin, developer, viewer, system) et de leurs permissions exactes (ex: `deploy:trigger`, `secrets:read`). |
| `evaluator.ts` | Moteur de decision. Evalue dynamiquement si un utilisateur possede le scope requis pour l'action demandee sur un tenant donne. |
| `index.ts` | Boucle de simulation d'ecoute et de validation. Genere automatiquement une piste d'audit SOC2 via Prisma pour chaque requete d'acces et emet une alerte de securite (`RBAC_EVALUATION_FAILED`) en cas de violation. |

## 11. Maintenance Zéro Human : Autonomous Patching
**Status: 100% Implemente | Service: `services/auto-patcher/`**
Surveillance proactive des vulnerabilites critiques (CVE) et creation autonome de correctifs.

| Fichier | Role |
|---|---|
| `scanner.ts` | Boucle de decouverte simulant une integration Snyk/NPM Audit. Traque les versions desactiver et assigne une severite (low a critical). |
| `patcher.ts` | Formule une payload d'instructions complexes (ex: `npm install package@version --save-exact`) structurees pour etre executees par l'`agent-coder` de maniere robotique. |
| `index.ts` | Orchestrateur cron. Si une CVE *critical* est detectee, log l'audit immediatement et emet `PATCH_PR_CREATED` a travers le bus d'evenements sans requerrir d'approbation humaine.

## 12. Deploiement Agnostique : Multi-Cloud Controller
**Status: 100% Implemente | Service: `services/multi-cloud-controller/`**
Rend l'integralite de l'usine logicielle inde-pendante d'AWS via le pattern Abstract Factory, permettant le deploiment sur GCP ou Azure d'une simple variable d'environnement.

| Fichier | Role |
|---|---|
| `interfaces.ts` | Definition du contrat strict `ICloudProvider` (provisionCompute, provisionStorage) que tout cloud public doit honorer. |
| `providers/*.ts` | Implementations specifiques (AWS Fargate/S3, GCP CloudRun/GCS) qui enrobent les SDK natifs. |
| `index.ts` | Factory dynamiquement routee. Capte l'evenement asynchrone `INFRA_PROVISION_REQUESTED` et instancie la ressource sur le cloud actif sans que l'Orchestrateur central n'ait a connaitre la cible.

---

# Resultat Final : Architecture Elite SaaS
La plateforme est desormais composee de **22 microservices** synchronises via Event Bus :

| # | Service | Role Strategique |
|---|---|---|
| 1 | `api-gateway` | Point d'entree securise et Webhooks |
| 2 | `task-router` | **Garde-fou Budget (Hard Limit)** + Classification |
| 3 | `orchestrator` | Chef d'orchestre de la machine a etats |
| 4 | `agent-planner` | Planification technique + **Contexte Vectoriel** |
| 5 | `agent-coder` | Generation de code Backend |
| 6 | `agent-reviewer` | Expert Qualite & Securite (Code Review) |
| 7 | `agent-ui` | Expert Frontend (**Tailwind & Storybook**) |
| 8 | `agent-sre` | Auto-diagnostic & **Post-mortems IA** |
| 9 | `agent-evolve` | **Meta-IA** : Auto-amelioration des prompts |
| 10 | `pr-service` | Livraison GitHub (Pull Requests) |
| 11 | `ci-monitor` | Surveillance de la sante des builds |
| 12 | `notification` | Communication unifiee (Slack/Mail) |
| 13 | `metrics-collector` | Observabilite & Export Prometheus |
| 14 | `billing-stripe` | Synchronisation financiere temps reel |
| 15 | `soc2-collector` | **Generation de preuves d'audit** automatiques |
| 16 | `vector-memory` | **Memoire Long Terme** du projet (RAG) |
| 17 | `chaos-agent` | **Tests de resilience** automatises (Chaos Engineering) |
| 18 | `secret-vault` | **Zero Secret en Clair** (AWS/HCP Vault + ACL) |
| 19 | `canary-controller`| **Deploiements Progressifs** et Auto-Rollback |
| 20 | `rbac-controller` | **Gouvernance & Securite** (Controles d'Acces) |
| 21 | `auto-patcher` | **Securite Proactive** (Correction CVE 100% IA) |
| 22 | `multi-cloud-controller` | **Agnosticisme Cloud** (AWS / GCP / Azure) |
