// generate-article.mjs
// FightFocus — V7-SAFE
// Perplexity = idée SEO uniquement (jamais de faits)
// Gemini = rédaction evergreen 100% fiable
// Correctifs V3.2 intégrés : strip backticks, normalize tirets, repair frontmatter,
//                            anti-doublon, exit code, rotation sports

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const GEMINI_API_KEY     = process.env.GEMINI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const __dirname          = path.dirname(fileURLToPath(import.meta.url));

// ─── Rotation sports ──────────────────────────────────────────────────────────
const SPORTS = ['mma', 'boxe', 'muay-thai', 'kickboxing', 'grappling'];
const SPORT_LABELS = {
  'mma':        'MMA',
  'boxe':       'boxe anglaise',
  'muay-thai':  'Muay Thaï',
  'kickboxing': 'kickboxing',
  'grappling':  'grappling et BJJ'
};

// Sport du jour basé sur la semaine ISO (cycle 5 semaines)
function pickSport(dateStr) {
  const d       = new Date(dateStr);
  const jan1    = new Date(d.getUTCFullYear(), 0, 1);
  const weekNum = Math.floor((d - jan1) / (7 * 86400000));
  return SPORTS[weekNum % SPORTS.length];
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"«»:!?,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 70);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function slugAlreadyExists(slug, articlesDir) {
  if (!fs.existsSync(articlesDir)) return false;
  return fs.readdirSync(articlesDir).some(f => f.includes(slug.substring(0, 40)));
}

// ─── Nettoyage sortie Gemini (correctifs V3.2) ───────────────────────────────

function stripGeminiCodeFences(text) {
  let r = text.trim();
  r = r.replace(/^```(?:markdown|yaml|md|json)?\s*\n?/i, '');
  r = r.replace(/\n?```\s*$/i, '');
  r = r.replace(/^```(?:markdown|yaml|md|json)?\s*\n?/i, '');
  r = r.replace(/\n?```\s*$/i, '');
  return r.trim();
}

function normalizeDashes(text) {
  // Remplace tirets longs — ou – par --- sur les lignes de séparateur
  return text.replace(/^[\u2014\u2013\-]{3,}\s*$/gm, '---');
}

function repairFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const lines = text.split('\n');
  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { closingIdx = i; break; }
  }
  if (closingIdx !== -1) return text; // déjà fermé

  // Cherche la dernière ligne YAML puis insère ---
  const yamlFieldRegex = /^[a-zA-Z_][a-zA-Z0-9_]*\s*:/;
  let lastYamlLine = 0;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (yamlFieldRegex.test(l)) { lastYamlLine = i; }
    else if (l === '' && lastYamlLine > 0) break;
    else if (l.startsWith('#') || l.startsWith('Le ') || l.startsWith('Au ')) break;
  }
  if (lastYamlLine > 0) {
    lines.splice(lastYamlLine + 1, 0, '---');
    console.log(`  🔧 Réparation frontmatter — --- inséré après ligne ${lastYamlLine + 1}`);
  }
  return lines.join('\n');
}

function cleanGeminiOutput(raw) {
  let t = stripGeminiCodeFences(raw);
  t = normalizeDashes(t);
  t = repairFrontmatter(t);
  return t;
}

// ─── Étape 1 : Perplexity → IDÉE SEO uniquement (jamais de faits) ────────────

async function getSeoTopic(sport) {
  const sportLabel = SPORT_LABELS[sport] || sport;
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `Tu es expert SEO spécialisé en sports de combat.
RÈGLE ABSOLUE : tu donnes UNIQUEMENT des idées de sujets, jamais des faits, jamais des résultats.`
          },
          {
            role: 'user',
            content: `Propose UN seul sujet d'article evergreen SEO sur le ${sportLabel}.
Le sujet doit être utile pour débutant ou pratiquant, intemporel, sans mention d'événements ou combattants spécifiques.
Réponds uniquement avec le titre du sujet, rien d'autre.`
          }
        ],
        max_tokens: 150
      })
    });
    const data = await res.json();
    const topic = data.choices?.[0]?.message?.content?.trim() || '';
    if (topic.length > 10) {
      console.log(`  ✓ Perplexity — sujet SEO : "${topic}"`);
      return topic;
    }
    throw new Error('Réponse trop courte');
  } catch (err) {
    console.warn(`  ⚠ Perplexity fail (${err.message}) → fallback sujet`);
    return '';
  }
}

// ─── Étape 2 : Gemini → article evergreen fiable ─────────────────────────────

async function generateArticle(topic, sport, date, attempts = 2) {
  const sportLabel = SPORT_LABELS[sport] || sport;
  const sujet = topic || `Progresser en ${sportLabel} : méthode et conseils`;

  const prompt = `Tu es rédacteur expert en sports de combat pour FightFocus.fr.

SUJET : ${sujet}
SPORT : ${sportLabel}
DATE  : ${date}

OBJECTIF : article evergreen fiable, utile, optimisé SEO pour FightFocus.fr.

RÈGLES ABSOLUES :
✅ Français · ton expert et accessible
✅ 900 à 1200 mots
✅ Au minimum 3 sections ## bien développées
✅ Introduction de 2-3 phrases · conclusion invitant à revenir sur FightFocus.fr
❌ AUCUN fait d'actualité, résultat de combat, événement récent
❌ AUCUN nom de combattant actif contemporain (tu peux citer des techniques ou concepts)
❌ AUCUN placeholder : [NOM], [DATE], etc.
❌ AUCUNE liste à puces dans le corps
❌ JAMAIS de backticks \`\`\` autour de ta réponse
❌ JAMAIS de tirets longs — à la place des séparateurs ---

Commence ta réponse EXACTEMENT par --- sans rien avant :

---
title: "Titre SEO accrocheur (50-70 caractères, mot-clé ${sportLabel} inclus)"
sport: ${sport}
category: guide
date: "${date}"
excerpt: "Résumé engageant 120-160 caractères"
featured: false
---

## Premier titre de section

[Ton article ici]`;

  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2800, temperature: 0.6, topP: 0.9 }
          })
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err}`);
      }
      const data = await res.json();
      const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error('Gemini réponse vide');
      console.log(`  ✓ Gemini — ${raw.length} chars · sport: ${sport}`);
      return cleanGeminiOutput(raw);
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(`  ⚠ Gemini tentative ${i}: ${err.message} — retry 3s...`);
      await sleep(3000);
    }
  }
}

// ─── Fallback article ─────────────────────────────────────────────────────────
function fallbackArticle(sport, date) {
  const label = SPORT_LABELS[sport] || sport;
  return `---
title: "Progresser en ${label} : les bases essentielles"
sport: ${sport}
category: guide
date: "${date}"
excerpt: "Guide complet pour progresser en ${label}, des fondamentaux à la pratique régulière."
featured: false
---

Le ${label} est une discipline exigeante qui récompense la régularité et la méthode.

## Maîtriser les fondamentaux

La progression en ${label} commence par une base solide. Les mouvements fondamentaux, s'ils sont bien intégrés, deviennent des automatismes qui libèrent l'esprit pour des techniques plus élaborées.

## Structurer son entraînement

Un programme équilibré alterne technique, cardio et récupération. La régularité prime sur l'intensité : trois séances hebdomadaires bien conduites valent mieux que des sessions irrégulières et épuisantes.

## Les erreurs classiques à éviter

Brûler les étapes, négliger la récupération, s'entraîner sans encadrement : ces erreurs ralentissent la progression et augmentent le risque de blessure. La patience est la première qualité d'un pratiquant sérieux.

## Conclusion

La progression en ${label} est une aventure longue terme. Revenez sur FightFocus.fr pour découvrir nos guides complets sur la technique et l'entraînement.
`;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateArticle(content) {
  const cleaned = cleanGeminiOutput(content);

  if (!cleaned.startsWith('---')) throw new Error('Frontmatter absent');
  const fmEnd = cleaned.indexOf('---', 3);
  if (fmEnd === -1) throw new Error('Frontmatter non fermé');

  const fm   = cleaned.substring(0, fmEnd + 3);
  const body = cleaned.substring(fmEnd + 3).trim();

  for (const field of ['title:', 'sport:', 'category:', 'date:', 'excerpt:']) {
    if (!fm.includes(field)) throw new Error(`Champ manquant : ${field}`);
  }

  const validSports = ['mma','boxe','kickboxing','muay-thai','grappling','karate','sanda','lethwei','savate','sambo'];
  const validCats   = ['guide','guide-debutant','conseil-entrainement','analyse','guide-equipement','actualite'];
  const sportVal    = (fm.match(/^sport:\s*(.+)$/m)    || [])[1]?.trim();
  const catVal      = (fm.match(/^category:\s*(.+)$/m) || [])[1]?.trim();

  if (sportVal && !validSports.includes(sportVal))
    throw new Error(`Sport invalide : "${sportVal}"`);
  if (catVal && !validCats.includes(catVal))
    throw new Error(`Category invalide : "${catVal}"`);

  const words  = body.split(/\s+/).filter(Boolean).length;
  const h2cnt  = (body.match(/^##\s+\S/gm) || []).length;

  if (words < 300) throw new Error(`Trop court : ${words} mots`);
  if (h2cnt < 2)   throw new Error(`H2 insuffisants : ${h2cnt}`);

  console.log(`  ✓ Validation OK — ${words} mots · ${h2cnt} H2 · ${sportVal} / ${catVal}`);
  return cleaned;
}

// ─── Sauvegarde ───────────────────────────────────────────────────────────────
function saveArticle(content, date) {
  const titleMatch  = content.match(/^title:\s*"(.+?)"$/m);
  const title       = titleMatch ? titleMatch[1] : `article-${date}`;
  const slug        = slugify(title);
  const filename    = `${date}-${slug}.md`;
  const articlesDir = path.resolve(__dirname, '../src/content/articles');

  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });
  if (slugAlreadyExists(slug, articlesDir))
    throw new Error(`Slug déjà existant : "${slug}" — anti-doublon activé`);

  fs.writeFileSync(path.join(articlesDir, filename), content, 'utf8');
  console.log(`  ✓ Sauvegardé : ${filename}`);
  return filename;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  FightFocus — Génération V7-SAFE');
  console.log('  Perplexity=idée · Gemini=rédaction evergreen');
  console.log('═══════════════════════════════════════════\n');

  if (!PERPLEXITY_API_KEY) { console.error('❌ PERPLEXITY_API_KEY manquante'); process.exit(1); }
  if (!GEMINI_API_KEY)     { console.error('❌ GEMINI_API_KEY manquante');     process.exit(1); }

  const date  = getTodayDate();
  const sport = pickSport(date);
  console.log(`  Sport du jour : ${SPORT_LABELS[sport]} (${sport})`);
  console.log(`  Date         : ${date}\n`);

  try {
    console.log('1/4 — Perplexity : idée SEO...');
    const topic = await getSeoTopic(sport);
    await sleep(500);

    console.log('2/4 — Gemini : rédaction...');
    let content;
    try {
      content = await generateArticle(topic, sport, date);
    } catch (err) {
      console.warn(`  ⚠ Gemini fail : ${err.message} → fallback`);
      content = fallbackArticle(sport, date);
    }

    console.log('3/4 — Validation...');
    let validated;
    try {
      validated = validateArticle(content);
    } catch (err) {
      console.warn(`  ⚠ Validation fail : ${err.message} → fallback`);
      validated = validateArticle(fallbackArticle(sport, date));
    }

    console.log('4/4 — Sauvegarde...');
    const filename = saveArticle(validated, date);

    console.log(`\n✅ SUCCÈS — ${filename}\n`);
  } catch (err) {
    console.error(`\n❌ ÉCHEC — ${err.message}`);
    console.error('   Aucun fichier créé.\n');
    process.exit(1);
  }
}

main();
