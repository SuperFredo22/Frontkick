// generate-article.mjs
// FightFocus — Perplexity (actus temps réel) + Gemini (rédaction FR)
// v3.2 — 30/03/2026
// CORRECTIF v3.1 : strip backticks Gemini (résolu)
// CORRECTIF v3.2 : réparation frontmatter non fermé + normalisation tirets

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY;
const __dirname          = path.dirname(fileURLToPath(import.meta.url));

// ─── Sports ───────────────────────────────────────────────────────────────────
// ACTUS (Perplexity) : MMA 60% + Boxe 40% — APIs fiables, fort volume recherche
// EVERGREEN (Gemini seul) : rotation MMA/Boxe/Muay Thaï/Kickboxing/Grappling
// EXCLU de l'auto : karate, sanda, lethwei, savate, sambo (niche, APIs peu fiables)

const ACTU_SPORTS      = ['mma', 'boxe', 'mma', 'mma', 'boxe'];
const EVERGREEN_SPORTS = ['mma', 'boxe', 'muay-thai', 'kickboxing', 'grappling'];

const SPORT_LABELS = {
  'mma':        'MMA et UFC',
  'boxe':       'boxe anglaise',
  'muay-thai':  'Muay Thaï',
  'kickboxing': 'kickboxing et K-1',
  'grappling':  'grappling et BJJ'
};

function pickEvergreenSportForWeek(dateStr) {
  const d       = new Date(dateStr);
  const jan1    = new Date(d.getUTCFullYear(), 0, 1);
  const weekNum = Math.floor((d - jan1) / (7 * 86400000));
  return EVERGREEN_SPORTS[weekNum % EVERGREEN_SPORTS.length];
}

function pickActuSport(dateStr) {
  const d      = new Date(dateStr);
  const jan1   = new Date(d.getUTCFullYear(), 0, 1);
  const dayNum = Math.floor((d - jan1) / 86400000);
  return ACTU_SPORTS[dayNum % ACTU_SPORTS.length];
}

// ─── Rotation par jour ────────────────────────────────────────────────────────
const DAY_CONFIG = {
  0: { type: 'discipline', category: 'guide'    },
  1: { type: 'actualite',  category: 'actualite'},
  2: { type: 'patrimoine', category: 'guide'    },
  3: { type: 'technique',  category: 'guide'    },
  4: { type: 'actualite',  category: 'actualite'},
  5: { type: 'evenement',  category: 'actualite'},
  6: { type: 'legende',    category: 'guide'    }
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getDayOfWeek() {
  return new Date().getUTCDay();
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

const FORBIDDEN_PLACEHOLDERS = [
  '[NOM', '[DATE', '[TITRE', '[Nom', '[nom',
  'VOTRE-', 'À COMPLÉTER', 'à compléter', 'placeholder',
  'Nom du combattant', 'Nom du champion', 'adversaire potentiel',
  '[Poids lourd', '[catégorie', 'Combattant A', 'Combattant B',
  'insérer', 'INSERT', '???'
];

// ─── CORRECTIF v3.1 — Strip backticks Gemini ─────────────────────────────────
// Gemini enveloppe parfois sa réponse dans ```markdown ... ```
// → les ## n'étaient pas trouvés → crash "H2:0"
function stripGeminiCodeFences(text) {
  let r = text.trim();
  r = r.replace(/^```(?:markdown|yaml|md|json)?\s*\n?/i, '');
  r = r.replace(/\n?```\s*$/i, '');
  // Passe 2 : double enveloppe rare
  r = r.replace(/^```(?:markdown|yaml|md|json)?\s*\n?/i, '');
  r = r.replace(/\n?```\s*$/i, '');
  return r.trim();
}

// ─── CORRECTIF v3.2 — Normalisation et réparation du frontmatter ─────────────
//
// Problèmes observés dans les logs Gemini :
//   1. Tirets longs (—) ou en-tirets (–) au lieu de vrais tirets (-)
//   2. Espaces après les tirets "--- " → indexOf('---') ne trouve pas le bon pattern
//   3. Frontmatter ouvert mais closing --- oublié par Gemini
//
// Cette fonction détecte et corrige ces trois cas avant la validation.

function normalizeDashes(text) {
  // Remplace — (em-dash) et – (en-dash) par - sur les lignes de séparateur frontmatter
  return text.replace(/^[\u2014\u2013\-]{3,}\s*$/gm, '---');
}

function repairFrontmatter(text) {
  // Si le texte commence par --- mais n'a pas de closing ---, on le répare
  if (!text.startsWith('---')) return text;

  // Cherche le closing --- (doit être sur sa propre ligne, après position 3)
  const lines   = text.split('\n');
  let closingIdx = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIdx = i;
      break;
    }
  }

  if (closingIdx !== -1) {
    // Frontmatter correctement fermé → rien à faire
    return text;
  }

  // Frontmatter NON fermé → on cherche la dernière ligne YAML du frontmatter
  // Les champs YAML commencent par "mot:" ou "mot: valeur"
  // Le corps commence en général par une ligne vide ou un titre ##
  const yamlFieldRegex = /^[a-zA-Z_][a-zA-Z0-9_]*\s*:/;
  let lastYamlLine     = 0;

  for (let i = 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (yamlFieldRegex.test(l)) {
      lastYamlLine = i;
    } else if (l === '' && lastYamlLine > 0) {
      // Ligne vide après les champs YAML = fin probable du frontmatter
      break;
    } else if (l.startsWith('#') || l.startsWith('Le ') || l.startsWith('Au ') || l.startsWith('En ')) {
      // Début du corps de l'article
      break;
    }
  }

  if (lastYamlLine > 0) {
    // Insère le --- fermant juste après le dernier champ YAML
    lines.splice(lastYamlLine + 1, 0, '---');
    console.log(`  🔧 Réparation frontmatter : --- inséré après la ligne ${lastYamlLine + 1}`);
    return lines.join('\n');
  }

  // Cas désespéré : on ne peut pas réparer → laisser la validation échouer proprement
  return text;
}

// Applique tous les correctifs de nettoyage en séquence
function cleanGeminiOutput(raw) {
  let text = stripGeminiCodeFences(raw);
  text     = normalizeDashes(text);
  text     = repairFrontmatter(text);
  return text;
}

// ─── Étape 1 : Perplexity ─────────────────────────────────────────────────────

async function fetchRealNews(sport, type) {
  const sportLabel = SPORT_LABELS[sport] || sport;
  const monthYear  = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const queryMap = {
    'actualite': `Actualités ${sportLabel} en ${monthYear} : résultats de combats récents, annonces officielles confirmées. Noms complets réels, dates précises, organisations (UFC, ONE, Bellator, Glory, WBC, WBA). Uniquement des faits vérifiés avec sources citées.`,
    'evenement': `Prochains grands événements MMA et boxe dans les 14 prochains jours : cartes de combat officielles, combats principaux, lieux, dates exactes, titres en jeu. Sources officielles uniquement (UFC.com, ESPN, DAZN).`
  };

  const recencyMap = { 'actualite': 'week', 'evenement': 'month' };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
          content: `Tu es un assistant factuel spécialisé en sports de combat.
Réponds en français. Fournis uniquement des informations vérifiées :
noms complets réels, dates précises, faits concrets.
N'invente jamais de noms, résultats, statistiques ou citations.
Si une information est incertaine, indique-le avec "selon certaines sources".
Cite systématiquement ta source (nom du site ou organisation officielle).`
        },
        { role: 'user', content: queryMap[type] }
      ],
      max_tokens: 1200,
      return_citations: true,
      search_recency_filter: recencyMap[type] || 'week'
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity ${response.status}: ${err}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || content.length < 250) {
    throw new Error(`Perplexity réponse insuffisante (${content?.length ?? 0} chars)`);
  }

  console.log(`  ✓ Perplexity — ${content.length} caractères · sport: ${sport}`);
  return content;
}

// ─── Étape 2 : Gemini ─────────────────────────────────────────────────────────

async function callGeminiWithRetry(prompt, attempts = 2) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await fetch(
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

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini ${response.status}: ${err}`);
      }

      const data = await response.json();
      const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw)  throw new Error('Gemini : réponse vide');

      // Nettoyage complet : strip backticks + normalise tirets + répare frontmatter
      return cleanGeminiOutput(raw);

    } catch (err) {
      if (i === attempts) throw err;
      console.warn(`  ⚠ Gemini tentative ${i} : ${err.message} — retry dans 3s...`);
      await sleep(3000);
    }
  }
}

async function generateArticleWithGemini(sport, type, category, contextData) {
  const date       = getTodayDate();
  const sportLabel = SPORT_LABELS[sport] || sport;

  const typeInstructions = {

    'actualite': `Rédige un article d'actualité journalistique dynamique.
Développe chaque fait avec contexte et analyse. Explique l'importance pour la discipline.
Termine par les perspectives à venir.
RÈGLE ABSOLUE : utilise UNIQUEMENT les noms, faits et dates du contexte Perplexity fourni.`,

    'evenement': `Rédige un article de preview d'événement enthousiaste et informatif.
Présente la carte de combat, les enjeux, les favoris, les rivalités.
RÈGLE ABSOLUE : utilise UNIQUEMENT les informations du contexte Perplexity.
N'invente AUCUN combat, AUCUN lieu non mentionné.`,

    'technique': `Rédige un guide technique complet sur UNE technique clé du ${sportLabel}.
Choisis une technique que tu connais avec certitude absolue.
Structure : présentation → exécution → utilisation en combat → erreurs classiques → entraînement.
Contenu 100% intemporel. N'invente AUCUNE statistique.`,

    'patrimoine': `Rédige un article histoire et culture sur le ${sportLabel}.
Choisis UN thème que tu connais avec certitude absolue.
N'utilise JAMAIS une date précise si tu n'en es pas certain à 100%.
Préfère "dans les années 1970" à "en 1973". Contenu intemporel.`,

    'legende': `Rédige le portrait d'UN champion légendaire du ${sportLabel}, carrière terminée, bien documentée.
Choisis uniquement une figure universellement reconnue.
N'invente AUCUNE statistique. Écris "l'un des plus décorés" plutôt qu'un chiffre douteux.
N'invente AUCUNE citation. Ton narratif et inspirant.`,

    'discipline': `Rédige "Tout comprendre sur le ${sportLabel}" pour un lecteur qui découvre ce sport.
Couvre : origines · règles essentielles · ce qui rend ce sport unique · équipement · organisations · champions.
Ton clair, engageant. Contenu 100% intemporel.`
  };

  const needsContext = ['actualite', 'evenement'].includes(type);

  const contextBlock = needsContext
    ? `INFORMATIONS FACTUELLES — SOURCE PERPLEXITY (internet, temps réel)
Base ton article UNIQUEMENT sur ce contexte vérfié :
---CONTEXTE---
${contextData}
---FIN CONTEXTE---`
    : `TYPE EVERGREEN : utilise uniquement des faits dont tu es certain à 100%.
En cas de doute sur une date ou un chiffre → reformule sans la donnée incertaine.`;

  const prompt = `Tu es rédacteur expert en sports de combat pour FightFocus.fr.

${contextBlock}

SPORT : ${sportLabel} | TYPE : ${type} | DATE : ${date} | CATÉGORIE : ${category}

CONSIGNE :
${typeInstructions[type]}

RÈGLES ABSOLUES :
✅ Français · ton journalistique expert
✅ Entre 900 et 1100 mots
✅ Au minimum 3 sections H2 (## Titre) bien développées
✅ Introduction accrocheuse · conclusion invitant à revenir sur FightFocus.fr
❌ AUCUN placeholder : [NOM], [DATE], [champion], etc.
❌ AUCUNE liste à puces dans le corps
❌ AUCUN titre H1 dans le corps
❌ Ne mets JAMAIS de backticks (\`\`\`) autour de ta réponse
❌ Ne mets JAMAIS de tirets longs (—) à la place des séparateurs de frontmatter

IMPORTANT FORMAT — commence ta réponse EXACTEMENT comme ceci, sans rien avant :

---
title: "Titre accrocheur (50-70 caractères avec le nom du sport)"
sport: ${sport}
category: ${category}
date: "${date}"
excerpt: "Une ou deux phrases engageantes (120-160 caractères)"
featured: false
---

## Premier titre de section

[Ton article ici — paragraphes, pas de listes]`;

  console.log(`  → Gemini · type: ${type} · sport: ${sport} · category: ${category}`);
  const result = await callGeminiWithRetry(prompt, 2);
  console.log(`  ✓ Gemini — ${result.length} caractères générés`);
  return result;
}

// ─── Étape 3 : Validation ─────────────────────────────────────────────────────

function validateArticle(content, sport, date, type, expectedCategory) {

  // Nettoyage défensif une seconde fois
  const cleaned = cleanGeminiOutput(content);

  if (!cleaned.startsWith('---')) {
    throw new Error('Frontmatter absent (article ne commence pas par ---)');
  }

  const fmEnd = cleaned.indexOf('---', 3);
  if (fmEnd === -1) throw new Error('Frontmatter non fermé (--- de clôture introuvable)');

  const frontmatter = cleaned.substring(0, fmEnd + 3);

  // Champs obligatoires
  for (const field of ['title:', 'sport:', 'category:', 'date:', 'excerpt:']) {
    if (!frontmatter.includes(field)) {
      throw new Error(`Champ manquant dans le frontmatter : ${field}`);
    }
  }

  // Valeurs autorisées
  const validSports     = ['mma','boxe','kickboxing','muay-thai','grappling','karate','equipement','sanda','lethwei','savate','sambo','k1'];
  const validCategories = ['actualite','guide','guide-debutant','conseil-entrainement','analyse','guide-equipement'];

  const sportVal = (frontmatter.match(/^sport:\s*(.+)$/m)    || [])[1]?.trim();
  const catVal   = (frontmatter.match(/^category:\s*(.+)$/m) || [])[1]?.trim();
  const dateVal  = (frontmatter.match(/^date:\s*"(.+?)"$/m)  || [])[1]?.trim();

  if (sportVal && !validSports.includes(sportVal))
    throw new Error(`Valeur sport invalide : "${sportVal}"`);
  if (catVal && !validCategories.includes(catVal))
    throw new Error(`Valeur category invalide : "${catVal}"`);
  if (dateVal && dateVal !== date)
    throw new Error(`Date incorrecte : "${dateVal}" (attendu : "${date}")`);
  if (catVal && catVal !== expectedCategory)
    throw new Error(`Category "${catVal}" ≠ attendu "${expectedCategory}" pour type "${type}"`);

  // Placeholders interdits
  for (const p of FORBIDDEN_PLACEHOLDERS) {
    if (cleaned.includes(p)) throw new Error(`Placeholder interdit : "${p}"`);
  }

  // Corps : longueur et structure
  const body      = cleaned.substring(fmEnd + 3).trim();
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 400) throw new Error(`Trop court : ${wordCount} mots (min 400)`);

  const h2Count = (body.match(/^##\s+\S/gm) || []).length;
  if (h2Count < 2) throw new Error(`Pas assez de sections H2 : ${h2Count} (min 2)`);

  console.log(`  ✓ Validation OK — ${wordCount} mots · ${h2Count} H2 · category: ${catVal}`);
  return cleaned;
}

// ─── Étape 4 : Sauvegarde ─────────────────────────────────────────────────────

function saveArticle(content, sport, date) {
  const titleMatch  = content.match(/^title:\s*"(.+?)"$/m);
  const title       = titleMatch ? titleMatch[1] : `article-${sport}-${date}`;
  const slug        = slugify(title);
  const filename    = `${date}-${slug}.md`;
  const articlesDir = path.resolve(__dirname, '../src/content/articles');

  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });

  if (slugAlreadyExists(slug, articlesDir)) {
    throw new Error(`Slug déjà existant : "${slug}" — anti-doublon activé`);
  }

  fs.writeFileSync(path.join(articlesDir, filename), content, 'utf8');
  console.log(`  ✓ Fichier sauvegardé : ${filename}`);
  return filename;
}

// ─── Résolution type + sport + contexte ───────────────────────────────────────

async function resolveAll(date, dayNum) {
  const { type, category } = DAY_CONFIG[dayNum];
  const needsPerplexity    = ['actualite', 'evenement'].includes(type);

  if (!needsPerplexity) {
    return { type, category, sport: pickEvergreenSportForWeek(date), context: '' };
  }

  const sport = pickActuSport(date);

  try {
    const context = await fetchRealNews(sport, type);
    return { type, category, sport, context };
  } catch (err) {
    console.warn(`  ⚠ Perplexity : ${err.message}`);
    console.warn('  → Fallback : type "technique" · category "guide" (evergreen fiable)');
    return {
      type:     'technique',
      category: 'guide',
      sport:    pickEvergreenSportForWeek(date),
      context:  ''
    };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  FightFocus — Génération automatique v3.2');
  console.log('═══════════════════════════════════════════\n');

  if (!PERPLEXITY_API_KEY) { console.error('❌ PERPLEXITY_API_KEY manquante'); process.exit(1); }
  if (!GEMINI_API_KEY)     { console.error('❌ GEMINI_API_KEY manquante');     process.exit(1); }

  const date   = getTodayDate();
  const dayNum = getDayOfWeek();

  const typeLabels = {
    'actualite':  '📰 Actualité',
    'evenement':  '🥊 Preview événement',
    'technique':  '🥋 Guide technique',
    'patrimoine': '📜 Histoire et patrimoine',
    'legende':    '🏆 Portrait légende',
    'discipline': '📖 Découvrir la discipline'
  };

  try {
    console.log('1/4 — Résolution type, sport et contexte...');
    const { type, category, sport, context } = await resolveAll(date, dayNum);

    console.log(`  Sport    : ${SPORT_LABELS[sport]}`);
    console.log(`  Type     : ${typeLabels[type] || type} (jour UTC ${dayNum})`);
    console.log(`  Catégorie: ${category}`);
    console.log(`  Date     : ${date}`);

    await sleep(800);

    console.log('2/4 — Rédaction Gemini...');
    const rawContent = await generateArticleWithGemini(sport, type, category, context);

    console.log('3/4 — Validation stricte...');
    const validContent = validateArticle(rawContent, sport, date, type, category);

    console.log('4/4 — Sauvegarde...');
    const filename = saveArticle(validContent, sport, date);

    console.log(`\n✅ SUCCÈS — ${filename}`);
    console.log(`   Sport : ${SPORT_LABELS[sport]} · Type : ${type} · Catégorie : ${category}\n`);

  } catch (error) {
    console.error(`\n❌ ÉCHEC — ${error.message}`);
    console.error('   Aucun fichier créé. Vérifier les logs ci-dessus.\n');
    process.exit(1);
  }
}

main();
