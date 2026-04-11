// generate-article.mjs
// FightFocus — V8
// Perplexity = tendance sport du moment (idée contexte, jamais des faits)
// Gemini     = rédaction evergreen propre, lisible, structurée
// Nouveautés V8 :
//   - Rotation élargie (10 sports, catégories variées)
//   - Format lisible : paragraphes courts, listes autorisées
//   - Interdiction stricte des --- dans le corps
//   - Détection de tendance par Perplexity pour choisir le sport du jour
//   - Anti-doublon renforcé sur les 60 premiers chars du slug

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const GEMINI_API_KEY     = process.env.GEMINI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const __dirname          = path.dirname(fileURLToPath(import.meta.url));

// ─── Sports & labels ──────────────────────────────────────────────────────────
const SPORTS = ['mma', 'boxe', 'muay-thai', 'kickboxing', 'grappling', 'karate', 'sanda', 'lethwei', 'savate', 'sambo'];
const SPORT_LABELS = {
  'mma':        'MMA',
  'boxe':       'boxe anglaise',
  'muay-thai':  'Muay Thaï',
  'kickboxing': 'kickboxing',
  'grappling':  'grappling et BJJ',
  'karate':     'karaté kyokushin',
  'sanda':      'sanda',
  'lethwei':    'lethwei',
  'savate':     'savate boxe française',
  'sambo':      'sambo',
};

// Catégories variées selon un cycle
const CATEGORY_ROTATION = [
  'guide-debutant',
  'conseil-entrainement',
  'analyse',
  'guide',
  'conseil-entrainement',
  'guide-debutant',
  'analyse',
];

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getDayOfYear() {
  const now = new Date();
  const jan1 = new Date(now.getUTCFullYear(), 0, 1);
  return Math.floor((now - jan1) / 86400000);
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
  const prefix = slug.substring(0, 60);
  return fs.readdirSync(articlesDir).some(f => {
    const base = f.replace(/\.md$/, '');
    // strip date prefix if present (YYYY-MM-DD-)
    const stripped = base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    return stripped.includes(prefix.substring(0, 40));
  });
}

// ─── Nettoyage sortie Gemini ──────────────────────────────────────────────────
function stripGeminiCodeFences(text) {
  let r = text.trim();
  r = r.replace(/^```(?:markdown|yaml|md|json)?\s*\n?/i, '');
  r = r.replace(/\n?```\s*$/i, '');
  r = r.replace(/^```(?:markdown|yaml|md|json)?\s*\n?/i, '');
  r = r.replace(/\n?```\s*$/i, '');
  return r.trim();
}

function removeBodyHorizontalRules(text) {
  // Supprime les --- qui apparaissent dans le corps (après le frontmatter fermant)
  if (!text.startsWith('---')) return text;
  const fmEnd = text.indexOf('\n---', 3);
  if (fmEnd === -1) return text;
  const frontmatter = text.substring(0, fmEnd + 4);
  let body = text.substring(fmEnd + 4);
  // Supprime les lignes contenant uniquement --- ou –– (tirets EM/EN)
  body = body.replace(/^\s*[-\u2014\u2013]{3,}\s*$/gm, '');
  // Remplace les doubles sauts de ligne créés par la suppression
  body = body.replace(/\n{3,}/g, '\n\n');
  return frontmatter + body;
}

function repairFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const lines = text.split('\n');
  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { closingIdx = i; break; }
  }
  if (closingIdx !== -1) return text;

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
  t = repairFrontmatter(t);
  t = removeBodyHorizontalRules(t);
  return t;
}

// ─── Étape 1 : Perplexity → sport tendance + contexte thématique ──────────────
// On demande UNIQUEMENT quel sport est en tendance et un thème générique
// Jamais de faits, jamais de résultats, jamais de noms de combattants

async function getTrendingSportAndTheme() {
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
            content: `Tu es expert SEO en sports de combat. Tu identifies uniquement les SPORTS (pas les combattants ni les événements) qui font l'actualité cette semaine.
RÈGLE ABSOLUE : réponds uniquement au format demandé, sans aucun fait, résultat ou nom de combattant.`
          },
          {
            role: 'user',
            content: `Quel sport de combat parmi cette liste est le plus recherché cette semaine en France ?
Liste : MMA, boxe anglaise, Muay Thaï, kickboxing, grappling, karaté, sanda, lethwei, savate, sambo

Réponds UNIQUEMENT avec ce format JSON (deux lignes max) :
{"sport":"<sport de la liste>","theme":"<thème evergreen lié à ce sport, sans événement ni combattant>"}

Exemple valide : {"sport":"boxe anglaise","theme":"les erreurs de garde les plus fréquentes chez les débutants"}
Exemple invalide : {"sport":"boxe anglaise","theme":"le combat de Canelo en mai"}`
          }
        ],
        max_tokens: 120,
        temperature: 0.2
      })
    });
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const match = raw.match(/\{[^}]+\}/);
    if (!match) throw new Error('Format JSON non trouvé');
    const parsed = JSON.parse(match[0]);
    if (!parsed.sport || !parsed.theme) throw new Error('Champs manquants');

    // Mappe le label Perplexity vers notre clé interne
    const sportKey = Object.entries(SPORT_LABELS).find(([, label]) =>
      parsed.sport.toLowerCase().includes(label.split(' ')[0].toLowerCase())
    )?.[0];

    console.log(`  ✓ Perplexity — sport tendance : "${parsed.sport}" → clé: ${sportKey || 'non mappé'}`);
    console.log(`  ✓ Perplexity — thème : "${parsed.theme}"`);
    return { sportKey: sportKey || null, theme: parsed.theme };
  } catch (err) {
    console.warn(`  ⚠ Perplexity fail (${err.message}) → fallback rotation`);
    return { sportKey: null, theme: '' };
  }
}

// ─── Étape 2 : Gemini → article evergreen lisible ────────────────────────────
async function generateArticle(theme, sport, category, date, attempts = 2) {
  const sportLabel = SPORT_LABELS[sport] || sport;

  const catDescriptions = {
    'guide-debutant':       'guide pratique pour débutants, pédagogique et rassurant',
    'conseil-entrainement': 'article de conseil concret sur l\'entraînement et la progression',
    'analyse':              'analyse technique ou tactique, ton expert mais accessible',
    'guide':                'guide complet sur un sujet pratique',
  };
  const catDesc = catDescriptions[category] || 'article éducatif';
  const sujet = theme || `Progresser en ${sportLabel} : méthode et conseils pratiques`;

  const prompt = `Tu es rédacteur expert en sports de combat pour FightFocus.fr.

SUJET   : ${sujet}
SPORT   : ${sportLabel}
TYPE    : ${catDesc}
DATE    : ${date}

OBJECTIF : produire un article de qualité, facile à lire, optimisé SEO pour FightFocus.fr.

━━ FORMAT OBLIGATOIRE ━━
✅ Frontmatter YAML correct (voir ci-dessous)
✅ 3 à 5 sections ## bien titrées
✅ Paragraphes COURTS : 3-4 phrases maximum par paragraphe
✅ Tu peux utiliser des listes à puces (- item) quand elles sont utiles : max 5 items
✅ Introduction courte (2 phrases) qui accroche le lecteur
✅ Conclusion d'une phrase invitant à revenir sur FightFocus.fr
✅ Français · ton expert, direct, sans jargon inutile
✅ 700 à 1000 mots

━━ INTERDICTIONS ABSOLUES ━━
❌ AUCUN fait d'actualité, résultat de combat, événement récent ou à venir
❌ AUCUN nom de combattant actif contemporain
❌ AUCUN placeholder : [NOM], [DATE], [SOURCE], etc.
❌ JAMAIS de --- dans le corps de l'article (uniquement dans le frontmatter)
❌ JAMAIS de backticks \`\`\` autour de ta réponse
❌ JAMAIS de tirets longs — (remplace par une virgule ou un point)

━━ FRONTMATTER ATTENDU ━━
Commence ta réponse EXACTEMENT par :

---
title: "Titre SEO accrocheur 50-70 chars avec le mot-clé ${sportLabel}"
sport: ${sport}
category: ${category}
date: "${date}"
excerpt: "Résumé engageant 120-160 chars"
featured: false
---

## Premier titre de section

[Commence ici avec 2 phrases d'introduction courtes et directes]

## Deuxième section...`;

  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 2200,
              temperature: 0.65,
              topP: 0.92,
            }
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
      console.log(`  ✓ Gemini — ${raw.length} chars · ${sport} / ${category}`);
      return cleanGeminiOutput(raw);
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(`  ⚠ Gemini tentative ${i}: ${err.message} — retry 3s...`);
      await sleep(3000);
    }
  }
}

// ─── Fallback ─────────────────────────────────────────────────────────────────
function fallbackArticle(sport, category, date) {
  const label = SPORT_LABELS[sport] || sport;
  return `---
title: "Progresser en ${label} : méthode et conseils pratiques"
sport: ${sport}
category: ${category}
date: "${date}"
excerpt: "Guide pratique pour progresser régulièrement en ${label}, des fondamentaux à la pratique avancée."
featured: false
---

## Maîtriser les fondamentaux d'abord

La progression en ${label} commence toujours par les bases. Un mouvement fondamental mal acquis se retrouve amplifié dans les techniques plus complexes. Prendre le temps de les solidifier au début évite des mois de correction plus tard.

## Structurer son entraînement

Un programme efficace alterne technique, conditionnement physique et récupération. La régularité prime sur l'intensité : trois séances hebdomadaires bien conduites progressent plus vite qu'un entraînement quotidien non structuré.

Quelques principes à retenir :

- Travailler chaque technique isolément avant de l'intégrer en combinaison
- Alterner séances légères et séances intenses
- Réserver une session par semaine au sparring technique

## Les erreurs les plus courantes

Brûler les étapes est la première erreur. Vouloir maîtriser des techniques avancées sans avoir les bases conduit à de mauvaises habitudes difficiles à corriger. La deuxième erreur est de négliger la récupération : les muscles et le système nerveux ont besoin de temps pour consolider les apprentissages.

## Progresser sur le long terme

La progression en ${label} se mesure sur des mois, pas sur des semaines. Chaque séance est un investissement. Restez patient, travaillez avec un coach compétent, et revenez sur FightFocus.fr pour découvrir nos guides complets sur la technique et l'entraînement.
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

  const validSports = ['mma','boxe','kickboxing','muay-thai','grappling','karate','sanda','lethwei','savate','sambo','k1','equipement'];
  const validCats   = ['guide','guide-debutant','conseil-entrainement','analyse','guide-equipement','actualite'];
  const sportVal    = (fm.match(/^sport:\s*(.+)$/m) || [])[1]?.trim();
  const catVal      = (fm.match(/^category:\s*(.+)$/m) || [])[1]?.trim();

  if (sportVal && !validSports.includes(sportVal))
    throw new Error(`Sport invalide : "${sportVal}"`);
  if (catVal && !validCats.includes(catVal))
    throw new Error(`Category invalide : "${catVal}"`);

  const words  = body.split(/\s+/).filter(Boolean).length;
  const h2cnt  = (body.match(/^##\s+\S/gm) || []).length;

  // Vérification : aucun --- parasite dans le corps
  const bodyLines = body.split('\n');
  const spuriousHR = bodyLines.filter(l => /^\s*---+\s*$/.test(l));
  if (spuriousHR.length > 0)
    throw new Error(`${spuriousHR.length} séparateur(s) --- parasite(s) dans le corps`);

  if (words < 250) throw new Error(`Trop court : ${words} mots`);
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
  console.log('  FightFocus — Génération V8');
  console.log('  Perplexity=tendance · Gemini=evergreen lisible');
  console.log('═══════════════════════════════════════════\n');

  if (!PERPLEXITY_API_KEY) { console.error('❌ PERPLEXITY_API_KEY manquante'); process.exit(1); }
  if (!GEMINI_API_KEY)     { console.error('❌ GEMINI_API_KEY manquante');     process.exit(1); }

  const date    = getTodayDate();
  const dayIdx  = getDayOfYear();

  // Catégorie du jour (rotation hebdomadaire)
  const category = CATEGORY_ROTATION[dayIdx % CATEGORY_ROTATION.length];

  console.log('1/4 — Perplexity : sport tendance...');
  const { sportKey, theme } = await getTrendingSportAndTheme();
  await sleep(500);

  // Sport : tendance Perplexity si dispo, sinon rotation par jour
  const sport = sportKey || SPORTS[dayIdx % SPORTS.length];
  console.log(`  Sport retenu : ${SPORT_LABELS[sport]} (${sport})`);
  console.log(`  Catégorie    : ${category}`);
  console.log(`  Date         : ${date}\n`);

  try {
    console.log('2/4 — Gemini : rédaction...');
    let content;
    try {
      content = await generateArticle(theme, sport, category, date);
    } catch (err) {
      console.warn(`  ⚠ Gemini fail : ${err.message} → fallback`);
      content = fallbackArticle(sport, category, date);
    }

    console.log('3/4 — Validation...');
    let validated;
    try {
      validated = validateArticle(content);
    } catch (err) {
      console.warn(`  ⚠ Validation fail : ${err.message} → fallback`);
      const fb = fallbackArticle(sport, category, date);
      validated = validateArticle(fb);
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
