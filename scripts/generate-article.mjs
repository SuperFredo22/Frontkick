import { writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ARTICLES_DIR   = 'frontkick/src/content/articles';
const GEMINI_MODEL   = 'gemini-2.5-flash-lite';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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

const ARTICLE_TYPES = {

  actualite: {
    category: 'actualite',
    sports: ['mma', 'boxe', 'kickboxing', 'muay-thai', 'grappling'],
    needsRss: true,
    prompt: (sport, date, headlines) => `Tu es rédacteur pour Frontkick.fr, média sports de combat.
Génère un article d'actualité sur ${sport} en ${date}.
Actualités du jour : ${headlines.slice(0,4).map((h,i)=>`${i+1}. ${h.title}`).join(' | ')}
Développe, contextualise, cite des combattants et événements réels.
Réponds avec les champs : filename (slug kebab sans accent max 60 chars), title, excerpt (120-150 chars), content (markdown: intro sans H2, 3 sections ##, termine par --- puis **Conclusion :**, 400 mots français).`,
  },

  fond: {
    category: 'guide-debutant',
    sports: ['mma', 'boxe', 'kickboxing', 'muay-thai', 'grappling', 'karate'],
    needsRss: false,
    prompt: (sport, date) => `Tu es rédacteur pour Frontkick.fr, média sports de combat.
Génère un article de fond original sur ${sport} en ${date}.
Sujet : discipline méconnue, style rare, histoire fascinante, ou comparatif de styles liés à ${sport}.
Réponds avec les champs : filename (slug kebab sans accent max 60 chars), title, excerpt (120-150 chars), content (markdown: intro sans H2, 3 sections ##, termine par --- puis **Conclusion :**, 400 mots français).`,
  },

  personnalite: {
    category: 'analyse',
    sports: ['mma', 'boxe', 'karate', 'grappling', 'muay-thai'],
    needsRss: false,
    prompt: (sport, date) => `Tu es rédacteur pour Frontkick.fr, média sports de combat.
Génère un article sur une célébrité inattendue liée aux arts martiaux en ${date}.
Sujet : acteur, musicien ou personnalité publique qui pratique sérieusement un sport de combat. Cite grades et anecdotes réelles.
Réponds avec les champs : filename (slug kebab sans accent max 60 chars), title, excerpt (120-150 chars), content (markdown: intro sans H2, 3 sections ##, termine par --- puis **Conclusion :**, 400 mots français).`,
  },
};

// ─── Schema JSON que Gemini doit respecter ────────────────────────────────────
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    filename: { type: 'string' },
    title:    { type: 'string' },
    excerpt:  { type: 'string' },
    content:  { type: 'string' },
  },
  required: ['filename', 'title', 'excerpt', 'content'],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getArticleType() {
  const hour = new Date().getUTCHours();
  if (hour < 9)  return 'actualite';
  if (hour < 15) return 'fond';
  return 'personnalite';
}

async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',  // ✅ Force JSON natif
        responseSchema: RESPONSE_SCHEMA,        // ✅ Structure garantie
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0, 70);
}

function buildMarkdown(a, sport, category, date) {
  const title   = a.title.replace(/"/g,'\\"');
  const excerpt = (a.excerpt||'').replace(/"/g,'\\"');
  return `---
title: "${title}"
sport: ${sport}
category: ${category}
date: "${date}"
excerpt: "${excerpt}"
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
  console.log('🤖 Génération via Gemini (mode JSON natif)...');
  const raw = await callGemini(prompt);

  let article;
  try {
    article = JSON.parse(raw);
  } catch(e) {
    console.error('❌ Réponse brute:', raw.slice(0, 300));
    throw new Error(`JSON invalide : ${e.message}`);
  }

  for (const f of ['title','content','filename']) {
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
  writeFileSync(filepath, buildMarkdown(article, sport, type.category, dateStr), 'utf-8');

  console.log(`✅ Article créé : ${filepath}`);
  console.log(`   Titre : ${article.title}`);

  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) appendFileSync(ghOutput, `article_path=${filepath}\narticle_slug=${slug}\n`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
