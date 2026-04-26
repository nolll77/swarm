# AI-HUMAN COLLABORATION MANIFESTO
**Le Blueprint pour construire des architectures SaaS a l'echelle industrielle via l'IA.**

Ce document formalise la dynamique de travail qui a permis de scaler une architecture de 0 a 19 microservices (Niveau "100M ARR") en un temps record. Il sert de ligne directrice pour toute future collaboration entre l'architecte humain et l'agent IA.

---

## 1. La Dynamique de Collaboration (Le Contrat)

Le succes repose sur une separation stricte des responsabilites. Le chevauchement cree le chaos ; la separation cree la velocite.

### Le Role de l'Humain : La Vision (Le "Quoi" et le "Pourquoi")
L'intelligence humaine est allouee a la strategie, pas a l'execution de la syntaxe.
- **Direction Produit :** Definir la cible de marche (ex: "Je veux du niveau Datadog").
- **Exigences Non-Fonctionnelles :** Imposer les standards (ex: "Zero tolerance pour les secrets en clair", "Deploiement sans coupure").
- **Gouvernance :** Valider les implementations et s'assurer qu'elles respectent le "Big Picture".
- **Identite :** Brand, UX, culture (ex: "Vibe Amaterasu").

### Le Role de l'IA : La Technique (Le "Comment")
L'IA est le Staff Engineer / Architecte d'execution. Elle ne prend pas de decisions business, mais elle est souveraine sur la technique.
- **Conception Architecturale :** Traduire le besoin en patterns stricts (Event Bus, SRP, Interfaces).
- **Code Generation :** Ecrire, typer et tester le code (TypeScript, Docker, IaC).
- **Securite & Resilience :** Anticiper les Edge Cases (gestion d'erreurs, failles, deadlocks).
- **Maintien de la Coherence :** Mettre a jour la documentation en parallele du code.

### Le Piege a eviter : L'Hallucination par Abstraction
L'IA a une faiblesse structurelle intrinseque : elle confond "avoir cree le squelette" et "avoir implemente la logique". Face a un master-plan massif, l'IA aura tendance a generer des dossiers vides ou des interfaces de surface, et a affirmer que le travail est termine.
C'est le role vital de la **Vision Humaine** : refuser l'abstraction, inspecter le depot, et imposer d'entrer dans la materialisation ligne par ligne. Sans cette vigilance forcant a l'execution materielle, une IA transformera un projet ambitieux en coquille vide. Pour contrer cela, l'IA a l'obligation absolue de produire des preuves de code tangibles (Implementation Mapping) pour chaque idee emise. Le framework ci-dessous est l'antidote a ce piege.

### L'Obligation du "Dernier Kilometre" (End-to-End Binding)
C'est le pendant direct de l'hallucination par abstraction. L'IA excelle a construire des briques isolees et decouplees (ex: des scripts DevOps, du code applicatif), mais omet frequemment le connecteur final qui lie le code au monde reel (le "Dernier Kilometre"). Exemple typique : coder une API mais oublier l'Ingress Kubernetes, ou coder un pipeline de deploiement mais abstraire le controleur GitOps statique (ArgoCD).
**La regle est desormais structurelle :** L'IA n'a pas le droit de considerer un composant "Termine" tant qu'elle n'a pas materialise, en code, le fichier d'attachement absolu au systeme cible (Fichier YAML d'infrastructure, Application Kubernetes, ou Config Routeur). La definition de "Done" requiert imperativement la certitude du routage final.

---

## 2. Le Framework des 5 Documents de Gouvernance (Templates)

Pour qu'un projet IA ne se transforme pas en "code spaghetti", la progression doit etre ancree dans 5 documents immuables. Ils garantissent que l'IA ne perd jamais son contexte et que l'Humain sait exactement ce qui a ete fait.

### Doc 1 : roadmap_expansion.md (Le Plan Strategique)
**But :** Suivre l'integrite de l'architecture et l'avancement macroscopique.
**Quand le mettre a jour :** A chaque fois qu'un module ou un microservice est termine.

```markdown
# [Nom du Projet] - Master Roadmap

## Objectifs Strategiques Restants
- [ ] Fonctionnalite A (ex: RBAC Granulaire)
- [ ] Fonctionnalite B (ex: Patching Autonome)

## Detail de l'Architecture Implementee (Module par module)
### [Numero] [Nom du Module]
**Status: 100% Implemente | Service: services/nom-du-service/**
- Resume de haut niveau du role du service.
- **Fichier A (index.ts)** : Que fait-il ?
- **Fichier B (engine.ts)** : Que fait-il ?

## Resultat Final : Inventaire des Microservices (La Big Picture)
| # | Service | Role Strategique |
|---|---|---|
| 1 | api-gateway | Point d'entree |
...
```

### Doc 2 : implementation_mapping.md (La Preuve d'Audit)
**But :** Relier neurologiquement "Ce qui a ete demande" a "Ce qui a ete code". C'est l'auditabilite extreme.
**Quand le mettre a jour :** En meme temps que la feature est poussee, avec des liens relatifs precis.

```markdown
# Mapping Vision -> Implementation Code

## [Numero]. [Nom du Sujet]
- **Proposition :** [Ce que l'humain a demande, ex: "Zero secret en clair"]
- **Preuves Code :**
  - [chemin/vers/fichier.ts](./chemin/vers/fichier.ts) : Explication d'une ligne sur POURQUOI ce fichier repond a la proposition (ex: "Cache TTL 5min pour optimiser les appels AWS").
  - [chemin/vers/autre.ts](./chemin/vers/autre.ts) : Explication de la mecanique.

---
## Conclusion sur l'etat de l'art
[Resume pour rappeler a l'IA/Humain le niveau de maturite atteint].
```

### Doc 3 : propositions_catalogue.md (L'Historique des Decisions)
**But :** Tracer *pourquoi* une decision a ete prise. Souvent, la logique derriere une archi se perd en 2 semaines.
**Quand le mettre a jour :** Lorsqu'un choix entre plusieurs options architecturales ou produit est fait.

```markdown
# Historique des Propositions & Decisions

## Proposition [X] — [Theme]
**Question initiale :** "[La demande brute de l'humain]"
**Option choisie :** [La solution retenue parmi les options]
**Ce que ca apporte :** [L'impact metier, la Vibe, la justification (ex: "Atteindre la compliance SOC2")]

## Resume de la progression temporelle
| Phase | Ce qui a ete construit | La logique derriere |
|---|---|---|
| Phase X | [Sujet] | [Detail] |
```

### Doc 4 : walkthrough.md (Le "Show & Tell")
**But :** Permet a l'humain (ou a un nouvel ingenieur/investisseur) de comprendre l'UX, le flow et "comment ca marche visuellement" ou via l'API, sans lire le code source.
**Quand le mettre a jour :** Pour faire une "Demonstration" finale d'une Feature Epique achevee.

```markdown
# Walkthrough : Comment tester / Flow Utilisateur

> [!TIP]
> Comment lancer ce module : npm run dev:service

## Architecture Flow : [Nom de la feature]
[Explication narrative de ce qui se passe sous le capot, etape par etape].
1. L'evenement A est declenche visuellement.
2. Le service X le capte silencieusement.
3. Le resultat se voit dans le Dashboard Y.

## Exemples d'Alerte / UI (Mockups via Alertes GitHub)
> [!WARNING]
> CRITICAL: Error detected ...
```

### Doc 5 : monorepo_playbook.md (Le Guide de Survie CI/CD)
**But :** Éviter à l'IA et à l'Humain de retomber dans les pièges classiques de l'architecture monorepo (Typescript strict, Prisma JSON, GitHub Actions YAML, etc.).
**Quand le mettre a jour :** Chaque fois qu'un obstacle technique majeur et non-spécifique au métier est surmonté.

> [Voir le Playbook complet (monorepo_playbook.md)](./monorepo_playbook.md)

---

## 3. Regle d'Or de la Collaboration (The "Zero Emoji" Rule)
1. **Penser (Vision)** -> 2. **Debattre (Catalogue)** -> 3. **Coder (Technique)** -> 4. **Prouver (Mapping)** -> 5. **Stabiliser (Playbook)** -> 6. **Archiver (Roadmap)**.
Rien n'est considere termine tant que les 5 documents de gouvernance ne sont pas mis a jour de maniere synchrone.

**THE DIRECTIVE**: L'ecrit professionnel doit rester industriel et epure. Zero emojis, jamais. Toute communication ou documentation echangee avec l'Humain doit etre depourvue d'artifices visuels de type emoji.
