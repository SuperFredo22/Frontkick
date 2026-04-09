// enrich-short-articles.mjs
// FightFocus — Enrichissement des articles < 800 mots avec Gemini
// Lit l'article existant, demande à Gemini de l'étendre à 900-1100 mots
// en conservant le frontmatter et le style existant.

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

async function callGemini(prompt, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 3200, temperature: 0.65, topP: 0.9 }
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

  const prompt = `Tu es un expert rédacteur pour FightFocus, un média français spécialisé dans les sports de combat.

Voici un article existant sur "${title}" (sport: ${sport}) qui fait ${currentWords} mots. Tu dois l'enrichir pour atteindre ${TARGET_WORDS}-1100 mots.

RÈGLES ABSOLUES :
- NE PAS modifier le frontmatter (---...---)
- Conserver les sections existantes (## Titres)
- Ajouter du contenu dans les sections existantes ET/OU ajouter 1-2 nouvelles sections ## pertinentes
- Langue : français, ton expert et accessible
- PAS de listes à puces
- PAS de H1 (# Titre) dans le corps
- PAS de citations de combattants actifs contemporains
- PAS de faits d'actualité datés
- Contenu evergreen uniquement
- PAS de balises \`\`\` autour de la réponse

Renvoie UNIQUEMENT le corps de l'article enrichi (sans le frontmatter), en Markdown propre.

--- ARTICLE ACTUEL (corps uniquement) ---
${body}
--- FIN ARTICLE ---`;

  const enrichedBody = await callGemini(prompt);
  const newWords = countWords(enrichedBody);

  if (newWords < MIN_WORDS) {
    console.warn(`  ⚠ Résultat trop court (${newWords} mots) — article non modifié`);
    return false;
  }

  const newContent = `${frontmatter}\n${enrichedBody}\n`;
  fs.writeFileSync(filepath, newContent, 'utf8');
  console.log(`  ✅ ${currentWords} → ${newWords} mots — sauvegardé`);
  return true;
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

  console.log(`\n🚀 FightFocus — Enrichissement de ${shortArticles.length} articles courts\n`);
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
      await sleep(2000); // éviter rate limit
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
