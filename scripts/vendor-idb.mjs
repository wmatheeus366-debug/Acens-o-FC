/* CRAQUE — vendoriza idb (wrapper Promise sobre IndexedDB) pros múltiplos saves.
   Mesmo princípio de sempre: buscar só em tempo de build, embutir puro, nunca rede em
   tempo de jogo. idb publica um build UMD de arquivo único (`build/umd.js`,
   `window.idb.openDB`/`.deleteDB`), sem precisar de bundler.

   Licença ISC (github.com/jakearchibald/idb).

   Uso:  node scripts/vendor-idb.mjs
   Cache: scripts/.cache/idb-v8.0.3.umd.js (gitignored) — rerodar é de graça.
   Saída: js/vendor/idb.umd.js (window.idb.openDB, window.idb.deleteDB) */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "8.0.3";
const CACHE = path.join(ROOT, "scripts", ".cache", `idb-v${VERSION}.umd.js`);
const OUT = path.join(ROOT, "js", "vendor", "idb.umd.js");
const URL = `https://unpkg.com/idb@${VERSION}/build/umd.js`;

async function main() {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  let code;
  if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 0) {
    code = fs.readFileSync(CACHE, "utf8");
    console.log(`Usando cache: ${CACHE}`);
  } else {
    console.log(`Baixando idb v${VERSION}...`);
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${URL}`);
    code = await res.text();
    if (code.indexOf("openDB") < 0) throw new Error("build baixado não parece conter idb.openDB — revisar script");
    fs.writeFileSync(CACHE, code, "utf8");
  }
  const credit = `/* CRAQUE — idb v${VERSION} vendorizado (wrapper Promise sobre IndexedDB,
   licença ISC). Fonte: https://github.com/jakearchibald/idb · build: ${URL}
   NÃO editar à mão — rerodar scripts/vendor-idb.mjs pra atualizar/reobter.
   window.idb.openDB/deleteDB ficam disponíveis globalmente após este <script>. */\n`;
  fs.writeFileSync(OUT, credit + code, "utf8");
  console.log(`js/vendor/idb.umd.js: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
}

main().catch(function (e) { console.error(e); process.exit(1); });
