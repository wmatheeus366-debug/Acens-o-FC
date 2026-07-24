// CRAQUE — Balance Runner
// Simula N carreiras por posição usando o MOTOR REAL (js/*.js) num shim Node,
// e gera docs/balance-baseline.json + docs/BALANCE_BASELINE.md.
//
// Uso:  node scripts/balance-runner.mjs [N]        (N carreiras por posição, padrão 60)
//
// Não altera o jogo: apenas lê os módulos e roda simulações em memória.

import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const N = parseInt(process.argv[2] || "60", 10);

// ---- shim: carrega os módulos vanilla (window.CQ) num contexto isolado ----
const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean,
  isNaN, parseInt, parseFloat, RegExp, Error, encodeURIComponent
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ["util", "data", "engine", "narrative"]) {
  const code = fs.readFileSync(path.join(root, "js", f + ".js"), "utf8");
  vm.runInContext(code, ctx, { filename: "js/" + f + ".js" });
}
ctx.CQ.state = { game: null };
const CQ = ctx.CQ;
const E = CQ.engine, D = CQ.DATA;

// ---- simula uma carreira completa e retorna as estatísticas agregadas ----
function simCareer(pos) {
  const clubPool = D.clubsOf("BRA");
  const cl = clubPool[Math.floor(Math.random() * clubPool.length)];
  const arch = D.POSITIONS[pos].archs[0].id;
  const g = E.newGame({
    name: "Sim " + pos, age: 16 + Math.floor(Math.random() * 3), foot: "Destro",
    num: 9, natId: "BR", pos: pos, archId: arch, legendIds: [], clubId: cl.id
  });
  let guard = 0;
  while (!g.retired && guard++ < 45) {
    let m = 0;
    while (E.currentFixture(g) && m++ < 160) E.applyMatch(g, E.resolveMatch(g, E.currentFixture(g), {}));
    const sum = g.pendingSummary || E.endSeason(g);
    if (sum.retiring) { g.retired = true; break; }
    if (sum.offers) {
      if (sum.offers.renew) E.acceptRenew(g, sum.offers.renew);
      else if (sum.offers.list && sum.offers.list[0]) E.acceptOffer(g, sum.offers.list[0]);
    }
    E.nextSeason(g);
  }
  const p = g.player;
  let games = 0, goals = 0, assists = 0, cs = 0, notaW = 0, notaN = 0;
  p.career.forEach(function (s) {
    games += s.j; goals += s.g; assists += s.a; cs += s.cs;
    if (s.avg && s.j) { notaW += s.avg * s.j; notaN += s.j; }
  });
  const peakOv = Math.max.apply(null, p.hist.map(function (h) { return h.ov; }));
  return {
    seasons: p.career.length, games: games, goals: goals, assists: assists, cs: cs,
    nota: notaN ? notaW / notaN : 0, peakOv: peakOv, titles: p.titles.length,
    awards: p.awards.length, ballons: p.awards.filter(function (a) { return a.name === "Bola de Ouro"; }).length,
    caps: p.natTeam.caps, natGoals: p.natTeam.goals, retireAge: p.age,
    marketValue: p.marketValue, idol: (p.idolClubs || []).length
  };
}

// ---- estatística descritiva ----
function summarize(arr) {
  const a = arr.slice().sort(function (x, y) { return x - y; });
  const n = a.length;
  const mean = a.reduce(function (s, x) { return s + x; }, 0) / n;
  const q = function (p) { return a[Math.min(n - 1, Math.floor(p * n))]; };
  return { mean: Math.round(mean * 100) / 100, min: a[0], p10: q(0.10), p50: q(0.50), p90: q(0.90), max: a[n - 1] };
}
const METRICS = ["seasons", "games", "goals", "assists", "cs", "nota", "peakOv", "titles", "awards", "ballons", "caps", "retireAge", "marketValue"];

// ---- roda ----
const positions = Object.keys(D.POSITIONS);
const report = { generatedAt: new Date().toISOString(), careersPerPosition: N, positions: {} };
console.log("Balance runner: " + N + " carreiras × " + positions.length + " posições...");
const t0 = Date.now();
for (const pos of positions) {
  const runs = [];
  for (let i = 0; i < N; i++) runs.push(simCareer(pos));
  const per = {};
  METRICS.forEach(function (m) { per[m] = summarize(runs.map(function (r) { return r[m]; })); });
  report.positions[pos] = per;
  process.stdout.write("  " + pos + " ok (média nota " + per.nota.mean + ", peak ov " + per.peakOv.mean + ")\n");
}
report.elapsedMs = Date.now() - t0;

// ---- grava JSON ----
fs.mkdirSync(path.join(root, "docs"), { recursive: true });
fs.writeFileSync(path.join(root, "docs", "balance-baseline.json"), JSON.stringify(report, null, 2), "utf8");

// ---- grava Markdown ----
function row(label, key, field) {
  return "| " + label + " | " + positions.map(function (pos) { return report.positions[pos][key][field]; }).join(" | ") + " |";
}
let md = "# BALANCE_BASELINE.md\n\n";
md += "Gerado por `scripts/balance-runner.mjs` — **" + N + " carreiras por posição** (amostragem estocástica, motor real).\n";
md += "Data: " + report.generatedAt + " · tempo: " + (report.elapsedMs / 1000).toFixed(1) + "s\n\n";
md += "> Cada carreira: nova promessa (16–18 anos) num clube da Série A, jogada até a aposentadoria,\n";
md += "> renovando ou aceitando a melhor proposta. Valores = média sobre as " + N + " carreiras.\n\n";
md += "## Médias por posição\n\n";
md += "| Métrica | " + positions.join(" | ") + " |\n";
md += "|" + "---|".repeat(positions.length + 1) + "\n";
const LABELS = {
  seasons: "Temporadas", games: "Jogos (carreira)", goals: "Gols", assists: "Assistências",
  cs: "Jogos sem sofrer", nota: "Nota média", peakOv: "Overall máximo", titles: "Títulos",
  awards: "Prêmios individ.", ballons: "Bolas de Ouro", caps: "Jogos seleção",
  retireAge: "Idade aposent.", marketValue: "Valor mercado (pico)"
};
METRICS.forEach(function (m) { md += row(LABELS[m], m, "mean") + "\n"; });
md += "\n## Distribuição da NOTA MÉDIA (p10 / mediana / p90)\n\n";
md += "| Posição | mín | p10 | mediana | p90 | máx |\n|---|---|---|---|---|---|\n";
positions.forEach(function (pos) {
  const s = report.positions[pos].nota;
  md += "| " + pos + " | " + s.min + " | " + s.p10 + " | " + s.p50 + " | " + s.p90 + " | " + s.max + " |\n";
});
md += "\n## Distribuição do OVERALL MÁXIMO (p10 / mediana / p90)\n\n";
md += "| Posição | mín | p10 | mediana | p90 | máx |\n|---|---|---|---|---|---|\n";
positions.forEach(function (pos) {
  const s = report.positions[pos].peakOv;
  md += "| " + pos + " | " + s.min + " | " + s.p10 + " | " + s.p50 + " | " + s.p90 + " | " + s.max + " |\n";
});
md += "\n## Leitura\n\n";
md += "- Comparar **nota média** e **overall máximo** entre posições revela favorecidos/prejudicados.\n";
md += "- **Bolas de Ouro** deve ser raro (majoritariamente 0; alguns picos para talentos geracionais).\n";
md += "- **Idade de aposentadoria** deve girar em ~34–38 conforme a posição.\n";
md += "- Qualquer ajuste de fórmula a partir daqui deve ser documentado no CHANGELOG e re-medido.\n";
fs.writeFileSync(path.join(root, "docs", "BALANCE_BASELINE.md"), md, "utf8");

console.log("OK → docs/balance-baseline.json e docs/BALANCE_BASELINE.md (" + (report.elapsedMs / 1000).toFixed(1) + "s)");
