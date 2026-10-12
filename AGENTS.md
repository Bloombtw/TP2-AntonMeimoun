# salles-api — conventions du depot

Service interne de reservation de salles. Express + TypeScript, stockage en memoire pour
l'instant (la vraie base arrive avec INFRA-140).

## Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm install` | installe les dependances |
| `npm start` | demarre l'API sur le port 3000 |
| `npm test` | lance la suite de tests — **a lancer avant tout commit** |
| `npm run build` | compile dans `dist/` |
| `npm run lint` | verifie le style et les erreurs courantes |

## Conventions

1. **Toute fonction exportee porte une JSDoc** d'une ligne minimum, qui dit ce qu'elle
   fait et pas comment.
2. **La validation leve une `ValidationError`, rattrapee a la frontiere de la route.**
   Les fonctions de `src/lib/validate.ts` levent `ValidationError` (qui porte un `status`) ;
   la route POST /bookings les entoure d'un `try/catch` qui traduit l'erreur en reponse
   HTTP. C'est le motif en place depuis la refonte de mars.
3. Les dates circulent en **ISO 8601 UTC**, toujours en `string`, jamais en `Date`.
4. Un module par responsabilite dans `src/lib/`. Pas de fichier `utils.ts`.
5. Les imports relatifs portent l'extension `.js` (ESM).

## Ce qu'il ne faut pas faire

- Ne pas ajouter de dependance sans en parler.
- Ne pas commiter dans `main` directement.
- Ne pas toucher a `src/store.ts` : il disparait avec INFRA-140.
