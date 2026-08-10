/* CRAQUE — embute os escudos reais no próprio jogo (js/crests.js).
   Motivo: a imagem vinda da rede (media.api-sports.io) some pra quem usa bloqueador de
   anúncio com filtro cosmético, e o jogo cai no brasão vetorial. Embutido, o escudo real
   aparece sempre — sem rede, sem bloqueador, sem CDN.

   Uso:  node scripts/embed-crests.mjs
   Cache: scripts/.cache/crests/{teamId}.png (gitignored) — rerodar é de graça pra quem
   já baixou. Requer "sharp" (npm install --no-save sharp).

   Saída: js/crests.js  →  CQ.CRESTS = { clubId: "data:image/webp;base64,..." } */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "scripts", ".cache", "crests");
const OUT = path.join(ROOT, "js", "crests.js");

const SIZE = 64;      // maior uso na tela é 62px (banner de jogo); 64 cobre com folga
const QUALITY = 82;   // acima disso o ganho visual some e o arquivo cresce rápido

// lê CREST_MAP direto de js/data.js (fonte única da verdade, sem duplicar a tabela aqui)
function readCrestMap() {
  const src = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
  const sandbox = { window: {} };
  sandbox.window.CQ = sandbox.CQ = {};
  new Function("window", "CQ", src).call(sandbox, sandbox.window, sandbox.CQ);
  const map = sandbox.window.CQ.DATA.CREST_MAP;
  if (!map) throw new Error("CREST_MAP não encontrado em js/data.js");
  return map;
}

async function fetchCrest(teamId) {
  const file = path.join(CACHE, teamId + ".png");
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return fs.readFileSync(file);
  const res = await fetch(`https://media.api-sports.io/football/teams/${teamId}.png`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  return buf;
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  const map = readCrestMap();
  const ids = Object.keys(map);
  console.log(`Embutindo ${ids.length} escudos (${SIZE}px, webp q${QUALITY})...`);

  const out = {};
  let ok = 0, fail = 0, bytes = 0;
  for (let i = 0; i < ids.length; i++) {
    const clubId = ids[i];
    try {
      const png = await fetchCrest(map[clubId]);
      const webp = await sharp(png)
        .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: QUALITY })
        .toBuffer();
      out[clubId] = "data:image/webp;base64," + webp.toString("base64");
      bytes += webp.length;
      ok++;
    } catch (e) {
      fail++;
      console.warn(`  ! ${clubId} (team ${map[clubId]}): ${e.message} — segue com o brasão vetorial`);
    }
    if ((i + 1) % 40 === 0) console.log(`  ${i + 1}/${ids.length}...`);
  }

  const body = Object.keys(out).sort().map(function (k) {
    return `  ${JSON.stringify(k)}: ${JSON.stringify(out[k])}`;
  }).join(",\n");

  const file = `/* CRAQUE — escudos reais embutidos (gerado por scripts/embed-crests.mjs).
   NÃO editar à mão. ${ok} escudos, ${SIZE}px webp. Embutir remove a dependência de rede:
   o escudo real aparece mesmo com bloqueador de anúncio ou sem internet. */
window.CQ = window.CQ || {};
CQ.CRESTS = {
${body}
};
`;
  fs.writeFileSync(OUT, file, "utf8");
  console.log(`\njs/crests.js: ${ok} escudos, ${fail} falhas`);
  console.log(`  imagens: ${(bytes / 1024).toFixed(0)} KB · arquivo final: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
}

main().catch(function (e) { console.error(e); process.exit(1); });
