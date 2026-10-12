# Captures — preuves du TP2

Chaque capture est la sortie **réelle** d'une commande exécutée (pas un copier-coller).
Elles se lisent avec le [`DIAGNOSTIC.md`](../DIAGNOSTIC.md) à la racine.

## Avant (le dépôt « malade »)

| Capture | Ce qu'elle montre |
|---|---|
| `01-avant-lint.png` | `npm run lint` vert, mais `rules: {}` : il ne vérifie rien |
| `02-avant-typecheck.png` | `npm run typecheck` vert, mais `price.ts` est en `@ts-nocheck` |
| `03-avant-tests.png` | `npm run test:unit` : 5 passed / 4 skipped, 2 fichiers sur 4 |
| `04-avant-scripts-manquants.png` | `npm test` et `npm run build` → `Missing script` |
| `05-avant-bugs-caches.png` | Les 2 tests exclus, forcés : `'5020'` au lieu de `70`, et `409` au lieu de `201` |
| `06-avant-hooks-morts.png` | husky non installé, `core.hooksPath` absent, `.git/hooks` vide |
| `07-avant-ci.png` | CI : les tests sont commentés |

## Après (le dépôt réparé)

| Capture | Ce qu'elle montre |
|---|---|
| `08-apres-hook-commit-vert.png` | `git commit` : le hook pre-commit tourne (lint + types + 24 tests verts) |
| `09-apres-hook-bloque.png` | Le hook **refuse** un commit cassé : `exit 1`, HEAD inchangé |
| `10-apres-endpoint-availability.png` | L'API tourne : `GET /rooms/:id/availability` répond (200 / 404 / 400) |
