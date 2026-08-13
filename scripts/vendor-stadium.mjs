/* CRAQUE — baixa/atualiza js/vendor/stadium-model.js (modelo 3D do estádio, embutido
   como base64). "Football stadium" por Poly by Google, licença CC-BY 3.0
   (https://creativecommons.org/licenses/by/3.0/) — arquivo original do extinto Google
   Poly, espelhado em poly.pizza (poly.pizza/m/6TZCkGh76m5). Rodar de novo é seguro —
   sobrescreve o arquivo.

   Por que embutido em vez de servido à parte: o jogo distribui como um único
   CRAQUE.html autossuficiente (scripts/build.mjs) — um .glb solto quebraria isso,
   então vira base64 dentro de um .js comum, igual js/crests.js já faz pras imagens
   dos escudos.

   Uso:  node scripts/vendor-stadium.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "js", "vendor", "stadium-model.js");

const URL_GLB = "https://static.poly.pizza/c64ea3bf-399e-4e55-ab07-497e0457e699.glb.br";
const CREDIT = `/* CRAQUE — modelo 3D do estádio, embutido como base64 (mesmo espírito de js/crests.js:
   busca externa só em tempo de setup via scripts/vendor-stadium.mjs, nunca em tempo de
   execução pro jogador — js/pitch3d.js decodifica isso com GLTFLoader.parse()).

   "Football stadium" por Poly by Google, licença CC-BY 3.0
   (https://creativecommons.org/licenses/by/3.0/), baixado via poly.pizza (espelho
   público do antigo Google Poly, poly.pizza/m/6TZCkGh76m5). Atribuição obrigatória —
   ver docs/CHANGELOG.md e docs/ARCHITECTURE.md. */\n`;

const res = await fetch(URL_GLB);
if (!res.ok) throw new Error(`HTTP ${res.status} baixando ${URL_GLB}`);
const buf = Buffer.from(await res.arrayBuffer());
// confere que é mesmo um glTF binário (assinatura "glTF" nos 4 primeiros bytes) antes
// de embutir qualquer coisa — evita comitar uma página de erro em HTML por engano
if (buf.toString("utf8", 0, 4) !== "glTF") throw new Error("resposta não é um .glb válido (assinatura ausente)");

const b64 = buf.toString("base64");
const js = CREDIT + `window.CQ = window.CQ || {};\nCQ.STADIUM_GLB_B64 = "${b64}";\n`;
if (js.indexOf("</script") >= 0) throw new Error("stadium-model.js contém \"</script\" literal — quebraria scripts/build.mjs");
fs.writeFileSync(OUT, js, "utf8");
console.log("stadium-model.js: " + (js.length / 1024).toFixed(0) + " KB (fonte binária " + (buf.length / 1024).toFixed(0) + " KB)");
console.log("\nLembrete: bump o ?v= de js/vendor/stadium-model.js em index.html depois de atualizar.");
