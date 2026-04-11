# FightFocus — Guide pour Claude Code

## Contexte du projet

**FightFocus** (`fightfocus.fr`) est un média français dédié aux sports de combat et arts martiaux.
Stack : **Astro 4.15** (SSG) + Markdown + Vercel. Pas de base de données, pas de JS framework front.
Repo racine : `Frontkick/` — le site Astro est dans `frontkick/`.

---

## Architecture

```
frontkick/
├── src/
│   ├── content/
│   │   ├── articles/        ← tous les articles (.md)
│   │   └── config.ts        ← schéma Zod des articles
│   ├── pages/
│   │   ├── index.astro      ← page d'accueil
│   │   ├── actualites.astro
│   │   ├── guides.astro
│   │   ├── equipement.astro
│   │   ├── classements.astro
│   │   ├── discipline/      ← pages par sport
│   │   └── articles/        ← rendu des articles
│   └── layouts/
│       └── Base.astro
├── scripts/
│   ├── generate-article.mjs   ← génération auto (Perplexity + Gemini)
│   ├── audit-articles.mjs     ← audit qualité
│   └── fix-articles-audit.mjs ← corrections automatiques
├── public/
├── astro.config.mjs           ← site: https://fightfocus.fr
└── vercel.json
```

---

## Schéma d'un article (frontmatter obligatoire)

```yaml
---
title: "Titre SEO (50-70 caractères, mot-clé sport inclus)"
sport: mma                    # voir valeurs valides ci-dessous
category: guide               # voir valeurs valides ci-dessous
date: "2026-04-02"
excerpt: "Résumé 120-160 caractères"
featured: false
---
```

### Valeurs valides — `sport`
`mma` · `boxe` · `kickboxing` · `muay-thai` · `grappling` · `karate` · `sanda` · `lethwei` · `savate` · `sambo` · `k1`

> Ne jamais utiliser `autres` — c'est un bug historique qui casse les pages discipline.

### Valeurs valides — `category`
`guide` · `guide-debutant` · `conseil-entrainement` · `analyse` · `guide-equipement` · `actualite`

---

## Règles de contenu

- **Langue** : français, ton expert et accessible
- **Longueur cible** : 900–1200 mots (minimum absolu : 300 mots publiables, idéal SEO : 800+)
- **Structure** : au moins 3 sections `##` bien développées
- **H1 interdit dans le corps** : le titre est dans le frontmatter, ne pas répéter `# Titre` dans le Markdown
- **Pas de listes à puces dans le corps** des articles
- **Pas de placeholders** : `[NOM]`, `[DATE]`, `[à compléter]`, etc.
- **Evergreen prioritaire** : éviter les faits d'actualité, résultats de combats, événements datés
- **Combattants actifs** : ne pas citer de combattants actifs contemporains (risque d'hallucination)
- Introduction 2-3 phrases + conclusion invitant à revenir sur FightFocus.fr

---

## Génération automatique d'articles

Script : `scripts/generate-article.mjs` (V7-SAFE)

Pipeline :
1. **Perplexity** (`sonar-pro`) → idée SEO uniquement (jamais de faits)
2. **Gemini** (`gemini-2.5-flash-lite`) → rédaction evergreen
3. Validation + nettoyage + sauvegarde

Rotation des sports par semaine ISO (cycle 5) : `mma → boxe → muay-thai → kickboxing → grappling`

Variables d'environnement requises : `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`

Commande : `node scripts/generate-article.mjs`

---

## Problèmes connus (audit du 25/03/2026)

| Priorité | Problème | Nb articles |
|----------|----------|-------------|
| P1 | `sport: autres` à corriger | 9 articles |
| P2 | Articles < 220 mots (squelettes) à supprimer | 7 articles |
| P3 | Placeholders non résolus | 1 article |
| P4 | H1 dans le corps (`# Titre` en doublon) | 28 articles |
| P5 | Articles 300–500 mots à enrichir | 25 articles |

---

## Commandes utiles

```bash
# Développement local
cd frontkick && npm run dev

# Build
cd frontkick && npm run build

# Générer un article automatiquement
cd frontkick && node scripts/generate-article.mjs

# Audit qualité des articles
cd frontkick && node scripts/audit-articles.mjs

# Corrections automatiques
cd frontkick && node scripts/fix-articles-audit.mjs

# Déploiement : push sur main → Vercel auto-deploy
```

---

## SEO & bonnes pratiques

- Slug de fichier = `YYYY-MM-DD-slug-titre.md` pour les nouveaux articles
- Anciens articles sans date dans le slug : format `sujet-discipline.md`
- Sitemap auto généré par `@astrojs/sitemap`
- Pas de pagination côté serveur, tout est statique
- Crawl budget : supprimer les articles squelettes nuit à l'indexation

---

## Ce qu'il ne faut pas faire

- Ne pas créer d'articles avec `sport: autres`
- Ne pas laisser de H1 dans le corps d'un article
- Ne pas publier d'articles < 300 mots
- Ne pas modifier `astro.config.mjs` sans raison (le `site:` est important pour le sitemap)
- Ne pas toucher `node_modules/` ni `dist/`
