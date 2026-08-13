/* CRAQUE — baixa/atualiza js/vendor/three.min.js, OrbitControls.js e GLTFLoader.js.
   three.js r140 é a última versão que ainda publica um build UMD clássico
   (build/three.min.js) e addons não-módulo (examples/js/controls/OrbitControls.js,
   examples/js/loaders/GLTFLoader.js) — versões mais novas migraram pra ES modules,
   incompatível com o jeito que scripts/build.mjs concatena os arquivos do jogo (script
   comum, sem import/export). Rodar de novo é seguro — sobrescreve os 3 arquivos.
   (O modelo 3D do estádio em si é um asset separado — ver scripts/vendor-stadium.mjs.)

   Uso:  node scripts/vendor-three.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "js", "vendor");
fs.mkdirSync(OUT_DIR, { recursive: true });

const VERSION = "0.140.0";
const FILES = [
  { url: `https://unpkg.com/three@${VERSION}/build/three.min.js`, out: "three.min.js",
    note: `/* CRAQUE — three.js r${VERSION} (build UMD clássico, MIT), vendorizado pra rodar como <script>\n   comum igual a todo arquivo do jogo — não editar à mão, baixado de unpkg.com/three@${VERSION}.\n   Ver scripts/vendor-three.mjs pra rebaixar/atualizar. */\n` },
  { url: `https://unpkg.com/three@${VERSION}/examples/js/controls/OrbitControls.js`, out: "OrbitControls.js",
    note: `/* CRAQUE — OrbitControls do three.js r${VERSION} (examples/js/controls, MIT), vendorizado junto\n   com three.min.js — controla a câmera do campo 3D (arrastar gira, scroll dá zoom). */\n` },
  { url: `https://unpkg.com/three@${VERSION}/examples/js/loaders/GLTFLoader.js`, out: "GLTFLoader.js",
    note: `/* CRAQUE — GLTFLoader do three.js r${VERSION} (examples/js/loaders, MIT), vendorizado junto\n   com three.min.js/OrbitControls.js — carrega o modelo do estádio (js/vendor/stadium-\n   model.js) a partir de bytes já embutidos no jogo, nunca de rede. */\n` }
];

for (const f of FILES) {
  const res = await fetch(f.url);
  if (!res.ok) throw new Error(`HTTP ${res.status} baixando ${f.url}`);
  const body = await res.text();
  if (body.indexOf("</script") >= 0) throw new Error(`${f.out} contém "</script" literal — quebraria scripts/build.mjs`);
  fs.writeFileSync(path.join(OUT_DIR, f.out), f.note + body, "utf8");
  console.log(f.out + ": " + (body.length / 1024).toFixed(0) + " KB");
}
console.log("\nLembrete: bump o ?v= de js/vendor/three.min.js e OrbitControls.js em index.html depois de atualizar.");
