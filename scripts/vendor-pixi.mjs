/* CRAQUE — vendoriza PixiJS (motor 2D via WebGL) pro modo Ao Vivo.
   Motivo: pedido explícito do usuário pra trocar o renderizador "bolinhas coloridas
   em <canvas> 2D cru" (js/pitch.js buildPitchCanvas) por um motor de verdade — sprites
   reais interpolados suavemente, em vez de só copiar pixel a cada frame.

   PixiJS v8+ só publica ESM (sem build UMD de arquivo único) — por isso a versão
   travada aqui é a 7.4.3, a última major com `dist/pixi.min.js` pronto pra <script>
   simples (mesmo motivo de three.js ter ficado travado em r140 nesta mesma base de
   código). Licença MIT (github.com/pixijs/pixijs).

   Uso:  node scripts/vendor-pixi.mjs
   Cache: scripts/.cache/pixi-v7.4.3.min.js (gitignored) — rerodar é de graça.
   Saída: js/vendor/pixi.min.js (window.PIXI = {...}) */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "7.4.3";
const CACHE = path.join(ROOT, "scripts", ".cache", `pixi-v${VERSION}.min.js`);
const OUT = path.join(ROOT, "js", "vendor", "pixi.min.js");
const URL = `https://unpkg.com/pixi.js@${VERSION}/dist/pixi.min.js`;

async function main() {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  let code;
  if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 0) {
    code = fs.readFileSync(CACHE, "utf8");
    console.log(`Usando cache: ${CACHE}`);
  } else {
    console.log(`Baixando PixiJS v${VERSION}...`);
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${URL}`);
    code = await res.text();
    if (code.indexOf("var PIXI=function") < 0 && code.indexOf("var PIXI = function") < 0) {
      throw new Error("build baixado não parece definir `var PIXI = ...` — versão/formato mudou, revisar script");
    }
    fs.writeFileSync(CACHE, code, "utf8");
  }
  const credit = `/* CRAQUE — PixiJS v${VERSION} vendorizado (motor 2D via WebGL, licença MIT).
   Fonte: https://github.com/pixijs/pixijs · build: ${URL}
   NÃO editar à mão — rerodar scripts/vendor-pixi.mjs pra atualizar/reobter.
   window.PIXI fica disponível globalmente após este <script>. */\n`;
  fs.writeFileSync(OUT, credit + code, "utf8");
  console.log(`js/vendor/pixi.min.js: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
}

main().catch(function (e) { console.error(e); process.exit(1); });
