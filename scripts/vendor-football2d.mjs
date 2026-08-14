/* CRAQUE — baixa/empacota o desenho de campo em canvas (cyntler/football2d) em
   js/vendor/football2d.js. Pedido do usuário: base visual do football2d — na prática,
   só o desenho do CAMPO é reaproveitável hoje: `startMatch`/`drawBall` do pacote não
   desenham jogador nenhum (parâmetros de time recebidos e nunca lidos) e a bola é só
   um círculo fixo sem posição real — por isso o entry sintético abaixo reexporta só
   `drawField`/`getGameDimensions`, não o pacote inteiro. Jogadores/bola continuam
   sendo os sprites Kenney + as posições reais do footballsim (ver js/pitch.js
   buildPitchCanvas, js/live-sim.js).

   Fonte: https://github.com/cyntler/football2d — TypeScript, "2D Football Engine
   using HTML Canvas", por Damian Cyntler. Licença MIT (LICENSE do repositório).

   Sem build publicado (só existe depois de rodar webpack localmente) — este script
   clona o repo, gera um entry point sintético e empacota com esbuild num único IIFE
   (window.CQ_FOOTBALL2D). O pacote usa o alias de path "@src/*" (tsconfig "paths") —
   resolvido aqui via --alias, já que esbuild não lê tsconfig paths sozinho.

   Requer: git (clone) e esbuild ("npm install --no-save esbuild"). Cache do clone em
   scripts/.cache/football2d-src/ (gitignored) — rerodar é seguro.

   Uso:  node scripts/vendor-football2d.mjs */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, "scripts", ".cache");
const SRC_DIR = path.join(CACHE_DIR, "football2d-src");
const OUT = path.join(ROOT, "js", "vendor", "football2d.js");
const REPO_URL = "https://github.com/cyntler/football2d.git";

fs.mkdirSync(CACHE_DIR, { recursive: true });
if (!fs.existsSync(SRC_DIR)) {
  console.log("Clonando " + REPO_URL + "...");
  execFileSync("git", ["clone", "--depth", "1", REPO_URL, SRC_DIR], { stdio: "inherit" });
} else {
  console.log("Repo já clonado em " + SRC_DIR + " — pull pra atualizar...");
  try { execFileSync("git", ["-C", SRC_DIR, "pull", "--ff-only"], { stdio: "inherit" }); } catch (e) { console.warn("  pull falhou, seguindo com o clone existente: " + e.message); }
}

// entry point sintético — só o desenho de campo (drawField) + o helper de dimensões
// que ele precisa (getGameDimensions) + as constantes de proporção do campo. NÃO
// reexporta startMatch/drawBall (não fazem nada útil pra nós, ver cabeçalho acima).
const entryPath = path.join(SRC_DIR, "_craque_entry.ts");
fs.writeFileSync(entryPath, `export { drawField } from "./src/draw/field/drawField";
export { getGameDimensions } from "./src/utils/getGameDimensions";
export { FIELD_WIDTH, FIELD_HEIGHT, FIELD_MARGIN, FIELD_GOAL_WIDTH } from "./src/constants";
`, "utf8");

const esbuildBin = process.platform === "win32"
  ? path.join(ROOT, "node_modules", "@esbuild", "win32-x64", "esbuild.exe")
  : path.join(ROOT, "node_modules", ".bin", "esbuild");
if (!fs.existsSync(esbuildBin)) throw new Error("esbuild não encontrado (" + esbuildBin + ") — rode: npm install --no-save esbuild");

console.log("Empacotando com esbuild...");
const bundled = execFileSync(esbuildBin, [
  entryPath, "--bundle", "--format=iife", "--global-name=__CQ_F2D__", "--platform=browser", "--target=es2019",
  "--alias:@src=./src"
], { cwd: SRC_DIR, encoding: "utf8", maxBuffer: 1024 * 1024 * 32 });

fs.unlinkSync(entryPath);

if (bundled.indexOf("</script") >= 0) throw new Error("bundle do football2d contém \"</script\" literal — quebraria scripts/build.mjs");

const CREDIT = `/* CRAQUE — desenho de campo em canvas, vendorizado (gerado por
   scripts/vendor-football2d.mjs — NÃO editar à mão). Busca externa só em tempo de
   setup, nunca em tempo de execução pro jogador.

   Fonte: cyntler/football2d (https://github.com/cyntler/football2d), por Damian
   Cyntler. Licença MIT. Só \`drawField\`/\`getGameDimensions\`/constantes de proporção
   são usados aqui — o pacote não desenha jogador/bola (ver cabeçalho do script de
   vendor pro motivo). Consumido só dentro de js/pitch.js (buildPitchCanvas). */
`;
const js = CREDIT + bundled + "\nwindow.CQ_FOOTBALL2D = __CQ_F2D__;\n";
fs.writeFileSync(OUT, js, "utf8");
console.log("\njs/vendor/football2d.js: " + (js.length / 1024).toFixed(0) + " KB");
console.log("Lembrete: bump o ?v= de js/vendor/football2d.js em index.html depois de atualizar.");
