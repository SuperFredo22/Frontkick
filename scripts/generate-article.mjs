import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ARTICLES_DIR   = 'frontkick/src/content/articles'; // ✅ CORRIGÉ
const GEMINI_MODEL   = 'gemini-2.0-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY) {
  console.error('❌ Variable GEMINI_API_KEY manquante');
  process.exit(1);
}

const RSS_FEEDS = [
  { url: 'https://www.mmafighting.com/rss/current', sport: 'mma' },
  { url: 'https://mmajunkie.usatoday.com/feed',     sport: 'mma' },
  { url: 'https://www.sherdog.com/rss/news.xml',    sport: 'mma' },
  { url: 'https://www.boxingscene.com/m/rss.php',   sport: 'boxe' },
];

async function fetchRssHeadlines(feedUrl, maxItems = 5) {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'FrontkickBot/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g)]
      .slice(1, maxItems + 1)
      .map(m => (m[1] || m[2] || '').trim())
      .filter(t => t.length > 10);
    return titles.map(t => ({ title: t }));
  } catch {
    return [];
  }
}

async function collectNews() {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async feed => {
      const items = await fetchRssHeadlines(feed.url);
      return items.map(item => ({ ...item, sport: feed.sport }));
    })
  );
  return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
}

// ─── Les 3 types d'articles, un par run ──────────────────────────────────────

const ARTICLE_TYPES = {

  // Type A — Actualité (1 run sur 3)
  actualite: {
    category: 'actualite',
    sports: ['mma', 'boxe', 'kickboxing', 'muay-thai', 'grappling'],
    needsRss: true,
    prompt: (sport, date, headlines) => `
Tu es rédacteur expert en sports de combat pour Frontkick.fr.
Réponds UNIQUEMENT avec un objet JSON valide. Pas de backticks.

Format JSON :
{
  "filename": "slug-kebab-sans-accent-max-60",
  "title": "Titre accrocheur en français avec noms réels",
  "sport": "${sport}",
  "category": "actualite",
  "date": "${date}",
  "excerpt": "Description 120-150 caractères",
  "featured": false,
  "content": "Contenu Markdown"
}

Règles content : intro sans H2, 3-5 sections ##, termine par --- puis **Conclusion :**, 400-600 mots.

ACTUALITÉS RÉCUPÉRÉES AUJOURD'HUI :
${headlines.slice(0, 6).map((h, i) => `${i + 1}. ${h.title}`).join('\n')}

Écris un article d'actualité sur ${sport} en ${date}.
Développe, contextualise, cite des combattants et événements réels.
Donne des faits, résultats, enjeux. Ton journalistique expert.
`,
  },

  // Type B — Fond / discipline méconnue / déclinaison (1 run sur 3)
  fond: {
    category: 'guide-debutant',
    sports: ['mma', 'boxe', 'kickboxing', 'muay-thai', 'grappling', 'karate'],
    needsRss: false,
    prompt: (sport, date) => `
Tu es rédacteur expert en sports de combat pour Frontkick.fr.
Réponds UNIQUEMENT avec un objet JSON valide. Pas de backticks.

Format JSON :
{
  "filename": "slug-kebab-sans-accent-max-60",
  "title": "Titre accrocheur en français",
  "sport": "${sport}",
  "category": "guide-debutant",
  "date": "${date}",
  "excerpt": "Description 120-150 caractères",
  "featured": false,
  "content": "Contenu Markdown"
}

Règles content : intro sans H2, 3-5 sections ##, termine par --- puis **Conclusion :**, 400-600 mots.

Écris un article de FOND original sur un de ces thèmes (choisis le plus intéressant) :
- Une discipline ou style méconnu lié à ${sport} (ex: karaté ashihara, lethwei birman, dambe africain, combat sambo, pancrace grec antique, capoeira angola vs regional...)
- Une technique ou concept précis et mal compris des débutants
- L'histoire fascinante d'une discipline ou d'un style de combat
- Un comparatif entre deux styles proches (ex: Muay-Thaï vs Kickboxing K-1)
- Un programme ou conseil d'entraînement très concret

Sois précis, instructif, avec des faits historiques ou techniques réels.
`,
  },

  // Type C — Personnalité inattendue / culture pop + arts martiaux (1 run sur 3)
  personnalite: {
    category: 'analyse',
    sports: ['mma', 'boxe', 'karate', 'grappling', 'muay-thai'],
    needsRss: false,
    prompt: (sport, date) => `
Tu es rédacteur expert en sports de combat pour Frontkick.fr.
Réponds UNIQUEMENT avec un objet JSON valide. Pas de backticks.

Format JSON :
{
  "filename": "slug-kebab-sans-accent-max-60",
  "title": "Titre accrocheur en français",
  "sport": "${sport}",
  "category": "analyse",
  "date": "${date}",
  "excerpt": "Description 120-150 caractères",
  "featured": false,
  "content": "Contenu Markdown"
}

Règles content : intro sans H2, 3-5 sections ##, termine par --- puis **Conclusion :**, 400-600 mots.

Écris un article sur une PERSONNALITÉ INATTENDUE liée aux sports de combat ou arts martiaux.
Choisis parmi ces profils (prends celui qui te semble le plus surprenant et méconnu) :
- Acteur/actrice qui pratique sérieusement un art martial (ex: Keanu Reeves judo/jiu-jitsu, Tom Hardy BJJ, Ashton Kutcher BJJ ceinture noire, Demi Lovato MMA, Ed O'Neill BJJ ceinture noire sous Machado...)
- Musicien/artiste qui pratique ou a pratiqué un sport de combat (ex: Elvis Presley ceinture noire karaté, ...)
- Personnalité historique ou politique connue pour sa pratique martiale
- Athlète d'un autre sport qui a une carrière en sport de combat (ex: sportif olympique reconverti)
- Philosophe, écrivain ou intellectuel pratiquant les arts martiaux

Sois précis sur les grades, les disciplines pratiquées, les anecdotes réelles.
Ton : fasciné, journalistique, accessible au grand public.
`,
  },
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Détermine le type selon l'heure UTC (répartition sur les 3 runs journaliers)
function getArticleType() {
  const hour = new Date().getUTCHours();
  if (hour < 9)  return 'actualite';    // run 7h UTC  → actu
  if (hour < 15) return 'fond';         // run 12h UTC → fond
  return 'personnalite';                // run 18h UTC → personnalité
}

async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 2500 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseArticle(raw) {
  const cleaned = raw.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Pas de JSON dans la réponse');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0, 70);
}

function buildMarkdown(a) {
  return `---
title: "${a.title.replace(/"/g,'\\"')}"
sport: ${a.sport}
category: ${a.category}
date: "${a.date}"
excerpt: "${(a.excerpt||'').replace(/"/g,'\\"')}"
featured: false
---

${a.content}
`;
}

async function main() {
  const typeKey = process.env.ARTICLE_TYPE || getArticleType();
  const type    = ARTICLE_TYPES[typeKey] || ARTICLE_TYPES.actualite;
  const sport   = pick(type.sports);
  const now     = new Date();
  const dateLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const dateStr   = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  console.log(`🎯 Type: ${typeKey} | Sport: ${sport}`);

  let headlines = [];
  if (type.needsRss) {
    console.log('📡 Lecture des flux RSS...');
    headlines = await collectNews();
    console.log(`   ${headlines.length} titres récupérés`);
  }

  const prompt = type.prompt(sport, dateStr, headlines);
  console.log('🤖 Génération via Gemini...');
  const raw = await callGemini(prompt);

  const article = parseArticle(raw);
  for (const f of ['title','sport','category','content','filename']) {
    if (!article[f]) throw new Error(`Champ manquant: ${f}`);
  }

  let slug     = slugify(article.filename || article.title);
  const ts     = now.toISOString().slice(0,16).replace(/[T:]/g,'-');
  let filepath = join(ARTICLES_DIR, `${slug}.md`);
  if (existsSync(filepath)) {
    slug     = `${slug}-${ts}`;
    filepath = join(ARTICLES_DIR, `${slug}.md`);
  }

  mkdirSync(ARTICLES_DIR, { recursive: true });
  writeFileSync(filepath, buildMarkdown({ ...article, sport, category: type.category, date: dateStr }), 'utf-8');

  console.log(`✅ Article créé : ${filepath}`);
  console.log(`   Titre : ${article.title}`);

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) appendFileSync(ghOutput, `article_path=${filepath}\narticle_slug=${slug}\n`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
