# 🥋 SUIVI DE PROJET — FRONTKICK
> Dernière mise à jour : 23/03/2026

---

## 🎯 Vision du projet
Média de référence sur tous les sports de combat et arts martiaux.
Stratégie : TikTok viral → rediriger l'audience vers le site une fois la version aboutie.

**Nom :** FrontKick
**URL actuelle :** https://frontkick.vercel.app
**Domaine cible :** frontkick.fr (à acheter)
**Repo GitHub :** SuperFredo22/Frontkick (branche main, REPO PUBLIC)
**Tagline :** "Le média des sports de combat. Analyses, guides et équipement pour pratiquants et passionnés."

---

## 🛠️ Stack technique
- Framework : Astro 4
- Déploiement : Vercel (auto sur chaque push GitHub)
- IA articles auto : Gemini 2.5 Flash Lite (gratuit, 0€)
- Automatisation : GitHub Actions (3 articles/jour à 7h/12h/18h UTC)
- Agent code : Base44 superagent (Ubbe) — connecté au repo GitHub via OAuth
- Stratégie : Claude pour réflexion/contenu/diagnostic, Base44/Ubbe pour modifications de code

---

## 📍 Phases du projet
- [x] Phase 1 — Site + automatisation ✅
- [ ] Phase 2 — Contenu, SEO, pages manquantes ← EN COURS
- [ ] Phase 3 — TikTok viral + croissance
- [ ] Phase 4 — Redirection TikTok → site
- [ ] Phase 5 — Monétisation (AdSense + affiliés Amazon)

---

## ✅ Ce qui est fait (23/03/2026)
| Réalisation | Date |
|-------------|------|
| Site Astro 4 déployé sur Vercel | — |
| Navigation complète (MMA, Boxe, Kickboxing, Muay Thaï, Grappling, Autres, Guides, Actualités, Classements) | — |
| Footer avec toutes les disciplines | — |
| Mode sombre/clair (toggle) | — |
| 3 articles/jour auto via GitHub Actions — Gemini 2.5 Flash Lite | — |
| Rotation types : actualite / fond / personnalite | — |
| Page /classements UFC | — |
| sitemap-index.xml ✅ fonctionnel | 22/03 |
| robots.txt ✅ en place | 22/03 |
| JSON-LD schema.org Article sur les articles | 22/03 |
| meta og:type + article:published_time + article:author | 22/03 |
| 28 articles validés poussés dans le repo | 22/03 |
| Page /search créée (client-side filtering) | 22/03 |
| Page /recherche → redirect vers /search | 22/03 |
| **Audit et correction des sports invalides** — 10 articles (lethwei/sambo/sanda/savate/k1 → autres/kickboxing) | 23/03 |
| **Fix /actualites** — gradients complets, tri date desc, affiche bien les articles | 23/03 |
| **Fix homepage** — actualités prioritaires + tri date décroissante + gradient "autres" | 23/03 |
| **Fix barre de recherche** — form action="/search" (était "/recherche") | 23/03 |
| **Moteur de recherche fuzzy** — normalisation unicode, Levenshtein, scoring par champ | 23/03 |
| **Google Analytics 4** — code intégré dans Base.astro, conditionné au consentement cookies | 23/03 |

---

## ⚠️ Problèmes connus
| Problème | Détail | Statut |
|----------|--------|--------|
| Classements UFC inexacts | Anti-scraping → solution fichier JSON manuel à prévoir | ⬜ À faire |
| Google Analytics 4 | Code en place MAIS ID placeholder → remplacer G-XXXXXXXXXX par le vrai ID | ⬜ **ACTION REQUISE** |
| Google Search Console | Sitemap à soumettre manuellement | ⬜ **ACTION REQUISE** |

---

## 🔴 SCHÉMA FRONTMATTER — RÈGLE ABSOLUE

### Fichier de référence : `frontkick/src/content/config.ts`
```typescript
import { defineCollection, z } from 'astro:content';
const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    sport: z.string(),
    category: z.string(),
    date: z.string(),
    excerpt: z.string().optional(),
    featured: z.boolean().optional().default(false),
  }),
});
export const collections = { articles };
```

### Frontmatter correct (template à respecter absolument)
```yaml
---
title: "Titre de l'article"
sport: mma
category: analyse
date: "2026-03-22"
excerpt: "Description courte de l'article."
---
```

### Valeurs autorisées
**sport :** mma | boxe | kickboxing | muay-thai | grappling | karate | equipement | autres
**category :** actualite | guide-debutant | conseil-entrainement | analyse | guide-equipement

### Correspondance navigation → valeur sport
| Onglet sur le site | Valeur sport dans le frontmatter |
|--------------------|----------------------------------|
| MMA | mma |
| BOXE | boxe |
| KICKBOXING | kickboxing |
| MUAY THAÏ | muay-thai |
| GRAPPLING | grappling |
| AUTRES | autres |
| (pas d'onglet dédié) | karate |
| (pas d'onglet dédié) | equipement |

### Disciplines → onglet AUTRES
Lethwei, Sanda, Sambo, Savate, Judo, Sumo, Krav Maga, Capoeira
→ toutes ces disciplines doivent avoir `sport: autres`

### Erreurs classiques à NE JAMAIS faire
| ❌ Faux | ✅ Correct | Raison |
|---------|-----------|--------|
| `pubDate: 2026-03-22` | `date: "2026-03-22"` | champ renommé |
| `description: "..."` | `excerpt: "..."` | champ renommé |
| `date: 2026-03-22` | `date: "2026-03-22"` | sans guillemets = objet Date → Zod rejette |
| `sport: mma` sur du Lethwei | `sport: autres` | mauvaise catégorie |
| `sport: lethwei` | `sport: autres` | lethwei n'est pas une valeur valide |
| `sport: k1` | `sport: kickboxing` | k1 n'est pas une valeur valide |

### Article de référence qui fonctionne
`frontkick/src/content/articles/bjj-ceintures-progression.md`
```yaml
---
title: "Les ceintures en BJJ : comprendre la progression"
sport: grappling
category: guide-debutant
date: "Février 2026"
excerpt: "Du blanc au noir..."
---
```

---

## 📦 65 articles dans le repo (23/03/2026)
Tous les sports ont été validés et corrigés. 0 sport invalide.

**Répartition par sport :**
- mma : ~25 articles
- boxe : ~7 articles
- kickboxing : ~5 articles
- muay-thai : ~5 articles
- grappling : ~8 articles
- karate : 2 articles
- equipement : ~4 articles
- autres (lethwei/sanda/sambo/savate/judo) : 9 articles

---

## 🔧 Google Analytics 4 — Instructions activation

Le code GA4 est **déjà intégré** dans `frontkick/src/layouts/Base.astro`.
Il se charge uniquement après consentement cookies (RGPD compliant).

**Pour activer :**
1. Aller sur https://analytics.google.com
2. Créer une propriété pour `frontkick.vercel.app`
3. Récupérer l'**ID de mesure** (format : `G-XXXXXXXXXX`)
4. Dans `Base.astro`, ligne ~50 : remplacer `'G-XXXXXXXXXX'` par votre ID
5. Commit & push → Vercel déploie automatiquement

---

## 🔧 Moteur de recherche (search.astro)

Le moteur de recherche est un moteur **fuzzy client-side** :
- Normalisation unicode (accents supprimés : "müay thai" → "muay thai")
- Distance de Levenshtein par mot (tolérance typos : "connor" → "conor" ✅)
- Scoring multi-champs : titre (×12) > slug (×5) > sport (×6) > excerpt (×4)
- Résultats triés par score décroissant
- Aucune dépendance externe, fonctionne hors ligne

**Recherches qui fonctionnent :**
- "connor" → trouve "Conor McGregor" ✅
- "mcgregor" → trouve Conor + Khabib vs McGregor ✅
- "muay thai" ou "muay thaï" → résultats muay-thai ✅
- "kickboxing" → tous les articles kickboxing ✅

---

## ❌ Priorités restantes
| # | Tâche | Statut |
|---|-------|--------|
| 1 | **Activer GA4** → remplacer G-XXXXXXXXXX dans Base.astro | ⬜ **ACTION REQUISE (toi)** |
| 2 | **Google Search Console** → soumettre sitemap | ⬜ À faire (toi) |
| 3 | Classements UFC → fichier JSON manuel | ⬜ À faire |
| 4 | Pages /a-propos + mentions légales | ⬜ À faire (agent Base44) |
| 5 | Page /equipement + affiliés Amazon | ⬜ À faire (agent Base44) |
| 6 | Filtre par sport sur page /guides | ⬜ À faire (agent Base44) |
| 7 | Articles similaires en bas d'article | ⬜ À faire (agent Base44) |
| 8 | Domaine frontkick.fr | ⬜ En attente d'achat |
| 9 | Page /autres-disciplines (liste articles sport:autres) | ⬜ À faire (agent Base44) |
| 10 | Google Analytics | ✅ Code intégré — manque ID |

---

## 🗂️ Structure du repo
```
frontkick/
├── src/
│   ├── content/
│   │   ├── config.ts              ← SCHÉMA DE VALIDATION
│   │   └── articles/              ← 65 fichiers .md (23/03/2026)
│   ├── layouts/
│   │   └── Base.astro             ← Layout global, GA4, cookies, nav
│   ├── pages/
│   │   ├── index.astro            ← accueil (actualités prioritaires + date desc)
│   │   ├── search.astro           ← recherche fuzzy ✅
│   │   ├── recherche.astro        ← redirect 301 vers /search
│   │   ├── actualites.astro       ← articles category:actualite ✅ fixé
│   │   ├── classements.astro      ← classements UFC
│   │   ├── guides.astro           ← page guides
│   │   └── discipline/[sport].astro
│   └── components/
├── public/
│   └── robots.txt ✅
├── astro.config.mjs ✅ (sitemap activé, URL = frontkick.vercel.app)
├── scripts/generate-article.mjs   ← NE PAS MODIFIER
└── .github/workflows/generate-articles.yml
```

---

## 💡 Règles d'utilisation des outils
| Tâche | Outil |
|-------|-------|
| Générer des articles en volume | Claude (les agents Base44 crashent sur gros volumes) |
| Modifier fichiers .astro | Agent Base44/Ubbe (1-3 fichiers par message) |
| Diagnostiquer erreurs de build | Claude en premier, agent pour le fix |
| Valider frontmatter avant push | Claude (validation par script) |
| Décisions stratégiques | Claude |
| Corrections sport/frontmatter en masse | Agent Base44/Ubbe |

### Template message pour agent Base44 (optimisé tokens)
```
STACK : Astro 4 / Vercel / GitHub
REPO : SuperFredo22/Frontkick (branche main)
FICHIER CIBLE : frontkick/src/pages/[nom].astro
CONTEXTE : [1-2 phrases max]
TÂCHE UNIQUE : [1 seule action précise]
CONTRAINTE : fichier complet prêt à coller, aucun placeholder
```

---

## 🗂️ Historique sessions
| Date | Sujet | Résumé |
|------|-------|--------|
| 22/03/2026 | Setup + template suivi | Création fichier de suivi |
| 22/03/2026 | Audit SEO | sitemap, robots.txt, JSON-LD OK via agent |
| 22/03/2026 | 28 articles générés + validés | ZIP final, frontmatter validé 28/28 |
| 22/03/2026 | Corrections sport (session 1) | sport corrigé sur 6 articles |
| 23/03/2026 | Corrections sport + page /search | 8 corrections sport + search.astro créé |
| 23/03/2026 | Audit complet + fixes | 10 sports invalides corrigés, /actualites fixé, homepage fixée, barre de recherche fixée |
| 23/03/2026 | Recherche fuzzy + GA4 | Moteur Levenshtein + normalisation unicode, GA4 intégré (placeholder) |

---

## 🔜 Par où commencer à la prochaine session
1. Donner ce fichier à l'agent Base44 (Ubbe) en début de conversation
2. **Activer GA4** : récupérer l'ID sur analytics.google.com, remplacer G-XXXXXXXXXX dans Base.astro
3. **Google Search Console** : soumettre https://frontkick.vercel.app/sitemap-index.xml
4. Continuer avec les priorités restantes (page /a-propos, /equipement, articles similaires…)
