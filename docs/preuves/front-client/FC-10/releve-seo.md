# FC-10 — le relevé SEO au SHA de départ (`669cdae`) : hreflang, sitemap, robots, canonical — RIEN n'y est touché

Consigne : « relevé hreflang / sitemap / robots / canonical, sans y toucher ». Lu dans le code ; aucune écriture.

| point | état relevé | où | conséquence (rapportée, pas corrigée) |
|---|---|---|---|
| `canonical` | **présente et ABSOLUE** sur les 10 pages qui appellent `publicMetadata` (accueil, `/salles`, la fiche, CGU, confidentialité, les 5 pages d'authentification) ; sur une variante de `/salles`, elle désigne la page NUE (D216) | `apps/client/src/lib/seo.ts`, `absoluteUrl`, `SITE_ORIGIN` | ⚠ `SITE_ORIGIN` retombe sur `http://localhost:3000` sans `NEXT_PUBLIC_SITE_URL` (`.env.example` le pose à cette valeur) : en production la variable est OBLIGATOIRE (D216) — hors session (consigne, § 4) |
| `robots` (balise) | `index` selon la page, `follow: true` partout ; `noindex` sur les variantes et les pages d'authentification | `publicMetadata` | conforme à D216 |
| `hreflang` | **ABSENT** : `publicMetadata` ne pose que `alternates.canonical`, aucune `alternates.languages` — les versions `/fr/…` et `/ar/…` d'une même page ne se déclarent pas l'une l'autre | `apps/client/src/lib/seo.ts` | un moteur ne sait pas que `/ar/salles/x` est la traduction de `/fr/salles/x` ; à ouvrir dans un lot dédié |
| `sitemap.xml` | **ABSENT** : aucun `app/sitemap.ts` ; `/sitemap.xml` contourne l'intergiciel (chemin à point) et tombe sur la 404 racine (D249) | `apps/client/src/app/` | les fiches ne sont découvertes que par les liens ; à ouvrir dans un lot dédié |
| `robots.txt` | **ABSENT** : aucun `app/robots.ts` ; `/robots.txt` tombe sur la 404 racine | `apps/client/src/app/` | sans effet bloquant (l'absence vaut « tout est permis ») ; à décider avec le sitemap |
| données structurées | **ABSENTES** avant ce lot | — | l'objet de FC-10 |

⚠ Les trois absences (hreflang, sitemap, robots) sont des DÉFAUTS CROISÉS : rapportés ici et au rapport, pas corrigés — un lot ne
corrige pas ce qui parle d'autre chose (CLAUDE.md).
