/* CRAQUE — embute os logos reais de competição no próprio jogo (js/comp-logos.js).
   Mesmo princípio já usado pros escudos de clube (embed-crests.mjs): buscar só em tempo
   de build, embutir como data-URI, nunca depender de rede/CDN em tempo de jogo — assim
   funciona offline e não some pra quem usa bloqueador de anúncio.

   Uso:  node scripts/embed-comp-logos.mjs
   Cache: scripts/.cache/comp-logos/{key}.png (gitignored) — rerodar é de graça pra quem
   já baixou. Requer "sharp" (npm install --no-save sharp).

   Saída: js/comp-logos.js  →  CQ.COMP_LOGOS = { compKey: "data:image/webp;base64,..." }
   Competição sem entrada aqui (ID errado, indisponível na API, ou de propósito fora do
   mapa — ver COMP_LOGO_MAP em js/data.js) cai no ícone vetorial (trophyIcon,
   js/ui.js) automaticamente — nunca quebra a tela. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "scripts", ".cache", "comp-logos");
const OUT = path.join(ROOT, "js", "comp-logos.js");

const SIZE = 56;      // maior uso na tela é ~32px (cabeçalho de card); 56 cobre com folga
const QUALITY = 88;   // logos têm bem menos detalhe que foto — qualidade alta pesa pouco

// lê COMP_LOGO_MAP direto de js/data.js (fonte única da verdade, sem duplicar a tabela)
function readLogoMap() {
  const src = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
  const sandbox = { window: {} };
  sandbox.window.CQ = sandbox.CQ = {};
  new Function("window", "CQ", src).call(sandbox, sandbox.window, sandbox.CQ);
  const map = sandbox.window.CQ.DATA.COMP_LOGO_MAP;
  if (!map) throw new Error("COMP_LOGO_MAP não encontrado em js/data.js");
  return map;
}

async function fetchLogo(leagueId) {
  const file = path.join(CACHE, leagueId + ".png");
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return fs.readFileSync(file);
  const res = await fetch(`https://media.api-sports.io/football/leagues/${leagueId}.png`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("resposta suspeita demais pra ser um logo real (" + buf.length + " bytes)");
  fs.writeFileSync(file, buf);
  return buf;
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  const map = readLogoMap();
  const keys = Object.keys(map);
  console.log(`Embutindo ${keys.length} logos de competição (${SIZE}px, webp q${QUALITY})...`);

  const out = {};
  let ok = 0, fail = 0, bytes = 0;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const png = await fetchLogo(map[key]);
      const webp = await sharp(png)
        .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: QUALITY })
        .toBuffer();
      out[key] = "data:image/webp;base64," + webp.toString("base64");
      bytes += webp.length;
      ok++;
    } catch (e) {
      fail++;
      console.warn(`  ! ${key} (liga ${map[key]}): ${e.message} — cai no ícone vetorial (trophyIcon)`);
    }
  }

  const body = Object.keys(out).sort().map(function (k) {
    return `  ${JSON.stringify(k)}: ${JSON.stringify(out[k])}`;
  }).join(",\n");

  const file = `/* CRAQUE — logos reais de competição embutidos (gerado por
   scripts/embed-comp-logos.mjs). NÃO editar à mão. ${ok} logos, ${SIZE}px webp.
   Fonte: media.api-sports.io (API-Football), uso local/pessoal — ver docs/CHANGELOG.md.
   Competição ausente daqui usa o ícone vetorial de troféu (trophyIcon, js/ui.js). */
window.CQ = window.CQ || {};
CQ.COMP_LOGOS = {
${body}
};
`;
  fs.writeFileSync(OUT, file, "utf8");
  console.log(`\njs/comp-logos.js: ${ok} logos, ${fail} falhas`);
  console.log(`  imagens: ${(bytes / 1024).toFixed(0)} KB · arquivo final: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
}

main().catch(function (e) { console.error(e); process.exit(1); });
