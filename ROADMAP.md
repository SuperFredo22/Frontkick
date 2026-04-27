# FightFocus — Roadmap & Audit complet
> Audit effectué le 26 avril 2026 · État du projet : production active

---

## PARTIE 1 — BUGS CLASSÉS PAR PRIORITÉ

### 🔴 P1 — Bloquants (à corriger maintenant)

#### BUG-01 · Page Équipement toujours vide
**Fichier :** `frontkick/src/pages/equipement.astro` ligne 13
**Problème :** Le filtre cherche `sport === 'equipement'` OR `category === 'guide-equipement'`. Or `equipement` n'est pas un sport valide dans le schéma — aucun article ne peut donc apparaître via la première condition. Il n'existe pas non plus d'article avec `category: guide-equipement` actuellement.
**Impact :** La page affiche "Aucun article équipement pour le moment" en permanence. Visiteur qui clique sur "Équipement" dans la nav tombe sur une page vide.
**Correction :**
1. Écrire au moins 2–3 articles avec `category: guide-equipement` (gants de boxe, sac de frappe, protège-dents).
2. Vérifier que le filtre `sport === 'equipement'` soit retiré (sport invalide).

---

#### BUG-02 · Classements UFC périmés d'un mois
**Fichier :** `frontkick/src/pages/classements.astro` lignes 4–252
**Problème :** Les rankings sont hardcodés dans le fichier avec la mention "Mise à jour 24 mars 2026". Au 26 avril 2026, les données ont un mois de retard. Plusieurs champions et classements ont probablement changé.
**Impact :** Contenu factuellement incorrect visible par les moteurs de recherche et les utilisateurs.
**Correction :**
1. Court terme : mettre à jour manuellement les données (champions, classements) depuis ufc.com/rankings.
2. Moyen terme : externaliser les données dans un fichier `src/data/classements.json` séparé pour simplifier les mises à jour.
3. Ajouter une date de mise à jour automatique en haut de page (utiliser la date de dernière modification du fichier).

---

#### BUG-03 · Article généré avec contenu fallback générique
**Fichier :** `frontkick/src/content/articles/2026-04-12-entrainement-intervalles-adapte-au-kickboxing.md`
**Problème :** Cet article semble avoir été généré via le template fallback du script (`generate-article.mjs` lignes 563–601). Il fait ~450 mots avec des sections passe-partout : "Les fondamentaux à maîtriser en priorité", "Structurer son entraînement pour progresser", etc. Ces titres de sections sont identiques quel que soit le sport ou le sujet.
**Impact :** Contenu de mauvaise qualité indexé sur Google, peut pénaliser le domaine.
**Correction :** Réécrire cet article manuellement ou le regénérer avec `node scripts/generate-article.mjs` après avoir vérifié que Gemini est disponible.

---

#### BUG-04 · Seuil de mots incohérent entre les scripts
**Fichiers :** `scripts/fix-articles-audit.mjs` ligne 125 vs `scripts/audit-articles.mjs` ligne 79
**Problème :** `audit-articles.mjs` considère qu'un article est "trop court" en dessous de 300 mots. Mais `fix-articles-audit.mjs` utilise un seuil de 150 mots. Le script de correction passe donc à côté d'articles entre 150 et 299 mots.
**Correction :** Dans `fix-articles-audit.mjs`, remplacer `150` par `300` à la ligne 125.

---

### 🟠 P2 — Importants (à corriger cette semaine)

#### BUG-05 · Redirection K-1 non-permanente
**Fichier :** `frontkick/vercel.json` lignes 18–21
**Problème :** La redirection `/discipline/k1` → `/discipline/kickboxing` est configurée avec `permanent: false` (code HTTP 302 temporaire). Comme K-1 est maintenant fusionné dans kickboxing de façon définitive, ce doit être un 301 permanent — sinon Google ne transfère pas le PageRank.
**Correction :** Passer `"permanent": true` dans ce bloc de redirection.

---

#### BUG-06 · Fallback article générique dans generate-article.mjs
**Fichier :** `scripts/generate-article.mjs` lignes 563–601 et 752
**Problème :** Quand la validation du contenu généré échoue (article trop court, erreur API), le script publie automatiquement un article template figé avec des titres de sections identiques pour tous les sports. Cet article est ensuite commité et déployé sans avertissement visible.
**Correction :**
1. Quand la validation échoue, faire `process.exit(1)` au lieu de publier le fallback.
2. Ou loguer clairement dans la console "FALLBACK UTILISÉ — révision manuelle requise" et créer le fichier avec un frontmatter `draft: true` pour l'exclure du build.

---

#### BUG-07 · Records manquants dans les classements
**Fichier :** `frontkick/src/pages/classements.astro`
**Problème :** La plupart des combattants (rangs 6–15) ont `record: ""` — le palmarès n'est pas affiché.
**Impact :** Page incomplète visuellement, moins crédible.
**Correction :** Lors de la prochaine mise à jour (BUG-02), remplir les records W-L-D pour tous les combattants.

---

#### BUG-08 · Banner guide.webp manquant probable
**Fichier :** `frontkick/src/pages/guides.astro` ligne 80
**Problème :** La page Guides utilise `/images/banners/guide.webp` comme image de fond du hero. Ce fichier n'a pas été généré par le script `generate-og-images.mjs` (qui génère des banners par sport, pas par page). Si le fichier n'existe pas, le hero s'affiche sans image.
**Correction :** Vérifier l'existence de `public/images/banners/guide.webp`. Si absent, créer une image générique ou utiliser une bannière existante comme fallback.

---

### 🟡 P3 — Mineurs (à traiter d'ici 2 semaines)

#### BUG-09 · Page `autres-disciplines.astro` dans la nav
**Problème :** La page `autres-disciplines.astro` existe mais le slug `autres` ne correspond à aucun sport valide dans le schéma. Toute navigation vers cette page est donc soit vide soit source de confusion.
**Correction :** Soit supprimer la page et retirer le lien nav, soit la transformer en page "Disciplines" listant sanda, lethwei, savate, sambo avec des liens vers leurs pages respectives.

---

#### BUG-10 · Dates événements hardcodées sur la home
**Fichier :** `frontkick/src/pages/index.astro` lignes 213–215
**Problème :** Un widget "Prochains événements" affiche des dates en dur (ex: "UFC 314 · 12 Avr") qui sont maintenant dans le passé.
**Correction :** Supprimer ce widget ou le remplir avec des données futures réelles.

---

#### BUG-11 · `copyLink()` exposée au scope global window
**Fichier :** `frontkick/src/pages/articles/[slug].astro` ligne 410
**Problème :** `(window as any).copyLink = copyLink;` expose une fonction au scope global. Pas de risque de sécurité critique dans ce contexte, mais c'est une mauvaise pratique.
**Correction :** Utiliser un event listener ciblé sur le bouton plutôt qu'une exposition globale.

---

## PARTIE 2 — FONCTIONNALITÉS MANQUANTES OU INCOMPLÈTES

### FEAT-01 · Newsletter — Non implémentée
**État :** La politique de confidentialité mentionne Brevo, et `vercel.json` autorise `https://api.brevo.com` dans la CSP. Mais aucun formulaire n'existe dans le projet.
**Ce qu'il faut faire :**
- Créer un compte Brevo (ex-Sendinblue) — plan gratuit jusqu'à 300 emails/jour
- Créer une liste de contacts "FightFocus Newsletter"
- Créer un formulaire embedded ou via API Brevo
- Ajouter un composant `NewsletterForm.astro` (formulaire avec champ email + bouton)
- L'intégrer dans : footer (`Base.astro`), bas d'article (`[slug].astro`), et sidebar accueil
- Configurer un premier email de bienvenue automatique dans Brevo
- Mettre à jour la politique de confidentialité avec les détails RGPD corrects

---

### FEAT-02 · AdSense — Configuré mais désactivé
**État :** 6 slots publicitaires existent dans le HTML (3 par article + 1 accueil + 1 footer). Le script AdSense est commenté dans `Base.astro` ligne 112 avec un Publisher ID placeholder `ca-pub-XXXXXXXXXX`.
**Ce qu'il faut faire :**
1. Créer un compte Google AdSense sur adsense.google.com
2. Soumettre fightfocus.fr pour validation (le site doit avoir du contenu de qualité — c'est le cas)
3. Attendre l'approbation (délai : 2 jours à 2 semaines)
4. Récupérer le Publisher ID réel (format `ca-pub-1234567890123456`)
5. Dans `Base.astro` ligne 112 : décommenter le script et remplacer `ca-pub-XXXXXXXXXX`
6. Remplacer les `<div class="ad-slot ad-leader">` par les vraies balises `<ins class="adsbygoogle">` avec les data attributes AdSense
7. Ajouter le script d'initialisation `adsbygoogle.push({})` pour chaque slot
**Note :** Ne pas activer AdSense avant d'avoir au moins 20–30 articles de qualité indexés. Le site est prêt.

---

### FEAT-03 · Moteur de recherche — Partiellement implémenté
**État :** Deux pages existent : `recherche.astro` et `search.astro`. La recherche côté client semble être en place dans `recherche.astro` mais `search.astro` est probablement un doublon ou une page stub.
**Ce qu'il faut faire :**
- Vérifier si `search.astro` est accessible et fonctionnel
- Si doublon : supprimer `search.astro` et ajouter une redirection dans `vercel.json` (`/search` → `/recherche`)
- S'assurer que le `robots.txt` exclut bien les deux URLs (déjà fait pour les deux)

---

### FEAT-04 · Page Équipement — Contenu manquant
**État :** La page existe et est bien conçue mais affiche "Aucun article équipement pour le moment".
**Ce qu'il faut faire :**
- Écrire 3–5 articles avec `category: guide-equipement` :
  - Guide d'achat gants de boxe pour débutants
  - Choisir son protège-dents pour les sports de combat
  - Guide sac de frappe : choisir le bon modèle
  - Chaussures de grappling : le guide complet
  - Casque de boxe : sécurité et confort
- Une fois Decathlon/affiliation en place, ces articles deviendront la base de monétisation affiliate

---

### FEAT-05 · Affiliation — Non démarrée
**État :** Le commit `9a7b972` mentionne "affiliation Decathlon à venir". Aucun lien affilié dans le projet.
**Ce qu'il faut faire :**
1. Rejoindre le programme partenaire Decathlon (programme.decathlon.fr)
2. Identifier les produits cibles (gants, sacs, protections)
3. Intégrer les liens affiliés dans les articles équipement (FEAT-04)
4. Ajouter une mention légale "liens partenaires" (requis par la loi française)
5. Envisager aussi : Amazon Partenaires, Intersport, Go Sport

---

### FEAT-06 · Sitemap des images — Non configuré
**État :** Le sitemap XML standard est généré par `@astrojs/sitemap`. Mais il n'inclut pas les images.
**Ce qu'il faut faire :** Pour les articles avec `heroImage`, ajouter un sitemap image (`<image:image>`) pour améliorer l'indexation des OG images dans Google Images.

---

## PARTIE 3 — OPTIMISATIONS SEO

### SEO-01 · Données structurées enrichies pour les articles
**État actuel :** Schema `Article` présent avec `headline`, `author`, `datePublished`.
**Ce qu'il manque :**
- `wordCount` (nombre de mots de l'article)
- `timeRequired` (temps de lecture estimé : `PT5M`)
- `about` avec le sport en `Thing`
- `aggregateRating` si des avis existent
**Fichier :** `frontkick/src/pages/articles/[slug].astro` lignes 121–174

---

### SEO-02 · Balise `<title>` des pages discipline trop générique
**Exemple :** `/discipline/mma` → probablement "MMA — FightFocus"
**Mieux :** "MMA : Guides, Techniques et Conseils — FightFocus" (inclut le mot-clé longue traîne)
**Fichier :** `frontkick/src/pages/discipline/[sport].astro`

---

### SEO-03 · Classements UFC — Contenu périmé nuit au crawl budget
**Déjà listé en BUG-02.** Impact SEO : Google peut détecter que le contenu est désynchronisé avec sa source officielle (ufc.com) et déprioriser la page.

---

### SEO-04 · Images hero en CSS background — pas d'alt text
**Fichier :** `frontkick/src/pages/articles/[slug].astro` lignes 222–224
**Problème :** L'image hero est affichée via `background-image` CSS, ce qui ne permet pas d'ajouter un attribut `alt`. Inaccessible et non indexé par Google Images.
**Correction :** Remplacer par une vraie balise `<img>` avec `alt={article.data.title}` et `loading="lazy"`. Styler avec `object-fit:cover`.

---

### SEO-05 · Métadonnées OG manquantes pour les pages de liste
**Pages concernées :** `actualites.astro`, `guides.astro`, `classements.astro`, `equipement.astro`
**Problème :** Ces pages ont probablement une OG image par défaut (`/og-default.png`). Créer des OG images spécifiques par page augmente le CTR sur les réseaux sociaux.
**Correction :** Générer des images OG pour les pages principales via `scripts/generate-og-images.mjs`.

---

### SEO-06 · Articles courts à enrichir
**Articles en dessous du seuil optimal (800 mots) :**
- `savate-guide-debutant.md` : ~753 mots
- `lethwei-guide-debutant.md` : ~769 mots
- `sanda-guide-debutant.md` : ~790 mots
- `2026-04-09-histoire-du-kickboxing-voyage-explosif-du-japon-a-leurope.md` : ~791 mots
- `wrestling-base-mma-moderne.md` : ~801 mots
- `2026-04-12-entrainement-intervalles-adapte-au-kickboxing.md` : ~450 mots (priorité haute)

**Commande disponible :** `node scripts/enrich-short-articles.mjs` (à tester, documentation incomplète)

---

### SEO-07 · Vérification Google Search Console
**Tâche :** S'assurer que fightfocus.fr est bien vérifié dans Google Search Console et que :
- Le sitemap est soumis (`https://fightfocus.fr/sitemap-index.xml`)
- Pas d'erreurs d'indexation signalées
- La couverture d'index est saine
- Les Core Web Vitals sont dans le vert

---

### SEO-08 · Robots.txt — Exclure les pages search
**Fichier :** `frontkick/public/robots.txt`
**État actuel :** `/search` et `/recherche` sont déjà exclus. ✅ Rien à faire.

---

### SEO-09 · Maillage interne à renforcer
**Problème :** Les articles des disciplines mineures (savate, sanda, lethwei, sambo) reçoivent peu de liens depuis l'accueil ou les autres articles.
**Correction :** S'assurer que `scripts/inject-body-links.mjs` est exécuté régulièrement pour enrichir le maillage interne contextuel.

---

## PARTIE 4 — ACTIVER LA NEWSLETTER

### Étape 1 · Créer le compte Brevo
1. Aller sur brevo.com → "S'inscrire gratuitement"
2. Renseigner fightfocus.fr comme domaine expéditeur
3. Vérifier le domaine (ajout d'un enregistrement DNS TXT)
4. Créer une liste "Abonnés FightFocus"

### Étape 2 · Créer le formulaire de souscription
Créer le fichier `frontkick/src/components/NewsletterForm.astro` :
```astro
---
// Aucun props requis
---
<div class="newsletter-block">
  <h3>Restez dans le jeu</h3>
  <p>1 email par semaine — guides, conseils, analyses. Pas de spam.</p>
  <form id="newsletter-form" action="https://api.brevo.com/v3/contacts" method="POST">
    <input type="email" name="email" placeholder="votre@email.fr" required />
    <button type="submit">S'abonner</button>
  </form>
  <p class="nl-legal">En vous inscrivant, vous acceptez notre <a href="/politique-confidentialite">politique de confidentialité</a>.</p>
</div>
```
**Note :** Remplacer l'action par le vrai endpoint Brevo avec l'API key (via variable d'environnement, jamais en dur).

### Étape 3 · Intégrer dans le projet
- **Footer** : dans `Base.astro`, ajouter `<NewsletterForm />` juste avant le footer
- **Bas d'article** : dans `[slug].astro`, après le contenu de l'article
- **Accueil** : dans `index.astro`, dans la sidebar ou en section dédiée

### Étape 4 · Configurer l'automatisation Brevo
1. Créer un email de bienvenue automatique (déclenché à l'inscription)
2. Créer un template d'email hebdomadaire avec les 3 derniers articles
3. Activer le double opt-in pour la conformité RGPD

### Étape 5 · Mettre à jour la politique de confidentialité
Dans `mentions-legales.astro` et `politique-confidentialite.astro` : documenter précisément :
- Données collectées (email uniquement)
- Durée de conservation
- Droit de désinscription
- Hébergeur : Brevo (Sendinblue SAS, Paris)

---

## PARTIE 5 — ACTIVER ADSENSE

### Étape 1 · Prérequis (vérifier avant de postuler)
- [ ] Le site a au moins 20 articles publiés de qualité ✅ (65 articles)
- [ ] Le site respecte les politiques AdSense (pas de contenu violent, pas de droits d'auteur) — À vérifier
- [ ] Pages légales présentes : mentions légales ✅, politique de confidentialité ✅, contact ✅
- [ ] Le site est en production et accessible publiquement ✅

### Étape 2 · Candidater
1. Aller sur adsense.google.com → "Commencer"
2. Renseigner `https://fightfocus.fr`
3. Choisir si vous souhaitez des annonces automatiques ou manuelles (recommandé : **annonces manuelles** pour contrôler le placement)
4. Coller le snippet de vérification dans `Base.astro` (entre `<head>` et `</head>`)
5. Soumettre et attendre l'approbation (24h à 14 jours)

### Étape 3 · Configurer les unités d'annonce
Une fois approuvé, créer dans AdSense :
- 1 unité "Leaderboard responsive" (`ad-leader`) — pour haut/bas article
- 1 unité "Rectangle medium responsive" (`ad-rect`) — pour sidebar

### Étape 4 · Activer dans le code
**Fichier :** `frontkick/src/layouts/Base.astro` ligne 112

Décommenter et remplacer :
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-VOTRE_VRAI_ID" crossorigin="anonymous"></script>
```

**Fichier :** `frontkick/src/pages/articles/[slug].astro` lignes 218, 294, 342

Remplacer les `<div class="ad-slot ad-leader">` par :
```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-VOTRE_VRAI_ID"
     data-ad-slot="VOTRE_SLOT_ID"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```

### Étape 5 · Vérifier les performances
- Après 48h d'activation : vérifier dans AdSense > Rapports que les impressions sont enregistrées
- Surveiller l'impact sur les Core Web Vitals (AdSense peut ralentir le LCP)
- Si LCP dégradé : activer le chargement différé des annonces

---

## PARTIE 6 — ORDRE D'EXÉCUTION LOGIQUE (ROADMAP JOUR PAR JOUR)

### Semaine 1 — Corrections critiques

**Jour 1 (lundi) :**
- [ ] BUG-04 · Corriger le seuil de mots dans `fix-articles-audit.mjs` (5 min)
- [ ] BUG-05 · Passer la redirection K-1 en `permanent: true` dans `vercel.json` (2 min)
- [ ] Pousser le commit → déploiement auto Vercel

**Jour 2 (mardi) :**
- [ ] BUG-02 · Mettre à jour les classements UFC depuis ufc.com/rankings (1–2h)
  - Mettre à jour champions et classements
  - Remplir les records manquants (BUG-07)
  - Corriger la date de mise à jour en haut de page
- [ ] Pousser le commit

**Jour 3 (mercredi) :**
- [ ] BUG-03 · Réécrire ou regénérer l'article `2026-04-12-entrainement-intervalles-adapte-au-kickboxing.md`
- [ ] BUG-06 · Modifier `generate-article.mjs` pour ne pas publier le fallback silencieusement
- [ ] Pousser le commit

**Jour 4 (jeudi) :**
- [ ] SEO-04 · Remplacer le `background-image` hero par une vraie balise `<img>` dans `[slug].astro`
- [ ] BUG-11 · Refactoriser `copyLink` sans exposition globale dans `[slug].astro`
- [ ] Pousser le commit

**Jour 5 (vendredi) :**
- [ ] BUG-08 · Vérifier l'existence de `public/images/banners/guide.webp`
- [ ] BUG-09 · Décider du sort de `autres-disciplines.astro` (supprimer ou transformer)
- [ ] BUG-10 · Retirer ou mettre à jour le widget événements hardcodé sur l'accueil
- [ ] Pousser le commit

---

### Semaine 2 — SEO et contenu

**Jour 6 (lundi) :**
- [ ] FEAT-03 · Vérifier `search.astro` vs `recherche.astro` — supprimer le doublon
- [ ] SEO-02 · Améliorer les titres `<title>` des pages discipline
- [ ] SEO-01 · Enrichir les données structurées Article (wordCount, timeRequired)

**Jour 7 (mardi) :**
- [ ] SEO-06 · Enrichir l'article kickboxing/intervalles (~450 mots → 800 mots)
- [ ] SEO-06 · Enrichir les 4–5 autres articles sous 800 mots via `enrich-short-articles.mjs`

**Jour 8 (mercredi) :**
- [ ] FEAT-04 · Écrire le 1er article équipement : "Guide d'achat gants de boxe débutant" (`category: guide-equipement`)
- [ ] FEAT-04 · Écrire le 2ème article équipement : "Quel sac de frappe choisir ?" (`category: guide-equipement`)

**Jour 9 (jeudi) :**
- [ ] FEAT-04 · Écrire le 3ème article équipement : "Choisir son protège-dents pour les sports de combat"
- [ ] BUG-01 · Vérifier que la page Équipement affiche maintenant les articles

**Jour 10 (vendredi) :**
- [ ] SEO-07 · Vérifier Google Search Console — soumettre sitemap si pas encore fait
- [ ] SEO-09 · Lancer `scripts/inject-body-links.mjs` pour enrichir le maillage interne
- [ ] Audit qualité : `node scripts/audit-articles.mjs`

---

### Semaine 3 — Newsletter

**Jour 11 (lundi) :**
- [ ] FEAT-01 · Créer le compte Brevo et configurer le domaine expéditeur
- [ ] FEAT-01 · Créer la liste "Abonnés FightFocus" et le template email de bienvenue

**Jour 12 (mardi) :**
- [ ] FEAT-01 · Créer le composant `NewsletterForm.astro`
- [ ] FEAT-01 · Intégrer dans le footer (`Base.astro`) et le bas d'article (`[slug].astro`)

**Jour 13 (mercredi) :**
- [ ] FEAT-01 · Tester le formulaire end-to-end (inscription → email de bienvenue reçu)
- [ ] FEAT-01 · Mettre à jour la politique de confidentialité avec les détails Brevo/RGPD

**Jour 14 (jeudi) :**
- [ ] FEAT-01 · Créer le template d'email hebdomadaire dans Brevo
- [ ] Pousser tous les changements

**Jour 15 (vendredi) :**
- [ ] Test complet de la newsletter sur mobile et desktop
- [ ] Vérifier les Core Web Vitals après ajout du formulaire

---

### Semaine 4 — AdSense & Affiliation

**Jour 16 (lundi) :**
- [ ] FEAT-02 · Candidater à Google AdSense (adsense.google.com)
- [ ] Coller le snippet de vérification dans `Base.astro` et pousser
- [ ] ⏳ Attendre l'approbation (entre 2 et 14 jours)

**Jour 17–18 :**
- [ ] FEAT-05 · Rejoindre le programme partenaire Decathlon
- [ ] FEAT-05 · Identifier 10 produits à recommander dans les articles équipement
- [ ] Ajouter la mention légale "liens partenaires" dans les articles concernés

**Jour 19 (après approbation AdSense) :**
- [ ] FEAT-02 · Activer le script AdSense dans `Base.astro`
- [ ] FEAT-02 · Remplacer les div placeholders par les vraies `<ins>` AdSense
- [ ] Pousser et vérifier que les annonces s'affichent

**Jour 20 :**
- [ ] Vérifier l'impact AdSense sur les Core Web Vitals (Lighthouse, PageSpeed Insights)
- [ ] Si LCP dégradé : activer le lazy loading des annonces
- [ ] Vérifier dans AdSense que les impressions sont comptabilisées

---

### Mois 2 — Contenu et croissance

**Semaine 5–6 :**
- [ ] Mettre en place la publication automatique quotidienne (cron job déjà configuré) — vérifier que `generate-article.mjs` tourne correctement en production
- [ ] Créer un calendrier éditorial : 1 article par jour, rotation des sports
- [ ] Ajouter le sport `sambo` dans la rotation du script (actuellement absent)

**Semaine 7–8 :**
- [ ] SEO-05 · Générer des OG images spécifiques pour les pages principales (actualites, guides, classements, equipement)
- [ ] SEO-06 · Enrichir tous les articles sous 800 mots restants
- [ ] FEAT-06 · Implémenter le sitemap image pour les articles avec heroImage

---

## RÉSUMÉ EXÉCUTIF

| Zone | État | Urgence |
|------|------|---------|
| Bugs critiques | 4 bugs P1 à corriger | 🔴 Cette semaine |
| Classements | Données périmées d'1 mois | 🔴 Jour 2 |
| Page Équipement | Vide — 0 article | 🟠 Semaine 2 |
| Newsletter | Brevo configuré en CSP, formulaire à créer | 🟠 Semaine 3 |
| AdSense | Slots prêts, script commenté | 🟠 Semaine 4 |
| SEO technique | Bon socle — quelques améliorations | 🟡 En continu |
| Affiliation | Décathlon à venir | 🟡 Semaine 4 |
| Contenu équipement | 0 article guide-equipement | 🟠 Semaine 2 |

**Le site est techniquement solide et le contenu est de qualité. Les priorités absolues sont : (1) corriger les bugs bloquants, (2) activer la newsletter pour capturer l'audience, (3) candidater à AdSense pour commencer à monétiser.**
