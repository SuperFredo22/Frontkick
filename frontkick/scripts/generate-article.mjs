// generate-article.mjs
// FightFocus — Architecture : Perplexity (recherche actus réelles) + Gemini (rédaction FR)
// NE PAS MODIFIER MANUELLEMENT — géré via workflow GitHub Actions

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Configuration ────────────────────────────────────────────────────────────

const SPORTS = [
  'mma', 'boxe', 'kickboxing', 'muay-thai', 'grappling',
  'karate', 'sanda', 'lethwei', 'savate', 'sambo', 'k1'
];

const TYPES = ['actualite', 'fond', 'personnalite'];

const SPORT_LABELS = {
  'mma':        'MMA et UFC',
  'boxe':       'boxe anglaise',
  'kickboxing': 'kickboxing et K-1',
  'muay-thai':  'Muay Thai',
  'grappling':  'grappling, BJJ et judo',
  'karate':     'karaté et kyokushin',
  'sanda':      'sanda et wushu',
  'lethwei':    'lethwei',
  'savate':     'savate et boxe française',
  'sambo':      'sambo',
  'k1':         'K-1 et kickboxing'
};

const CATEGORY_MAP = {
  'actualite':    'actualite',
  'fond':         'analyse',
  'personnalite': 'analyse'
};

const FORBIDDEN_PLACEHOLDERS = [
  '[NOM', '[DATE', '[TITRE', '[Nom', '[nom',
  'VOTRE-', 'À COMPLÉTER', 'à compléter',
  'placeholder', 'Nom du combattant',
  'Nom du champion', 'adversaire potentiel',
  '[Poids lourd', '[catégorie', 'Combattant A', 'Combattant B'
];

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"«»:!?]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 70);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, maxAttempts = 2, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      console.error(`  ⚠️  Tentative ${attempt}/${maxAttempts} échouée: ${err.message}`);
      if (attempt < maxAttempts) {
        console.log(`  ⏳ Nouvelle tentative dans ${delayMs/1000}s...`);
        await sleep(delayMs);
      } else {
        throw err;
      }
    }
  }
}

// ─── Étape 1 : Perplexity — recherche des vraies infos ───────────────────────

async function fetchRealNews(sport, type) {
  const sportLabel = SPORT_LABELS[sport] || sport;

  const queryMap = {
    'actualite': `Actualités ${sportLabel} mars 2026 : résultats de combats récents, 
      annonces officielles, événements à venir. Noms complets des combattants, 
      dates précises, organisations (UFC, ONE, Bellator, etc.). Faits vérifiés uniquement.`,

    'fond': `Histoire, techniques et évolution du ${sportLabel} : faits marquants, 
      pionniers, champions légendaires, règles, organisations mondiales. 
      Informations factuelles et vérifiables uniquement.`,

    'personnalite': `Meilleur combattant ou personnalité marquante du ${sportLabel} 
      actuellement en 2025-2026 : biographie précise, palmarès officiel, style de combat, 
      combats récents et résultats. Nom complet, nationalité, organisation. 
      Uniquement des faits réels et vérifiés.`
  };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: `Tu es un assistant factuel spécialisé en sports de combat. 
            Réponds en français. Fournis uniquement des informations vérifiées 
            avec noms complets réels, dates précises et faits concrets. 
            N'invente jamais de noms, de citations ou de statistiques. 
            Si une information est incertaine, ne la mentionne pas.`
        },
        {
          role: 'user',
          content: queryMap[type]
        }
      ],
      max_tokens: 1000,
      return_citations: true,
      search_recency_filter: 'month'
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || content.length < 100) {
    throw new Error('Perplexity : réponse vide ou insuffisante');
  }

  console.log(`  ✓ Perplexity — ${content.length} caractères récupérés`);
  return content;
}

// ─── Étape 2 : Gemini — rédaction de l'article complet ───────────────────────

async function generateArticleWithGemini(sport, type, realNewsContext) {
  const category = CATEGORY_MAP[type];
  const date = getTodayDate();
  const sportLabel = SPORT_LABELS[sport] || sport;

  const typeInstructions = {
    'actualite': `Rédige un article d'actualité dynamique. Développe chaque fait 
      avec contexte et analyse. Explique l'importance de chaque événement pour 
      la discipline. Termine par les perspectives à venir.`,

    'fond': `Rédige un article de fond approfondi et pédagogique. Développe 
      l'histoire, les techniques clés, l'évolution de la discipline. 
      Ton expert et accessible. Utile pour les débutants comme les pratiquants.`,

    'personnalite': `Rédige un portrait captivant du combattant ou de la 
      personnalité. Présente sa carrière, son style unique, ses accomplissements. 
      Ton narratif et engageant. N'invente aucune citation.`
  };

  const prompt = `Tu es rédacteur expert en sports de combat pour FightFocus.fr, 
le média français de référence sur les sports de combat.

═══════════════════════════════════════
INFORMATIONS FACTUELLES VÉRIFIÉES — BASE DE L'ARTICLE
(source internet vérifiée par Perplexity)
═══════════════════════════════════════
${realNewsContext}
═══════════════════════════════════════

RÈGLES ABSOLUES :
✅ Utilise UNIQUEMENT les noms, faits et dates présents dans le contexte ci-dessus
✅ Rédige en français, ton journalistique expert et dynamique
✅ Entre 900 et 1100 mots
✅ Structure : frontmatter → introduction accrocheuse → plusieurs sections H2 → conclusion
✅ Paragraphes développés, informatifs, sans listes à puces dans le corps

❌ N'INVENTE AUCUN nom, AUCUNE date, AUCUNE statistique absente du contexte
❌ AUCUNE citation entre guillemets sauf si elle figure mot pour mot dans le contexte
❌ AUCUN placeholder : [NOM], [DATE], [adversaire], [champion], etc.
❌ Pas de formulations vagues : "un combattant", "certains experts", "il paraît"

TYPE D'ARTICLE : ${type} — ${typeInstructions[type]}
SPORT : ${sportLabel}
DATE : ${date}

GÉNÈRE LE FICHIER MARKDOWN COMPLET avec ce frontmatter EXACT en premier :

---
title: "Titre accrocheur en français (50-70 caractères, mot-clé sport inclus)"
sport: ${sport}
category: ${category}
date: "${date}"
excerpt: "Une ou deux phrases descriptives naturelles (120-160 caractères)"
featured: false
---

[Corps de l'article ici — uniquement du markdown, pas de balise H1 dans le corps]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2800,
          temperature: 0.65,
          topP: 0.9
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Gemini : réponse vide');
  }

  // Nettoyer les balises de code markdown si Gemini les ajoute
  const cleaned = content
    .replace(/^```(?:markdown|yaml|md)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  console.log(`  ✓ Gemini — ${cleaned.length} caractères générés`);
  return cleaned;
}

// ─── Étape 3 : Validation stricte ────────────────────────────────────────────

function validateArticle(content, sport, date) {
  // 1. Frontmatter présent et correctement fermé
  if (!content.startsWith('---')) {
    throw new Error('Frontmatter manquant ou mal positionné');
  }
  const fmEnd = content.indexOf('---', 3);
  if (fmEnd === -1) {
    throw new Error('Frontmatter non fermé');
  }

  const frontmatter = content.substring(0, fmEnd + 3);

  // 2. Champs obligatoires
  for (const field of ['title:', 'sport:', 'category:', 'date:', 'excerpt:']) {
    if (!frontmatter.includes(field)) {
      throw new Error(`Champ manquant dans le frontmatter : ${field}`);
    }
  }

  // 3. Valeurs valides
  const validSports = ['mma','boxe','kickboxing','muay-thai','grappling',
                       'karate','equipement','sanda','lethwei','savate','sambo','k1'];
  const validCategories = ['actualite','guide-debutant','conseil-entrainement',
                           'analyse','guide-equipement'];

  const sportVal = (frontmatter.match(/^sport:\s*(.+)$/m) || [])[1]?.trim();
  const catVal   = (frontmatter.match(/^category:\s*(.+)$/m) || [])[1]?.trim();
  const dateVal  = (frontmatter.match(/^date:\s*"(.+?)"$/m) || [])[1]?.trim();

  if (sportVal && !validSports.includes(sportVal))
    throw new Error(`Valeur sport invalide : "${sportVal}"`);
  if (catVal && !validCategories.includes(catVal))
    throw new Error(`Valeur category invalide : "${catVal}"`);
  if (dateVal && dateVal !== date)
    throw new Error(`Date incorrecte : "${dateVal}" (attendu : "${date}")`);

  // 4. Aucun placeholder interdit
  for (const p of FORBIDDEN_PLACEHOLDERS) {
    if (content.includes(p)) {
      throw new Error(`Placeholder interdit détecté : "${p}"`);
    }
  }

  // 5. Longueur minimale du corps
  const body = content.substring(fmEnd + 3).trim();
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 400) {
    throw new Error(`Article trop court : ${wordCount} mots (minimum : 400)`);
  }

  console.log(`  ✓ Validation OK — ${wordCount} mots, frontmatter valide`);
  return content;
}

// ─── Étape 4 : Sauvegarde ─────────────────────────────────────────────────────

function saveArticle(content, sport, date) {
  const titleMatch = content.match(/^title:\s*"(.+?)"$/m);
  const title = titleMatch ? titleMatch[1] : `article-${sport}-${date}`;
  const slug = slugify(title);
  const filename = `${date}-${slug}.md`;

  const articlesDir = path.resolve(__dirname, '../src/content/articles');

  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
  }

  const filepath = path.join(articlesDir, filename);
  fs.writeFileSync(filepath, content, 'utf8');

  console.log(`  ✓ Fichier sauvegardé : ${filename}`);
  return filename;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════');
  console.log('  FightFocus — Génération automatique');
  console.log('══════════════════════════════════════\n');

  if (!PERPLEXITY_API_KEY) {
    console.error('❌ Variable manquante : PERPLEXITY_API_KEY');
    console.error('   → Ajouter dans GitHub Settings > Secrets > Actions');
    process.exit(1);
  }
  if (!GEMINI_API_KEY) {
    console.error('❌ Variable manquante : GEMINI_API_KEY');
    process.exit(1);
  }

  const sport = getRandomItem(SPORTS);
  const type  = getRandomItem(TYPES);
  const date  = getTodayDate();

  console.log(`Sport : ${SPORT_LABELS[sport]}`);
  console.log(`Type  : ${type}`);
  console.log(`Date  : ${date}\n`);

  try {
    console.log('1/4 — Recherche Perplexity (actus réelles)...');
    const realNews = await fetchRealNews(sport, type);

    await sleep(1500);

    console.log('2/4 — Rédaction Gemini...');
    const articleContent = await generateArticleWithGemini(sport, type, realNews);

    console.log('3/4 — Validation du contenu...');
    const validContent = validateArticle(articleContent, sport, date);

    console.log('4/4 — Sauvegarde du fichier...');
    const filename = saveArticle(validContent, sport, date);

    console.log(`\n✅ Succès — Article publié : ${filename}\n`);

  } catch (error) {
    console.error(`\n❌ Échec — ${error.message}`);
    console.error('   Aucun fichier créé. Corriger l\'erreur et relancer.\n');
    process.exit(1);
  }
}

main();
