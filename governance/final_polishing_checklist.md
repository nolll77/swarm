# Checklist de Polissage Final (V1 → Enterprise SaaS)

Ce document trace les dernières étapes nécessaires pour finaliser la transition du MVP vers la plateforme industrielle.

---

## 1. Archivage du Code Legacy
- [x] Création du dossier `/legacy`.
- [x] Déplacement de l'ancien dossier `api/` (V1).
- [x] Déplacement de l'ancien dossier `worker/` (V1).
  - *Objectif :* Clarifier la racine du projet et éviter les conflits de dépendances.
  - *Preuve :* Seuls les dossiers `/packages`, `/services`, `/infra`, `/dashboard` et `/policies` doivent rester actifs.

## 2. Consolidation du Monorepo
- [x] Vérification du `package.json` racine pour inclure tous les `workspaces`.
- [x] Test des scripts Turbo (`npm run build`).
- [x] Harmonisation des versions de Node/TypeScript entre les services.

## 3. Santé de la Base de Données
- [x] Vérification du script `packages/database/src/seed.ts` (doit créer un tenant de test par défaut).
- [x] Exécution de `npx prisma generate` à la racine pour synchroniser tous les modules.

## 4. Documentation & Onboarding
- [x] Validation finale du `README.md` (liens internes, instructions de démarrage).
- [x] Vérification de `.env.example` (présence de toutes les variables requises pour les 10 services).

## 5. Sécurité Globale
- [x] Suppression des fichiers `.env` qui auraient pu être créés par erreur dans les sous-dossiers.
- [x] Vérification des permissions par défaut dans `policies/risk-rules.yaml`.

---

## État actuel du Cleanup
- **Statut :** Formellement Complété (Backend et Frontend CI au vert).
- **Prochaines actions techniques (TODO) :**
  - [ ] **Validation UI :** Tester visuellement le Dashboard Vite en local (`npm run dev --workspace=dashboard`) et ajuster les finitions front-end.
  - [ ] **Déploiement Cloud :** Finaliser les manifestes d'infrastructure AWS ECS (`infra/aws/ecs.tf`) et injecter les secrets réels de production dans GitHub Actions.
