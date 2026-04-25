# Project Context: Amaswarn

## Architecture
- **Distributed Swarm:** 22 Microservices (Docker/Kubernetes).
- **Event-Driven:** Redis Pub/Sub (Bus).
- **Decision Engine:** Multi-agent (Planner, Coder, Reviewer).

## Stack
- **Backend:** Node.js, TypeScript, OpenAI API, Octokit.
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion.
- **Database:** Prisma (PostgreSQL), Local Vector DB (Simulated).

## Conventions
- **Naming:** CamelCase for variables, Kebab-case for services.
- **Folder structure:** Monorepo (services/, packages/, dashboard/).

## Constraints
- **Multi-tenant:** Absolute isolation via tenantId.
- **Social Proof:** SOC2, RGPD, ANSSI compliance.
