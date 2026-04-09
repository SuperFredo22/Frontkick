# FightFocus — Spec de redesign UX/Visuel

**Date :** 2026-04-09  
**Scope :** Amélioration complète de l'expérience utilisateur sur tous les profils (mobile lecteur, explorateur, pratiquant)  
**Contraintes :** Astro 4.15 SSG, zéro JS inutile, performance Core Web Vitals, maintenabilité, Vercel

---

## Contexte

FightFocus est un média français de sports de combat (MMA, Boxe, Muay Thai, etc.). Le site est statique (Astro SSG), déployé sur Vercel. Un premier redesign visuel a été réalisé (SVG sport, logo CSS, grain/vignette, suppression emojis). Il reste 4 zones majeures à améliorer pour offrir une expérience premium.

---

## Objectifs

1. **Expérience de lecture premium** sur mobile et desktop (page article)
2. **Navigation fluide** entre disciplines et contenus
3. **Accueil percutant** qui convertit les visiteurs en lecteurs réguliers
4. **Pages discipline** cohérentes et engageantes
5. **Zéro régression** de performance (LCP < 2.5s, CLS < 0.1)

---

## Périmètre — 4 sprints ordonnés par impact

### Sprint 1 — Page Article (priorité absolue)
La page la plus visitée via SEO. Impact direct sur le taux de rebond.

**Problèmes actuels :**
- Hero image trop haute (260px fixe), peu lisible sur mobile
- Typographie du corps article générique, pas de hiérarchie visuelle
- Méta-données (date, temps de lecture) sans style propre
- Sidebar trop chargée sur mobile (disparaît mais prend de la place)
- Boutons de partage : trop nombreux, style inline surchargé
- Table des matières : fond non différencié du contenu
- Section "Articles similaires" : cards trop grandes pour une fin d'article

**Améliorations :**
- Hero réduit à 200px avec overlay gradient + titre lisible
- Typographie article : `DM Serif Display` pour les titres `h2/h3`, `DM Sans` 17px/1.8 pour le corps
- Méta-row stylée avec séparateur `·` et icônes SVG inline
- TOC avec fond distinct (`--card`), border-left accent rouge, sticky sur desktop
- Partage : 3 boutons max visibles + "Plus" collapsed, style card compact
- Articles similaires : liste compacte 3 items au lieu de cards full-size
- Mobile : sidebar masquée, partage en bas de contenu uniquement

### Sprint 2 — Pages Discipline
Le hub par sport. Visitée depuis la nav et les articles.

**Problèmes actuels :**
- Hero gradient plat (SVG pas utilisé en hero pleine largeur)
- Grille articles sans distinction featured/normal
- Pas de filtre par catégorie
- Aucune description étendue de la discipline

**Améliorations :**
- Hero full-width avec SVG sport en background, overlay gradient, titre Bebas Neue grand format
- Premier article mis en avant (card featured large)
- Filtres catégories (Guides / Analyses / Équipement / Actualités) — CSS pur, pas de JS si possible
- Bloc "À propos de cette discipline" : 2-3 phrases intro sous le hero

### Sprint 3 — Page d'accueil
La vitrine. Visitée depuis liens directs et bookmarks.

**Problèmes actuels :**
- `mini-icon` supprimé mais `.mini-card` manque de repère visuel
- Hub disciplines : cards sans image sport (juste gradient)
- Widgets sidebar (newsletter, événements) style basique
- Pas de section "Dernières publications" visible si peu d'actualités

**Améliorations :**
- Mini-cards sidebar : ajouter une barre colorée gauche selon le sport (couleur gradient)
- Hub disciplines : utiliser les SVGs sport comme background des cards (cohérent avec discipline pages)
- Widget newsletter : style premium avec fond dégradé sombre
- Widget événements : style "calendrier" avec date en accent
- Section fallback "Dernières publications" toujours visible (pas conditionnelle)

### Sprint 4 — Navigation mobile & transversal
Finition transversale. Impacte toutes les pages.

**Problèmes actuels :**
- Nav bar : 10+ liens qui wrappent sur 2-3 lignes sur mobile
- Pas de menu hamburger
- Header : search input trop large sur mobile
- `.hero-accent-band` : 4px trop fin, peu visible

**Améliorations :**
- Menu hamburger sur mobile (< 768px) : les liens discipline se cachent derrière un toggle
- Search input : icône uniquement sur mobile, s'expand au clic
- `hero-accent-band` : hauteur 6px, légère opacité augmentée
- `active` state nav : underline animé au lieu du simple highlight
- Focus visible sur tous les éléments interactifs (accessibilité)

---

## Architecture technique

**Fichiers modifiés :**
- `src/pages/articles/[slug].astro` — Sprint 1
- `src/pages/discipline/[sport].astro` — Sprint 2  
- `src/pages/index.astro` — Sprint 3
- `src/layouts/Base.astro` — Sprint 4
- `public/styles/global.css` — Tous les sprints (styles partagés)

**Pas de nouveaux composants Astro** (YAGNI) — tout reste dans les fichiers existants + global.css.  
**Zéro dépendances npm ajoutées.**  
**JS client uniquement pour le hamburger mobile** (toggle class, ~10 lignes).

---

## Critères de succès

- [ ] Page article lisible et agréable sur iPhone SE (375px)
- [ ] LCP page article < 2.5s (image sport préchargée)
- [ ] Navigation mobile sans overflow horizontal
- [ ] Toutes les pages buildent sans erreur (`npm run build`)
- [ ] Aucun emoji résiduel dans les templates
- [ ] Cohérence visuelle entre toutes les pages (même palette, même typographie)
