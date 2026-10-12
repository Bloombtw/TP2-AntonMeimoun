# DIAGNOSTIC — TP2 « Le repo malade »

Service audité : `salles-api` (chaîne d'agents OpenCode `.opencode/`).
Méthode : chaque brique du harness vue en cours a été passée au crible, en
privilégiant la **démonstration** (commande lancée + sortie) sur la déduction.

Les preuves sont des captures PNG, dans [`captures/`](captures/). Chaque problème
ci-dessous renvoie à la capture qui le montre.

> **Note d'honnêteté sur l'environnement.** OpenCode n'était pas installable dans
> l'environnement d'exécution (pas de binaire `opencode`, pas de clés pour les modèles
> `deepseek-v4-*`). La **chaîne d'agents elle-même n'a donc pas pu être lancée**. Les
> constats sur les agents / droits / MCP s'appuient sur la lecture des fichiers de
> configuration **et sur l'historique git** (`git show` des commits fautifs). Tous les
> constats sur le code, le lint, les types, les tests, les hooks et la CI sont, eux,
> **intégralement démontrés par des commandes exécutées** (captures `01` à `10`).

---

## 1. Synthèse

| # | Brique du cours | Symptôme | Fichier (cause) | Preuve |
|---|---|---|---|---|
| 1 | Lint & types / Tests | Prix week-end = `"5020"` au lieu de `70` | `src/lib/price.ts` | `05`, `03` |
| 2 | Tests | Créneaux bout-à-bout refusés (409) à tort | `src/lib/overlap.ts` | `05` |
| 3 | Tests | La moitié des tests ne s'exécutent jamais | `vitest.config.ts` + noms `.test.ts` | `03`, `05` |
| 4 | Lint | ESLint ne vérifie **rien** (`rules: {}`) | `eslint.config.js` | `01` |
| 5 | Types | `@ts-nocheck` masque le bug de prix | `src/lib/price.ts` | `02`, `05` |
| 6 | Hooks | Le pre-commit n'est **pas branché**, jamais exécuté | `.husky/`, `package.json` | `06`, `08`, `09` |
| 7 | CI & Git | Les tests sont commentés dans la CI | `.github/workflows/ci.yml` | `07` |
| 8 | Rules | `npm test` et `npm run build` documentés mais absents | `package.json` vs `AGENTS.md` | `04` |
| 9 | Rules | Convention « Result, jamais throw » fausse à 100 % | `AGENTS.md` | `diff` |
| 10 | Droits | L'architecte a `edit`+`bash:*` alors qu'il « n'écrit jamais » | `.opencode/agent/architect.md` | git `865177b` |
| 11 | Droits | L'explorer (lecture seule) a `edit: allow` non borné | `.opencode/agent/explorer.md` | diff |
| 12 | Subagents | Le planner est `mode: primary` → injoignable via `task` | `.opencode/agent/planner.md` | diff |
| 13 | Subagents | Le tester existe mais n'est dans aucun roster | `.opencode/agent/architect.md` | diff |
| 14 | MCP | `salles-db` référence `${SALLES_MCP_TOKEN}`, absent de `.env` | `opencode.json` / `.env` | grep |

---

## 2. Détail des problèmes corrigés

### 1. Majoration de week-end : une `string` au lieu d'un nombre — *(Lint & types / Tests)*
**Symptôme.** `priceFor()` renvoie `"5020"` (string) au lieu de `70` un samedi.
`const WEEKEND_SURCHARGE = "20"` est une chaîne : `base (50) + "20"` → concaténation `"5020"`.
**Cause.** `src/lib/price.ts`.
**Preuve.** Capture `05` : `expected '5020' to be 70`.
**Correctif.** `WEEKEND_SURCHARGE = 20` (nombre) + suppression du `@ts-nocheck` (cf. #5).
C'est exactement le genre de bug que « le filet attrape une fois remis en état ».

### 2. Chevauchement : intervalle semi-ouvert mal implémenté — *(Tests)*
**Symptôme.** Deux réservations bout-à-bout (09–10 puis 10–11) sont refusées avec un
`409 creneau deja reserve`, alors qu'elles ne se chevauchent pas.
**Cause.** `src/lib/overlap.ts` : le commentaire dit `[début, fin[` mais le code teste
`a1 <= b2 && b1 <= a2`. Pour un intervalle semi-ouvert il faut `<` strict.
**Preuve.** Capture `05` : `POST /bookings … expected 409 to be 201`.
**Correctif.** `return a1 < b2 && b1 < a2;`

### 3. La moitié de la suite de tests ne tourne jamais — *(Tests)*
**Symptôme.** `npm run test:unit` annonce « 5 passed » alors qu'il existe 4 fichiers de
test. `test/bookings.test.ts` et `test/price.test.ts` sont **silencieusement exclus** —
or ce sont précisément les deux qui attrapent les bugs #1 et #2.
**Cause.** `vitest.config.ts` : `include: ["test/**/*.spec.ts"]` ; deux fichiers sont
nommés `.test.ts`. Le commentaire du fichier affirme pourtant « la convention du dépôt
est `*.spec.ts` » (INFRA-205).
**Preuve.** Capture `03` (5 passed / 4 skipped) vs capture `05` (les tests exclus, forcés,
échouent).
**Correctif.** Renommage `bookings.test.ts → bookings.spec.ts`, `price.test.ts →
price.spec.ts` (on respecte la convention annoncée plutôt que d'élargir le glob). J'ai
aussi réactivé le test « bout-à-bout » (il était `it.skip`, il masquait le bug #2) et
remplacé deux stubs vides (`expect(true).toBe(true)`) par de vrais tests de bornes.

### 4. ESLint ne vérifie rien — *(Lint)*
**Symptôme.** `npm run lint` est vert sur n'importe quoi : `rules: {}`.
**Cause.** `eslint.config.js` (« les règles seront choisies avec l'équipe », INFRA-212 —
restées vides).
**Preuve.** Capture `01`.
**Correctif.** Activation de `tseslint.configs.recommended` + `no-unused-vars`, `eqeqeq`,
`no-var`, `prefer-const`. Relancé sur le code existant : vert (capture `08`).

### 5. `@ts-nocheck` sur le seul fichier qui avait un bug de type — *(Types)*
**Symptôme.** `npm run typecheck` vert, alors que `price.ts` additionne un `number` et une
`string`. La première ligne du fichier est `// @ts-nocheck`.
**Cause.** `src/lib/price.ts`.
**Preuve.** Capture `02` (vert) ; capture `05` (le bug qui passait au travers).
**Correctif.** Suppression du `@ts-nocheck` ; le typage mord désormais.

### 6. Le hook pre-commit n'est pas branché — *(Hooks)*
**Symptôme.** `.husky/pre-commit` existe mais ne s'exécute **jamais** : `husky` est absent
de `package.json`, il n'y a pas de script `prepare`, `core.hooksPath` n'est pas défini,
`.git/hooks/` est vide, et `.husky/_/husky.sh` (que le script source) n'existe pas.
**Cause.** `package.json` (pas de dépendance ni de `prepare`) + `.husky/pre-commit`
(format husky v8 déprécié).
**Preuve.** Capture `06` (état mort) → capture `08` (le hook s'exécute au commit) →
capture `09` (le hook **refuse** un commit cassé : `git commit` renvoie 1, HEAD inchangé).
**Correctif.** Ajout de `husky` en devDep + `"prepare": "husky"`, réinstall (génère
`.husky/_` et pose `core.hooksPath=.husky/_`), réécriture du hook au format v9 :
`npm run lint && npm run typecheck && npm test`.

### 7. La CI ne lance pas les tests — *(CI & Git)*
**Symptôme.** La CI est verte mais ne prouve que le lint (vide, cf. #4). Les tests sont
commentés : `# - run: npm run test:unit   # TODO remettre, ca bloquait les merges`.
**Cause.** `.github/workflows/ci.yml` (commit `07a2c4d fix ci`). « Ça bloquait les merges »
= les tests échouaient (bugs #1/#2).
**Preuve.** Capture `07`.
**Correctif.** Réactivation de `npm run typecheck` **et** `npm test` dans la CI.

### 8. `AGENTS.md` documente des commandes qui n'existent pas — *(Rules)*
**Symptôme.** `AGENTS.md` liste `npm test` (« à lancer avant tout commit ») et
`npm run build` (« compile dans dist/ »). Les deux renvoient `Missing script`.
**Cause.** `package.json` n'a que `test:unit`, pas de `test` ni de `build`.
**Preuve.** Capture `04`.
**Correctif.** Ajout de `"test": "vitest run"` et `"build": "tsc -p tsconfig.build.json"`
(+ `tsconfig.build.json` qui émet dans `dist/`). Les instructions du dépôt redeviennent
vraies, et le hook/CI peuvent s'appuyer dessus.

### 9. `AGENTS.md` décrit une convention que zéro ligne de code ne suit — *(Rules)*
**Symptôme.** Règle 2 : « Les erreurs remontent en `Result`, jamais en `throw`… plus de
`try/catch` dans les routes ». Or **aucun** type `Result` n'existe dans `src/`, et tout le
code lève (`validate.ts`) et rattrape (`routes/bookings.ts` a un `try/catch`).
**Cause.** `AGENTS.md` (le fichier d'instructions ne dit pas la vérité sur le dépôt).
**Preuve.** `grep -rn "Result" src/` → rien ; `throw` dans `validate.ts` et `bookings.ts`.
**Correctif.** Règle réécrite pour décrire le motif réel (`ValidationError` levée,
rattrapée à la frontière de la route). On corrige le **document**, pas 100 % du code qui,
lui, est cohérent avec lui-même.

### 10. L'architecte a tous les droits alors qu'il « n'écrit jamais » — *(Droits)*
**Symptôme.** `description:` dit « delegates every sub-task… **Never writes code** », mais
la permission est `edit: allow` et `bash: {"*": allow}`.
**Cause.** `.opencode/agent/architect.md`, commit `865177b architect: unblock, trop de
refus de permission en session` : l'architecte était read-only (`edit: deny`, bash limité
à `git status/diff/log/branch`, `ls`), il a été « débloqué » d'un coup.
**Preuve.** `git show 865177b` (passage de `edit: deny` → `edit: allow`, bash → `*: allow`).
**Correctif.** Restauration du jeu read-only d'origine ; le corps du prompt est réaligné
(« tu lis pour comprendre et vérifier ; toute écriture passe par `dev` »).

### 11. L'explorer (rôle lecture seule) peut tout éditer — *(Droits)*
**Symptôme.** `explorer.md` dit « No fixes, no refactoring advice », mais a `edit: allow`
sans restriction. Il n'a besoin d'écrire que ses notes dans `.opencode/plans/`.
**Cause.** `.opencode/agent/explorer.md`.
**Correctif.** `edit` borné à `.opencode/plans/*.md` (comme le planner).

### 12. Le planner est injoignable — *(Subagents)*
**Symptôme.** L'architecte délègue au `planner` via `task` (étape 2 de sa boucle), mais
`planner.md` est `mode: primary`. Un agent primary n'est pas une cible de sous-agent :
l'étape « plan » de la chaîne ne peut pas s'exécuter.
**Cause.** `.opencode/agent/planner.md`.
**Correctif.** `mode: subagent`. On retombe alors sur « 1 primary (architect) + 6
subagents », conforme au README.

### 13. Le tester n'est dans aucun roster — *(Subagents)*
**Symptôme.** `tester.md` existe (`mode: subagent`) mais n'apparaît pas dans la table
d'équipe de l'architecte : il n'est jamais délégué, donc inutilisable par la chaîne.
**Cause.** `.opencode/agent/architect.md`.
**Correctif.** Ajout de la ligne `tester` au roster (QA sur l'app qui tourne).

### 14. MCP `salles-db` : jeton non défini — *(MCP)*
**Symptôme.** `opencode.json` déclare le MCP `salles-db` avec
`Authorization: Bearer ${SALLES_MCP_TOKEN}`, mais `.env` ne définit pas `SALLES_MCP_TOKEN`
(il n'y a que `SALLES_DB_URL`). Le serveur pointe de plus vers un hôte interne
`mcp.internal.salles.lan` non résoluble hors réseau.
**Cause.** `opencode.json` / `.env`.
**Preuve.** `grep -c SALLES_MCP_TOKEN .env` → `0`.
**Correctif.** Documenté ici. Le jeton est un secret d'infra que je ne possède pas ; je
**n'invente pas** de valeur. Je signale la variable manquante plutôt que de « réparer » en
désactivant le MCP, car il peut être légitime en production.

---

## 3. Ce que j'ai choisi de **ne pas** corriger (et pourquoi)

Le sujet prévient : certains choix *ressemblent* à des erreurs mais sont délibérés.
Les signaler comme défauts serait compté contre moi. Après avoir lu ce qui les entoure :

- **`scripts/checks.sh` renvoie toujours `exit 0`.** Délibéré et documenté
  (INFRA-231) : ce script est le hook *post-écriture* de l'agent ; il doit l'avertir sans
  l'interrompre en plein travail. Ce n'est **pas** le filet de pre-commit (lequel, lui,
  doit bloquer — cf. #6). Les deux coexistent correctement.
- **`src/store.ts` non modifié.** `AGENTS.md` : « Ne pas toucher à `src/store.ts` : il
  disparaît avec INFRA-140. » Respecté.
- **Absence de JSDoc dans `src/lib/`.** `src/lib/AGENTS.md` l'exige explicitement
  (« Pas de JSDoc ici »), en surcharge de la règle globale. Cohérent, pas un défaut.
- **`src/lib/AGENTS.md` : « un `export default` par module ».** Aucun module de `src/lib/`
  n'a de default export, mais `price.ts` indique être « repris du script de facturation » :
  ces scripts de facturation vivent **hors du dépôt** et sont les consommateurs visés par
  la règle. Je n'ai donc ni ajouté de default exports factices (slop sans consommateur
  visible) ni accusé la règle. Simple observation.
- **`.env` : `STRIPE_SECRET_KEY=sk_test_FAKE_TEACHING_FIXTURE…`.** Marqué « JEU DE DONNÉES
  PÉDAGOGIQUE, aucune valeur réelle ». Pas une fuite de secret.
- **Test `legacy-bookings` laissé en `it.skip`.** Documenté (INFRA-198) : la fixture
  `test/fixtures/legacy-bookings.json` n'a jamais été versée ; réactiver sans elle casse
  au chargement. À remettre le jour où la fixture arrive — je ne fabrique pas de fausses
  données.
- **MCP `github` / `notion` / `slack` / `sentry` / `playwright`.** Déclarés mais non
  vérifiables sans exécuter OpenCode. Plusieurs semblent sur-dimensionnés pour une petite
  API de réservation, mais « une brique présente en trop » n'est pas démontrable ici sans
  les lancer : je le signale sans supprimer, faute de preuve.

---

## 4. Exercice 1 — la chaîne avant / après

La tâche demandée (« Ajoute un endpoint `GET /rooms/:id/availability?date=YYYY-MM-DD`… »)
a été implémentée (`src/lib/availability.ts` + route dans `src/routes/rooms.ts` +
`test/availability.spec.ts`). Faute de pouvoir exécuter OpenCode (voir note d'honnêteté),
l'avant/après est mesuré sur **l'état du dépôt et de son filet**, ce qui est l'objet réel
du TP :

| | Avant | Après |
|---|---|---|
| Fichiers de test exécutés | 2 / 4 | 5 / 5 |
| Tests exécutés | 5 (+4 skip) | 24 (+1 skip documenté) |
| Bugs attrapés par le filet | 0 (les 2 tests qui mordent sont exclus) | 2 attrapés puis corrigés |
| `npm run lint` | vert mais vérifie `{}` | vert avec règles réelles |
| `npm run typecheck` | vert, `price.ts` en `@ts-nocheck` | vert, `price.ts` typé |
| `npm test` / `npm run build` | `Missing script` | OK |
| Hook pre-commit | fichier mort | branché, **bloque** un commit rouge |
| CI | lint seul | lint + typecheck + tests |
| Endpoint `availability` | absent | présent, testé, servi (capture `10`) |

Captures : `01`–`07` (avant), `08`–`10` (après).

Preuve de non-régression + détection : capture `09` — en réintroduisant le bug #2, le
hook refuse le commit (`exit 1`), ce que l'ancien dépôt laissait passer.
