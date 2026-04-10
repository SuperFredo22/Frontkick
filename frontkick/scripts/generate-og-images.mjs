// generate-og-images.mjs
// FightFocus — Génération des images Open Graph par sport (1200×630)
// Crée des SVG haute qualité pour le partage social, stockés dans public/images/og/
// Convertissez-les en PNG si nécessaire avec : npx sharp-cli ou ImageMagick

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OG_DIR = path.join(__dirname, '../public/images/og');

const sports = {
  mma: {
    label: 'MMA',
    subtitle: 'Mixed Martial Arts',
    gradient: ['#0F172A', '#1E88E5'],
    accent: '#38BDF8',
    icon: '🥊',
  },
  boxe: {
    label: 'Boxe Anglaise',
    subtitle: 'Technique · Entraînement · Analyse',
    gradient: ['#7f1d1d', '#DC2626'],
    accent: '#FCA5A5',
    icon: '🥊',
  },
  kickboxing: {
    label: 'Kickboxing',
    subtitle: 'Full Contact · Low Kick · K-1',
    gradient: ['#064e3b', '#10B981'],
    accent: '#6EE7B7',
    icon: '🦵',
  },
  'muay-thai': {
    label: 'Muay Thaï',
    subtitle: "L'Art des 8 Membres",
    gradient: ['#78350f', '#F59E0B'],
    accent: '#FDE68A',
    icon: '🦵',
  },
  grappling: {
    label: 'Grappling',
    subtitle: 'BJJ · Judo · Wrestling',
    gradient: ['#1e3a8a', '#3B82F6'],
    accent: '#93C5FD',
    icon: '🤼',
  },
  karate: {
    label: 'Karaté',
    subtitle: 'Kata · Kumite · Philosophie',
    gradient: ['#1a1a2e', '#e94560'],
    accent: '#F9A8D4',
    icon: '🥋',
  },
  sanda: {
    label: 'Sanda',
    subtitle: 'Wushu de Combat · Chine',
    gradient: ['#7c2d12', '#ea580c'],
    accent: '#FED7AA',
    icon: '🐉',
  },
  lethwei: {
    label: 'Lethwei',
    subtitle: 'Art Martial Birman',
    gradient: ['#1c1917', '#78716c'],
    accent: '#D6D3D1',
    icon: '💀',
  },
  savate: {
    label: 'Savate',
    subtitle: 'Boxe Française',
    gradient: ['#1e3a5f', '#2563EB'],
    accent: '#BFDBFE',
    icon: '🇫🇷',
  },
  sambo: {
    label: 'Sambo',
    subtitle: 'Art Martial Russe',
    gradient: ['#1a1a1a', '#dc2626'],
    accent: '#FCA5A5',
    icon: '🇷🇺',
  },
  k1: {
    label: 'K-1 / Glory',
    subtitle: 'Kickboxing Debout · Mondial',
    gradient: ['#1a1a2e', '#7C3AED'],
    accent: '#C4B5FD',
    icon: '⚡',
  },
};

function generateOgSvg(sport, data) {
  const [c1, c2] = data.gradient;
  const gradId = `g${sport.replace(/[^a-z]/g, '')}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>

  <!-- Fond dégradé -->
  <rect width="1200" height="630" fill="url(#${gradId})"/>

  <!-- Motif géométrique discret -->
  <circle cx="950" cy="120" r="320" fill="white" fill-opacity="0.04"/>
  <circle cx="1050" cy="400" r="200" fill="white" fill-opacity="0.03"/>
  <circle cx="200" cy="520" r="150" fill="white" fill-opacity="0.025"/>

  <!-- Bande accent gauche -->
  <rect x="0" y="0" width="8" height="630" fill="${data.accent}" opacity="0.8"/>

  <!-- Logo FightFocus -->
  <rect x="60" y="52" width="48" height="48" rx="10" fill="${data.accent}" opacity="0.9"/>
  <text x="84" y="83" font-family="Arial Black, sans-serif" font-size="22" font-weight="900" fill="${c1}" text-anchor="middle">FF</text>
  <text x="124" y="82" font-family="Arial Black, sans-serif" font-size="24" font-weight="900" fill="white" letter-spacing="1">Fight<tspan fill="${data.accent}">Focus</tspan></text>

  <!-- Icône sport (grand) -->
  <text x="950" y="380" font-size="220" text-anchor="middle" opacity="0.15">${data.icon}</text>

  <!-- Titre sport -->
  <text x="60" y="300" font-family="Arial Black, Impact, sans-serif" font-size="96" font-weight="900" fill="white" letter-spacing="-1" opacity="0.97">${data.label}</text>

  <!-- Sous-titre -->
  <text x="60" y="360" font-family="Arial, sans-serif" font-size="32" fill="${data.accent}" opacity="0.85">${data.subtitle}</text>

  <!-- Tagline -->
  <text x="60" y="540" font-family="Arial, sans-serif" font-size="22" fill="white" opacity="0.55">fightfocus.fr · Guides, Analyses &amp; Techniques</text>

  <!-- Ligne décorative -->
  <rect x="60" y="395" width="120" height="4" rx="2" fill="${data.accent}" opacity="0.6"/>
</svg>`;
}

if (!fs.existsSync(OG_DIR)) fs.mkdirSync(OG_DIR, { recursive: true });

let count = 0;
for (const [sport, data] of Object.entries(sports)) {
  const svg = generateOgSvg(sport, data);
  const svgPath = path.join(OG_DIR, `og-${sport}.svg`);
  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log(`  ✓ og-${sport}.svg`);
  count++;
}

// OG par défaut
const defaultSvg = generateOgSvg('default', {
  label: 'FightFocus',
  subtitle: 'Le média des sports de combat',
  gradient: ['#0F172A', '#1e3a8a'],
  accent: '#38BDF8',
  icon: '🥊',
});
fs.writeFileSync(path.join(OG_DIR, 'og-default.svg'), defaultSvg, 'utf8');
console.log(`  ✓ og-default.svg`);

console.log(`\n✅ ${count + 1} images OG générées dans public/images/og/`);
console.log(`\nNOTE: Ces fichiers SVG sont utilisés directement comme images OG.`);
console.log(`Les réseaux sociaux (Facebook, Twitter) acceptent les SVG pour l'aperçu.`);
console.log(`Pour des PNG, utilisez : npx @squoosh/cli --webp public/images/og/*.svg\n`);
