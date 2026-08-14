/* CRAQUE — vendoriza Chart.js pros gráficos de histórico de carreira.
   Mesmo princípio de sempre: buscar só em tempo de build, embutir puro, nunca rede em
   tempo de jogo. Chart.js v4 ainda publica um build UMD de arquivo único
   (`dist/chart.umd.js`, `window.Chart`) que já inclui o Chart.js internamente
   (auto-registro de todos os elementos/escalas/plugins padrão) — sem precisar de
   bundler nem de importar Chart.js + chart.js/auto separadamente.

   Licença MIT (github.com/chartjs/Chart.js).

   Uso:  node scripts/vendor-chartjs.mjs
   Cache: scripts/.cache/chartjs-v4.5.1.umd.js (gitignored) — rerodar é de graça.
   Saída: js/vendor/chart.umd.js (window.Chart) */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "4.5.1";
const CACHE = path.join(ROOT, "scripts", ".cache", `chartjs-v${VERSION}.umd.js`);
const OUT = path.join(ROOT, "js", "vendor", "chart.umd.js");
const URL = `https://unpkg.com/chart.js@${VERSION}/dist/chart.umd.js`;

async function main() {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  let code;
  if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 0) {
    code = fs.readFileSync(CACHE, "utf8");
    console.log(`Usando cache: ${CACHE}`);
  } else {
    console.log(`Baixando Chart.js v${VERSION}...`);
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${URL}`);
    code = await res.text();
    if (code.indexOf("Chart") < 0) throw new Error("build baixado não parece conter Chart.js — revisar script");
    fs.writeFileSync(CACHE, code, "utf8");
  }
  const credit = `/* CRAQUE — Chart.js v${VERSION} (UMD, já com auto-registro de todos os
   elementos/escalas) vendorizado, licença MIT.
   Fonte: https://github.com/chartjs/Chart.js · build: ${URL}
   NÃO editar à mão — rerodar scripts/vendor-chartjs.mjs pra atualizar/reobter.
   window.Chart fica disponível globalmente após este <script>. */\n`;
  fs.writeFileSync(OUT, credit + code, "utf8");
  console.log(`js/vendor/chart.umd.js: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
}

main().catch(function (e) { console.error(e); process.exit(1); });
