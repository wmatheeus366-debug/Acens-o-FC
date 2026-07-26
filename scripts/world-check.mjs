// CRAQUE — World Check
// Diagnóstico manual do mundo persistente (CQ.world): roda N temporadas simuladas
// (motor real, mesmo shim de balance-runner.mjs) e reporta idade/substituições/tamanho.
//
// Uso:  node scripts/world-check.mjs [N]        (N temporadas, padrão 20)
//
// Não altera o jogo: só lê os módulos e roda simulações em memória.

import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const N = parseInt(process.argv[2] || "20", 10);

const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean,
  isNaN, parseInt, parseFloat, RegExp, Error, encodeURIComponent
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["util", "data", "world", "engine", "narrative"]) {
  const code = fs.readFileSync(path.join(root, "js", f + ".js"), "utf8");
  vm.runInContext(code, ctx, { filename: "js/" + f + ".js" });
}
ctx.CQ.state = { game: null };
const CQ = ctx.CQ;
const E = CQ.engine, D = CQ.DATA;

console.log("World check: " + N + " temporadas simuladas...");
const t0 = Date.now();

const g = E.newGame({
  name: "World Check", age: 18, foot: "Destro", num: 9, natId: "BR",
  pos: "ATA", archId: D.POSITIONS.ATA.archs[0].id, legendIds: [], clubId: "fla"
});

const clubCount = Object.keys(g.world.clubs).length;
const initialSize = JSON.stringify(g.world).length;
console.log("clubes no mundo: " + clubCount + " | tamanho inicial de g.world: " + (initialSize / 1024).toFixed(1) + " KB");

function ageHistogram(g) {
  const buckets = {};
  Object.keys(g.world.clubs).forEach(function (cid) {
    g.world.clubs[cid].roster.forEach(function (pl) {
      const b = Math.floor(pl.age / 5) * 5;
      buckets[b] = (buckets[b] || 0) + 1;
    });
  });
  return buckets;
}
const histBefore = ageHistogram(g);

let guard = 0, seasons = 0;
while (guard++ < N) {
  let n = 0;
  while (E.currentFixture(g) && n++ < 160) E.applyMatch(g, E.resolveMatch(g, E.currentFixture(g), {}));
  const hadPending = !!g.pendingSummary;
  const sum = g.pendingSummary || E.endSeason(g);
  if (!hadPending) seasons++;
  if (sum.retiring) break;
  if (sum.offers) {
    if (sum.offers.renew) E.acceptRenew(g, sum.offers.renew);
    else if (sum.offers.list && sum.offers.list[0]) E.acceptOffer(g, sum.offers.list[0]);
  }
  E.nextSeason(g);
}

let totalPlayers = 0, totalReal = 0, totalReplaced = 0;
Object.keys(g.world.clubs).forEach(function (cid) {
  g.world.clubs[cid].roster.forEach(function (pl) {
    totalPlayers++;
    if (pl.real) totalReal++; else totalReplaced++;
  });
});
const histAfter = ageHistogram(g);
const finalSize = JSON.stringify(g.world).length;

console.log("\ntemporadas de fato avançadas: " + seasons);
console.log("total de jogadores no mundo: " + totalPlayers);
console.log("ainda reais (REAL_SQUADS): " + totalReal + " (" + (totalReal / totalPlayers * 100).toFixed(1) + "%)");
console.log("já substituídos (aposentaram e foram repostos): " + totalReplaced + " (" + (totalReplaced / totalPlayers * 100).toFixed(1) + "%)");

console.log("\ndistribuição de idade ANTES (faixas de 5 anos):");
Object.keys(histBefore).sort((a, b) => a - b).forEach((b) => console.log("  " + b + "-" + (+b + 4) + ": " + histBefore[b]));
console.log("\ndistribuição de idade DEPOIS de " + seasons + " temporadas:");
Object.keys(histAfter).sort((a, b) => a - b).forEach((b) => console.log("  " + b + "-" + (+b + 4) + ": " + histAfter[b]));

console.log("\ntamanho de g.world: " + (initialSize / 1024).toFixed(1) + " KB → " + (finalSize / 1024).toFixed(1) + " KB");
console.log("\nOK (" + ((Date.now() - t0) / 1000).toFixed(1) + "s)");
