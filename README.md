# AI Dev Platform

AI-powered software engineering platform that transforms GitHub issues into validated pull requests using autonomous AI agents with CI safety gates.

## Architecture

```
GitHub ──> API Gateway ──> Event Bus (Redis Streams)
                                |
            +-------------------+--------------------+
            |                   |                    |
       Task Router        Orchestrator          CI Monitor
            |                   |                    |
            |        +----------+----------+         |
            |        |          |          |         |
         Planner   Coder    Reviewer    PR Service   |
            |        |          |          |         |
            +--------+----------+----------+---------+
                                |
                         Notification
                          + Metrics
```

## Monorepo Structure

```
packages/
  shared/           Shared types, constants, utilities
  database/         Prisma schema, migrations, DB client
  events/           Event bus (Redis Streams pub/sub)
  logger/           Structured JSON logging

services/
  api-gateway/      HTTP webhooks, REST API, auth
  task-router/      Issue triage, risk classification
  orchestrator/     Pipeline state machine
  agent-planner/    AI planning agent
  agent-coder/      AI code generation agent
  agent-reviewer/   AI code review agent
  pr-service/       GitHub PR lifecycle
  ci-monitor/       CI result surveillance
  notification/     Slack, email, webhook notifications
  metrics-collector/ Prometheus metrics, health checks

infra/
  docker/           Multi-stage Dockerfiles
  kubernetes/       K8s deployments, HPA, ingress
  terraform/        AWS VPC, ECS, RDS, ElastiCache, ALB, S3

policies/           Risk rules, merge policy, agent permissions
scripts/            Bootstrap, seed, deploy scripts
docs/               Architecture, event flow, API reference
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker + Docker Compose
- OpenAI API key

### Setup

```bash
# Clone and bootstrap
git clone <repo-url>
cd ai-dev-platform

# Run bootstrap (installs deps, sets up DB, seeds data)
bash scripts/bootstrap.sh

# Fill in your API keys
vi .env

# Start all services
docker-compose up
```

### Access Points

| Service | URL |
|---|---|
| API Gateway | http://localhost:3000 |
| Prometheus Metrics | http://localhost:9090/metrics |

## Pipeline Flow

1. **Ingestion**: GitHub issue webhook received by API Gateway
2. **Triage**: Task Router classifies risk level and task type
3. **Planning**: Planner Agent generates implementation plan via LLM
4. **Coding**: Coder Agent generates minimal code diff
5. **Review**: Reviewer Agent evaluates code quality and security
6. **Auto-Fix**: On review failure, Coder re-generates with feedback (max 3 iterations)
7. **PR Creation**: PR Service creates branch and opens GitHub PR
8. **CI Monitoring**: CI Monitor watches check suite results
9. **Notification**: Results pushed to Slack, email, or webhooks

## Safety Mechanisms

- Max 3 auto-fix iterations per task
- High-risk modules (auth, billing) blocked from auto-processing
- Unsafe tasks (destructive keywords) rejected immediately
- All actions logged to audit trail
- Per-tenant rate limiting and budget controls
- CI gates as absolute blockers

## Configuration

### Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/ai_dev_saas
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### Policies

Edit YAML files in `policies/` to configure:
- `risk-rules.yaml` - Risk classification per module
- `merge-policy.yaml` - Auto-merge conditions
- `agent-permissions.yaml` - Agent capabilities and rate limits

## Tech Stack

- **Runtime**: Node.js / TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: Redis Streams (event-driven)
- **AI**: OpenAI GPT-4o
- **Git**: Octokit (GitHub API)
- **Build**: Turborepo (monorepo)
- **Infra**: Docker, Kubernetes, Terraform (AWS)
- **Monitoring**: Prometheus-format metrics

## License

Proprietary
