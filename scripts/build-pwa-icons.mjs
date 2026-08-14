/* CRAQUE — gera os ícones PWA (192/512px + maskable) a partir do mesmo "C" vetorial já
   usado no favicon do jogo (index.html) — não baixa nada de fora, só rasteriza (sharp)
   o próprio SVG do projeto num tamanho maior. Referenciados por manifest.json.

   Uso:  node scripts/build-pwa-icons.mjs
   Saída: icons/icon-192.png, icons/icon-512.png, icons/icon-maskable-512.png */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "icons");

// mesmas cores/tipografia do favicon (index.html <link rel="icon">) — "C" itálico bold
// sobre fundo creme, só numa tela maior e com margem de segurança maior pra maskable
function iconSVG(size, maskable) {
  const pad = maskable ? size * 0.2 : size * 0.08; // maskable precisa de mais respiro (zona segura)
  const fontSize = size - pad * 2.2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#f4efe2"/>
    <text x="${size / 2}" y="${size / 2 + fontSize * 0.36}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="900" font-size="${fontSize}" fill="#bf3711">C</text>
  </svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jobs = [
    { file: "icon-192.png", size: 192, maskable: false },
    { file: "icon-512.png", size: 512, maskable: false },
    { file: "icon-maskable-512.png", size: 512, maskable: true }
  ];
  for (const j of jobs) {
    const svg = Buffer.from(iconSVG(j.size, j.maskable));
    await sharp(svg).png().toFile(path.join(OUT_DIR, j.file));
    console.log(`icons/${j.file} (${j.size}x${j.size})`);
  }
}

main().catch(function (e) { console.error(e); process.exit(1); });
