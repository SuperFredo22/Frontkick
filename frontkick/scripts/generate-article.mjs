// generate-article.mjs
// FightFocus — Perplexity (actus) + Gemini (rédaction FR)
// v4.0 — 30/03/2026
//
// LOGIQUE CENTRALE :
//   1. Perplexity récupère les infos du jour
//   2. On évalue la QUALITÉ du contenu (score)
//   3. Si le contenu est trop pauvre → pivot automatique vers un angle evergreen pertinent
//   4. Gemini rédige avec les bonnes instructions selon l'angle final
//   5. Un article de qualité est TOUJOURS publié

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY;
const __dirname          = path.dirname(fileURLToPath(import.meta.url));

// ─── Sports autorisés en automatisation ───────────────────────────────────────
// Niches (sambo, lethwei, sanda, savate, karate) → articles manuels Claude uniquement

const AUTO_SPORTS_PRIMARY   = ['mma', 'boxe'];          // APIs fiables, volume élevé
const AUTO_SPORTS_SECONDARY = ['muay-thai', 'kickboxing']; // APIs correctes, volume moyen

// Sport de la semaine : 2 semaines MMA, 2 semaines Boxe, 1 Muay Thaï, 1 Kickboxing
// Cycle de 6 semaines → bonne répétition sans lassitude
const SPORT_WEEK_CYCLE = [
  'mma', 'boxe', 'mma', 'boxe', 'muay-thai', 'kickboxing'
];

function pickSportForWeek(dateStr) {
  const d       = new Date(dateStr);
  const jan1    = new Date(d.getUTCFullYear(), 0, 1);
  const weekNum = Math.floor((d - jan1) / (7 * 86400000));
  return SPORT_WEEK_CYCLE[weekNum % SPORT_WEEK_CYCLE.length];
}

const SPORT_LABELS = {
  'mma':        'MMA et UFC',
  'boxe':       'boxe anglaise',
  'muay-thai':  'Muay Thaï',
  'kickboxing': 'kickboxing et K-1'
};

// ─── Rotation éditoriale par jour ─────────────────────────────────────────────
//
// INTENTION PAR JOUR :
//   Lundi    → Actualité  : recap du weekend (combats récents)
//   Mardi    → Patrimoine : histoire/culture (evergreen, fiable 100%)
//   Mercredi → Technique  : guide pratique (très recherché par débutants)
//   Jeudi    → Actualité  : annonces de mi-semaine (events, signatures)
//   Vendredi → Événement  : preview du weekend à venir
//   Samedi   → Légende    : portrait (lecture longue du weekend)
//   Dimanche → Discipline : découverte (débutants weekend)
//
// 0=Dim 1=Lun 2=Mar 3=Mer 4=Jeu 5=Ven 6=Sam

const DAY_TYPE_MAP = {
  0: 'discipline',
  1: 'actualite',
  2: 'patrimoine',
  3: 'technique',
  4: 'actualite',
  5: 'evenement',
  6: 'legende'
};

// Catégorie Astro correcte par type (vérifié avec config.ts)
const TYPE_CATEGORY = {
  'actualite':  'actualite',   // → /actualites
  'evenement':  'actualite',   // → /actualites
  'technique':  'guide',       // → /guides
  'patrimoine': 'guide',       // → /guides
  'legende':    'guide',       // → /guides
  'discipline': 'guide'        // → /guides
};

// ─── Cascade de pivot par type ────────────────────────────────────────────────
// Si le contenu temps réel est trop pauvre, on pivote vers ces alternatives.
// L'ordre = priorité (premier disponible est utilisé).

const PIVOT_CASCADE = {
  // Semaine calme en MMA/Boxe → portrait d'un combattant actif bien connu
  'actualite': ['legende', 'technique', 'patrimoine'],
  // Pas d'event annoncé ce weekend → portrait ou technique
  'evenement': ['legende', 'patrimoine']
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
  'insérer', 'INSERT', '???', 'XX', 'YY'
];

// ─── Évaluation qualité du contenu Perplexity ─────────────────────────────────
//
// Score sur 100. Seuils :
//   ≥ 15 → RICHE    : assez de faits concrets → article actualité/événement
//   ≥ 7  → CORRECT  : quelques infos → article acceptable mais simplifié
//   < 7  → PAUVRE   → pivot obligatoire vers evergreen

function assessContentQuality(content, type) {
  const text  = content.toLowerCase();
  let score   = 0;
  const notes = [];

  // ── Organisations majeures présentes ──────────────────────────────────────
  const orgs = [
    'ufc', 'one championship', 'bellator', 'glory', 'k-1', 'pfl',
    'wbc', 'wba', 'ibf', 'wbo', 'matchroom', 'top rank', 'dazn',
    'brave cf', 'rizin', 'invicta'
  ];
  const orgMatches = orgs.filter(o => text.includes(o));
  score += orgMatches.length * 3;
  if (orgMatches.length > 0) notes.push(`orgs: ${orgMatches.join(', ')}`);

  // ── Références temporelles (dates, jours) ─────────────────────────────────
  const datePattern = /\b(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|\d{1,2}\/\d{1,2}|\d{4}|ce week-end|prochainement|récemment)\b/gi;
  const dateMatches = content.match(datePattern) || [];
  score += Math.min(dateMatches.length * 2, 12);
  if (dateMatches.length > 0) notes.push(`dates: ${dateMatches.length} ref.`);

  // ── Mots-clés pertinents selon le type ────────────────────────────────────
  const keywordsByType = {
    'actualite': ['victoire', 'défaite', 'combat', 'ko', 'tko', 'soumission', 'décision',
                  'annonce', 'signature', 'contrat', 'champion', 'titre', 'ceinture',
                  'classement', 'pesée', 'conférence', 'carte', 'main event'],
    'evenement': ['prochain', 'prévu', 'aura lieu', 'programmé', 'annoncé', 'carte',
                  'fight card', 'main event', 'co-main', 'undercard', 'diffusé',
                  'retransmis', 'arena', 'salle', 'accueillera']
  };
  const keywords = keywordsByType[type] || keywordsByType['actualite'];
  const kwMatches = keywords.filter(k => text.includes(k));
  score += kwMatches.length * 2;
  if (kwMatches.length > 0) notes.push(`kw: ${kwMatches.length} pertinents`);

  // ── Pénalités : signaux de contenu vide ───────────────────────────────────
  const emptySignals = [
    'aucun événement', 'aucune information', 'je ne dispose pas',
    'aucune actualité', 'pas d\'information disponible', 'rien de notable',
    'impossible de trouver', 'données insuffisantes', 'je n\'ai pas accès'
  ];
  const emptyFound = emptySignals.filter(s => text.includes(s));
  score -= emptyFound.length * 15;
  if (emptyFound.length > 0) notes.push(`⚠ signaux vides: ${emptyFound.length}`);

  // ── Longueur brute (sécurité) ─────────────────────────────────────────────
  if (content.length < 300) score -= 10;
  if (content.length > 600) score += 3;

  const finalScore = Math.max(score, 0);
  const quality    = finalScore >= 15 ? 'RICHE' : finalScore >= 7 ? 'CORRECT' : 'PAUVRE';

  console.log(`  📊 Qualité contenu : ${quality} (score ${finalScore}) — ${notes.join(' · ') || 'aucun signal fort'}`);

  return {
    score:      finalScore,
    isRich:     finalScore >= 15,
    isCorrect:  finalScore >= 7,
    isEmpty:    finalScore < 7,
    quality
  };
}

// ─── Étape 1 : Perplexity ─────────────────────────────────────────────────────

async function fetchRealNews(sport, type) {
  const sportLabel = SPORT_LABELS[sport] || sport;
  const monthYear  = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const today      = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const queryMap = {
    'actualite':
      `Actualités ${sportLabel} du mois de ${monthYear} : 
      résultats de combats récents, annonces officielles, événements confirmés, signatures de combattants.
      Noms complets réels, dates précises, organisations (UFC, ONE, Bellator, Glory, K-1, WBC, WBA...).
      Si aucun événement majeur n'a eu lieu récemment en ${sportLabel}, dis-le explicitement
      et cite la dernière actualité connue même si elle date de quelques semaines.`,

    'evenement':
      `Prochains événements majeurs de MMA (UFC, ONE, Bellator, PFL) et boxe anglaise 
      dans les 21 prochains jours à partir du ${today} : 
      cartes de combat confirmées, combats principaux, lieux, dates exactes, titres en jeu.
      Si aucun grand événement n'est prévu dans ce délai, indique-le clairement 
      et cite le prochain événement connu même s'il est dans 4-6 semaines.`
  };

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
noms complets réels, dates précises, faits concrets issus de sources officielles.
N'invente jamais de noms, résultats, statistiques ou citations.
Si l'actualité est calme ou si tu manques d'informations récentes, dis-le clairement
plutôt que d'inventer ou de généraliser. C'est une information utile.
Cite ta source pour chaque information (nom du site ou organisation).`
        },
        { role: 'user', content: queryMap[type] }
      ],
      max_tokens: 1200,
      return_citations: true,
      search_recency_filter: type === 'evenement' ? 'month' : 'week'
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity ${response.status}: ${err}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || content.length < 100) {
    throw new Error(`Perplexity : réponse vide (${content?.length ?? 0} car.)`);
  }

  console.log(`  ✓ Perplexity — ${content.length} caractères récupérés`);
  return content;
}

// ─── Résolution intelligente type + contexte ──────────────────────────────────
//
// C'est le cœur de la v4 :
//   · Pour les types temps réel (actualite, evenement) :
//       1. On interroge Perplexity
//       2. On évalue la qualité du résultat
//       3. Si RICHE → on garde le type original
//          Si CORRECT → on adapte les instructions Gemini (angle moins affirmatif)
//          Si PAUVRE → pivot cascade vers evergreen
//   · Pour les types evergreen : aucun appel Perplexity, toujours fiable

async function resolveArticleStrategy(sport, intendedType) {
  const needsRealtime = ['actualite', 'evenement'].includes(intendedType);

  // Types evergreen : aucune incertitude possible
  if (!needsRealtime) {
    return {
      finalType:    intendedType,
      context:      '',
      quality:      'EVERGREEN',
      pivotApplied: false
    };
  }

  // Types temps réel : on tente Perplexity
  let rawContent = null;

  try {
    rawContent = await fetchRealNews(sport, intendedType);
  } catch (err) {
    console.warn(`  ⚠ Perplexity en erreur (${err.message}) → pivot evergreen`);
    return {
      finalType:    PIVOT_CASCADE[intendedType][0],
      context:      '',
      quality:      'ERREUR_API',
      pivotApplied: true,
      pivotReason:  'Perplexity indisponible'
    };
  }

  // On évalue la qualité du contenu récupéré
  const quality = assessContentQuality(rawContent, intendedType);

  if (quality.isRich) {
    // Contenu riche → article actualité/événement complet
    return {
      finalType:    intendedType,
      context:      rawContent,
      quality:      'RICHE',
      pivotApplied: false
    };
  }

  if (quality.isCorrect) {
    // Contenu acceptable → on garde le type MAIS on ajuste le ton
    // (Gemini sera informé que le contenu est partiel → ton plus prudent)
    console.log(`  🟡 Contenu partiel → article ${intendedType} avec ton prudent`);
    return {
      finalType:    intendedType,
      context:      rawContent,
      quality:      'CORRECT',
      pivotApplied: false,
      toneAdjust:   true  // signal pour le prompt Gemini
    };
  }

  // Contenu trop pauvre → pivot vers evergreen
  const pivotType = PIVOT_CASCADE[intendedType][0];
  console.log(`  🔴 Contenu insuffisant (score ${quality.score}) → pivot vers "${pivotType}"`);
  return {
    finalType:    pivotType,
    context:      '',
    quality:      'PAUVRE',
    pivotApplied: true,
    pivotReason:  `Semaine calme en ${SPORT_LABELS[sport]} · pas assez de faits vérifiés`
  };
}

// ─── Étape 2 : Gemini — rédaction ─────────────────────────────────────────────

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
            generationConfig: {
              maxOutputTokens: 2800,
              temperature: 0.6,
              topP: 0.9
            }
          })
        }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini ${response.status}: ${err}`);
      }
      const data    = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error('Gemini : réponse vide');
      return content
        .replace(/^```(?:markdown|yaml|md)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(`  ⚠ Gemini tentative ${i} échouée : ${err.message} — retry dans 4s...`);
      await sleep(4000);
    }
  }
}

async function generateArticleWithGemini(sport, type, context, strategy) {
  const date       = getTodayDate();
  const sportLabel = SPORT_LABELS[sport] || sport;
  const category   = TYPE_CATEGORY[type];
  const toneAdjust = strategy?.toneAdjust || false;

  // ── Blocs de contexte ──────────────────────────────────────────────────────

  const contextBlock = context
    ? `═══════════════════════════════════════
FAITS VÉRIFIÉS — SOURCE PERPLEXITY (internet temps réel)
${toneAdjust ? '⚠ Note : le contexte est partiel. Développe uniquement les éléments présents.\nPour les zones vagues, utilise un angle analytique plutôt que factuel.' : 'Base TON article UNIQUEMENT sur ces données. N\'ajoute rien d\'extérieur.'}
═══════════════════════════════════════
${context}
═══════════════════════════════════════`
    : `═══════════════════════════════════════
TYPE : contenu evergreen (intemporel)
Utilise uniquement des faits dont tu es certain à 100%.
En cas de doute sur une date ou un chiffre → reformule sans la donnée incertaine.
═══════════════════════════════════════`;

  // ── Instructions rédactionnelles par type ──────────────────────────────────

  const instructions = {

    'actualite': toneAdjust
      ? `Rédige un article d'actualité avec un angle ANALYTIQUE et CONTEXTUEL.
Le contexte disponible est partiel : ne l'invente pas, développe-le.
Structure suggérée : rappel du contexte récent → analyse de la situation actuelle
→ ce que les fans peuvent attendre prochainement.
Ton expert et modéré. Pas de formulations péremptoires sur des faits non confirmés.`
      : `Rédige un article d'actualité journalistique dynamique.
Développe chaque fait avec contexte et analyse. Explique l'importance pour les fans.
Termine par les perspectives concrètes à venir.
RÈGLE ABSOLUE : uniquement les noms, faits et dates présents dans le contexte Perplexity.`,

    'evenement': toneAdjust
      ? `Rédige un article de preview avec les informations disponibles.
Si l'événement est dans plusieurs semaines, centre l'article sur les enjeux et l'attente
plutôt que sur des détails logistiques incertains.
Angle : pourquoi ce combat / cet événement mérite l'attention des fans.`
      : `Rédige un article de preview d'événement enthousiaste et informatif.
Carte de combat, enjeux, favoris, rivalités. Donne envie de suivre l'événement.
RÈGLE ABSOLUE : uniquement les informations du contexte Perplexity.`,

    'technique':
      `Rédige un guide technique complet sur UNE technique fondamentale du ${sportLabel}.
Choisis une technique que tu maîtrises avec certitude absolue.
Structure : présentation → exécution → utilisation en combat → erreurs classiques → entraînement.
Contenu 100% intemporel. Aucun chiffre ou nom incertain.
Si tu illustres avec un combattant, utilise uniquement des légendes universellement connues.`,

    'patrimoine':
      `Rédige un article culture & histoire sur LE ${sportLabel}.
Choisis UN thème : origines, moment fondateur, évolution des règles, influence culturelle,
ou rivalité historique emblématique que tu connais avec certitude.
RÈGLE ABSOLUE : n'utilise JAMAIS une date précise si tu n'en es pas sûr à 100%.
Préfère "dans les années 1980" à "en 1983". Préfère "l'un des pionniers" à un nom incertain.
Ton narratif et passionné. Contenu intemporel.`,

    'legende':
      `Rédige le portrait d'UN champion légendaire du ${sportLabel} dont la carrière est terminée
ou bien documentée (aucun combattant actif).
Choisis uniquement une figure universellement reconnue dans la discipline.
Palmarès, style de combat, héritage, impact sur le sport.
RÈGLE ABSOLUE : aucune statistique invente. Si tu doutes d'un chiffre → "parmi les plus grands".
Aucune citation inventée. Ton narratif et inspirant.`,

    'discipline':
      `Rédige un article "Tout comprendre sur le ${sportLabel}" pour un découvreur total.
Origines · règles essentielles · ce qui rend ce sport unique · équipement de base ·
organisations majeures · 2-3 champions emblématiques bien documentés.
Ton clair, engageant, accessible. Contenu 100% intemporel.
Aucune date ou statistique dont tu n'es pas certain.`
  };

  // ── Prompt final ───────────────────────────────────────────────────────────

  const pivotNote = strategy?.pivotApplied
    ? `\nNOTE ÉDITORIALE : l'angle initial "${intendedType}" a été remplacé par "${type}" car l'actualité était trop creuse cette semaine. Cet article remplace avantageusement un article d'actu vide de sens.\n`
    : '';

  const prompt = `Tu es rédacteur expert en sports de combat pour FightFocus.fr,
le média français de référence sur les sports de combat.
${pivotNote}
${contextBlock}

SPORT     : ${sportLabel}
TYPE      : ${type}
DATE      : ${date}
CATÉGORIE : ${category}

CONSIGNE RÉDACTIONNELLE :
${instructions[type]}

RÈGLES COMMUNES ABSOLUES :
✅ Français · ton journalistique expert et dynamique
✅ Entre 900 et 1100 mots
✅ Au minimum 3 sections H2 bien développées (2 paragraphes minimum chacune)
✅ Introduction accrocheuse (2-3 phrases qui donnent envie de lire)
✅ Conclusion qui invite à revenir sur FightFocus.fr
❌ AUCUN placeholder : [NOM], [DATE], [champion], [adversaire]...
❌ AUCUNE liste à puces dans le corps — uniquement des paragraphes
❌ AUCUN titre H1 dans le corps de l'article
❌ Pas de formulations vagues : "un combattant", "certains disent", "il paraît"

GÉNÈRE LE FICHIER MARKDOWN COMPLET avec ce frontmatter EXACT :

---
title: "Titre accrocheur (50-70 caractères, mot-clé sport inclus)"
sport: ${sport}
category: ${category}
date: "${date}"
excerpt: "Phrase(s) engageante(s) donnant envie de lire (120-160 caractères)"
featured: false
---

[Corps de l'article — markdown pur, pas de balise H1]`;

  console.log(`  → Gemini : type=${type} · category=${category} · tone=${toneAdjust ? 'prudent' : 'affirmatif'}`);
  const result = await callGeminiWithRetry(prompt, 2);
  console.log(`  ✓ Gemini — ${result.length} caractères générés`);
  return result;
}

// ─── Étape 3 : Validation ─────────────────────────────────────────────────────

function validateArticle(content, sport, date, type) {
  if (!content.startsWith('---')) throw new Error('Frontmatter manquant');

  const fmEnd = content.indexOf('---', 3);
  if (fmEnd === -1) throw new Error('Frontmatter non fermé');

  const frontmatter = content.substring(0, fmEnd + 3);

  for (const field of ['title:', 'sport:', 'category:', 'date:', 'excerpt:']) {
    if (!frontmatter.includes(field))
      throw new Error(`Champ manquant : ${field}`);
  }

  const validSports = [
    'mma', 'boxe', 'kickboxing', 'muay-thai', 'grappling',
    'karate', 'equipement', 'sanda', 'lethwei', 'savate', 'sambo', 'k1'
  ];
  const validCategories = [
    'actualite', 'guide', 'guide-debutant', 'conseil-entrainement',
    'analyse', 'guide-equipement'
  ];

  const sportVal = (frontmatter.match(/^sport:\s*(.+)$/m)    || [])[1]?.trim();
  const catVal   = (frontmatter.match(/^category:\s*(.+)$/m) || [])[1]?.trim();
  const dateVal  = (frontmatter.match(/^date:\s*"(.+?)"$/m)  || [])[1]?.trim();

  if (sportVal && !validSports.includes(sportVal))
    throw new Error(`sport invalide : "${sportVal}"`);
  if (catVal && !validCategories.includes(catVal))
    throw new Error(`category invalide : "${catVal}"`);
  if (dateVal && dateVal !== date)
    throw new Error(`date incorrecte : "${dateVal}" (attendu "${date}")`);

  const expectedCat = TYPE_CATEGORY[type];
  if (catVal && catVal !== expectedCat)
    throw new Error(`category "${catVal}" ≠ attendu "${expectedCat}" pour type "${type}"`);

  for (const p of FORBIDDEN_PLACEHOLDERS) {
    if (content.includes(p))
      throw new Error(`Placeholder interdit : "${p}"`);
  }

  const body      = content.substring(fmEnd + 3).trim();
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 400) throw new Error(`Trop court : ${wordCount} mots (min 400)`);

  const h2Count = (body.match(/^##\s+.+/gm) || []).length;
  if (h2Count < 2) throw new Error(`Pas assez de sections H2 : ${h2Count} (min 2)`);

  console.log(`  ✓ Validation OK — ${wordCount} mots · ${h2Count} H2 · ${catVal}`);
  return content;
}

// ─── Étape 4 : Sauvegarde ─────────────────────────────────────────────────────

function saveArticle(content, sport, date) {
  const titleMatch  = content.match(/^title:\s*"(.+?)"$/m);
  const title       = titleMatch ? titleMatch[1] : `article-${sport}-${date}`;
  const slug        = slugify(title);
  const filename    = `${date}-${slug}.md`;
  const articlesDir = path.resolve(__dirname, '../src/content/articles');

  if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });

  if (slugAlreadyExists(slug, articlesDir))
    throw new Error(`Slug existant : "${slug}" — doublon évité`);

  fs.writeFileSync(path.join(articlesDir, filename), content, 'utf8');
  console.log(`  ✓ Sauvegardé : ${filename}`);
  return filename;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═════════════════════════════════════════════');
  console.log('  FightFocus — Génération automatique  v4   ');
  console.log('═════════════════════════════════════════════\n');

  if (!PERPLEXITY_API_KEY) {
    console.error('❌ PERPLEXITY_API_KEY manquante');
    process.exit(1);
  }
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY manquante');
    process.exit(1);
  }

  const date        = getTodayDate();
  const dayNum      = getDayOfWeek();
  const sport       = pickSportForWeek(date);
  const intendedType = DAY_TYPE_MAP[dayNum];

  const typeLabels = {
    'actualite':  '📰 Actualité',
    'evenement':  '🥊 Preview événement',
    'technique':  '🥋 Guide technique',
    'patrimoine': '📜 Histoire & patrimoine',
    'legende':    '🏆 Portrait d\'une légende',
    'discipline': '📖 Découvrir la discipline'
  };

  console.log(`Sport visé : ${SPORT_LABELS[sport]}`);
  console.log(`Type prévu : ${typeLabels[intendedType] || intendedType} (jour UTC ${dayNum})`);
  console.log(`Date       : ${date}\n`);

  try {
    // ── 1. Stratégie ──────────────────────────────────────────────────────────
    console.log('1/4 — Analyse de l\'actualité et stratégie éditoriale...');
    const strategy = await resolveArticleStrategy(sport, intendedType);

    const { finalType, context } = strategy;

    if (strategy.pivotApplied) {
      console.log(`  ↩ Pivot : "${intendedType}" → "${finalType}" (${strategy.pivotReason || strategy.quality})`);
    } else {
      console.log(`  ✓ Type confirmé : "${finalType}" · qualité : ${strategy.quality}`);
    }

    await sleep(800);

    // ── 2. Rédaction ──────────────────────────────────────────────────────────
    console.log('2/4 — Rédaction Gemini...');
    const articleContent = await generateArticleWithGemini(sport, finalType, context, strategy);

    // ── 3. Validation ─────────────────────────────────────────────────────────
    console.log('3/4 — Validation stricte...');
    const validContent = validateArticle(articleContent, sport, date, finalType);

    // ── 4. Sauvegarde ─────────────────────────────────────────────────────────
    console.log('4/4 — Sauvegarde...');
    const filename = saveArticle(validContent, sport, date);

    // ── Résumé ────────────────────────────────────────────────────────────────
    console.log('\n✅ SUCCÈS');
    console.log(`   Fichier   : ${filename}`);
    console.log(`   Sport     : ${SPORT_LABELS[sport]}`);
    console.log(`   Type final: ${finalType}${strategy.pivotApplied ? ' (pivot)' : ''}`);
    console.log(`   Catégorie : ${TYPE_CATEGORY[finalType]}`);
    console.log(`   Qualité   : ${strategy.quality}\n`);

  } catch (error) {
    console.error(`\n❌ ÉCHEC — ${error.message}`);
    console.error('   Aucun fichier créé. Vérifier les logs ci-dessus.\n');
    process.exit(1);
  }
}

main();
