/* CRAQUE — baixa/empacota o motor de simulação real (eozgit/footballsim) em
   js/vendor/footballsim.js. Pedido do usuário: "lógica e inteligência" real decidindo
   a partida assistida ao vivo, no lugar do sorteio estatístico puro — só nessa tela
   (ver plano de implementação / docs/ARCHITECTURE.md pro desenho completo).

   Fonte: https://github.com/eozgit/footballsim — TypeScript, "high-performance,
   headless football simulation engine", fork modernizado do footballSimulationEngine
   original (Aiden Gallagher, 2018). Licença: o arquivo LICENSE do repo é MIT
   (Copyright (c) 2018 Aiden Gallagher) — o package.json do fork diz "ISC" por engano,
   mas o texto do LICENSE é quem manda; qualquer uma das duas é permissiva o bastante
   pra uso livre aqui.

   O pacote não publica build pronto pro navegador (só "npm install" + bundler de quem
   consome) — este script clona o repo, gera um entry point sintético reexportando
   initiateGame/playIteration/startSecondHalf (API pública) + setMatchSeed (função
   determinística de js/lib/common.ts, não reexportada pelo pacote em si — necessária
   pro projeto manter seu invariante de determinismo por seed), e empacota tudo com
   esbuild num único IIFE (window.CQ_FOOTBALLSIM).

   Requer: git (clone) e esbuild (node_modules/.bin/esbuild — "npm install --no-save
   esbuild"). Cache do clone em scripts/.cache/footballsim-src/ (gitignored) — rerodar
   é seguro, só atualiza o clone e regera o arquivo.

   Uso:  node scripts/vendor-footballsim.mjs */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, "scripts", ".cache");
const SRC_DIR = path.join(CACHE_DIR, "footballsim-src");
const OUT = path.join(ROOT, "js", "vendor", "footballsim.js");
const REPO_URL = "https://github.com/eozgit/footballsim.git";

fs.mkdirSync(CACHE_DIR, { recursive: true });
if (!fs.existsSync(SRC_DIR)) {
  console.log("Clonando " + REPO_URL + "...");
  execFileSync("git", ["clone", "--depth", "1", REPO_URL, SRC_DIR], { stdio: "inherit" });
} else {
  console.log("Repo já clonado em " + SRC_DIR + " — pull pra atualizar...");
  try { execFileSync("git", ["-C", SRC_DIR, "pull", "--ff-only"], { stdio: "inherit" }); } catch (e) { console.warn("  pull falhou, seguindo com o clone existente: " + e.message); }
}

// entry point sintético — reexporta a API pública (engine.ts) + setMatchSeed (lib/
// common.ts, usado só internamente pelo pacote, mas essencial pra determinismo aqui)
const entryPath = path.join(SRC_DIR, "_craque_entry.ts");
fs.writeFileSync(entryPath, `export { initiateGame, playIteration, startSecondHalf } from "./src/engine.js";
export { setMatchSeed } from "./src/lib/common.js";
`, "utf8");

// no Windows, o wrapper .cmd em node_modules/.bin dá EINVAL via execFileSync sem
// shell:true — chama o binário nativo da plataforma direto, evita a casca.
const esbuildBin = process.platform === "win32"
  ? path.join(ROOT, "node_modules", "@esbuild", "win32-x64", "esbuild.exe")
  : path.join(ROOT, "node_modules", ".bin", "esbuild");
if (!fs.existsSync(esbuildBin)) throw new Error("esbuild não encontrado (" + esbuildBin + ") — rode: npm install --no-save esbuild");

console.log("Empacotando com esbuild...");
const bundled = execFileSync(esbuildBin, [
  entryPath, "--bundle", "--format=iife", "--global-name=__CQ_FS__", "--platform=browser", "--target=es2019"
], { cwd: SRC_DIR, encoding: "utf8", maxBuffer: 1024 * 1024 * 32 });

fs.unlinkSync(entryPath); // limpa o entry sintético do clone (não é do repo original)

if (bundled.indexOf("</script") >= 0) throw new Error("bundle do footballsim contém \"</script\" literal — quebraria scripts/build.mjs");

const CREDIT = `/* CRAQUE — motor de simulação de partida real, vendorizado (gerado por
   scripts/vendor-footballsim.mjs — NÃO editar à mão). Busca externa só em tempo de
   setup, nunca em tempo de execução pro jogador (mesmo princípio de js/crests.js e
   dos outros arquivos em js/vendor/).

   Fonte: eozgit/footballsim (https://github.com/eozgit/footballsim), fork modernizado
   do footballSimulationEngine original por Aiden Gallagher (2018). Licença MIT (ver
   LICENSE do repositório original). Consumido só dentro de js/live-sim.js, só quando
   o jogador assiste uma partida decisiva/mata-mata ao vivo — nunca no resto do jogo.

   Guardado como STRING (não executado aqui) — js/live-sim.js usa esse texto pra
   montar um Web Worker (via Blob) e rodar a simulação fora da thread principal. Medido
   na prática (ver docs/ARCHITECTURE.md): ~1.9ms/iteração, ~10s pra uma partida
   completa — rodar isso bloqueando a tela travaria o navegador; num Worker roda em
   segundo plano sem travar nada. */
`;
// o bundle do esbuild já é um IIFE de escopo próprio (var __CQ_FS__ = (()=>{...})();)
// — funciona igual dentro de um Worker (self) ou na thread principal (window), sem
// precisar mudar nada nele. Só a ATRIBUIÇÃO final do global precisa ser agnóstica de
// ambiente (window não existe dentro de um Worker).
const withGlobalAssign = bundled + "\n(typeof window !== \"undefined\" ? window : self).CQ_FOOTBALLSIM = __CQ_FS__;\n";
const js = CREDIT + "window.CQ_FOOTBALLSIM_SRC = " + JSON.stringify(withGlobalAssign) + ";\n";
fs.writeFileSync(OUT, js, "utf8");
console.log("\njs/vendor/footballsim.js: " + (js.length / 1024).toFixed(0) + " KB");
console.log("Lembrete: bump o ?v= de js/vendor/footballsim.js em index.html depois de atualizar.");
