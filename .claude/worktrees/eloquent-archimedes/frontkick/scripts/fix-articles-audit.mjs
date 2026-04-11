// fix-articles-audit.mjs
// FightFocus — Correctif audit : articles trop courts + dates incorrectes
// Lancer UNE SEULE FOIS manuellement : node frontkick/scripts/fix-articles-audit.mjs
//
// Ce script corrige 2 problèmes détectés par l'audit Base44 :
//   1. Dates non-ISO ("Mars 2026" → "2026-03-XX") → corrigées vers 2026-03-29
//   2. Articles trop courts (< 150 mots) → signalés pour suppression manuelle

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const articlesDir = path.resolve(__dirname, '../src/content/articles');

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function getAllArticles() {
  if (!fs.existsSync(articlesDir)) {
    console.error('❌ Dossier articles introuvable :', articlesDir);
    process.exit(1);
  }
  return fs.readdirSync(articlesDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ file: f, filepath: path.join(articlesDir, f) }));
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('---', 3);
  if (end === -1) return null;
  return {
    raw:  content.substring(0, end + 3),
    body: content.substring(end + 3)
  };
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

// ─── Correction 1 : dates non-ISO ────────────────────────────────────────────
// Gemini a parfois écrit date: "Mars 2026" au lieu de date: "2026-03-XX"
// On les normalise vers 2026-03-29 (date de génération la plus probable)

const DATE_CORRECTIONS = {
  // Variantes françaises → date ISO normalisée
  '"Mars 2026"':    '"2026-03-29"',
  '"mars 2026"':    '"2026-03-29"',
  '"Février 2026"': '"2026-02-28"',
  '"février 2026"': '"2026-02-28"',
  '"Janvier 2026"': '"2026-01-31"',
  '"janvier 2026"': '"2026-01-31"',
  '"Décembre 2025"':'"2025-12-31"',
  '"décembre 2025"':'"2025-12-31"',
};

function fixDateInFrontmatter(fm) {
  let fixed = fm;
  for (const [wrong, correct] of Object.entries(DATE_CORRECTIONS)) {
    if (fixed.includes(`date: ${wrong}`)) {
      fixed = fixed.replace(`date: ${wrong}`, `date: ${correct}`);
    }
  }
  return fixed;
}

function isDateNonISO(fm) {
  // Date ISO valide = "YYYY-MM-DD"
  const match = fm.match(/^date:\s*"(.+?)"$/m);
  if (!match) return true;
  return !/^\d{4}-\d{2}-\d{2}$/.test(match[1].trim());
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  FightFocus — Correctif Audit Articles');
  console.log('══════════════════════════════════════════════\n');

  const articles = getAllArticles();
  console.log(`📂 ${articles.length} articles trouvés\n`);

  const report = {
    dateFixed:   [],
    tooShort:    [],
    ok:          []
  };

  for (const { file, filepath } of articles) {
    const content = fs.readFileSync(filepath, 'utf8');
    const parsed  = parseFrontmatter(content);

    if (!parsed) {
      console.warn(`  ⚠ ${file} — frontmatter invalide, ignoré`);
      continue;
    }

    const { raw: fm, body } = parsed;
    const wc = wordCount(body);
    let modified = false;
    let newContent = content;

    // ── Correction date non-ISO ───────────────────────────────────────────────
    if (isDateNonISO(fm)) {
      const fixedFm = fixDateInFrontmatter(fm);
      if (fixedFm !== fm) {
        newContent = fixedFm + body;
        fs.writeFileSync(filepath, newContent, 'utf8');
        const oldDate = (fm.match(/^date:\s*(.+)$/m) || [])[1];
        const newDate = (fixedFm.match(/^date:\s*(.+)$/m) || [])[1];
        console.log(`  ✅ Date corrigée : ${file}`);
        console.log(`     ${oldDate} → ${newDate}`);
        report.dateFixed.push(file);
        modified = true;
      } else {
        // Date non-ISO mais pas dans notre mapping → signaler sans corriger
        const dateVal = (fm.match(/^date:\s*(.+)$/m) || [])[1];
        console.warn(`  ⚠ ${file} — date non-ISO non mappée : ${dateVal}`);
      }
    }

    // ── Détection articles trop courts ────────────────────────────────────────
    if (wc < 150) {
      console.warn(`  🔴 ${file} — TROP COURT : ${wc} mots → À SUPPRIMER MANUELLEMENT`);
      report.tooShort.push({ file, wc });
    } else if (!modified) {
      report.ok.push(file);
    }
  }

  // ── Rapport final ─────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  RAPPORT FINAL');
  console.log('══════════════════════════════════════════════\n');

  console.log(`✅ Dates corrigées automatiquement : ${report.dateFixed.length}`);
  if (report.dateFixed.length > 0) {
    report.dateFixed.forEach(f => console.log(`   · ${f}`));
  }

  console.log(`\n🔴 Articles trop courts (< 150 mots) — À SUPPRIMER MANUELLEMENT : ${report.tooShort.length}`);
  if (report.tooShort.length > 0) {
    report.tooShort.forEach(({ file, wc }) => {
      console.log(`   · ${file} (${wc} mots)`);
    });
    console.log('\n  ACTION REQUISE : supprimer ces fichiers via Base44 et ajouter');
    console.log('  leurs URLs dans vercel.json (redirections 301 vers la page discipline).');
    console.log('  Exemple : "/articles/grappling-vs-mma-frappes" → "/discipline/grappling"');
  }

  console.log(`\n✅ Articles OK inchangés : ${report.ok.length}`);
  console.log('\n══════════════════════════════════════════════\n');
}

main();
