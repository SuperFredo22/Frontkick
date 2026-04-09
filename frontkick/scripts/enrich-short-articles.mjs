// enrich-short-articles.mjs
// FightFocus — V2-SAFE : Enrichissement des articles < 800 mots avec Gemini
// Pipeline : lecture → rédaction enrichie → self-review anti-hallucination → sauvegarde
// Anti-intoxication : aucune donnée externe — contenu 100% evergreen généré internement

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR   = path.join(__dirname, '../src/content/articles');
const MIN_WORDS      = 800;
const TARGET_WORDS   = 1000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractFrontmatter(content) {
  const match = content.match(/^(---[\s\S]*?---)([\s\S]*)$/);
  if (!match) return { frontmatter: '', body: content };
  return { frontmatter: match[1], body: match[2].trim() };
}

function cleanGeminiOutput(raw) {
  return raw
    .replace(/^```(?:markdown)?\s*/i, '')
    .replace(/```\s*$/, '')
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '') // strip frontmatter if Gemini added one
    .trim();
}

// Détecte les placeholders non résolus dans le texte
function hasPlaceholders(text) {
  const FORBIDDEN = [
    '[NOM', '[DATE', '[TITRE', '[Nom', '[nom',
    'VOTRE-', 'À COMPLÉTER', 'à compléter',
    'Nom du combattant', 'Nom du champion',
    '[catégorie', 'Combattant A', 'Combattant B',
    '[Nom du', '[à imaginer]', '[imaginer]',
    'X euros', 'X kg', 'X semaines',
  ];
  return FORBIDDEN.some(p => text.includes(p));
}

async function callGemini(prompt, temperature = 0.65, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 3200, temperature, topP: 0.9 }
          })
        }
      );
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error('Réponse Gemini vide');
      return cleanGeminiOutput(raw);
    } catch (err) {
      if (i === attempts) throw err;
      console.warn(`  ⚠ tentative ${i}: ${err.message} — retry 4s...`);
      await sleep(4000);
    }
  }
}

// Pass 1 : Enrichissement rédactionnel
async function enrichContent(title, sport, body, currentWords) {
  const prompt = `Tu es un expert rédacteur pour FightFocus, un média français spécialisé dans les sports de combat.

Voici un article existant sur "${title}" (sport: ${sport}) qui fait ${currentWords} mots.
Tu dois l'enrichir pour atteindre ${TARGET_WORDS}-1100 mots.

RÈGLES ABSOLUES :
- Conserver toutes les sections existantes (## Titres) et leur contenu
- Ajouter du contenu dans les sections existantes ET/OU ajouter 1-2 nouvelles sections ## pertinentes
- Langue : français, ton expert et accessible
- PAS de listes à puces (utiliser des paragraphes)
- PAS de H1 (# Titre) dans le corps
- PAS de noms de combattants actifs contemporains (risque d'erreur)
- PAS de statistiques ou chiffres précis invérifiables (ex: "87% des combattants...")
- PAS de résultats de combats, événements datés, actualités récentes
- PAS de placeholders du type [NOM], [DATE], [chiffre], [X semaines]
- Contenu 100% evergreen — valable dans 5 ans
- PAS de balises \`\`\` autour de la réponse

Les informations que tu ajoutes doivent être :
- Des principes techniques établis, pas des anecdotes de combattants spécifiques
- Des conseils d'entraînement généraux et éprouvés
- Des explications pédagogiques sur les concepts du sport
- Cohérent avec ce qui est déjà écrit dans l'article

Renvoie UNIQUEMENT le corps de l'article enrichi (sans le frontmatter), en Markdown propre.

--- ARTICLE ACTUEL (corps uniquement) ---
${body}
--- FIN ARTICLE ---`;

  return callGemini(prompt, 0.65);
}

// Pass 2 : Self-review anti-hallucination
async function selfReview(title, sport, enrichedBody) {
  const prompt = `Tu es un éditeur de FightFocus, un média français spécialisé dans les sports de combat.

Voici un article enrichi sur "${title}" (sport: ${sport}).

Ta mission : relire et corriger sans changer la longueur ni la structure.

VÉRIFIE ET CORRIGE :
1. Supprime tout nom de combattant actif contemporain (remplace par "certains combattants" ou "les pratiquants de haut niveau")
2. Supprime toute statistique précise invérifiable (ex: "87% des combattants") → remplace par formulation qualitative
3. Supprime tout résultat de combat ou événement daté
4. Supprime tout placeholder non résolu ([NOM], [DATE], [X], etc.)
5. Corrige toute incohérence interne entre paragraphes
6. Supprime toute liste à puces (transforme en paragraphes si présent)
7. Supprime tout H1 (# Titre) dans le corps

NE PAS :
- Réduire significativement la longueur (conserver >90% du contenu)
- Changer la structure des sections ##
- Reformuler ce qui est correct

Renvoie UNIQUEMENT le corps corrigé (sans frontmatter), en Markdown propre, sans balises \`\`\`.

--- ARTICLE À RELIRE ---
${enrichedBody}
--- FIN ARTICLE ---`;

  return callGemini(prompt, 0.2);
}

async function enrichArticle(filename) {
  const filepath = path.join(ARTICLES_DIR, filename);
  const original = fs.readFileSync(filepath, 'utf8');
  const { frontmatter, body } = extractFrontmatter(original);
  const currentWords = countWords(body);

  if (currentWords >= MIN_WORDS) {
    console.log(`  ⏭ Ignoré (${currentWords} mots) — ${filename}`);
    return false;
  }

  // Extraire titre et sport du frontmatter
  const title = (frontmatter.match(/^title:\s*"?(.+?)"?\s*$/m) || [])[1]?.trim() || filename;
  const sport  = (frontmatter.match(/^sport:\s*(.+)$/m) || [])[1]?.trim() || 'mma';

  console.log(`\n📝 Enrichissement : ${filename}`);
  console.log(`   ${currentWords} mots → cible ${TARGET_WORDS}+ mots`);

  // Pass 1 : Enrichissement
  console.log(`   ✍  Pass 1 — rédaction...`);
  const enrichedBody = await callGemini(
    await buildEnrichPrompt(title, sport, body, currentWords),
    0.65
  );
  const wordsAfterPass1 = countWords(enrichedBody);
  console.log(`   📊 Pass 1 → ${wordsAfterPass1} mots`);

  if (wordsAfterPass1 < MIN_WORDS) {
    console.warn(`  ⚠ Résultat trop court (${wordsAfterPass1} mots) — article non modifié`);
    return false;
  }

  // Pass 2 : Self-review anti-hallucination
  console.log(`   🔍 Pass 2 — self-review anti-hallucination...`);
  const reviewedBody = await selfReview(title, sport, enrichedBody);
  const finalWords = countWords(reviewedBody);
  console.log(`   📊 Pass 2 → ${finalWords} mots`);

  // Vérification finale
  if (finalWords < MIN_WORDS * 0.9) {
    console.warn(`  ⚠ Résultat trop court après review (${finalWords} mots) — utilisation du Pass 1`);
    // Fallback sur le résultat du Pass 1
    if (hasPlaceholders(enrichedBody)) {
      console.warn(`  ⚠ Placeholders détectés dans Pass 1 — article non modifié`);
      return false;
    }
    const newContent = `${frontmatter}\n${enrichedBody}\n`;
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`  ✅ ${currentWords} → ${wordsAfterPass1} mots (Pass 1 conservé) — sauvegardé`);
    return true;
  }

  if (hasPlaceholders(reviewedBody)) {
    console.warn(`  ⚠ Placeholders détectés après review — article non modifié`);
    return false;
  }

  const newContent = `${frontmatter}\n${reviewedBody}\n`;
  fs.writeFileSync(filepath, newContent, 'utf8');
  console.log(`  ✅ ${currentWords} → ${finalWords} mots — sauvegardé`);
  return true;
}

// Prompt d'enrichissement (extrait pour réutilisation)
async function buildEnrichPrompt(title, sport, body, currentWords) {
  return `Tu es un expert rédacteur pour FightFocus, un média français spécialisé dans les sports de combat.

Voici un article existant sur "${title}" (sport: ${sport}) qui fait ${currentWords} mots.
Tu dois l'enrichir pour atteindre ${TARGET_WORDS}-1100 mots.

RÈGLES ABSOLUES :
- Conserver toutes les sections existantes (## Titres) et leur contenu
- Ajouter du contenu dans les sections existantes ET/OU ajouter 1-2 nouvelles sections ## pertinentes
- Langue : français, ton expert et accessible
- PAS de listes à puces (utiliser des paragraphes)
- PAS de H1 (# Titre) dans le corps
- PAS de noms de combattants actifs contemporains (risque d'erreur)
- PAS de statistiques ou chiffres précis invérifiables
- PAS de résultats de combats, événements datés, actualités récentes
- PAS de placeholders du type [NOM], [DATE], [chiffre]
- Contenu 100% evergreen — valable dans 5 ans
- PAS de balises \`\`\` autour de la réponse
- Cohérence totale avec le contenu existant de l'article

Renvoie UNIQUEMENT le corps de l'article enrichi (sans le frontmatter), en Markdown propre.

--- ARTICLE ACTUEL (corps uniquement) ---
${body}
--- FIN ARTICLE ---`;
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY manquante');
    process.exit(1);
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));

  // Identifier les articles courts
  const shortArticles = files.filter(f => {
    const content = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8');
    const { body } = extractFrontmatter(content);
    return countWords(body) < MIN_WORDS;
  }).sort();

  if (shortArticles.length === 0) {
    console.log('✅ Aucun article sous 800 mots — rien à faire.');
    return;
  }

  console.log(`\n🚀 FightFocus — Enrichissement V2-SAFE : ${shortArticles.length} articles\n`);
  console.log('Pipeline : Gemini rédaction → Gemini self-review → validation\n');
  console.log('Articles à enrichir :');
  shortArticles.forEach(f => {
    const content = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8');
    const { body } = extractFrontmatter(content);
    console.log(`  · ${f} (${countWords(body)} mots)`);
  });
  console.log('');

  let enriched = 0;
  let failed   = 0;

  for (const filename of shortArticles) {
    try {
      const ok = await enrichArticle(filename);
      if (ok) enriched++;
      await sleep(3000); // pause entre articles (rate limit)
    } catch (err) {
      console.error(`  ❌ Erreur sur ${filename}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n══════════════════════════════════════`);
  console.log(`  Enrichis : ${enriched} | Échecs : ${failed}`);
  console.log(`══════════════════════════════════════`);
}

main().catch(err => { console.error(err); process.exit(1); });
