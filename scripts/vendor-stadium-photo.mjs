/* CRAQUE — baixa/atualiza js/vendor/stadium-photo.js (foto real de estádio, embutida
   como data-URI base64, usada como pano de fundo discreto atrás do cabeçalho do modo Ao
   Vivo — js/ui.js renderLiveOverlay). Pedido do usuário depois de ver o campo 3D
   procedural: "vamos com 2D, pega em algum site ou repositório" — a imagem em si vem de
   um repositório de verdade (Wikimedia Commons), não é mais desenhada à mão.

   Foto: "Football stadium Za Lužánkami Brno Panorama 2010.jpg", por Petr Šmerkl
   ("Sveter" no Wikimedia Commons), licença CC BY-SA 3.0
   (https://creativecommons.org/licenses/by-sa/3.0/). Página da mídia:
   https://commons.wikimedia.org/wiki/File:Football_stadium_Za_Lu%C5%BE%C3%A1nkami_Brno_Panorama_2010.jpg
   O autor pede crédito como "Petr Šmerkl, Wikipedia" fora da Wikipedia — atribuição
   entra no rodapé da capa do jogo (js/ui.js coverHTML), igual ao já feito pro modelo do
   estádio 3D removido nesta mesma sessão.

   Baixa via Special:FilePath com ?width=1280 (miniatura gerada pela própria Wikimedia —
   o arquivo original tem ~24MB, a miniatura larga e baixa (panorama, ~1280x246) fica em
   ~100KB, tamanho razoável pra embutir). Rodar de novo é seguro — sobrescreve o arquivo.

   Uso:  node scripts/vendor-stadium-photo.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "js", "vendor", "stadium-photo.js");
const FILE = "Football stadium Za Lužánkami Brno Panorama 2010.jpg";
const URL_THUMB = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(FILE)}?width=1280`;

const CREDIT = `/* CRAQUE — foto real de estádio, embutida como data-URI base64 (mesmo espírito de
   js/crests.js/js/vendor/life-scenes.js: busca externa só em tempo de setup via
   scripts/vendor-stadium-photo.mjs, nunca em tempo de execução pro jogador).

   "Football stadium Za Lužánkami Brno Panorama 2010" por Petr Šmerkl ("Sveter"),
   licença CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/), via Wikimedia
   Commons. Atribuição obrigatória — ver docs/CHANGELOG.md e docs/ARCHITECTURE.md, e o
   rodapé da capa do jogo (js/ui.js coverHTML). */
window.CQ = window.CQ || {};
`;

const res = await fetch(URL_THUMB, { headers: { "User-Agent": "CRAQUE-vendor-script/1.0" } });
if (!res.ok) throw new Error(`HTTP ${res.status} baixando ${URL_THUMB}`);
const buf = Buffer.from(await res.arrayBuffer());
if (buf.toString("utf8", 0, 3) !== "\xFF\xD8\xFF" && buf[0] !== 0xff) throw new Error("resposta não parece um JPEG válido");
const b64 = buf.toString("base64");
const js = CREDIT + `CQ.STADIUM_PHOTO = "data:image/jpeg;base64,${b64}";\n`;
if (js.indexOf("</script") >= 0) throw new Error("stadium-photo.js contém \"</script\" literal — quebraria scripts/build.mjs");
fs.writeFileSync(OUT, js, "utf8");
console.log("stadium-photo.js: " + (js.length / 1024).toFixed(0) + " KB (fonte " + (buf.length / 1024).toFixed(0) + " KB)");
console.log("\nLembrete: bump o ?v= de js/vendor/stadium-photo.js em index.html depois de atualizar.");
