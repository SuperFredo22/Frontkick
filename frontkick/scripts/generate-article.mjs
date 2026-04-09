// generate-article.mjs
// FightFocus — V8-EXPERT
// Pipeline : Banque interne → Gemini rédaction → Gemini self-review → validation → save
// Perplexity reste optionnel pour affiner le sujet, mais n'est plus un prérequis.
// Anti-hallucination : double-pass Gemini (rédaction + relecture critique)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const GEMINI_API_KEY     = process.env.GEMINI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY; // optionnel
const __dirname          = path.dirname(fileURLToPath(import.meta.url));

// ─── Rotation sports étendue (11 sports, cycle 11 semaines) ──────────────────
const SPORTS = [
  'mma', 'boxe', 'muay-thai', 'kickboxing', 'grappling',
  'karate', 'savate', 'sambo', 'sanda', 'lethwei', 'k1'
];
const SPORT_LABELS = {
  'mma':        'MMA (Mixed Martial Arts)',
  'boxe':       'boxe anglaise',
  'muay-thai':  'Muay Thaï',
  'kickboxing': 'kickboxing',
  'grappling':  'grappling et BJJ',
  'karate':     'karaté',
  'savate':     'savate boxe française',
  'sambo':      'sambo',
  'sanda':      'sanda (wushu de combat)',
  'lethwei':    'lethwei',
  'k1':         'K-1 et kickboxing debout',
};

// ─── Banque de sujets evergreen par sport ───────────────────────────────────
// Organisée par thème : technique, entraînement, histoire, équipement, mental
// Sujets volontairement larges → Gemini les interprète librement
const TOPIC_BANK = {
  mma: [
    "Les positions de combat au sol incontournables en MMA",
    "Clinch et dirty boxing en MMA : techniques et usages",
    "Transition debout-sol en MMA : décryptage de la lutte debout",
    "Comment développer son cardio spécifique MMA",
    "La garde en MMA : choisir son style défensif",
    "Les 5 submissions les plus efficaces en compétition MMA",
    "Préparation physique 12 semaines avant un combat MMA amateur",
    "Nutrition et récupération pour le pratiquant de MMA",
    "Comprendre les règles du MMA professionnel",
    "MMA et flexibilité : pourquoi le yoga transforme les combattants",
    "Les bases du judo appliquées au MMA moderne",
    "Psychologie du combattant : gérer la pression avant un combat",
  ],
  boxe: [
    "Maîtriser le jeu de jambes en boxe anglaise",
    "Le contre en boxe : timing et placement",
    "L'uppercut : biomécanique et entraînement",
    "Boxe et vision périphérique : entraîner son regard",
    "Comment travailler seul : le shadow boxing efficace",
    "La corde à sauter en boxe : méthodes et progression",
    "Préparer son premier sparring en boxe anglaise",
    "Les protections indispensables pour s'entraîner en boxe",
    "Histoire de la boxe anglaise : des origines à l'ère moderne",
    "Le travail au sac : erreurs communes et bonne technique",
    "Boxe et perte de poids : réalités et méthodes sérieuses",
    "Les systèmes de défense en boxe anglaise expliqués",
  ],
  'muay-thai': [
    "Le teep : pied frontal offensif et défensif en Muay Thaï",
    "Les coudes en Muay Thaï : 6 variantes expliquées",
    "Le clinch en Muay Thaï : maîtriser le corps à corps",
    "Travailler les genoux en Muay Thaï : exercices de base",
    "La culture et les rituels du Muay Thaï traditionnel",
    "Muay Thaï pour débutants : le premier mois d'entraînement",
    "Choisir son sac de frappe pour le Muay Thaï",
    "Le roundhouse kick en Muay Thaï : puissance et précision",
    "Comprendre les catégories de poids dans le Muay Thaï",
    "Conditionnement des tibias : méthodes et précautions",
    "Le Muay Thaï comme outil de remise en forme",
    "Préparer un combat Muay Thaï amateur : les 8 semaines décisives",
  ],
  kickboxing: [
    "Les différences entre K-1, full contact et low kick kickboxing",
    "Maîtriser le back kick en kickboxing",
    "L'entraînement en intervalles adapté au kickboxing",
    "Kickboxing et coordination : exercices pour améliorer ses réflexes",
    "Choisir ses gants pour le kickboxing",
    "Les combinaisons de base en kickboxing full contact",
    "Histoire du kickboxing : du Japon à l'Europe",
    "Kickboxing féminin : particularités et progression",
    "Les erreurs de débutants en kickboxing et comment les corriger",
    "Kickboxing et MMA : complémentarités et différences",
    "Préparer sa première compétition de kickboxing amateur",
    "Les catégories du kickboxing mondial : WAKO, Glory, ONE",
  ],
  grappling: [
    "La garde fermée en grappling : contrôle et attaques",
    "Le kimura : setup et finition en grappling",
    "Passer la garde : les 4 techniques fondamentales",
    "Le takedown double-leg : mécanique et défense",
    "Grappling no-gi vs gi : différences et complémentarités",
    "Les soumissions depuis le dos : rear naked choke et étranglements",
    "Développer sa force de préhension pour le grappling",
    "La position de contrôle latérale : maintien et transitions",
    "Le triangle : comprendre et appliquer la soumission",
    "Grappling et mobilité articulaire : prévenir les blessures",
    "Structurer son entraînement en grappling sur 4 jours",
    "Les ceintures en BJJ : signification et progression réaliste",
  ],
  karate: [
    "Les katas fondamentaux du karaté shotokan expliqués",
    "Le kumite en karaté : règles olympiques et stratégies",
    "Kizami-zuki et gyaku-zuki : les deux coups de poing de base",
    "La philosophie du Budo : discipline et respect en karaté",
    "Karaté kyokushin vs shotokan : deux visions du combat",
    "Entraîner sa vitesse d'exécution en karaté",
    "Les pieds de base en karaté : mawashi-geri et yoko-geri",
    "Histoire du karaté : des îles Ryukyu au monde entier",
    "Préparer son premier passage de grade en karaté",
    "Le makiwara : l'outil de frappe traditionnel du karaté",
    "Karaté et concentration mentale : l'apport de la méditation",
    "Les principales fédérations mondiales de karaté",
  ],
  savate: [
    "La savate boxe française : principes fondamentaux",
    "Les coups de pied spécifiques à la savate : fouetté, chassé, revers",
    "La distance en savate : gestion et exploitation",
    "Histoire de la savate : des rues de Paris aux rings mondiaux",
    "Les assauts de savate : règles et compétition",
    "Chaussage et équipements de la savate",
    "Savate et préparation physique : les exercices indispensables",
    "Les grades de la savate : du gant jaune au gant d'or",
    "Savate vs boxe anglaise : similitudes et divergences techniques",
    "Le chausson à la savate : l'art du pied nu traditionnel",
    "Préparer son premier assaut de savate",
    "La savate comme base pour le kickboxing européen",
  ],
  sambo: [
    "Les projections de base du sambo combat",
    "Sambo sportif vs sambo combat : différences et applications",
    "L'histoire du sambo : origines soviétiques et expansion mondiale",
    "Les clés de bras spécifiques au sambo",
    "Le sambo freestyle : règles et spécificités",
    "Étranglements en sambo : légalité et techniques",
    "La veste de sambo (kurtka) : usage et prises spécifiques",
    "Sambo et luta livre : deux visions du grappling sans gi",
    "Préparer son premier tournoi de sambo",
    "Sambo et judo : complémentarité et différences tactiques",
    "L'entraînement quotidien d'un judoka converti au sambo",
    "Les catégories de poids en sambo compétition",
  ],
  sanda: [
    "Le sanda : pieds-poings et projections en compétition",
    "Les projections en sanda : technique et score",
    "Histoire du sanda : du wushu militaire au sport olympique",
    "La plateforme de sanda : règles et spécificités du ring surélevé",
    "Entraîner les combinaisons pieds-poings en sanda",
    "Sanda et kickboxing : complémentarités tactiques",
    "Les tenu (attentes) en sanda : corps à corps et sortie de plateforme",
    "Sanda féminin : croissance et spécificités",
    "Préparer son premier combat de sanda",
    "Le sanda comme base pour le MMA moderne",
    "Nutrition et récupération pour le pratiquant de sanda",
    "Les grandes compétitions mondiales de sanda",
  ],
  lethwei: [
    "Le lethwei et les coups de tête : règles et techniques",
    "Histoire du lethwei : art martial birman ancestral",
    "Conditionnement physique pour le lethwei",
    "Les bandages de mains en lethwei traditionnel",
    "Lethwei et Muay Thaï : différences fondamentales",
    "Le système de victoire en lethwei : KO ou match nul",
    "Techniques de coude et de genou en lethwei",
    "Le lethwei à l'international : expansion et adaptation",
    "L'état mental du combattant de lethwei",
    "Préparer un combat de lethwei : approche physique et mentale",
    "Les règles modernes du lethwei : standard international",
    "Lethwei et MMA : ce que le sport birman apporte aux combattants modernes",
  ],
  k1: [
    "Le K-1 : règles et origine du kickboxing debout japonais",
    "Les coups de pied de base en K-1 : mawashi, yoko, ura",
    "Le clinch en K-1 : gestion et sortie réglementaire",
    "Entraîner sa puissance de frappe pour le K-1",
    "Histoire du K-1 World Grand Prix",
    "Glory Kickboxing vs K-1 : comparaison des règles",
    "Le travail en infight dans le kickboxing K-1",
    "Choisir son entraîneur pour progresser en K-1",
    "La préparation physique spécifique au kickboxing debout",
    "K-1 et cardio : gérer 3 rounds intenses",
    "Les catégories de poids du Glory Kickboxing mondial",
    "Débuter le K-1 : premiers mois et progression",
  ],
};

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

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function slugAlreadyExists(slug, articlesDir) {
  if (!fs.existsSync(articlesDir)) return false;
  return fs.readdirSync(articlesDir).some(f => f.includes(slug.substring(0, 40)));
}

function pickSport(dateStr) {
  const d       = new Date(dateStr);
  const jan1    = new Date(d.getUTCFullYear(), 0, 1);
  const weekNum = Math.floor((d - jan1) / (7 * 86400000));
  return SPORTS[weekNum % SPORTS.length];
}

function pickTopic(sport, articlesDir) {
  const bank = TOPIC_BANK[sport] || TOPIC_BANK['mma'];
  // Exclure les sujets déjà couverts (slug matching approximatif)
  const existingSlugs = fs.existsSync(articlesDir)
    ? fs.readdirSync(articlesDir).map(f => f.replace(/\.md$/, '').toLowerCase())
    : [];
  const unused = bank.filter(topic => {
    const topicSlug = slugify(topic).substring(0, 30);
    return !existingSlugs.some(s => s.includes(topicSlug.substring(0, 20)));
  });
  const pool = unused.length > 0 ? unused : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Nettoyage sortie Gemini ──────────────────────────────────────────────────
function stripCodeFences(text) {
  let r = text.trim();
  r = r.replace(/^```(?:markdown|yaml|md)?\s*\n?/i, '');
  r = r.replace(/\n?```\s*$/i, '');
  return r.trim();
}

function normalizeDashes(text) {
  return text.replace(/^[\u2014\u2013\-]{3,}\s*$/gm, '---');
}

function repairFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return text; // déjà fermé
  }
  const yamlFieldRegex = /^[a-zA-Z_][a-zA-Z0-9_]*\s*:/;
  let lastYamlLine = 0;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (yamlFieldRegex.test(l)) lastYamlLine = i;
    else if (l === '' && lastYamlLine > 0) break;
    else if (l.startsWith('#') || l.startsWith('Le ') || l.startsWith('La ')) break;
  }
  if (lastYamlLine > 0) {
    lines.splice(lastYamlLine + 1, 0, '---');
    console.log(`  🔧 Frontmatter réparé`);
  }
  return lines.join('\n');
}

function cleanOutput(raw) {
  return repairFrontmatter(normalizeDashes(stripCodeFences(raw)));
}

// ─── Perplexity (optionnel) — idée SEO uniquement ────────────────────────────
async function refineTopic(baseTopic, sport) {
  if (!PERPLEXITY_API_KEY) return baseTopic;
  const label = SPORT_LABELS[sport] || sport;
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
            content: `Expert SEO sports de combat. Réponds en UN titre optimisé, jamais de faits, jamais de combattants, jamais de résultats. Français uniquement.`
          },
          {
            role: 'user',
            content: `Reformule ce sujet en titre d'article SEO accrocheur pour ${label} : "${baseTopic}"\nRéponds uniquement avec le titre, rien d'autre.`
          }
        ],
        max_tokens: 100
      })
    });
    const data = await res.json();
    const refined = data.choices?.[0]?.message?.content?.trim() || '';
    if (refined.length > 15 && refined.length < 120) {
      console.log(`  ✓ Sujet affiné (Perplexity) : "${refined}"`);
      return refined;
    }
    return baseTopic;
  } catch {
    return baseTopic; // Perplexity fail → on garde le sujet de base
  }
}

// ─── Gemini : rédaction principale ───────────────────────────────────────────
async function writeArticle(topic, sport, date, attempts = 2) {
  const sportLabel = SPORT_LABELS[sport] || sport;

  const prompt = `Tu es un expert reconnu en arts martiaux et sports de combat, rédacteur pour FightFocus.fr, le média français de référence sur les sports de combat.

SUJET : ${topic}
DISCIPLINE : ${sportLabel}
DATE : ${date}

TU DOIS produire un article expert, pédagogique et evergreen, 100% basé sur des principes techniques et méthodologiques reconnus dans la communauté des sports de combat. Jamais de faits inventés.

━━━ STRUCTURE OBLIGATOIRE ━━━

Introduction (2-3 phrases) : accroche directe sur le sujet, sans préambule général.

4 sections ## minimum, chacune développée en 150-220 mots :
• Section 1 : concept fondamental (définition, principes, pourquoi c'est important)
• Section 2 : technique ou méthode détaillée (comment faire concrètement)
• Section 3 : application pratique ou erreurs communes (pédagogie)
• Section 4 (ou plus) : progression, variations, ou contexte avancé

Conclusion (2-3 phrases) : synthèse + invitation à explorer FightFocus.fr

━━━ RÈGLES ABSOLUES ━━━
✅ Français soigné, ton expert mais accessible au débutant
✅ 950 à 1150 mots (corps uniquement, hors frontmatter)
✅ Minimum 4 sections ## développées
✅ Données factuelles uniquement si établies depuis des décennies (pas de stats récentes)
❌ AUCUN combattant actif contemporain (vivant ou actif depuis moins de 20 ans)
❌ AUCUN événement daté (compétitions, records, palmarès récents)
❌ AUCUNE statistique inventée ou approximative
❌ AUCUNE liste à puces dans le corps de l'article
❌ AUCUN placeholder : [NOM], [CHIFFRE], [DATE], etc.
❌ JAMAIS de backticks \`\`\` dans la réponse
❌ JAMAIS de H1 (# Titre)

━━━ FORMAT EXACT ━━━
Commence ta réponse PAR --- sans rien avant :

---
title: "Titre SEO précis 55-70 caractères (inclure le mot-clé principal ${sportLabel})"
sport: ${sport}
category: guide
date: "${date}"
excerpt: "Accroche 130-155 caractères sans guillemets imbriqués"
featured: false
---

Introduction ici (2-3 phrases, pas de titre ##)

## Premier titre de section

[contenu]`;

  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 3200, temperature: 0.55, topP: 0.88 }
          })
        }
      );
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error('Réponse vide');
      console.log(`  ✓ Rédigé — ${raw.length} chars`);
      return cleanOutput(raw);
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(`  ⚠ Tentative ${i}: ${err.message} — retry 3s...`);
      await sleep(3000);
    }
  }
}

// ─── Gemini : self-review anti-hallucination ──────────────────────────────────
async function selfReview(articleContent, sport) {
  const fmEnd   = articleContent.indexOf('---', 3);
  const body    = fmEnd !== -1 ? articleContent.substring(fmEnd + 3).trim() : articleContent;
  const sportLabel = SPORT_LABELS[sport] || sport;

  const reviewPrompt = `Tu es éditeur senior pour un média de sports de combat. Lis cet article sur le ${sportLabel} et corrige UNIQUEMENT les problèmes suivants :

1. SUPPRIMER toute mention d'un combattant actif ou ayant combattu récemment (post-2005)
2. SUPPRIMER toute statistique ou chiffre qui pourrait être inexact (remplacer par une description qualitative)
3. SUPPRIMER tout placeholder [NOM], [CHIFFRE], [DATE], [À COMPLÉTER]
4. SUPPRIMER les listes à puces (- ou *) dans le corps — les réécrire en prose
5. NE PAS changer le fond, le style, ni la structure si tout est correct

Si l'article est déjà correct sur ces 5 points, renvoie-le tel quel.
Ne modifie PAS le frontmatter (---...---).
Renvoie l'article complet (frontmatter inclus) sans backticks.

─── ARTICLE À RELIRE ───
${articleContent}
─── FIN ───`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: reviewPrompt }] }],
          generationConfig: { maxOutputTokens: 3500, temperature: 0.2, topP: 0.85 }
        })
      }
    );
    if (!res.ok) return articleContent; // fail → garde l'original
    const data    = await res.json();
    const reviewed = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reviewed || reviewed.length < 200) return articleContent;
    console.log(`  ✓ Self-review OK`);
    return cleanOutput(reviewed);
  } catch {
    return articleContent; // fail → garde l'original
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateArticle(content) {
  const cleaned = cleanOutput(content);
  if (!cleaned.startsWith('---')) throw new Error('Frontmatter absent');

  const fmEnd = cleaned.indexOf('---', 3);
  if (fmEnd === -1) throw new Error('Frontmatter non fermé');

  const fm   = cleaned.substring(0, fmEnd + 3);
  const body = cleaned.substring(fmEnd + 3).trim();

  for (const field of ['title:', 'sport:', 'category:', 'date:', 'excerpt:']) {
    if (!fm.includes(field)) throw new Error(`Champ manquant : ${field}`);
  }

  const validSports = ['mma','boxe','kickboxing','muay-thai','grappling','karate','sanda','lethwei','savate','sambo','k1'];
  const validCats   = ['guide','guide-debutant','conseil-entrainement','analyse','guide-equipement','actualite'];
  const sportVal    = (fm.match(/^sport:\s*(.+)$/m) || [])[1]?.trim();
  const catVal      = (fm.match(/^category:\s*(.+)$/m) || [])[1]?.trim();

  if (sportVal && !validSports.includes(sportVal)) throw new Error(`Sport invalide : "${sportVal}"`);
  if (catVal   && !validCats.includes(catVal))     throw new Error(`Category invalide : "${catVal}"`);

  const words = body.split(/\s+/).filter(Boolean).length;
  const h2cnt = (body.match(/^##\s+\S/gm) || []).length;

  if (words < 350) throw new Error(`Trop court : ${words} mots`);
  if (h2cnt < 2)   throw new Error(`Sections insuffisantes : ${h2cnt} H2`);

  // Détection de placeholders résiduels
  const placeholders = ['[NOM', '[DATE', '[TITRE', 'VOTRE-', 'À COMPLÉTER', 'à compléter', '[Nom du'];
  for (const p of placeholders) {
    if (body.includes(p)) throw new Error(`Placeholder résiduel : "${p}"`);
  }

  console.log(`  ✓ Validation — ${words} mots · ${h2cnt} H2 · ${sportVal} / ${catVal}`);
  return cleaned;
}

// ─── Fallback article ─────────────────────────────────────────────────────────
function fallbackArticle(sport, date, topic) {
  const label = SPORT_LABELS[sport] || sport;
  return `---
title: "${topic.substring(0, 65)}"
sport: ${sport}
category: guide
date: "${date}"
excerpt: "Guide complet sur ${label} pour progresser efficacement dès les premiers entraînements."
featured: false
---

La progression en ${label} repose sur des principes fondamentaux accessibles à tous, mais qui demandent du temps et de la rigueur pour être intégrés pleinement. Cet article vous guide à travers les éléments essentiels à connaître pour avancer avec méthode.

## Les fondamentaux à maîtriser en priorité

Toute discipline de combat repose sur une base technique solide. En ${label}, les mouvements fondamentaux constituent le socle sur lequel s'accumulent toutes les techniques avancées. Consacrer du temps à leur répétition minutieuse, même après des années de pratique, reste l'une des habitudes les plus efficaces pour progresser durablement.

La mécanique corporelle — position de garde, gestion du centre de gravité, déplacements — précède toujours l'apprentissage des techniques offensives. Un pratiquant dont la garde est stable et les déplacements fluides dispose d'une plateforme fiable pour toutes ses actions.

## Structurer son entraînement pour progresser

La régularité prévaut sur l'intensité. Trois entraînements hebdomadaires bien conduits produisent des résultats supérieurs à des sessions irrégulières et épuisantes. Chaque séance devrait idéalement se diviser en échauffement, travail technique, application en pression légère et récupération active.

Le travail personnel entre les cours — shadow boxing, répétitions de techniques au ralenti, étirements — accélère sensiblement l'intégration des mouvements. L'automatisation des gestes libère l'attention pour des aspects plus tactiques.

## Les erreurs classiques à corriger

Aller trop vite dans l'apprentissage constitue l'erreur la plus commune. La précipitation vers des techniques avancées avant d'avoir solidifié les bases crée des lacunes qui freinent la progression à long terme. La patience est une qualité cardinale dans les arts martiaux.

Négliger la récupération est une autre erreur fréquente. Le corps consolide les apprentissages pendant le repos. Dormir suffisamment, s'hydrater correctement et prendre des jours de repos actif font partie intégrante de l'entraînement.

## Progresser sur le long terme

La pratique des arts martiaux est une aventure de long terme. Les progrès ne sont pas toujours linéaires : des plateaux apparaissent, qui précèdent souvent des sauts qualitatifs significatifs. Les pratiquants qui persistent malgré ces phases de stagnation sont ceux qui atteignent leur potentiel plein.

S'entraîner avec des partenaires de niveaux variés enrichit la pratique : les débutants permettent de consolider les bases, les plus expérimentés exposent aux limites actuelles.

Revenez régulièrement sur FightFocus.fr pour découvrir l'ensemble de nos guides techniques et conseils d'entraînement sur le ${label} et les autres disciplines de combat.
`;
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
    throw new Error(`Slug déjà existant : "${slug}"`);

  fs.writeFileSync(path.join(articlesDir, filename), content, 'utf8');
  console.log(`  ✓ Sauvegardé : ${filename}`);
  return { filename, slug, articlesDir };
}

// ─── Liens internes automatiques ─────────────────────────────────────────────
function parseFrontmatterForLinks(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  m[1].split(/\r?\n/).forEach(line => {
    const [k, ...v] = line.split(':');
    if (k && v.length) meta[k.trim()] = v.join(':').trim().replace(/^"|"$/g, '');
  });
  return { meta, body: m[2] };
}

function relevanceScore(a, b) {
  if (a.slug === b.slug) return -1;
  let score = 0;
  if (a.sport === b.sport)       score += 10;
  if (a.category === b.category) score += 4;
  const wordsA = a.slug.replace(/\d{4}-\d{2}-\d{2}-/, '').split('-').filter(w => w.length > 3);
  const wordsB = b.slug.replace(/\d{4}-\d{2}-\d{2}-/, '').split('-').filter(w => w.length > 3);
  const shared = wordsA.filter(w => wordsB.includes(w)).length;
  score += shared * 2;
  return score;
}

function addInternalLinks(newFilename, articlesDir) {
  // Charge tous les articles
  const all = fs.readdirSync(articlesDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(articlesDir, f), 'utf8');
      const parsed  = parseFrontmatterForLinks(content);
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

  const article = all.find(a => a.file === newFilename);
  if (!article) { console.log('  ⚠ Article introuvable pour les liens internes'); return; }
  if (article.body.includes('Pour aller plus loin')) { console.log('  ℹ Liens internes déjà présents'); return; }

  // Sélectionne les 3 meilleurs articles liés
  const related = all
    .filter(a => a.slug !== article.slug)
    .map(a => ({ article: a, score: relevanceScore(article, a) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.article);

  if (related.length < 2) { console.log('  ℹ Pas assez d\'articles liés (< 2)'); return; }

  const lines   = related.map(a => `- [${a.title}](/articles/${a.slug})`);
  const section = `\n\n## Pour aller plus loin\n\n${lines.join('\n')}\n`;
  const newBody  = article.body.trimEnd() + section;
  const newContent = article.raw.replace(article.body, newBody);

  fs.writeFileSync(path.join(articlesDir, newFilename), newContent, 'utf8');
  console.log(`  ✓ Liens internes ajoutés :`);
  related.forEach(r => console.log(`     → ${r.title}`));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  FightFocus — Génération V8-EXPERT');
  console.log('  Banque interne + Gemini + self-review');
  if (PERPLEXITY_API_KEY) console.log('  Perplexity : actif (affinage SEO)');
  else                    console.log('  Perplexity : inactif (banque interne seule)');
  console.log('═══════════════════════════════════════════\n');

  if (!GEMINI_API_KEY) { console.error('❌ GEMINI_API_KEY manquante'); process.exit(1); }

  const date        = getTodayDate();
  const articlesDir = path.resolve(__dirname, '../src/content/articles');

  // Support FORCE_SPORT (variable d'environnement ou arg CLI)
  const forceSport = process.env.FORCE_SPORT || process.argv[2] || '';
  const sport = (forceSport && SPORTS.includes(forceSport))
    ? forceSport
    : pickSport(date);

  if (forceSport && !SPORTS.includes(forceSport)) {
    console.warn(`  ⚠ Sport "${forceSport}" inconnu — rotation automatique utilisée`);
  }
  const baseTopic  = pickTopic(sport, articlesDir);

  console.log(`  Sport du jour : ${SPORT_LABELS[sport]}`);
  console.log(`  Date          : ${date}`);
  console.log(`  Sujet initial : "${baseTopic}"\n`);

  try {
    // 1. Affinage sujet (Perplexity optionnel)
    console.log('1/5 — Sélection du sujet...');
    const topic = await refineTopic(baseTopic, sport);
    await sleep(500);

    // 2. Rédaction Gemini
    console.log('2/5 — Rédaction...');
    let content;
    try {
      content = await writeArticle(topic, sport, date);
    } catch (err) {
      console.warn(`  ⚠ Rédaction fail (${err.message}) → fallback`);
      content = fallbackArticle(sport, date, topic);
    }

    // 3. Self-review anti-hallucination
    console.log('3/5 — Relecture critique...');
    const reviewed = await selfReview(content, sport);
    await sleep(500);

    // 4. Validation + sauvegarde
    console.log('4/5 — Validation et sauvegarde...');
    let validated;
    try {
      validated = validateArticle(reviewed);
    } catch (err) {
      console.warn(`  ⚠ Validation fail (${err.message}) → fallback`);
      validated = validateArticle(fallbackArticle(sport, date, topic));
    }

    const { filename, articlesDir: aDir } = saveArticle(validated, date);

    // 5. Liens internes automatiques
    console.log('5/5 — Liens internes...');
    addInternalLinks(filename, aDir);

    console.log(`\n✅ SUCCÈS — ${filename}\n`);

  } catch (err) {
    console.error(`\n❌ ÉCHEC — ${err.message}`);
    process.exit(1);
  }
}

main();
