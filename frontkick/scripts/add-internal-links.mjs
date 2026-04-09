// add-internal-links.mjs
// FightFocus — Ajout automatique de liens internes dans les articles
//
// Pour chaque article sans section "Pour aller plus loin", ajoute 3 liens
// vers des articles connexes (même sport prioritaire, puis même catégorie).
// 100% algorithmique — aucune API requise.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, '../src/content/articles');

// ─── Lecture du frontmatter ───────────────────────────────────────────────────
function parseFrontmatter(content) {
  // Supporte \n (Unix) et \r\n (Windows)
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  m[1].split(/\r?\n/).forEach(line => {
    const [k, ...v] = line.split(':');
    if (k && v.length) meta[k.trim()] = v.join(':').trim().replace(/^"|"$/g, '');
  });
  return { meta, body: m[2] };
}

// ─── Chargement de tous les articles ─────────────────────────────────────────
function loadArticles() {
  return fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8');
      const parsed  = parseFrontmatter(content);
      if (!parsed) return null;
      return {
        slug:     f.replace(/\.md$/, ''),
        file:     f,
        title:    parsed.meta.title || f,
        sport:    parsed.meta.sport || '',
        category: parsed.meta.category || '',
        body:     parsed.body,
        raw:      content,
      };
    })
    .filter(Boolean);
}

// ─── Scoring de pertinence entre deux articles ────────────────────────────────
function relevanceScore(a, b) {
  if (a.slug === b.slug) return -1;
  let score = 0;
  if (a.sport === b.sport)       score += 10;
  if (a.category === b.category) score += 4;
  // Bonus si les slugs partagent des mots-clés
  const wordsA = a.slug.replace(/\d{4}-\d{2}-\d{2}-/, '').split('-').filter(w => w.length > 3);
  const wordsB = b.slug.replace(/\d{4}-\d{2}-\d{2}-/, '').split('-').filter(w => w.length > 3);
  const shared = wordsA.filter(w => wordsB.includes(w)).length;
  score += shared * 2;
  return score;
}

// ─── Sélection des 3 meilleurs liens pour un article ─────────────────────────
function pickRelated(article, all) {
  return all
    .filter(a => a.slug !== article.slug)
    .map(a => ({ article: a, score: relevanceScore(article, a) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.article);
}

// ─── Génération de la section "Pour aller plus loin" ─────────────────────────
function buildSection(related) {
  const lines = related.map(a => `- [${a.title}](/articles/${a.slug})`);
  return `\n\n## Pour aller plus loin\n\n${lines.join('\n')}\n`;
}

// ─── Traitement d'un article ──────────────────────────────────────────────────
function processArticle(article, all) {
  // Déjà un lien interne ou une section "Pour aller plus loin" ?
  if (article.body.includes('Pour aller plus loin')) return 'skip-existing';
  if (article.body.includes('](/articles/'))         return 'skip-has-links';

  const related = pickRelated(article, all);
  if (related.length < 2) return 'skip-no-candidates';

  const newBody   = article.body.trimEnd() + buildSection(related);
  const newContent = article.raw.replace(article.body, newBody);

  fs.writeFileSync(path.join(ARTICLES_DIR, article.file), newContent, 'utf8');
  return 'added';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const articles = loadArticles();
  console.log(`\n🔗 FightFocus — Liens internes automatiques`);
  console.log(`   ${articles.length} articles chargés\n`);

  let added = 0, skipped = 0;

  for (const article of articles) {
    const result = processArticle(article, articles);
    if (result === 'added') {
      const related = pickRelated(article, articles);
      console.log(`  ✅ ${article.file}`);
      related.forEach(r => console.log(`     → ${r.title}`));
      added++;
    } else {
      console.log(`  ⏭  ${article.file} (${result})`);
      skipped++;
    }
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`  Liés : ${added} | Ignorés : ${skipped}`);
  console.log(`══════════════════════════════════\n`);
}

main();
