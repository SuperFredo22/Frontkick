// generate-og-png.mjs
// Génère de vrais PNG 1200×630 pour les OG images, sans dépendance externe.
// Utilise uniquement le module natif Node.js zlib pour créer des PNG valides.

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OG_DIR = path.join(__dirname, '../public/images/og');
if (!fs.existsSync(OG_DIR)) fs.mkdirSync(OG_DIR, { recursive: true });

const W = 1200, H = 630;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

// Crée un PNG brut (RGBA) à partir d'un tableau de pixels Uint8Array
function createPNG(pixels) {
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    const table = new Uint32Array(256);
    for (let i=0;i<256;i++){let x=i;for(let j=0;j<8;j++)x=x&1?(0xEDB88320^(x>>>1)):(x>>>1);table[i]=x;}
    for (let i=0;i<buf.length;i++) c=table[(c^buf[i])&0xFF]^(c>>>8);
    return (c^0xFFFFFFFF)>>>0;
  }
  function u32(n){const b=Buffer.alloc(4);b.writeUInt32BE(n,0);return b;}
  function chunk(type, data){
    const t=Buffer.from(type,'ascii');
    const d=Buffer.isBuffer(data)?data:Buffer.from(data);
    const c=crc32(Buffer.concat([t,d]));
    return Buffer.concat([u32(d.length),t,d,u32(c)]);
  }

  // IHDR
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);
  ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0; // 8bit RGB

  // Lignes scanlines (filtre 0)
  const raw=Buffer.alloc(H*(1+W*3));
  for(let y=0;y<H;y++){
    raw[y*(1+W*3)]=0; // filtre None
    for(let x=0;x<W;x++){
      const si=(y*W+x)*4;
      const di=y*(1+W*3)+1+x*3;
      raw[di]=pixels[si];raw[di+1]=pixels[si+1];raw[di+2]=pixels[si+2];
    }
  }
  const idat=chunk('IDAT',zlib.deflateSync(raw,{level:6}));
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
    chunk('IHDR',ihdr),
    idat,
    chunk('IEND',Buffer.alloc(0))
  ]);
}

// Dessine un gradient linéaire diagonal sur un buffer RGBA
function drawGradient(pixels, c1, c2) {
  const [r1,g1,b1]=hexToRgb(c1);
  const [r2,g2,b2]=hexToRgb(c2);
  for(let y=0;y<H;y++) {
    for(let x=0;x<W;x++) {
      const t=(x/W + y/H)/2; // diagonal
      const i=(y*W+x)*4;
      pixels[i]  =Math.round(r1+(r2-r1)*t);
      pixels[i+1]=Math.round(g1+(g2-g1)*t);
      pixels[i+2]=Math.round(b1+(b2-b1)*t);
      pixels[i+3]=255;
    }
  }
}

// Dessine un rectangle plein
function drawRect(pixels, x0, y0, w, h, color, alpha=1) {
  const [r,g,b]=hexToRgb(color);
  for(let y=y0;y<Math.min(y0+h,H);y++){
    for(let x=x0;x<Math.min(x0+w,W);x++){
      const i=(y*W+x)*4;
      pixels[i]  =Math.round(pixels[i]  *(1-alpha)+r*alpha);
      pixels[i+1]=Math.round(pixels[i+1]*(1-alpha)+g*alpha);
      pixels[i+2]=Math.round(pixels[i+2]*(1-alpha)+b*alpha);
    }
  }
}

// Dessine un cercle
function drawCircle(pixels, cx, cy, r, color, alpha=0.06) {
  const [rr,gg,bb]=hexToRgb(color);
  for(let y=Math.max(0,cy-r);y<Math.min(H,cy+r);y++){
    for(let x=Math.max(0,cx-r);x<Math.min(W,cx+r);x++){
      if((x-cx)**2+(y-cy)**2<=r**2){
        const i=(y*W+x)*4;
        pixels[i]  =Math.round(pixels[i]  *(1-alpha)+rr*alpha);
        pixels[i+1]=Math.round(pixels[i+1]*(1-alpha)+gg*alpha);
        pixels[i+2]=Math.round(pixels[i+2]*(1-alpha)+bb*alpha);
      }
    }
  }
}

function generateOgImage(sport, cfg) {
  const pixels = new Uint8Array(W * H * 4);

  // 1. Fond gradient
  drawGradient(pixels, cfg.gradient[0], cfg.gradient[1]);

  // 2. Cercles décoratifs
  drawCircle(pixels, 960, 180, 280, '#ffffff', 0.05);
  drawCircle(pixels, 1080, 480, 180, '#ffffff', 0.03);

  // 3. Bande accent gauche (8px)
  drawRect(pixels, 0, 0, 8, H, cfg.accent, 0.85);

  // 4. Rectangle badge logo (coin haut gauche)
  drawRect(pixels, 60, 50, 50, 50, cfg.accent, 0.9);

  // 5. Barre décorative sous-titre
  drawRect(pixels, 60, 400, 130, 5, cfg.accent, 0.65);

  // 6. Rectangle sombre en bas (zone tagline)
  drawRect(pixels, 0, 560, W, 70, '#000000', 0.25);

  const png = createPNG(pixels);
  const outPath = path.join(OG_DIR, `og-${sport}.png`);
  fs.writeFileSync(outPath, png);
  return outPath;
}

const sports = [
  { key:'mma',        gradient:['#0F172A','#1565C0'], accent:'#38BDF8' },
  { key:'boxe',       gradient:['#7f1d1d','#DC2626'], accent:'#FCA5A5' },
  { key:'kickboxing', gradient:['#064e3b','#10B981'], accent:'#6EE7B7' },
  { key:'muay-thai',  gradient:['#78350f','#F59E0B'], accent:'#FDE68A' },
  { key:'grappling',  gradient:['#1e3a8a','#3B82F6'], accent:'#93C5FD' },
  { key:'karate',     gradient:['#1a1a2e','#e94560'], accent:'#F9A8D4' },
  { key:'sanda',      gradient:['#7c2d12','#ea580c'], accent:'#FED7AA' },
  { key:'lethwei',    gradient:['#1c1917','#78716c'], accent:'#D6D3D1' },
  { key:'savate',     gradient:['#1e3a5f','#2563EB'], accent:'#BFDBFE' },
  { key:'sambo',      gradient:['#1a1a1a','#dc2626'], accent:'#FCA5A5' },
  { key:'k1',         gradient:['#1a1a2e','#7C3AED'], accent:'#C4B5FD' },
  { key:'default',    gradient:['#0F172A','#1e3a8a'], accent:'#38BDF8' },
];

console.log('\n🖼  FightFocus — Génération OG PNG 1200×630\n');
for(const s of sports) {
  const out = generateOgImage(s.key, s);
  const size = (fs.statSync(out).size/1024).toFixed(1);
  console.log(`  ✓ og-${s.key}.png  (${size} KB)`);
}
console.log(`\n✅ ${sports.length} images OG PNG générées dans public/images/og/\n`);
