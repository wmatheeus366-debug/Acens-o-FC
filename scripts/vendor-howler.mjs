/* CRAQUE — vendoriza Howler.js (biblioteca de áudio) pro ambiente do estádio.
   Mesmo princípio de sempre: buscar só em tempo de build, embutir puro, nunca rede em
   tempo de jogo. Howler continua publicando um build UMD de arquivo único
   (`dist/howler.min.js`, `window.Howl`/`window.Howler`), sem precisar de bundler —
   diferente de PixiJS/three.js, não teve que travar versão antiga por isso.

   Licença MIT (github.com/goldfire/howler.js).

   Uso:  node scripts/vendor-howler.mjs
   Cache: scripts/.cache/howler-v2.2.4.min.js (gitignored) — rerodar é de graça.
   Saída: js/vendor/howler.min.js (window.Howl, window.Howler) */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "2.2.4";
const CACHE = path.join(ROOT, "scripts", ".cache", `howler-v${VERSION}.min.js`);
const OUT = path.join(ROOT, "js", "vendor", "howler.min.js");
const URL = `https://unpkg.com/howler@${VERSION}/dist/howler.min.js`;

async function main() {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  let code;
  if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 0) {
    code = fs.readFileSync(CACHE, "utf8");
    console.log(`Usando cache: ${CACHE}`);
  } else {
    console.log(`Baixando Howler.js v${VERSION}...`);
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${URL}`);
    code = await res.text();
    if (code.indexOf("Howler") < 0) throw new Error("build baixado não parece conter Howler — revisar script");
    fs.writeFileSync(CACHE, code, "utf8");
  }
  const credit = `/* CRAQUE — Howler.js v${VERSION} vendorizado (biblioteca de áudio, licença MIT).
   Fonte: https://github.com/goldfire/howler.js · build: ${URL}
   NÃO editar à mão — rerodar scripts/vendor-howler.mjs pra atualizar/reobter.
   window.Howl/window.Howler ficam disponíveis globalmente após este <script>. */\n`;
  fs.writeFileSync(OUT, credit + code, "utf8");
  console.log(`js/vendor/howler.min.js: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
}

main().catch(function (e) { console.error(e); process.exit(1); });
