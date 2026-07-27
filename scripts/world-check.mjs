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
for (const f of ["util", "data", "world", "engine", "market", "narrative"]) {
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
const initialRosterSizes = {};
Object.keys(g.world.clubs).forEach(function (cid) { initialRosterSizes[cid] = g.world.clubs[cid].roster.length; });

// intercepta advanceMarket só pra registrar o "moved" real de cada temporada
// (contar ids "_t" no mundo não serve de proxy: um jogador transferido pode se
// aposentar depois, e aí some da contagem sem que isso seja um "recuo" de verdade)
const realAdvanceMarket = CQ.market.advanceMarket;
let lastMoved = 0;
CQ.market.advanceMarket = function (g, notes) {
  const r = realAdvanceMarket(g, notes);
  lastMoved = r.moved;
  return r;
};

// sanidade estrutural das tabelas das outras ligas, a cada temporada de fato avançada
let leagueChecks = 0, leagueProblems = 0;
function checkWorldLeagues(g) {
  const myLg = E.leagueOf(g, g.player.clubId);
  Object.keys(D.LEAGUES).forEach(function (k) {
    if (k === myLg) return;
    leagueChecks++;
    const L = g.world.leagues[k];
    if (!L) { leagueProblems++; console.log("  PROBLEMA: " + k + " ausente em g.world.leagues"); return; }
    const N2 = L.teamIds.length;
    const table = E.tableOf(g, L);
    const sumJ = table.reduce(function (a, t) { return a + t.j; }, 0);
    if (sumJ !== N2 * (N2 - 1) * 2) { leagueProblems++; console.log("  PROBLEMA: " + k + " j=" + sumJ + " esperado=" + (N2 * (N2 - 1) * 2)); }
  });
}

let guard = 0, seasons = 0;
const transfersPerSeason = [];
while (guard++ < N) {
  let n = 0;
  while (E.currentFixture(g) && n++ < 160) E.applyMatch(g, E.resolveMatch(g, E.currentFixture(g), {}));
  const hadPending = !!g.pendingSummary;
  const sum = g.pendingSummary || E.endSeason(g);
  if (!hadPending) {
    seasons++;
    transfersPerSeason.push(lastMoved);
    checkWorldLeagues(g);
  }
  if (sum.retiring) break;
  if (sum.offers) {
    if (sum.offers.renew) E.acceptRenew(g, sum.offers.renew);
    else if (sum.offers.list && sum.offers.list[0]) E.acceptOffer(g, sum.offers.list[0]);
  }
  E.nextSeason(g);
}

let totalPlayers = 0, totalReal = 0, totalReplaced = 0, totalTransferred = 0, totalRetired = 0;
let rosterSizeMismatch = 0;
Object.keys(g.world.clubs).forEach(function (cid) {
  const roster = g.world.clubs[cid].roster;
  if (roster.length !== initialRosterSizes[cid]) rosterSizeMismatch++;
  roster.forEach(function (pl) {
    totalPlayers++;
    if (pl.real) totalReal++; else totalReplaced++;
    if (pl.id.indexOf("_t") >= 0) totalTransferred++;
    else if (pl.id.indexOf("_r") >= 0) totalRetired++;
  });
});
const histAfter = ageHistogram(g);
const finalSize = JSON.stringify(g.world).length;

console.log("\ntemporadas de fato avançadas: " + seasons);
console.log("total de jogadores no mundo: " + totalPlayers);
console.log("ainda reais (REAL_SQUADS): " + totalReal + " (" + (totalReal / totalPlayers * 100).toFixed(1) + "%)");
console.log("já substituídos (aposentaram e foram repostos): " + totalReplaced + " (" + (totalReplaced / totalPlayers * 100).toFixed(1) + "%)");
console.log("  dos quais por aposentadoria (_r): " + totalRetired);
console.log("  dos quais por transferência (_t): " + totalTransferred);
console.log("elencos com tamanho diferente do inicial: " + rosterSizeMismatch + (rosterSizeMismatch === 0 ? " (OK)" : " (PROBLEMA)"));

if (transfersPerSeason.length) {
  const min = Math.min.apply(null, transfersPerSeason);
  const max = Math.max.apply(null, transfersPerSeason);
  const avg = transfersPerSeason.reduce(function (a, b) { return a + b; }, 0) / transfersPerSeason.length;
  console.log("\ntransferências por temporada: min " + min + " | média " + avg.toFixed(1) + " | máx " + max + " (cap=18)");
}

console.log("\ndistribuição de idade ANTES (faixas de 5 anos):");
Object.keys(histBefore).sort((a, b) => a - b).forEach((b) => console.log("  " + b + "-" + (+b + 4) + ": " + histBefore[b]));
console.log("\ndistribuição de idade DEPOIS de " + seasons + " temporadas:");
Object.keys(histAfter).sort((a, b) => a - b).forEach((b) => console.log("  " + b + "-" + (+b + 4) + ": " + histAfter[b]));

console.log("\ntamanho de g.world: " + (initialSize / 1024).toFixed(1) + " KB → " + (finalSize / 1024).toFixed(1) + " KB");

console.log("\ntabelas do mundo: " + leagueChecks + " verificações, " + leagueProblems + " problema(s)" + (leagueProblems === 0 ? " (OK)" : ""));
console.log("tamanho de g.world.leagues: " + (JSON.stringify(g.world.leagues).length / 1024).toFixed(1) + " KB");

console.log("\nOK (" + ((Date.now() - t0) / 1000).toFixed(1) + "s)");
