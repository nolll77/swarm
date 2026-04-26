# TypeScript Monorepo Stabilization Playbook

Ce document fait office de *post-mortem* de la stabilisation de l'architecture Amaswarn. Il recense les pièges classiques inhérents aux architectures **Monorepo (Turborepo) + TypeScript Strict + Prisma + GitHub Actions** et pose les règles d'or pour les éviter sur les futurs projets.

---

## 1. Le Piège du "Silence TypeScript" (Les tsconfig fantômes)
**Le problème :** Dans un monorepo contenant 25 packages/services, si un seul dossier n'a pas de fichier `tsconfig.json`, `npm run build` ou `tsc` échouera en chaîne avec des erreurs cryptiques (comme le refus de compiler ou des types globaux introuvables).
**L'erreur rencontrée :** Des centaines d'erreurs d'import sur `@ai-dev/shared` parce que les services n'avaient pas les règles de résolution de base.
> [!IMPORTANT]
> **Règle d'or :** Aucun package (backend ou frontend) ne peut exister sans son propre `tsconfig.json` déclarant explicitement ses `compilerOptions` et ses bibliothèques (`lib`). Si un service est un "wrapper" vide, il lui faut quand même son tsconfig étendant la configuration de base.

## 2. Le Piège des Itérateurs (Le syndrome du Spread Operator)
**Le problème :** Faire `[...new Set(array)]` est une syntaxe standard en JS. Mais sous TypeScript strict, la décomposition (spread) d'un opérateur réclame la définition du type `Symbol.iterator`.
**L'erreur rencontrée :** `Type 'unknown' must have a '[Symbol.iterator]()' method.`
> [!TIP]
> **Règle d'or :** 
> 1. Activer `"lib": ["es2020", "es2015.iterable"]` partout via un tsconfig partagé.
> 2. Coder de façon défensive pour la conversion Set -> Array : utiliser `Array.from(new Set(...))` plutôt que le spread `[...new Set()]`, ce qui évite la majorité des confusions de type.

## 3. Le Piège de la Rigidité de Prisma (Le cauchemar du type Json)
**Le problème :** L'écosystème JS adore le type `Record<string, unknown>` pour signifier "un objet quelconque sécurisé". Mais Prisma dispose d'un type interne strict (`InputJsonValue`) qui refuse `unknown` par précaution (car un `unknown` pourrait cacher une fonction non-sérialisable).
**L'erreur rencontrée :** `Type 'Record<string, unknown>' is not assignable to type 'JsonNull | InputJsonValue...'`.
> [!IMPORTANT]
> **Règle d'or :** Toujours créer une fonction unifiée (ex: `toJsonSafe()`) dans le dossier `shared`. Cette fonction convertit explicitement tout objet en `any` (ou caste en type Prisma localement) après un passage radical dans `JSON.parse(JSON.stringify())` pour détruire tout ce qui n'est pas serialisable.

## 4. Le Piège des Templates Literals (Le Backtick non-échappé silencieux)
**Le problème :** Dans l'écriture de prompts complexes pour les LLM, on utilise souvent des backticks (`` ` ``) pour structurer le texte. Si le "template literal" TypeScript englobant utilise lui aussi des backticks, le moindre backtick non-échappé à l'intérieur fermera la chaîne prématurément. TypeScript tentera d'interpréter le texte qui suit comme du vrai code (`.stories.tsx`).
**L'erreur rencontrée :** `Property 'stories' does not exist on type '"You are an Elite Frontend..."'`
> [!WARNING]
> **Règle d'or :** Dans les prompts contenant des blocs de code ou des noms de fichiers formatés en markdown, il faut **absolument** échapper les backticks : `` \`.stories.tsx\` ``. 

## 5. Le Piège YAML de GitHub Actions (La malédiction des Deux-Points)
**Le problème :** Les parseurs YAML interprètent le caractère `:` suivi d'un espace comme le début d'une association clé-valeur. Si on tape une commande inline contenant un deux-points (même entre guillemets parfois selon le parseur exact), le YAML est corrompu.
**L'erreur rencontrée :** `Invalid workflow file: You have an error in your yaml syntax` sur `run: echo "Config: missed..."`
> [!TIP]
> **Règle d'or :** Dans GitHub Actions, bannir les étapes `run` sur une seule ligne dès qu'elles contiennent des syntaxes complexes ou des ponctuations. Toujours utiliser le *block scalar* (`|`) :
> ```yaml
> run: |
>   echo "My complex text with : and ''"
> ```

## 6. Le Piège de Couplage Frontend/Backend en CI
**Le problème :** Un monorepo mélange souvent des applications Vite (Frontend) et des microservices Node (Backend). Les chaines de build sont fondamentalement différentes (Vite vs tsc direct). L'inclure dans un pipeline Node strict fait échouer l'ensemble du SaaS parce qu'il manque un loader PostCSS ou un paramètre ESM local.
**L'erreur rencontrée :** Déploiements backend bloqués par des échecs de build `dashboard`.
> [!IMPORTANT]
> **Règle d'or :** Isoler le frontend. Dans le CI/CD principal, utiliser les filtres Turbo (`npx turbo run build --filter=!dashboard`). Le frontend (Dashboard) doit avoir son propre workflow de build séparé (ou être géré via Vercel/Netlify en direct).

---

## Conclusion
Les erreurs TypeScript ou CI dans de gros monorepos paraissent souvent indéchiffrables en surface. La recette secrète en mode "SRE" est d'isoler l'étape :
1. **Échouer bruyamment :** Forcer le CI/CD à imprimer le diagnostic spécifique (le `--pretty` de `tsc`) via une étape de recovery.
2. **Centraliser :** Plutôt que de patcher 6 microservices, on patche 1 abstraction dans `@ai-dev/shared`.
