// CRAQUE — sincroniza elenco REAL dos clubes brasileiros que ainda não têm
// (Série A + Série B faltantes) via API-Football (plano Free, 100 req/dia).
//
// A chave NUNCA entra no bundle do jogo: fica só em .env (fora do git),
// lida aqui em tempo de build/sync. O resultado vira texto estático dentro
// de js/data.js (REAL_SQUADS) — o runtime do jogo não faz nenhuma chamada
// de rede a esta API.
//
// Uso:  node scripts/sync-squads.mjs
// Requer: .env na raiz do projeto com API_FOOTBALL_KEY=xxxxx

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cacheDir = path.join(root, "scripts", ".cache", "squads");
fs.mkdirSync(cacheDir, { recursive: true });

// ---------------- .env (parser mínimo, sem dependências) ----------------
function loadEnv() {
  const p = path.join(root, ".env");
  if (!fs.existsSync(p)) return {};
  const out = {};
  fs.readFileSync(p, "utf8").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2];
  });
  return out;
}
const env = loadEnv();
const API_KEY = env.API_FOOTBALL_KEY;
if (!API_KEY) {
  console.error("ERRO: API_FOOTBALL_KEY não encontrada em .env (raiz do projeto).");
  process.exit(1);
}

// ---------------- clubes brasileiros ainda SEM elenco real em data.js ----------------
// (os 13 clubes de Série A já curados à mão — fla,pal,cor,sao,flu,bot,gre,int,cru,cam,vas,san,bah —
// NÃO são tocados por este script. IDs abaixo confirmados manualmente contra a API
// [nome + cidade da sede] antes de gastar requisições de sync.)
const CLUB_TEAM_MAP = {
  // Série A — 7 faltantes
  rbb: { id: 794, name: "RB Bragantino" },
  mir: { id: 7848, name: "Mirassol" },
  vit: { id: 136, name: "Vitória" },
  cap: { id: 134, name: "Athletico-PR" },
  cfc: { id: 147, name: "Coritiba" },
  cha: { id: 132, name: "Chapecoense" },
  rem: { id: 1198, name: "Remo" },
  // Série B — 16
  spt: { id: 123, name: "Sport Recife" },
  for: { id: 154, name: "Fortaleza" },
  cea: { id: 129, name: "Ceará" },
  juv: { id: 152, name: "Juventude" },
  goi: { id: 151, name: "Goiás" },
  ava: { id: 145, name: "Avaí" },
  cri: { id: 140, name: "Criciúma" },
  ame: { id: 125, name: "América-MG" },
  crb: { id: 146, name: "CRB" },
  pay: { id: 149, name: "Paysandu" },
  vil: { id: 142, name: "Vila Nova" },
  pon: { id: 139, name: "Ponte Preta" },
  gua: { id: 138, name: "Guarani" },
  ope: { id: 1223, name: "Operário-PR" },
  amz: { id: 10862, name: "Amazonas" },
  ath: { id: 13975, name: "Athletic-MG" },
  // Estaduais (clubes pequenos/regionais) — 27
  boa: { id: 2206, name: "Boavista-RJ" },
  vre: { id: 7814, name: "Volta Redonda" },
  mad: { id: 7780, name: "Madureira" },
  nig: { id: 7782, name: "Nova Iguaçu" },
  xvp: { id: 7870, name: "XV de Piracicaba" },
  nov: { id: 7834, name: "Novorizontino" },
  bsp: { id: 2618, name: "Botafogo-SP" },
  por: { id: 1214, name: "Portuguesa" },
  sbe: { id: 7865, name: "São Bernardo" },
  tom: { id: 2227, name: "Tombense" },
  cal: { id: 7769, name: "Caldense" },
  pou: { id: 13084, name: "Pouso Alegre" },
  cax: { id: 7770, name: "Caxias" },
  ypi: { id: 1221, name: "Ypiranga-RS" },
  sjo: { id: 2232, name: "São José-RS" },
  jac: { id: 7831, name: "Jacuipense" },
  jua: { id: 1224, name: "Juazeirense" },
  ala: { id: 9997, name: "Atlético de Alagoinhas" },
  lon: { id: 148, name: "Londrina" },
  mar: { id: 7833, name: "Maringá" },
  cas: { id: 10673, name: "FC Cascavel" },
  bru: { id: 1211, name: "Brusque" },
  mcd: { id: 10677, name: "Marcílio Dias" },
  con: { id: 12300, name: "Concórdia" },
  tun: { id: 15611, name: "Tuna Luso" },
  agm: { id: 7879, name: "Águia de Marabá" },
  cst: { id: 13124, name: "Castanhal" },
  // Espanha (16 faltantes — rma/bar já curados à mão)
  atm: { id: 530, name: "Atlético de Madrid" },
  atb: { id: 531, name: "Athletic Bilbao" },
  rso: { id: 548, name: "Real Sociedad" },
  bet: { id: 543, name: "Betis" },
  vll: { id: 533, name: "Villarreal" },
  sev: { id: 536, name: "Sevilla" },
  val: { id: 532, name: "Valencia" },
  gir: { id: 547, name: "Girona" },
  osa: { id: 727, name: "Osasuna" },
  cel: { id: 538, name: "Celta" },
  ray: { id: 728, name: "Rayo Vallecano" },
  mal: { id: 798, name: "Mallorca" },
  get: { id: 546, name: "Getafe" },
  alv: { id: 542, name: "Alavés" },
  esy: { id: 540, name: "Espanyol" },
  lev: { id: 539, name: "Levante" },
  // Inglaterra (16 faltantes — mci/liv já curados à mão)
  ars: { id: 42, name: "Arsenal" },
  che: { id: 49, name: "Chelsea" },
  mun: { id: 33, name: "Manchester United" },
  tot: { id: 47, name: "Tottenham" },
  new: { id: 34, name: "Newcastle" },
  avl: { id: 66, name: "Aston Villa" },
  bha: { id: 51, name: "Brighton" },
  whu: { id: 48, name: "West Ham" },
  cry: { id: 52, name: "Crystal Palace" },
  bre: { id: 55, name: "Brentford" },
  ful: { id: 36, name: "Fulham" },
  eve: { id: 45, name: "Everton" },
  wol: { id: 39, name: "Wolves" },
  nfo: { id: 65, name: "Nottingham Forest" },
  bou: { id: 35, name: "Bournemouth" },
  lee: { id: 63, name: "Leeds" },
  // Itália (17 faltantes — intm já curado à mão)
  mln: { id: 489, name: "Milan" },
  juve: { id: 496, name: "Juventus" },
  nap: { id: 492, name: "Napoli" },
  rom: { id: 497, name: "Roma" },
  ata: { id: 499, name: "Atalanta" },
  laz: { id: 487, name: "Lazio" },
  fio: { id: 502, name: "Fiorentina" },
  bgn: { id: 500, name: "Bologna" },
  tor: { id: 503, name: "Torino" },
  udi: { id: 494, name: "Udinese" },
  gen: { id: 495, name: "Genoa" },
  como: { id: 895, name: "Como" },
  sas: { id: 488, name: "Sassuolo" },
  cag: { id: 490, name: "Cagliari" },
  ver: { id: 504, name: "Hellas Verona" },
  lec: { id: 867, name: "Lecce" },
  par: { id: 523, name: "Parma" },
  // Alemanha (17 faltantes — bay já curado à mão)
  lev4: { id: 168, name: "Bayer Leverkusen" },
  bvb: { id: 165, name: "Borussia Dortmund" },
  rbl: { id: 173, name: "RB Leipzig" },
  stu: { id: 172, name: "Stuttgart" },
  sge: { id: 169, name: "Eintracht Frankfurt" },
  fre: { id: 160, name: "Freiburg" },
  hof: { id: 167, name: "Hoffenheim" },
  wob: { id: 161, name: "Wolfsburg" },
  bmg: { id: 163, name: "M'gladbach" },
  mai: { id: 164, name: "Mainz" },
  aug: { id: 170, name: "Augsburg" },
  sve: { id: 162, name: "Werder Bremen" },
  uni: { id: 182, name: "Union Berlin" },
  koe: { id: 192, name: "Colônia" },
  hsv: { id: 175, name: "Hamburgo" },
  stp: { id: 186, name: "St. Pauli" },
  hei: { id: 180, name: "Heidenheim" },
  // França (17 faltantes — psg já curado à mão)
  mon: { id: 91, name: "Monaco" },
  mars: { id: 81, name: "Olympique de Marselha" },
  lil: { id: 79, name: "Lille" },
  oly: { id: 80, name: "Lyon" },
  nice: { id: 84, name: "Nice" },
  len: { id: 116, name: "Lens" },
  ren: { id: 94, name: "Rennes" },
  str: { id: 95, name: "Strasbourg" },
  tou: { id: 96, name: "Toulouse" },
  nan: { id: 83, name: "Nantes" },
  rei: { id: 93, name: "Reims" },
  mtp: { id: 82, name: "Montpellier" },
  bres: { id: 106, name: "Brest" },
  aux: { id: 108, name: "Auxerre" },
  hav: { id: 111, name: "Le Havre" },
  ang: { id: 77, name: "Angers" },
  metz: { id: 112, name: "Metz" },
  // Portugal (18 — nenhum curado à mão ainda)
  ben: { id: 211, name: "Benfica" },
  porto: { id: 212, name: "Porto" },
  scp: { id: 228, name: "Sporting" },
  bra: { id: 217, name: "Braga" },
  vgu: { id: 224, name: "Vitória de Guimarães" },
  fam: { id: 242, name: "Famalicão" },
  boav: { id: 222, name: "Boavista" },
  gil: { id: 762, name: "Gil Vicente" },
  rio: { id: 226, name: "Rio Ave" },
  mor: { id: 215, name: "Moreirense" },
  esto: { id: 230, name: "Estoril" },
  cpia: { id: 4716, name: "Casa Pia" },
  aro: { id: 240, name: "Arouca" },
  scl: { id: 227, name: "Santa Clara" },
  farn: { id: 231, name: "Farense" },
  estr: { id: 15130, name: "Estrela da Amadora" },
  nacp: { id: 225, name: "Nacional" },
  ton: { id: 218, name: "Tondela" }
};

// ---------------- fetch com cache local (reruns não gastam cota) ----------------
async function fetchSquad(clubId, teamId) {
  const cacheFile = path.join(cacheDir, teamId + ".json");
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  }
  const res = await fetch("https://v3.football.api-sports.io/players/squads?team=" + teamId, {
    headers: { "x-apisports-key": API_KEY }
  });
  const json = await res.json();
  const ok = json.response && json.response[0] && json.response[0].players && json.response[0].players.length;
  if (ok) fs.writeFileSync(cacheFile, JSON.stringify(json), "utf8"); // só cacheia sucesso — erro (ex.: rate limit) deve poder ser reexecutado
  await new Promise((r) => setTimeout(r, 7000)); // plano Free: limite por minuto, não só por dia
  return json;
}

// ---------------- posição da API (larga) → posição do CRAQUE (fina) ----------------
// A API só dá Goalkeeper/Defender/Midfielder/Attacker. Distribuição determinística
// (por ordem de camisa) dentro de cada bloco, para aproximar a mistura real de um time.
function assignPositions(players) {
  const byBucket = { Goalkeeper: [], Defender: [], Midfielder: [], Attacker: [] };
  players.forEach((p) => { if (byBucket[p.position]) byBucket[p.position].push(p); });
  Object.keys(byBucket).forEach((k) => {
    byBucket[k].sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
  });
  const out = [];
  byBucket.Goalkeeper.slice(0, 2).forEach((p) => out.push({ p: "GOL", n: p.name }));
  byBucket.Defender.forEach((p, i) => out.push({ p: i % 5 < 3 ? "ZAG" : "LAT", n: p.name }));
  byBucket.Midfielder.forEach((p, i) => out.push({ p: i % 2 === 0 ? "VOL" : "MEI", n: p.name }));
  byBucket.Attacker.forEach((p, i) => out.push({ p: i % 2 === 0 ? "PON" : "ATA", n: p.name }));
  // limita a densidade a algo parecido com os elencos já curados à mão (~16-18)
  const quota = { GOL: 2, ZAG: 3, LAT: 3, VOL: 3, MEI: 3, PON: 3, ATA: 3 };
  const count = {};
  return out.filter((row) => {
    count[row.p] = (count[row.p] || 0) + 1;
    return count[row.p] <= quota[row.p];
  });
}

// ---------------- main ----------------
// limite de segurança de chamadas AO VIVO por execução (plano Free: 100/dia).
// Ao atingir o limite, para e imprime instrução — reexecutar mais tarde retoma
// exatamente de onde parou (cache local pula tudo que já foi sincronizado).
const LIVE_CALL_CAP = parseInt(process.argv[2] || "35", 10);
let liveCalls = 0;

const ids = Object.keys(CLUB_TEAM_MAP);
const results = {};
let synced = 0, failed = [], stopped = false;

for (const clubId of ids) {
  const { id: teamId, name } = CLUB_TEAM_MAP[clubId];
  const cacheFile = path.join(cacheDir, teamId + ".json");
  if (!fs.existsSync(cacheFile) && liveCalls >= LIVE_CALL_CAP) {
    console.log("— parado no limite de " + LIVE_CALL_CAP + " chamadas ao vivo desta execução (" + clubId + " em diante fica para a próxima rodada) —");
    stopped = true;
    break;
  }
  if (!fs.existsSync(cacheFile)) liveCalls++;
  process.stdout.write("sincronizando " + clubId + " (" + name + ", team=" + teamId + ")... ");
  try {
    const json = await fetchSquad(clubId, teamId);
    const squad = json.response && json.response[0] && json.response[0].players;
    if (!squad || !squad.length) {
      console.log("SEM DADOS (" + JSON.stringify(json.errors || {}) + ")");
      failed.push(clubId);
      continue;
    }
    const rows = assignPositions(squad);
    results[clubId] = rows;
    synced++;
    console.log(rows.length + " jogadores");
  } catch (e) {
    console.log("ERRO: " + e.message);
    failed.push(clubId);
  }
}

// ---------------- gera o trecho `sq("...")` e injeta em js/data.js ----------------
function toSqString(rows) {
  return rows.map((r) => r.p + ":" + r.n).join(", ");
}

const dataPath = path.join(root, "js", "data.js");
let src = fs.readFileSync(dataPath, "utf8");

const marker = "  const REAL_SQUADS = {";
const markerIdx = src.indexOf(marker);
if (markerIdx < 0) {
  console.error("ERRO: não encontrei `const REAL_SQUADS = {` em js/data.js");
  process.exit(1);
}
// remove entradas antigas dos MESMOS clubes (permite re-rodar o script com segurança)
ids.forEach((clubId) => {
  const re = new RegExp("\\n    " + clubId + ": sq\\(\"[^\"]*\"\\),?", "g");
  src = src.replace(re, "");
});
const insertAfter = "  const REAL_SQUADS = {";
const newLines = ids.filter((id) => results[id]).map((id) =>
  "\n    " + id + ": sq(\"" + toSqString(results[id]) + "\"),"
).join("");
src = src.replace(insertAfter, insertAfter + newLines);

fs.writeFileSync(dataPath, src, "utf8");

console.log("\n" + synced + "/" + ids.length + " clubes sincronizados com elenco real.");
if (failed.length) console.log("Falharam (retentar rodando de novo): " + failed.join(", "));
if (stopped) {
  const pending = ids.length - synced - failed.length;
  console.log(pending + " clubes ainda não tentados nesta execução (limite de chamadas ao vivo). Rode o script de novo (mesmo dia ou após a cota diária renovar) para continuar — o cache local pula quem já foi sincronizado.");
}
console.log("js/data.js atualizado (REAL_SQUADS). Rode `node scripts/build.mjs` para regravar o bundle.");
