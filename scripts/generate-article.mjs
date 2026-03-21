import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ARTICLES_DIR   = 'src/content/articles';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY) {
  console.error('❌ Variable GEMINI_API_KEY manquante');
  process.exit(1);
}

const RSS_FEEDS = [
  { url: 'https://www.mmafighting.com/rss/current',   sport: 'mma'  },
  { url: 'https://mmajunkie.usatoday.com/feed',       sport: 'mma'  },
  { url: 'https://www.sherdog.com/rss/news.xml',      sport: 'mma'  },
  { url: 'https://www.boxingscene.com/m/rss.php',     sport: 'boxe' },
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

const SPORTS = ['mma', 'boxe', 'kickboxing', 'muay-thai', 'grappling', 'karate'];
const WEIGHTED_CATEGORIES = [
  'actualite', 'actualite', 'actualite',
  'guide-debutant', 'conseil-entrainement',
  'analyse', 'guide-equipement',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildPrompt({ sport, category, dateLabel, headlines }) {
  const newsBlock = headlines.length > 0
    ? `\nACTUALITÉS DU JOUR (utilise-les comme base) :\n${
        headlines.slice(0, 6).map((h, i) => `${i + 1}. ${h.title}`).join('\n')
      }\n`
    : '';

  return `Tu es rédacteur expert en sports de combat pour Frontkick.fr.
Réponds UNIQUEMENT avec un objet JSON valide. Pas de backticks, pas d'explication.

Format JSON :
{
  "filename": "slug-kebab-case-sans-accent-max-60-chars",
  "title": "Titre accrocheur en français",
  "sport": "${sport}",
  "category": "${category}",
  "date": "${dateLabel}",
  "excerpt": "Description 120-150 caractères",
  "featured": false,
  "content": "Contenu Markdown complet"
}

Règles pour content :
- Paragraphe d'intro sans ## au début
- 3 à 5 sections ## H2
- Listes ou tableaux si utile
- Termine par --- puis **Conclusion :** en gras
- 400 à 600 mots, ton expert francophone
${newsBlock}
${category === 'actualite'
  ? `Sujet : article ACTUALITÉ sur ${sport} en ${dateLabel}. Utilise les titres fournis, développe et contextualise.`
  : `Sujet : article de FOND sur ${sport}, catégorie "${category}". Angle original et concret.`
}`;
}

async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2500 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseArticle(raw) {
  const cleaned = raw.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Pas de JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0, 70);
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
  const sport    = pick(SPORTS);
  const category = pick(WEIGHTED_CATEGORIES);
  const now      = new Date();
  const dateLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const dateStr  = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  console.log(`🎯 Sport: ${sport} | Catégorie: ${category}`);

  let headlines = [];
  if (category === 'actualite') {
    console.log('📡 Lecture des flux RSS...');
    headlines = await collectNews();
    console.log(`   ${headlines.length} titres récupérés`);
  }

  console.log('🤖 Génération via Gemini...');
  const raw = await callGemini(buildPrompt({ sport, category, dateLabel: dateStr, headlines }));

  const article = parseArticle(raw);
  for (const f of ['title','sport','category','content','filename']) {
    if (!article[f]) throw new Error(`Champ manquant: ${f}`);
  }

  let slug     = slugify(article.filename || article.title);
  const ts     = now.toISOString().slice(0,16).replace(/[T:]/g,'-');
  let filepath = join(ARTICLES_DIR, `${slug}.md`);
  if (existsSync(filepath)) { slug = `${slug}-${ts}`; filepath = join(ARTICLES_DIR,`${slug}.md`); }

  mkdirSync(ARTICLES_DIR, { recursive: true });
  writeFileSync(filepath, buildMarkdown({ ...article, sport, category, date: dateStr }), 'utf-8');

  console.log(`✅ Article créé : ${filepath}`);
  console.log(`   Titre : ${article.title}`);

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) appendFileSync(ghOutput, `article_path=${filepath}\narticle_slug=${slug}\n`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
