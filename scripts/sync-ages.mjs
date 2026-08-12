/* CRAQUE — sincroniza idade REAL dos jogadores de REAL_SQUADS via API-Football.
   Motivo: REAL_SQUADS (js/data.js) nunca teve idade — só {posição, nome} — então a
   idade de todo jogador real era sorteada (mitigado, mas não resolvido, na fatia
   anterior com rollAge). Este script busca data de nascimento de verdade.

   Uso:  node scripts/sync-ages.mjs [limite de chamadas ao vivo por execução, padrão 90]
   Requer: .env na raiz do projeto com API_FOOTBALL_KEY=xxxxx (mesma chave de sync-squads.mjs)
   Cache: scripts/.cache/ages/{clubId}.json (gitignored) — resumível, rerodar não gasta
   cota de novo pra clube já processado.

   Saída: js/birthdates.js  →  CQ.BIRTHDATES = { clubId: { "Nome": "AAAA-MM-DD" } }
   ADITIVO — nunca sobrescreve REAL_SQUADS/sq(), faz merge com execuções anteriores.
   Times/jogadores sem correspondência inequívoca ficam de fora (log "revisar
   manualmente" no fim) — nunca um chute silencioso. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, "scripts", ".cache", "ages");
const OUT = path.join(ROOT, "js", "birthdates.js");
const SEASON = 2024; // última temporada completa disponível no plano Free no momento

fs.mkdirSync(CACHE_DIR, { recursive: true });

// ---------------- .env (mesmo parser de sync-squads.mjs) ----------------
function loadEnv() {
  const p = path.join(ROOT, ".env");
  if (!fs.existsSync(p)) return {};
  const out = {};
  fs.readFileSync(p, "utf8").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2];
  });
  return out;
}
const API_KEY = loadEnv().API_FOOTBALL_KEY;
if (!API_KEY) {
  console.error("ERRO: API_FOOTBALL_KEY não encontrada em .env (raiz do projeto).");
  process.exit(1);
}

// ---------------- lê REAL_SQUADS/CREST_MAP direto de js/data.js (mesma técnica de embed-crests.mjs) ----------------
function readData() {
  const src = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
  const sandbox = { window: {} };
  sandbox.window.CQ = sandbox.CQ = {};
  new Function("window", "CQ", src).call(sandbox, sandbox.window, sandbox.CQ);
  return sandbox.window.CQ.DATA;
}
const D = readData();
if (!D.REAL_SQUADS || !D.CREST_MAP) throw new Error("REAL_SQUADS/CREST_MAP não encontrados em js/data.js");

// 20 clubes curados à mão primeiro (nomes mais fáceis de casar, mais visíveis pro
// usuário); os ~109 auto-sincronizados (nomes abreviados "I. Sobrenome") entram depois.
const HAND_CURATED = ["fla", "pal", "cor", "sao", "flu", "bot", "gre", "int", "cru", "cam", "vas", "san", "bah", "rma", "bar", "mci", "liv", "psg", "bay", "intm"];
const allIds = Object.keys(D.REAL_SQUADS);
const ids = HAND_CURATED.filter((id) => allIds.indexOf(id) >= 0)
  .concat(allIds.filter((id) => HAND_CURATED.indexOf(id) < 0));

// ---------------- normalização + casamento de nome (tolerante, mas conservador) ----------------
const DIACRITICS_RE = new RegExp("[̀-ͯ]", "g");
function norm(s) {
  return s.normalize("NFD").replace(DIACRITICS_RE, "").replace(/\./g, "").toLowerCase().trim().replace(/\s+/g, " ");
}
// candidatos da API cujo nome bate com o nome curado; só aceita se a lista final tiver
// exatamente 1 item (ambiguidade = não casa, fica pra revisão manual).
function matchName(curatedName, apiPlayers) {
  const cur = norm(curatedName);
  const curTokens = cur.split(" ");
  const cands = apiPlayers.filter((p) => {
    const api = norm(p.name);
    const apiTokens = api.split(" ");
    if (api === cur) return true;
    if (curTokens.length === 1) {
      // nome de bola de 1 palavra: bate se for o último token do nome da API (sobrenome)
      // OU se aparecer como palavra inteira em qualquer posição do nome da API.
      return apiTokens[apiTokens.length - 1] === cur || apiTokens.indexOf(cur) >= 0;
    }
    // "i sosa" (abreviado): 1º token de 1 letra = inicial do primeiro nome, resto = sobrenome
    if (curTokens[0].length === 1) {
      const surname = curTokens.slice(1).join(" ");
      return apiTokens[apiTokens.length - 1] === curTokens[curTokens.length - 1]
        && apiTokens[0][0] === curTokens[0][0]
        && api.indexOf(surname) >= 0;
    }
    // nome duplo comum ("vitor roque", "vinicius junior"): todos os tokens presentes
    return curTokens.every((t) => apiTokens.indexOf(t) >= 0);
  });
  return cands.length === 1 ? cands[0] : null;
}

// ---------------- fetch com cache local (reruns não gastam cota) ----------------
// teto de página confirmado na prática: o plano Free devolve erro pedindo page > 3
// ("Free plans are limited to a maximum value of 3 for the Page parameter") — nunca
// pedir além disso evita gastar cota numa chamada que sempre vai falhar.
const MAX_PAGE_FREE_PLAN = 3;
async function fetchTeamAges(teamId) {
  const cacheFile = path.join(CACHE_DIR, teamId + ".json");
  if (fs.existsSync(cacheFile)) return { players: JSON.parse(fs.readFileSync(cacheFile, "utf8")), live: false };
  let page = 1, total = 1, players = [];
  const lastPage = () => Math.min(total, MAX_PAGE_FREE_PLAN);
  while (page <= lastPage()) {
    const res = await fetch(`https://v3.football.api-sports.io/players?team=${teamId}&season=${SEASON}&page=${page}`, {
      headers: { "x-apisports-key": API_KEY }
    });
    const json = await res.json();
    if (json.errors && Object.keys(json.errors).length) {
      // mantém o que já foi coletado nas páginas anteriores — nunca descarta tudo por
      // causa de 1 página que falhou (cota diária estourada, instabilidade, etc.)
      console.log(" [aviso pág " + page + ": " + JSON.stringify(json.errors) + "]");
      break;
    }
    (json.response || []).forEach((r) => {
      if (r.player && r.player.birth && r.player.birth.date) {
        players.push({ name: r.player.name, birth: r.player.birth.date });
      }
    });
    total = (json.paging && json.paging.total) || 1;
    page++;
    if (page <= lastPage()) await new Promise((r) => setTimeout(r, 7000)); // limite por minuto do plano Free
  }
  if (players.length) fs.writeFileSync(cacheFile, JSON.stringify(players), "utf8"); // só cacheia se achou algo — time totalmente sem dado pode ser retentado depois
  return { players, live: true };
}

// ---------------- js/birthdates.js existente (merge, nunca perde progresso) ----------------
function readExistingBirthdates() {
  if (!fs.existsSync(OUT)) return {};
  const src = fs.readFileSync(OUT, "utf8");
  const m = src.match(/CQ\.BIRTHDATES\s*=\s*(\{[\s\S]*\});/);
  if (!m) return {};
  try { return (0, eval)("(" + m[1] + ")"); } catch (e) { return {}; }
}

// ---------------- main ----------------
const LIVE_CALL_CAP = parseInt(process.argv[2] || "90", 10);
let liveCalls = 0, stopped = false;
const birthdates = readExistingBirthdates();
const toReview = [];
let clubsDone = 0, playersMatchedTotal = 0;

for (const clubId of ids) {
  const teamId = D.CREST_MAP[clubId];
  if (!teamId) { console.log(clubId + ": sem CREST_MAP, pulando"); continue; }
  const cacheFile = path.join(CACHE_DIR, teamId + ".json");
  if (!fs.existsSync(cacheFile) && liveCalls >= LIVE_CALL_CAP) {
    console.log("— parado no limite de " + LIVE_CALL_CAP + " chamadas ao vivo desta execução (" + clubId + " em diante fica pra próxima rodada) —");
    stopped = true;
    break;
  }
  // pausa TAMBÉM entre times (não só entre páginas do mesmo time, ver fetchTeamAges) —
  // sem isso, times de 1 página só disparam quase sem intervalo e estouram o limite por
  // minuto do plano Free bem antes do teto diário.
  if (!fs.existsSync(cacheFile) && liveCalls > 0) await new Promise((r) => setTimeout(r, 7000));
  process.stdout.write("sincronizando " + clubId + " (team=" + teamId + ")... ");
  const wasCached = fs.existsSync(cacheFile); // precisa checar ANTES de buscar — fetchTeamAges grava o cache no final, então checar depois sempre daria "true"
  try {
    const { players: apiPlayers } = await fetchTeamAges(teamId);
    if (!wasCached) liveCalls++; // conta pro teto de segurança só quando realmente foi buscar ao vivo (aproxima 1 clube ~ 1 "chamada", mesmo que internamente tenha paginado mais de uma vez)
    const curated = D.REAL_SQUADS[clubId];
    const clubMap = birthdates[clubId] || {};
    let matched = 0;
    curated.forEach((pl) => {
      if (clubMap[pl.n]) { matched++; return; } // já casado numa execução anterior
      const hit = matchName(pl.n, apiPlayers);
      if (hit) { clubMap[pl.n] = hit.birth; matched++; }
      else toReview.push({ club: clubId, nome: pl.n });
    });
    if (matched) birthdates[clubId] = clubMap;
    playersMatchedTotal += matched;
    clubsDone++;
    console.log(matched + "/" + curated.length + " jogadores casados");
  } catch (e) {
    console.log("ERRO: " + e.message);
  }
}

// ---------------- grava js/birthdates.js ----------------
const header = `/* CRAQUE — data de nascimento REAL de jogadores de REAL_SQUADS, via API-Football.
   Gerado por scripts/sync-ages.mjs — NÃO editar à mão (rerodar o script atualiza).
   Aditivo: clube/jogador ausente aqui cai no sorteio de idade normal (rollAge,
   js/world.js) — nunca quebra nada, só cresce aos poucos a cada execução. */
window.CQ = window.CQ || {};
CQ.BIRTHDATES = ${JSON.stringify(birthdates, null, 2)};
`;
fs.writeFileSync(OUT, header, "utf8");

console.log("\n" + clubsDone + " clubes processados nesta execução, " + playersMatchedTotal + " jogadores com idade real casada (acumulado, incluindo execuções anteriores).");
console.log("Total de clubes com pelo menos 1 jogador casado: " + Object.keys(birthdates).length + "/" + ids.length + ".");
if (toReview.length) {
  console.log("\nSEM correspondência inequívoca (" + toReview.length + ") — revisar manualmente ou deixar pra próxima execução:");
  toReview.slice(0, 40).forEach((r) => console.log("  " + r.club + ": " + r.nome));
  if (toReview.length > 40) console.log("  ... e mais " + (toReview.length - 40) + ".");
}
if (stopped) {
  console.log("\nRode `node scripts/sync-ages.mjs` de novo (amanhã, se a cota diária já tiver zerado) pra continuar de onde parou.");
}
