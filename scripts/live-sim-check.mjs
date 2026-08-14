// CRAQUE — Live Sim Check
// Diagnóstico manual do motor de partida real (js/live-sim.js + js/vendor/
// footballsim.js): roda N partidas de teste (times/seeds diferentes) e reporta tempo
// de execução, placar, quantidade de eventos e qualquer exceção — mesmo padrão de
// scripts/world-check.mjs/balance-runner.mjs.
//
// IMPORTANTE: roda `simulateLoop` DIRETO (sem Worker/Blob — Node não tem o mesmo
// ambiente de navegador) — mede o custo "puro" da simulação; no navegador de verdade
// isso roda dentro de um Worker (não bloqueia a tela), só o tempo total muda um pouco
// pela marshalling de postMessage.
//
// Uso:  node scripts/live-sim-check.mjs [N]        (N partidas, padrão 8)
//
// Não altera o jogo: só lê os módulos e roda simulações em memória.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const N = parseInt(process.argv[2] || "8", 10);

function freshCtx() {
  const ctx = {
    console, Math, Date, JSON, Object, Array, String, Number, Boolean,
    isNaN, parseInt, parseFloat, RegExp, Error, encodeURIComponent,
    performance: { now: () => Date.now() }, structuredClone
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ["util", "data", "world", "engine", "market", "narrative", "live-sim"]) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", f + ".js"), "utf8"), ctx, { filename: "js/" + f + ".js" });
  }
  const fsCode = fs.readFileSync(path.join(root, "js", "vendor", "footballsim.js"), "utf8");
  vm.runInContext(fsCode, ctx, { filename: "js/vendor/footballsim.js" });
  vm.runInContext("eval(CQ_FOOTBALLSIM_SRC)", ctx, { filename: "footballsim-src-eval" }); // mesmo passo que o Worker faz no navegador
  // stub de CQ.ui.probableLineup (js/ui.js não é carregado aqui — só a peça que
  // js/live-sim.js precisa: escalação titular a partir do elenco do mundo persistente)
  ctx.CQ.ui = {
    probableLineup: function (G, fixture) {
      const p = G.player;
      const squad = G.world.clubs[p.clubId].roster.map(function (j) { return { name: j.name, pos: j.pos, ov: j.ovr }; });
      const buckets = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2, PON: 1, ATA: 1 };
      const out = [];
      Object.keys(buckets).forEach(function (pos) {
        out.push.apply(out, squad.filter(function (j) { return j.pos === pos; }).sort(function (a, b) { return b.ov - a.ov; }).slice(0, buckets[pos]));
      });
      const idx = out.findIndex(function (j) { return j.pos === p.pos; });
      const me = { name: p.name, pos: p.pos, ov: p.overall, isMe: true };
      if (idx >= 0) out[idx] = me; else out.push(me);
      return out;
    }
  };
  return ctx;
}

console.log("Live Sim Check: " + N + " partidas simuladas (ITERS_PER_HALF calibrado em js/live-sim.js)...\n");

const clubIds = ["vas", "fla", "flu", "bot", "cor", "pal", "san", "gua"];
let ok = 0, fail = 0, totalGoals = 0, totalMs = 0, ownGoalsUnattributed = 0;
const scorelines = {};

for (let i = 0; i < N; i++) {
  const ctx = freshCtx();
  const CQ = ctx.CQ, E = CQ.engine, D = ctx.CQ.DATA;
  const myClub = clubIds[i % clubIds.length];
  const oppClub = clubIds[(i + 3) % clubIds.length] === myClub ? clubIds[(i + 4) % clubIds.length] : clubIds[(i + 3) % clubIds.length];
  const g = E.newGame({
    name: "Check " + i, age: 18 + (i % 8), foot: "Destro", num: 9, natId: "BR",
    pos: ["ATA", "MEI", "ZAG", "GOL", "VOL", "LAT", "PON"][i % 7],
    archId: D.POSITIONS[["ATA", "MEI", "ZAG", "GOL", "VOL", "LAT", "PON"][i % 7]].archs[0].id,
    legendIds: [], clubId: myClub
  });
  const fx = {
    compKey: "LIGA", label: "Teste", oppId: oppClub, home: i % 2 === 0,
    myTeam: E.myClub(g), opp: D.CLUBS[oppClub], isNatMatch: false, decisive: true
  };
  const t0 = Date.now();
  try {
    const teams = CQ.liveSim.buildTeams(g, fx);
    const sim = CQ.liveSim.simulateLoop(ctx.CQ_FOOTBALLSIM, teams.mine, teams.opp, CQ.liveSim.PITCH, 1000 + i, CQ.liveSim.ITERS_PER_HALF);
    const res = CQ.liveSim.translate(g, fx, teams, sim);
    const ms = Date.now() - t0;
    totalMs += ms;
    totalGoals += res.gm + res.go;
    const key = res.gm + "x" + res.go;
    scorelines[key] = (scorelines[key] || 0) + 1;
    const unattributed = sim.events.filter(function (e) { return e.type === "goal" && !e.name; }).length;
    ownGoalsUnattributed += unattributed;
    console.log(
      "  #" + i + " " + fx.myTeam.name + " x " + fx.opp.name + " -> " + res.gm + "x" + res.go +
      " | nota=" + res.nota + " | tempo=" + ms + "ms | eventos=" + sim.events.length +
      (unattributed ? " | gol(s) sem autor=" + unattributed : "")
    );
    ok++;
  } catch (e) {
    fail++;
    console.log("  #" + i + " FALHOU: " + e.message);
  }
}

console.log("\n--- resumo ---");
console.log("ok=" + ok + " falhas=" + fail);
console.log("tempo médio: " + (totalMs / Math.max(1, ok)).toFixed(0) + "ms/partida");
console.log("gols/partida (média): " + (totalGoals / Math.max(1, ok)).toFixed(2));
console.log("placares:", JSON.stringify(scorelines));
console.log("gols sem autor identificado (gol contra): " + ownGoalsUnattributed);
if (fail > 0) process.exit(1);
