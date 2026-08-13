/* CRAQUE — baixa/atualiza js/vendor/player-sprites.js (marcadores de jogador + bola do
   campo 2D animado, js/pitch.js). Substitui os círculos SVG lisos (que ficavam ilegíveis
   quando o clube tem cor próxima do verde do gramado, e cujo padrão listrado/diagonal
   nunca aparecia direito num círculo tão pequeno — o tile do <pattern> era maior que o
   próprio marcador). Pedido do usuário: "pega [os bonecos] de algum repositório" em vez
   de continuar desenhando forma geométrica na mão.

   Fonte: Kenney "Sports Pack" (https://kenney.nl/assets/sports-pack), licença CC0 1.0
   (https://creativecommons.org/publicdomain/zero/1.0/) — uso livre, sem exigir
   atribuição. 4 cores de "cabeça vista de cima" (Spritesheet/sheet_characters.png) +
   1 sprite de bola (Spritesheet/sheet_charactersEquipment.png).

   Cores escolhidas: Azul/Vermelho/Branco/"Special" (dourado) — a 5ª cor do pacote
   (Verde) é deliberadamente NUNCA usada aqui, porque some contra o gramado (o motivo
   original deste script existir). js/pitch.js escolhe a cor mais próxima da cor real
   de cada clube dentro dessas 4, nunca a verde.

   Requer: "sharp" (já usado por scripts/embed-crests.mjs) e o utilitário de linha de
   comando "unzip" (presente por padrão no Git Bash/Linux/macOS).

   Uso:  node scripts/vendor-player-sprites.mjs */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "scripts", ".cache", "sports-pack");
const OUT = path.join(ROOT, "js", "vendor", "player-sprites.js");
const ZIP_URL = "https://kenney.nl/media/pages/assets/sports-pack/ede5629412-1677693282/kenney_sports-pack.zip";

fs.mkdirSync(CACHE, { recursive: true });
const zipPath = path.join(CACHE, "sports-pack.zip");
if (!fs.existsSync(zipPath)) {
  console.log("Baixando " + ZIP_URL + "...");
  const res = await fetch(ZIP_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} baixando o pacote`);
  fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
}

const extractDir = path.join(CACHE, "extracted");
fs.mkdirSync(extractDir, { recursive: true });
execFileSync("unzip", ["-o", "-j", zipPath,
  "Spritesheet/sheet_characters.png", "Spritesheet/sheet_charactersEquipment.png",
  "-d", extractDir]);

const charSheet = path.join(extractDir, "sheet_characters.png");
const equipSheet = path.join(extractDir, "sheet_charactersEquipment.png");

// coordenadas conferidas manualmente no XML do pacote (Spritesheet/sheet_characters.xml
// / sheet_charactersEquipment.xml) — cada cor tem seu bloco de frames num offset
// diferente da textura; a linha y=93 é a pose "cabeça de frente" (a mais legível como
// marcador, testada visualmente contra as outras poses do pacote antes de escolher).
const PLAYER_FRAMES = {
  blue: [0, 93], red: [147, 93], white: [84, 93], special: [126, 93]
};
const BALL_FRAME = [198, 36]; // ball_soccer2.png — bola clássica preto/branco

async function cropToDataURI(sheet, x, y, w, h, scale) {
  const buf = await sharp(sheet)
    .extract({ left: x, top: y, width: w, height: h })
    .resize(w * scale, h * scale, { kernel: "nearest" }) // nearest: mantém o traço pixel-art nítido
    .png({ compressionLevel: 9 })
    .toBuffer();
  return "data:image/png;base64," + buf.toString("base64");
}

const entries = [];
for (const [key, [x, y]] of Object.entries(PLAYER_FRAMES)) {
  const uri = await cropToDataURI(charSheet, x, y, 21, 31, 4);
  entries.push(`  ${key}: ${JSON.stringify(uri)}`);
  console.log(key + ": " + (uri.length / 1024).toFixed(1) + " KB");
}
const ballUri = await cropToDataURI(equipSheet, BALL_FRAME[0], BALL_FRAME[1], 18, 18, 4);
entries.push(`  ball: ${JSON.stringify(ballUri)}`);
console.log("ball: " + (ballUri.length / 1024).toFixed(1) + " KB");

const CREDIT = `/* CRAQUE — marcadores de jogador + bola do campo 2D animado, embutidos como data-URI
   base64 (mesmo espírito de js/crests.js: busca externa só em tempo de setup via
   scripts/vendor-player-sprites.mjs, nunca em tempo de execução pro jogador).

   Kenney "Sports Pack" (https://kenney.nl/assets/sports-pack), licença CC0 1.0 — uso
   livre, sem exigir atribuição. 4 cores de cabeça vista de cima + 1 bola. A 5ª cor do
   pacote (verde) é deliberadamente omitida aqui — some contra o gramado do campo. */
window.CQ = window.CQ || {};
`;
const js = CREDIT + `CQ.PLAYER_SPRITES = {\n${entries.join(",\n")}\n};\n`;
if (js.indexOf("</script") >= 0) throw new Error("player-sprites.js contém \"</script\" literal — quebraria scripts/build.mjs");
fs.writeFileSync(OUT, js, "utf8");
console.log("\nplayer-sprites.js: " + (js.length / 1024).toFixed(0) + " KB total");
console.log("Lembrete: bump o ?v= de js/vendor/player-sprites.js em index.html depois de atualizar.");
