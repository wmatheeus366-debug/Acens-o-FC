/* CRAQUE — vendoriza SortableJS (drag-and-drop) pra tela de Tática (escalação).
   Mesmo princípio de sempre: buscar só em tempo de build, embutir puro, nunca rede em
   tempo de jogo. SortableJS publica um build UMD de arquivo único
   (`Sortable.min.js`, `window.Sortable`), sem precisar de bundler.

   Licença MIT (github.com/SortableJS/Sortable).

   Uso:  node scripts/vendor-sortable.mjs
   Cache: scripts/.cache/sortable-v1.15.7.min.js (gitignored) — rerodar é de graça.
   Saída: js/vendor/sortable.min.js (window.Sortable) */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "1.15.7";
const CACHE = path.join(ROOT, "scripts", ".cache", `sortable-v${VERSION}.min.js`);
const OUT = path.join(ROOT, "js", "vendor", "sortable.min.js");
const URL = `https://unpkg.com/sortablejs@${VERSION}/Sortable.min.js`;

async function main() {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  let code;
  if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 0) {
    code = fs.readFileSync(CACHE, "utf8");
    console.log(`Usando cache: ${CACHE}`);
  } else {
    console.log(`Baixando SortableJS v${VERSION}...`);
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${URL}`);
    code = await res.text();
    if (code.indexOf("Sortable") < 0) throw new Error("build baixado não parece conter Sortable — revisar script");
    fs.writeFileSync(CACHE, code, "utf8");
  }
  const credit = `/* CRAQUE — SortableJS v${VERSION} vendorizado (drag-and-drop, licença MIT).
   Fonte: https://github.com/SortableJS/Sortable · build: ${URL}
   NÃO editar à mão — rerodar scripts/vendor-sortable.mjs pra atualizar/reobter.
   window.Sortable fica disponível globalmente após este <script>. */\n`;
  fs.writeFileSync(OUT, credit + code, "utf8");
  console.log(`js/vendor/sortable.min.js: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
}

main().catch(function (e) { console.error(e); process.exit(1); });
