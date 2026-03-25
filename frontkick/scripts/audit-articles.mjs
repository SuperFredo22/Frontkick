// audit-articles.mjs
// FightFocus — Script d'audit de la qualité des articles existants
// Usage : node audit-articles.mjs
// Génère un rapport audit-report.md dans le dossier courant

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');
const OUTPUT_FILE  = path.resolve(__dirname, 'audit-report.md');

const VALID_SPORTS = [
  'mma','boxe','kickboxing','muay-thai','grappling',
  'karate','equipement','sanda','lethwei','savate','sambo','k1'
];
const VALID_CATEGORIES = [
  'actualite','guide-debutant','conseil-entrainement','analyse','guide-equipement'
];
const FORBIDDEN_PLACEHOLDERS = [
  '[NOM', '[DATE', '[TITRE', '[Nom', '[nom',
  'VOTRE-', 'À COMPLÉTER', 'à compléter',
  'Nom du combattant', 'Nom du champion',
  'adversaire potentiel', '[Poids lourd',
  '[catégorie', 'Combattant A', 'Combattant B',
  '[Nom du', 'à imaginer'
];

// ─── Analyse d'un article ─────────────────────────────────────────────────────

function analyzeArticle(filename, content) {
  const issues   = [];
  const warnings = [];

  // 1. Frontmatter
  if (!content.startsWith('---')) {
    issues.push('Frontmatter absent ou mal positionné');
    return { filename, status: 'ERREUR', issues, warnings, wordCount: 0, title: 'Inconnu' };
  }

  const fmEnd = content.indexOf('---', 3);
  if (fmEnd === -1) {
    issues.push('Frontmatter non fermé');
    return { filename, status: 'ERREUR', issues, warnings, wordCount: 0, title: 'Inconnu' };
  }

  const frontmatter = content.substring(0, fmEnd + 3);
  const body = content.substring(fmEnd + 3).trim();

  // 2. Champs obligatoires
  const titleVal = (frontmatter.match(/^title:\s*"(.+?)"$/m) || [])[1];
  const sportVal = (frontmatter.match(/^sport:\s*(.+)$/m) || [])[1]?.trim();
  const catVal   = (frontmatter.match(/^category:\s*(.+)$/m) || [])[1]?.trim();
  const dateVal  = (frontmatter.match(/^date:\s*"(.+?)"$/m) || [])[1]?.trim();
  const excerptVal = (frontmatter.match(/^excerpt:\s*"(.+?)"$/m) || [])[1];

  if (!titleVal)   issues.push('Champ "title" manquant ou mal formaté');
  if (!sportVal)   issues.push('Champ "sport" manquant');
  if (!catVal)     issues.push('Champ "category" manquant');
  if (!dateVal)    issues.push('Champ "date" manquant ou mal formaté (guillemets requis)');
  if (!excerptVal) warnings.push('Champ "excerpt" manquant (impact SEO)');

  // 3. Valeurs valides
  if (sportVal && !VALID_SPORTS.includes(sportVal))
    issues.push(`Valeur sport invalide : "${sportVal}"`);
  if (catVal && !VALID_CATEGORIES.includes(catVal))
    issues.push(`Valeur category invalide : "${catVal}"`);

  // 4. Placeholders interdits
  const foundPlaceholders = FORBIDDEN_PLACEHOLDERS.filter(p => content.includes(p));
  if (foundPlaceholders.length > 0) {
    issues.push(`Placeholders détectés : ${foundPlaceholders.join(', ')}`);
  }

  // 5. Longueur
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 300)       issues.push(`Article trop court : ${wordCount} mots`);
  else if (wordCount < 500)  warnings.push(`Article court : ${wordCount} mots (recommandé : 800+)`);

  // 6. Structure H2
  const h2Count = (body.match(/^## .+/gm) || []).length;
  if (h2Count === 0) warnings.push('Aucun titre H2 — structure SEO faible');

  // 7. H1 dans le corps (interdit)
  const h1InBody = (body.match(/^# .+/gm) || []).length;
  if (h1InBody > 0) warnings.push(`${h1InBody} titre(s) H1 dans le corps (doit être uniquement dans le title frontmatter)`);

  // 8. Déterminer le statut global
  let status;
  if (issues.length > 0)        status = 'ERREUR';
  else if (foundPlaceholders.length > 0) status = 'ERREUR';
  else if (warnings.length >= 3) status = 'FAIBLE';
  else if (warnings.length > 0)  status = 'AVERTISSEMENT';
  else                            status = 'OK';

  return {
    filename,
    title: titleVal || 'Sans titre',
    sport: sportVal || '?',
    category: catVal || '?',
    date: dateVal || '?',
    status,
    issues,
    warnings,
    wordCount
  };
}

// ─── Génération du rapport ────────────────────────────────────────────────────

function generateReport(results) {
  const total      = results.length;
  const errors     = results.filter(r => r.status === 'ERREUR');
  const weak       = results.filter(r => r.status === 'FAIBLE');
  const warnings   = results.filter(r => r.status === 'AVERTISSEMENT');
  const ok         = results.filter(r => r.status === 'OK');

  const avgWords = Math.round(
    results.reduce((sum, r) => sum + r.wordCount, 0) / total
  );

  let report = `# 🥋 FightFocus — Rapport d'audit des articles
> Généré le ${new Date().toLocaleDateString('fr-FR')} — ${total} articles analysés

---

## 📊 Résumé

| Statut | Nombre | Action |
|--------|--------|--------|
| ✅ OK | ${ok.length} | Aucune action requise |
| ⚠️ AVERTISSEMENT | ${warnings.length} | Amélioration recommandée |
| 🔶 FAIBLE | ${weak.length} | À corriger prochainement |
| ❌ ERREUR | ${errors.length} | **À corriger ou supprimer en priorité** |

**Moyenne de mots par article :** ${avgWords} mots

---

`;

  // Articles avec erreurs — priorité absolue
  if (errors.length > 0) {
    report += `## ❌ Articles à corriger ou supprimer (${errors.length})

Ces articles ont des erreurs bloquantes (placeholders, frontmatter invalide, 
article trop court). Ils nuisent à la crédibilité du site.

`;
    for (const r of errors) {
      report += `### \`${r.filename}\`
**Titre :** ${r.title}  
**Sport :** ${r.sport} | **Catégorie :** ${r.category} | **Mots :** ${r.wordCount}

**Erreurs :**
${r.issues.map(i => `- ❌ ${i}`).join('\n')}
${r.warnings.length > 0 ? '\n**Avertissements :**\n' + r.warnings.map(w => `- ⚠️ ${w}`).join('\n') : ''}

**Action recommandée :** ${r.wordCount < 200 || r.issues.some(i => i.includes('Placeholder')) ? '🗑️ Supprimer' : '✏️ Corriger le frontmatter'}

---
`;
    }
  }

  // Articles faibles
  if (weak.length > 0) {
    report += `## 🔶 Articles faibles à améliorer (${weak.length})

Ces articles sont publiables mais gagneraient à être enrichis.

`;
    for (const r of weak) {
      report += `### \`${r.filename}\`
**Titre :** ${r.title}  
**Sport :** ${r.sport} | **Catégorie :** ${r.category} | **Mots :** ${r.wordCount}

**Avertissements :**
${r.warnings.map(w => `- ⚠️ ${w}`).join('\n')}

---
`;
    }
  }

  // Articles avec avertissements mineurs
  if (warnings.length > 0) {
    report += `## ⚠️ Articles avec avertissements mineurs (${warnings.length})

`;
    for (const r of warnings) {
      report += `- \`${r.filename}\` — ${r.warnings.join(' | ')}\n`;
    }
    report += '\n---\n\n';
  }

  // Articles OK
  report += `## ✅ Articles conformes (${ok.length})

`;
  for (const r of ok) {
    report += `- \`${r.filename}\` — ${r.wordCount} mots — ${r.sport} / ${r.category}\n`;
  }

  report += `
---

## 🎯 Plan d'action recommandé

1. **Supprimer** tous les articles avec placeholders visibles ([NOM], [DATE], etc.)
2. **Corriger** les frontmatter invalides (mauvaise valeur sport/category)
3. **Enrichir** les articles < 500 mots si le sujet le justifie
4. **Ajouter** un excerpt manquant sur les articles qui n'en ont pas
5. **Surveiller** les nouveaux articles générés via le workflow automatisé

`;

  return report;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('\n══════════════════════════════════════');
  console.log('  FightFocus — Audit des articles');
  console.log('══════════════════════════════════════\n');

  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error(`❌ Dossier articles introuvable : ${ARTICLES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.log('Aucun article trouvé.');
    process.exit(0);
  }

  console.log(`Analyse de ${files.length} articles...\n`);

  const results = files.map(filename => {
    const content = fs.readFileSync(path.join(ARTICLES_DIR, filename), 'utf8');
    const result  = analyzeArticle(filename, content);

    const icon = { 'OK': '✅', 'AVERTISSEMENT': '⚠️', 'FAIBLE': '🔶', 'ERREUR': '❌' }[result.status];
    console.log(`${icon} ${filename}`);
    if (result.issues.length > 0)   result.issues.forEach(i => console.log(`     ❌ ${i}`));
    if (result.warnings.length > 0) result.warnings.forEach(w => console.log(`     ⚠️  ${w}`));

    return result;
  });

  const report = generateReport(results);
  fs.writeFileSync(OUTPUT_FILE, report, 'utf8');

  const errors   = results.filter(r => r.status === 'ERREUR').length;
  const warnings = results.filter(r => r.status !== 'OK' && r.status !== 'ERREUR').length;
  const ok       = results.filter(r => r.status === 'OK').length;

  console.log(`\n══════════════════════════════════════`);
  console.log(`  Résultat : ${ok} OK | ${warnings} avertissements | ${errors} erreurs`);
  console.log(`  Rapport  : ${OUTPUT_FILE}`);
  console.log(`══════════════════════════════════════\n`);
}

main();
