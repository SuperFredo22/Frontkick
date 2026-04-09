# FightFocus UX Redesign — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Redesign UX complet de FightFocus en 4 sprints ordonnés par impact SEO/utilisateur — article → discipline → accueil → mobile/nav.

**Architecture :** Modifications ciblées sur les fichiers Astro existants + global.css. Zéro nouvelle dépendance. JS client limité au strict minimum (hamburger mobile).

**Tech Stack :** Astro 4.15 SSG, CSS custom properties, SVG inline, Bebas Neue / DM Serif Display / DM Sans / Barlow Condensed (Google Fonts déjà chargées)

---

## SPRINT 1 — Page Article

### Task 1 : Typographie et corps de l'article

**Files :**
- Modify: `public/styles/global.css` — règles `.art-content`, `h2`, `h3`, `.art-h1`, `.art-lead`
- Modify: `src/pages/articles/[slug].astro` — méta-row, hero height

- [ ] **Step 1 : Réduire la hauteur du hero article et améliorer l'overlay**

Dans `src/pages/articles/[slug].astro`, ligne ~146, remplacer :
```astro
<div class="art-image-hero" style={`background: ${gradients[article.data.sport] || 'linear-gradient(135deg,#0F172A,#38BDF8)'}; height:260px; border-radius:16px; margin-bottom:28px; position:relative; overflow:hidden;`}>
  <img src={sportImages[article.data.sport] || '/images/sports/mma.svg'} alt={article.data.sport} style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.9;" loading="eager"/>
</div>
```
Par :
```astro
<div class="art-image-hero" style={`background: ${gradients[article.data.sport] || 'linear-gradient(135deg,#0F172A,#38BDF8)'}; height:200px; border-radius:12px; margin-bottom:24px; position:relative; overflow:hidden;`}>
  <img src={sportImages[article.data.sport] || '/images/sports/mma.svg'} alt={article.data.sport} style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.85;" loading="eager"/>
  <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%);"></div>
</div>
```

- [ ] **Step 2 : Améliorer la typographie dans global.css**

Dans `public/styles/global.css`, ajouter/remplacer les règles du corps article :
```css
/* ── Corps article ── */
.art-content {
  font-size: 1.05rem;
  line-height: 1.85;
  color: var(--text-light);
}
.art-content h2 {
  font-family: 'DM Serif Display', serif;
  font-size: 1.55rem;
  font-weight: 400;
  color: var(--text);
  margin: 2.2rem 0 0.8rem;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  line-height: 1.3;
}
.art-content h3 {
  font-family: 'DM Serif Display', serif;
  font-size: 1.2rem;
  font-weight: 400;
  font-style: italic;
  color: var(--text);
  margin: 1.8rem 0 0.6rem;
}
.art-content p {
  margin: 0 0 1.2rem;
}
.art-content strong {
  color: var(--text);
  font-weight: 700;
}
.art-content a {
  color: var(--blue);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.art-content ul, .art-content ol {
  padding-left: 1.4rem;
  margin: 0 0 1.2rem;
}
.art-content li {
  margin-bottom: 0.4rem;
}
.art-h1 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2.2rem;
  letter-spacing: .03em;
  line-height: 1.15;
  margin: 12px 0 10px;
  color: var(--text);
}
.art-lead {
  font-size: 1.08rem;
  line-height: 1.65;
  color: var(--text-light);
  border-left: 3px solid var(--accent-red);
  padding-left: 14px;
  margin-bottom: 20px;
}
```

- [ ] **Step 3 : Build de vérification**
```bash
npm run build --prefix frontkick 2>&1 | tail -5
```
Attendu : `75 page(s) built` sans erreur.

- [ ] **Step 4 : Commit**
```bash
cd frontkick && git add public/styles/global.css src/pages/articles/[slug].astro && git commit -m "style: améliore typographie et hero page article"
```

---

### Task 2 : Table des matières et méta-row

**Files :**
- Modify: `src/pages/articles/[slug].astro` — toc-box, art-meta-row
- Modify: `public/styles/global.css` — `.toc-box`, `.toc-title`, `.art-meta-row`

- [ ] **Step 1 : Styler la méta-row dans global.css**
```css
/* ── Méta article ── */
.art-meta-row {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
  margin-bottom: 24px;
  font-size: 0.82rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 10px 0;
}
.art-meta-row span {
  padding: 0 12px;
  border-right: 1px solid var(--border);
}
.art-meta-row span:first-child {
  padding-left: 0;
}
.art-meta-row span:last-child {
  border-right: none;
}
/* ── Table des matières ── */
.toc-box {
  background: var(--card);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent-red);
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 28px;
}
.toc-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--text-muted);
  margin-bottom: 10px;
}
.toc-item {
  margin-bottom: 2px;
}
```

- [ ] **Step 2 : Build de vérification**
```bash
npm run build --prefix frontkick 2>&1 | tail -5
```

- [ ] **Step 3 : Commit**
```bash
cd frontkick && git add public/styles/global.css src/pages/articles/[slug].astro && git commit -m "style: améliore TOC et méta-row page article"
```

---

### Task 3 : Boutons de partage compacts + articles similaires en liste

**Files :**
- Modify: `src/pages/articles/[slug].astro` — share-section, similar-section

- [ ] **Step 1 : Remplacer la section partage par une version compacte**

Dans `src/pages/articles/[slug].astro`, remplacer le bloc `.share-section` par :
```astro
<div class="share-section" style="margin-top:36px;padding:20px 24px;background:var(--card);border:1px solid var(--border);border-radius:12px;">
  <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:12px;">Partager</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <a href={twitterUrl} target="_blank" rel="noopener noreferrer" class="share-btn share-btn--x">𝕏</a>
    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" class="share-btn share-btn--wa">WhatsApp</a>
    <a href={fbUrl} target="_blank" rel="noopener noreferrer" class="share-btn share-btn--fb">Facebook</a>
    <a href={redditUrl} target="_blank" rel="noopener noreferrer" class="share-btn share-btn--rd">Reddit</a>
    <a href={telegramUrl} target="_blank" rel="noopener noreferrer" class="share-btn share-btn--tg">Telegram</a>
    <button onclick="copyLink()" id="copy-btn" class="share-btn share-btn--copy">Copier le lien</button>
  </div>
</div>
```

- [ ] **Step 2 : Ajouter les styles des boutons de partage dans global.css**
```css
/* ── Boutons de partage ── */
.share-btn {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: opacity .2s;
}
.share-btn:hover { opacity: .8; }
.share-btn--x    { background: #000; color: #fff; }
.share-btn--wa   { background: #25D366; color: #fff; }
.share-btn--fb   { background: #1877F2; color: #fff; }
.share-btn--rd   { background: #FF4500; color: #fff; }
.share-btn--tg   { background: #2AABEE; color: #fff; }
.share-btn--copy { background: var(--border); color: var(--text); }
```

- [ ] **Step 3 : Remplacer les articles similaires (cards) par une liste compacte**

Dans `src/pages/articles/[slug].astro`, remplacer le bloc `similar-section` par :
```astro
{similar.length > 0 && (
  <div style="margin-top:40px;">
    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:14px;">Articles similaires</div>
    <div style="display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;">
      {similar.map((a, i) => (
        <a href={`/articles/${a.slug}`} style={`display:flex;align-items:center;gap:14px;padding:14px 16px;text-decoration:none;background:var(--card);transition:background .15s;${i < similar.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}`} onmouseover="this.style.background='var(--card-hover,#1e293b)'" onmouseout="this.style.background='var(--card)'">
          <div style={`width:40px;height:40px;border-radius:6px;background:${gradients[a.data.sport] || gradients.mma};flex-shrink:0;overflow:hidden;position:relative;`}>
            <img src={sportImages[a.data.sport] || '/images/sports/mma.svg'} alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.85;" loading="lazy"/>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.85rem;font-weight:600;color:var(--text);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" set:html={a.data.title}></div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">{sportLabel[a.data.sport] || a.data.sport} · {a.data.date}</div>
          </div>
        </a>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4 : Build de vérification**
```bash
npm run build --prefix frontkick 2>&1 | tail -5
```

- [ ] **Step 5 : Commit**
```bash
cd frontkick && git add src/pages/articles/[slug].astro public/styles/global.css && git commit -m "style: partage compact et articles similaires en liste"
```

---

## SPRINT 2 — Pages Discipline

### Task 4 : Hero pleine largeur avec SVG sport

**Files :**
- Modify: `src/pages/discipline/[sport].astro` — hero section
- Modify: `public/styles/global.css` — `.discipline-hero`

- [ ] **Step 1 : Remplacer le hero discipline par une version pleine largeur avec SVG**

Dans `src/pages/discipline/[sport].astro`, remplacer le bloc `.list-hero` par :
```astro
<div class="discipline-hero" style={`background: ${gradient};`}>
  <img src={sportImages[sport] || '/images/sports/mma.svg'} alt={label} class="discipline-hero__bg" loading="eager"/>
  <div class="discipline-hero__overlay"></div>
  <div class="discipline-hero__content">
    <div class="discipline-hero__label">Discipline</div>
    <h1 class="discipline-hero__title">{label}</h1>
    <p class="discipline-hero__desc">{description}</p>
  </div>
</div>
```

- [ ] **Step 2 : Ajouter les styles `.discipline-hero` dans global.css**
```css
/* ── Hero discipline ── */
.discipline-hero {
  position: relative;
  height: 280px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 36px;
  display: flex;
  align-items: flex-end;
}
.discipline-hero__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.75;
}
.discipline-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%);
}
.discipline-hero__content {
  position: relative;
  z-index: 1;
  padding: 28px 32px;
  width: 100%;
}
.discipline-hero__label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .15em;
  color: rgba(255,255,255,0.6);
  margin-bottom: 6px;
}
.discipline-hero__title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 3rem;
  letter-spacing: .04em;
  color: white;
  line-height: 1;
  margin: 0 0 8px;
}
.discipline-hero__desc {
  font-size: 0.92rem;
  color: rgba(255,255,255,0.78);
  max-width: 520px;
  line-height: 1.5;
  margin: 0;
}
@media (max-width: 768px) {
  .discipline-hero { height: 220px; }
  .discipline-hero__title { font-size: 2.2rem; }
  .discipline-hero__content { padding: 20px; }
}
```

- [ ] **Step 3 : Build de vérification**
```bash
npm run build --prefix frontkick 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**
```bash
cd frontkick && git add src/pages/discipline/[sport].astro public/styles/global.css && git commit -m "style: hero pleine largeur avec SVG sur pages discipline"
```

---

### Task 5 : Premier article mis en avant sur les pages discipline

**Files :**
- Modify: `src/pages/discipline/[sport].astro` — grille articles, premier article featured

- [ ] **Step 1 : Séparer premier article du reste et l'afficher en featured**

Dans `src/pages/discipline/[sport].astro`, remplacer le bloc `{articles.length > 0 ? (` par :
```astro
{articles.length > 0 ? (
  <div>
    {/* Article featured (premier) */}
    {(() => {
      const [featured, ...rest] = articles;
      return (
        <>
          <a href={`/articles/${featured.slug}`} class="art-card art-card--featured" style="display:flex;gap:0;margin-bottom:28px;flex-direction:row;">
            <div class="art-image art-image--featured" style={`background: ${gradients[featured.data.sport] || gradient}; position:relative; overflow:hidden; flex:0 0 46%; min-height:220px;`}>
              <img src={sportImages[featured.data.sport] ?? '/images/sports/default.svg'} alt={featured.data.sport} style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.8;" loading="lazy"/>
              <span class="art-cat-tag">{catLabel[featured.data.category] || featured.data.category}</span>
            </div>
            <div class="art-body" style="flex:1;padding:24px 28px;display:flex;flex-direction:column;justify-content:center;">
              <div class="art-title-sm" style="font-size:1.3rem;margin-bottom:10px;" set:html={featured.data.title}></div>
              <div class="art-excerpt" style="font-size:0.9rem;line-height:1.6;margin-bottom:16px;">{featured.data.excerpt}</div>
              <div class="art-foot">
                <span>{featured.data.date}</span>
                <span class="read-more">Lire l'article →</span>
              </div>
            </div>
          </a>
          {rest.length > 0 && (
            <div class="art-grid">
              {rest.map(a => (
                <a href={`/articles/${a.slug}`} class="art-card">
                  <div class="art-image" style={`background: ${gradients[a.data.sport] || gradient}; position:relative; overflow:hidden;`}>
                    <img src={sportImages[a.data.sport] ?? '/images/sports/default.svg'} alt={a.data.sport} style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.8;" loading="lazy"/>
                    <span class="art-cat-tag">{catLabel[a.data.category] || a.data.category}</span>
                  </div>
                  <div class="art-body">
                    <div class="art-title-sm" set:html={a.data.title}></div>
                    <div class="art-excerpt">{a.data.excerpt}</div>
                    <div class="art-foot">
                      <span>{a.data.date}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      );
    })()}
  </div>
) : (
  <div class="empty-state">
    <h3>Bientôt disponible</h3>
    <p>Les articles pour cette discipline arrivent prochainement. Revenez vite !</p>
    <a href="/" class="btn">← Retour à l'accueil</a>
  </div>
)}
```

- [ ] **Step 2 : Ajouter les styles `.art-card--featured` dans global.css**
```css
/* ── Card featured discipline ── */
.art-card--featured {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
}
.art-card--featured .art-image--featured {
  border-radius: 0;
}
@media (max-width: 640px) {
  .art-card--featured { flex-direction: column !important; }
  .art-card--featured .art-image--featured { flex: 0 0 180px !important; min-height: 180px !important; }
}
```

- [ ] **Step 3 : Build de vérification**
```bash
npm run build --prefix frontkick 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**
```bash
cd frontkick && git add src/pages/discipline/[sport].astro public/styles/global.css && git commit -m "style: article featured sur pages discipline"
```

---

## SPRINT 3 — Page d'accueil

### Task 6 : Hub disciplines avec SVG sport

**Files :**
- Modify: `src/pages/index.astro` — `.sports-hub`, `.sport-hub-card`
- Modify: `public/styles/global.css` — `.sport-hub-card`, `.sport-hub-img`

- [ ] **Step 1 : Améliorer les cards du hub disciplines dans global.css**
```css
/* ── Hub disciplines ── */
.sports-hub {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
  padding: 0 1.5rem;
}
.sport-hub-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  min-height: 160px;
  transition: transform .2s, box-shadow .2s;
  border: 1px solid var(--border);
}
.sport-hub-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,.35);
}
.sport-hub-img {
  position: absolute;
  inset: 0;
}
.sport-hub-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.65;
}
.sport-hub-top {
  position: relative;
  z-index: 1;
  padding: 14px 14px 0;
  flex: 1;
}
.sport-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.3rem;
  letter-spacing: .04em;
  color: white;
  line-height: 1.1;
}
.sport-origin {
  font-size: 0.68rem;
  color: rgba(255,255,255,0.55);
  margin-top: 3px;
  line-height: 1.3;
}
.sport-links {
  position: relative;
  z-index: 1;
  display: flex;
  border-top: 1px solid rgba(255,255,255,0.1);
  margin-top: 12px;
}
.sport-link {
  flex: 1;
  padding: 8px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  text-align: center;
  transition: color .15s, background .15s;
}
.sport-link:first-child {
  border-right: 1px solid rgba(255,255,255,0.1);
}
.sport-hub-card:hover .sport-link {
  color: white;
  background: rgba(255,255,255,0.08);
}
```

- [ ] **Step 2 : Ajouter le fond SVG sur chaque card du hub dans index.astro**

Dans `src/pages/index.astro`, le bloc `<a href=... class="sport-hub-card">` doit inclure le fond SVG. Modifier :
```astro
<a href={d.key === 'guides' ? '/guides' : `/discipline/${d.key}`} class="sport-hub-card" style={`background: ${gradients[d.key] || gradients.mma};`}>
  <div class="sport-hub-img">
    <img src={d.key === 'guides' ? '/images/sections/guides.svg' : (sportImages[d.key] ?? '/images/sports/default.svg')} alt={d.name} loading="lazy"/>
  </div>
  <div class="sport-hub-top">
    <div>
      <div class="sport-name">{d.name}</div>
      <div class="sport-origin">{d.origin}</div>
    </div>
  </div>
  <div class="sport-links">
    <div class="sport-link"><span>Articles</span></div>
    <div class="sport-link"><span>Guide →</span></div>
  </div>
</a>
```

- [ ] **Step 3 : Build de vérification**
```bash
npm run build --prefix frontkick 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**
```bash
cd frontkick && git add src/pages/index.astro public/styles/global.css && git commit -m "style: hub disciplines avec fond SVG sport"
```

---

### Task 7 : Widgets sidebar premium (newsletter + événements)

**Files :**
- Modify: `public/styles/global.css` — `.nl-widget`, `.widget`, `.ev-item`

- [ ] **Step 1 : Améliorer les styles widgets dans global.css**
```css
/* ── Widget newsletter ── */
.nl-widget {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  border: 1px solid rgba(56,189,248,0.2);
  border-radius: 14px;
  padding: 22px;
  margin-bottom: 20px;
}
.nl-widget .widget-head {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #38BDF8;
  margin-bottom: 8px;
}
.nl-widget p {
  font-size: 0.83rem;
  color: rgba(255,255,255,0.6);
  margin-bottom: 14px;
  line-height: 1.5;
}
.nl-input {
  width: 100%;
  padding: 9px 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 7px;
  color: white;
  font-size: 0.85rem;
  margin-bottom: 8px;
  box-sizing: border-box;
  outline: none;
  transition: border-color .2s;
}
.nl-input:focus {
  border-color: #38BDF8;
}
.nl-btn {
  width: 100%;
  padding: 9px;
  background: #1E88E5;
  color: white;
  border: none;
  border-radius: 7px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background .2s;
}
.nl-btn:hover { background: #1565C0; }
/* ── Widget événements ── */
.widget {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 20px;
}
.widget-head {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text-muted);
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.ev-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
  color: var(--text-light);
}
.ev-item:last-child { border-bottom: none; }
.ev-date {
  background: var(--accent-red);
  color: white;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: 3px 8px;
  border-radius: 5px;
  white-space: nowrap;
  flex-shrink: 0;
}
```

- [ ] **Step 2 : Build de vérification**
```bash
npm run build --prefix frontkick 2>&1 | tail -5
```

- [ ] **Step 3 : Commit**
```bash
cd frontkick && git add public/styles/global.css && git commit -m "style: widgets sidebar newsletter et événements premium"
```

---

## SPRINT 4 — Navigation mobile & transversal

### Task 8 : Menu hamburger mobile

**Files :**
- Modify: `src/layouts/Base.astro` — nav-bar, bouton hamburger, script toggle
- Modify: `public/styles/global.css` — `.nav-hamburger`, `.nav-bar.open`

- [ ] **Step 1 : Ajouter le bouton hamburger dans Base.astro**

Dans `src/layouts/Base.astro`, après `</form>` dans `.header-actions`, ajouter :
```astro
<button id="hamburger" class="nav-hamburger" aria-label="Menu" aria-expanded="false">
  <svg id="ham-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  <svg id="close-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:none;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>
```

- [ ] **Step 2 : Ajouter les styles hamburger dans global.css**
```css
/* ── Hamburger mobile ── */
.nav-hamburger {
  display: none;
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background .15s;
}
.nav-hamburger:hover { background: var(--border); }
@media (max-width: 768px) {
  .nav-hamburger { display: flex; align-items: center; justify-content: center; }
  .nav-bar .nav-inner {
    display: none;
    flex-direction: column;
    padding: 12px 16px 16px;
    gap: 2px;
  }
  .nav-bar.open .nav-inner {
    display: flex;
  }
  .nav-bar .nav-link {
    padding: 10px 12px;
    border-radius: 8px;
    width: 100%;
  }
}
```

- [ ] **Step 3 : Ajouter le script toggle hamburger dans Base.astro**

Dans `<script>` existant de Base.astro, ajouter :
```typescript
// ── Hamburger menu ──
const hamburger = document.getElementById('hamburger');
const navBar = document.querySelector('.nav-bar');
const hamIcon = document.getElementById('ham-icon');
const closeIcon = document.getElementById('close-icon');
if (hamburger && navBar) {
  hamburger.addEventListener('click', () => {
    const isOpen = navBar.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    if (hamIcon) (hamIcon as HTMLElement).style.display = isOpen ? 'none' : 'block';
    if (closeIcon) (closeIcon as HTMLElement).style.display = isOpen ? 'block' : 'none';
  });
}
```

- [ ] **Step 4 : Build de vérification**
```bash
npm run build --prefix frontkick 2>&1 | tail -5
```

- [ ] **Step 5 : Commit**
```bash
cd frontkick && git add src/layouts/Base.astro public/styles/global.css && git commit -m "feat: menu hamburger mobile"
```

---

### Task 9 : Search compressé + hero-accent-band + active nav

**Files :**
- Modify: `public/styles/global.css` — search mobile, hero-accent-band, nav active
- Modify: `src/layouts/Base.astro` — search input behavior

- [ ] **Step 1 : Améliorer hero-accent-band et active nav dans global.css**
```css
/* ── Hero accent band ── */
.hero-accent-band {
  height: 6px;
  background: linear-gradient(90deg, #DC2626 0%, #1E88E5 40%, #38BDF8 70%, transparent 100%);
  opacity: 0.9;
}
/* ── Nav active state ── */
.nav-link {
  position: relative;
}
.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--accent-red);
  border-radius: 2px;
}
/* ── Search mobile ── */
@media (max-width: 768px) {
  #searchForm input {
    width: 120px;
    transition: width .2s;
  }
  #searchForm input:focus {
    width: 180px;
  }
}
```

- [ ] **Step 2 : Build final de vérification**
```bash
npm run build --prefix frontkick 2>&1 | tail -5
```
Attendu : `75 page(s) built` sans erreur.

- [ ] **Step 3 : Commit final**
```bash
cd frontkick && git add public/styles/global.css && git commit -m "style: hero-band 6px, active nav underline, search mobile compact"
```

---

## Récapitulatif des tâches

| # | Sprint | Tâche | Fichiers |
|---|--------|-------|---------|
| 1 | Article | Typographie + hero réduit | `[slug].astro`, `global.css` |
| 2 | Article | TOC stylée + méta-row | `[slug].astro`, `global.css` |
| 3 | Article | Partage compact + similaires liste | `[slug].astro`, `global.css` |
| 4 | Discipline | Hero pleine largeur SVG | `[sport].astro`, `global.css` |
| 5 | Discipline | Article featured | `[sport].astro`, `global.css` |
| 6 | Accueil | Hub disciplines SVG | `index.astro`, `global.css` |
| 7 | Accueil | Widgets premium | `global.css` |
| 8 | Mobile | Menu hamburger | `Base.astro`, `global.css` |
| 9 | Mobile | Search compact + finitions | `global.css` |
