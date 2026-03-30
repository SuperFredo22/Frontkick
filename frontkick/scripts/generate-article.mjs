// generate-article.mjs
// FightFocus — Perplexity (actus temps réel) + Gemini (rédaction FR)
// v3.1 — 30/03/2026
// CORRECTIF : strip Gemini renforcé (cause réelle du crash H2:0)
// STRATÉGIE : Sports à fort trafic en priorité (MMA, Boxe, Muay Thaï, Kickboxing)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY;
const __dirname          = path.dirname(fileURLToPath(import.meta.url));

// ─── Sports — Stratégie trafic ────────────────────────────────────────────────
//
// ACTUS AUTO (Perplexity fiable + volume recherche élevé) :
//   → mma, boxe  (priorité maximale, APIs très fiables sur ces sports)
//
// CONTENU EVERGREEN AUTO (Gemini seul, volume moyen) :
//   → muay-thai, kickboxing, grappling  (APIs correctes, trafic réel)
//
// ARTICLES MANUELS UNIQUEMENT (hors automatisation) :
//   → karate, sanda, lethwei, savate, sambo  (trop niche, APIs peu fiables)

// Sports pour les ACTUS (Perplexity) — MMA 3x/5 = 60% car volume 3x supérieur
const ACTU_SPORTS = ['mma', 'boxe', 'mma', 'mma', 'boxe'];

// Sports pour l'EVERGREEN — rotation hebdomadaire sur 5 semaines
const EVERGREEN_SPORTS = ['mma', 'boxe', 'muay-thai', 'kickboxing', 'grappling'];

const SPORT_LABELS = {
  'mma':        'MMA et UFC',
  'boxe':       'boxe anglaise',
  'muay-thai':  'Muay Thaï',
  'kickboxing': 'kickboxing et K-1',
  'grappling':  'grappling et BJJ'
};

// Sport de la semaine pour l'evergreen (change chaque lundi, cycle 5 semaines)
function pickEvergreenSportForWeek(dateStr) {
  const d       = new Date(dateStr);
  const jan1    = new Date(d.getUTCFullYear(), 0, 1);
  const weekNum = Math.floor((d - jan1) / (7 * 86400000));
  return EVERGREEN_SPORTS[weekNum % EVERGREEN_SPORTS.length];
}

// Sport pour une actu (pseudo-aléatoire basé sur le jour de l'année)
function pickActuSport(dateStr) {
  const d      = new Date(dateStr);
  const jan1   = new Date(d.getUTCFullYear(), 0, 1);
  const dayNum = Math.floor((d - jan1) / 86400000);
  return ACTU_SPORTS[dayNum % ACTU_SPORTS.length];
}

// ─── Rotation par jour ────────────────────────────────────────────────────────
// 0=Dim 1=Lun 2=Mar 3=Mer 4=Jeu 5=Ven 6=Sam
const DAY_CONFIG = {
  0: { type: 'discipline', category: 'guide'    }, // Dim → découvrir la discipline
  1: { type: 'actualite',  category: 'actualite'}, // Lun → actu (recap weekend)
  2: { type: 'patrimoine', category: 'guide'    }, // Mar → histoire / culture
  3: { type: 'technique',  category: 'guide'    }, // Mer → guide technique
  4: { type: 'actualite',  category: 'actualite'}, // Jeu → actu (annonces semaine)
  5: { type: 'evenement',  category: 'actualite'}, // Ven → preview événement weekend
  6: { type: 'legende',    category: 'guide'    }  // Sam → portrait d'une légende
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function getTodayDate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC
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

// ── CORRECTIF PRINCIPAL ───────────────────────────────────────────────────────
// Gemini enveloppe parfois sa réponse dans des backticks triple (```markdown).
// C'est la CAUSE RÉELLE du bug "H2: 0" — la validation cherchait des ## dans
// du texte encore emballé dans des backticks → 0 trouvé → crash.
// Cette fonction retire les backticks de façon robuste, en deux passes.
function stripGeminiCodeFences(text) {
  let result = text.trim();
  // Passe 1
  result = result.replace(/^```(?:markdown|yaml|md|json)?\s*\n?/i, '');
  result = result.replace(/\n?```\s*$/i, '');
  // Passe 2 (rare mais vu : double enveloppe)
  result = result.replace(/^```(?:markdown|yaml|md|json)?\s*\n?/i, '');
  result = result.replace(/\n?```\s*$/i, '');
  return result.trim();
}

const FORBIDDEN_PLACEHOLDERS = [
  '[NOM', '[DATE', '[TITRE', '[Nom', '[nom',
  'VOTRE-', 'À COMPLÉTER', 'à compléter', 'placeholder',
  'Nom du combattant', 'Nom du champion', 'adversaire potentiel',
  '[Poids lourd', '[catégorie', 'Combattant A', 'Combattant B',
  'insérer', 'INSERT', '???'
];

// ─── Étape 1 : Perplexity ─────────────────────────────────────────────────────

async function fetchRealNews(sport, type) {
  const sportLabel = SPORT_LABELS[sport] || sport;
  const monthYear  = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const queryMap = {
    'actualite': `Actualités ${sportLabel} en ${monthYear} : résultats de combats récents, annonces officielles confirmées. Noms complets réels, dates précises, organisations (UFC, ONE, Bellator, Glory, WBC, WBA). Uniquement des faits vérifiés avec sources.`,
    'evenement': `Prochains grands événements de MMA et boxe dans les 14 prochains jours : cartes de combat officielles, combats principaux, lieux, dates exactes, titres en jeu. Sources officielles uniquement (UFC.com, ESPN, DAZN).`
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

      // ✅ Strip appliqué ici, avant tout retour
      return stripGeminiCodeFences(raw);

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
Développe chaque fait avec contexte et analyse. Explique l'importance pour la discipline et ses fans.
Termine par les perspectives à venir.
RÈGLE ABSOLUE : utilise UNIQUEMENT les noms, faits et dates présents dans le contexte Perplexity.
N'ajoute AUCUNE information extérieure même si tu la connais.`,

    'evenement': `Rédige un article de preview d'événement enthousiaste et informatif.
Présente la carte de combat, les enjeux, les favoris, l'historique des rivalités si disponible.
Donne au lecteur envie de suivre l'événement.
RÈGLE ABSOLUE : utilise UNIQUEMENT les informations du contexte Perplexity.
N'invente AUCUN combat, AUCUN résultat, AUCUN lieu non mentionné.`,

    'technique': `Rédige un guide technique complet et pédagogique sur UNE technique clé du ${sportLabel}.
Choisis une technique que tu connais avec CERTITUDE (position, coup fondamental, défense clé...).
Structure : présentation → exécution → utilisation en combat → erreurs classiques → entraînement.
Contenu 100% intemporel (evergreen). N'invente AUCUNE statistique ni nom incertain.`,

    'patrimoine': `Rédige un article culture et histoire sur le ${sportLabel}.
Choisis UN thème historique ou culturel que tu connais avec CERTITUDE.
N'utilise JAMAIS une date précise si tu n'en es pas certain à 100%.
Préfère "dans les années 1970" à "en 1973". Ton narratif et passionné. Contenu intemporel.`,

    'legende': `Rédige le portrait d'UN seul champion légendaire du ${sportLabel} dont la carrière est terminée
et bien documentée. Choisis uniquement une figure universellement reconnue.
N'invente AUCUNE statistique sans en être certain. Écris "l'un des plus décorés" plutôt qu'un chiffre douteux.
N'invente AUCUNE citation. Ton narratif et inspirant.`,

    'discipline': `Rédige un article "Tout comprendre sur le ${sportLabel}" pour quelqu'un qui découvre ce sport.
Couvre : origines · règles essentielles · ce qui rend ce sport unique · équipement · organisations · champions emblématiques.
Ton clair, engageant, accessible. Contenu 100% intemporel.`
  };

  const needsContext = ['actualite', 'evenement'].includes(type);

  const contextBlock = needsContext
    ? `═══════════════════════════════════════
INFORMATIONS FACTUELLES — SOURCE PERPLEXITY (internet, temps réel)
Base ton article UNIQUEMENT sur ce contexte. N'ajoute rien d'extérieur.
═══════════════════════════════════════
${contextData}
═══════════════════════════════════════`
    : `═══════════════════════════════════════
CONTENU EVERGREEN — utilise uniquement des faits dont tu es certain à 100%.
En cas de doute sur une date ou un chiffre → reformule sans la donnée incertaine.
═══════════════════════════════════════`;

  const prompt = `Tu es rédacteur expert en sports de combat pour FightFocus.fr.

${contextBlock}

SPORT     : ${sportLabel}
TYPE      : ${type}
DATE      : ${date}
CATÉGORIE : ${category}

CONSIGNE :
${typeInstructions[type]}

RÈGLES ABSOLUES :
✅ Français · ton journalistique expert et dynamique
✅ Entre 900 et 1100 mots
✅ Au minimum 3 sections ## (H2) bien développées — OBLIGATOIRE
✅ Introduction accrocheuse (2-3 phrases)
✅ Conclusion qui invite à revenir sur FightFocus.fr
❌ AUCUN placeholder : [NOM], [DATE], [champion], etc.
❌ AUCUNE liste à puces dans le corps — uniquement des paragraphes
❌ AUCUN titre H1 dans le corps
❌ Ne mets PAS de backticks (\`\`\`) autour de ta réponse — réponds directement en markdown brut

GÉNÈRE LE FICHIER MARKDOWN COMPLET en commençant DIRECTEMENT par --- sans rien avant :

---
title: "Titre accrocheur (50-70 caractères, mot-clé sport inclus)"
sport: ${sport}
category: ${category}
date: "${date}"
excerpt: "Une ou deux phrases engageantes (120-160 caractères)"
featured: false
---

[Corps de l'article — sections ## obligatoires, paragraphes, pas de listes]`;

  console.log(`  → Gemini · type: ${type} · sport: ${sport} · category: ${category}`);
  const result = await callGeminiWithRetry(prompt, 2);
  console.log(`  ✓ Gemini — ${result.length} caractères générés`);
  return result;
}

// ─── Étape 3 : Validation ─────────────────────────────────────────────────────

function validateArticle(content, sport, date, type, expectedCategory) {

  // ✅ Strip appliqué une 2e fois ici — défense en profondeur
  const cleaned = stripGeminiCodeFences(content);

  if (!cleaned.startsWith('---')) {
    throw new Error('Frontmatter manquant (ne commence pas par ---)');
  }
  const fmEnd = cleaned.indexOf('---', 3);
  if (fmEnd === -1) throw new Error('Frontmatter non fermé');

  const frontmatter = cleaned.substring(0, fmEnd + 3);

  for (const field of ['title:', 'sport:', 'category:', 'date:', 'excerpt:']) {
    if (!frontmatter.includes(field)) {
      throw new Error(`Champ manquant : ${field}`);
    }
  }

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

  for (const p of FORBIDDEN_PLACEHOLDERS) {
    if (cleaned.includes(p)) throw new Error(`Placeholder interdit : "${p}"`);
  }

  const body      = cleaned.substring(fmEnd + 3).trim();
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 400) throw new Error(`Trop court : ${wordCount} mots (min 400)`);

  // ✅ Regex robuste sur le contenu NETTOYÉ (c'était la faille du bug)
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
  console.log('  FightFocus — Génération automatique v3.1');
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
