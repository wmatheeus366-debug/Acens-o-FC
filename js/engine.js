/* CRAQUE — motor: temporadas, competições, simulação de partidas,
   evolução do atleta, prêmios, mercado, seleções e rival de geração. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util, D = CQ.DATA;

  const NAT_FLAGS = {
    "Brasil": "br", "Argentina": "ar", "França": "fr", "Espanha": "es", "Inglaterra": "gb-eng", "Portugal": "pt",
    "Alemanha": "de", "Holanda": "nl", "Itália": "it", "Uruguai": "uy", "Colômbia": "co", "México": "mx",
    "Estados Unidos": "us", "Japão": "jp", "Equador": "ec", "Paraguai": "py", "Chile": "cl", "Peru": "pe",
    "Bolívia": "bo", "Venezuela": "ve", "Bélgica": "be", "Croácia": "hr", "Dinamarca": "dk", "Suíça": "ch",
    "Áustria": "at", "Canadá": "ca", "Panamá": "pa", "Costa Rica": "cr", "Honduras": "hn", "Jamaica": "jm",
    "El Salvador": "sv", "Coreia do Sul": "kr", "Irã": "ir", "Austrália": "au", "Arábia Saudita": "sa",
    "Catar": "qa", "Iraque": "iq", "Uzbequistão": "uz", "Marrocos": "ma", "Senegal": "sn",
    "Gana": "gh", "Nigéria": "ng", "Argélia": "dz", "Tunísia": "tn", "Egito": "eg",
    "Nova Zelândia": "nz", "Polônia": "pl", "Suécia": "se",
    "Sérvia": "rs", "Ucrânia": "ua", "República Tcheca": "cz", "Escócia": "gb-sct", "País de Gales": "gb-wls",
    "Turquia": "tr", "Grécia": "gr", "Noruega": "no", "Hungria": "hu", "Romênia": "ro",
    "Trinidad e Tobago": "tt", "Haiti": "ht", "Curaçao": "cw", "Guadalupe": "gp", "Martinica": "mq",
    "Nicarágua": "ni", "Guatemala": "gt", "Cuba": "cu",
    "China": "cn", "Índia": "in", "Vietnã": "vn", "Tailândia": "th", "Indonésia": "id", "Filipinas": "ph",
    "Bahrein": "bh", "Emirados Árabes Unidos": "ae", "Jordânia": "jo", "Líbano": "lb", "Síria": "sy",
    "Omã": "om", "Quirguistão": "kg", "Turcomenistão": "tm", "Tajiquistão": "tj", "Palestina": "ps"
  };

  // ---------- helpers de clube ----------
  function leagueOf(g, clubId) {
    if (g.leagueOf && g.leagueOf[clubId]) return g.leagueOf[clubId];
    return D.CLUBS[clubId].league;
  }
  function club(id) { return D.CLUBS[id]; }
  function myClub(g) { return D.CLUBS[g.player.clubId]; }
  function isBrazilLeague(l) { return l === "BRA" || l === "BRB"; }
  // disciplina (cartão/suspensão) por competição: um cartão no Brasileirão não pode
  // suspender o jogador na Libertadores nem vice-versa — cada grupo tem seu próprio
  // contador (p.disc[grupo]). Seleção continua isenta via isNatMatch (checado à parte,
  // nunca chama esta função) — mesma regra que já existia.
  const DISC_GROUP = { LIB: "CONTI", SUL: "CONTI", UCL: "CONTI", UEL: "CONTI", UECL: "CONTI", COPA: "CDB" };
  function discGroup(fx) {
    return DISC_GROUP[fx.compKey] || fx.compKey; // LIGA/EST/CDB/MUN/SUPER já usam o próprio compKey
  }
  function natTeamObj(name) {
    const flag = NAT_FLAGS[name] || null;
    return { id: "nat:" + name, name: name, short: name.slice(0, 3).toUpperCase(), str: D.NAT_STR[name] || 74, c1: "#1a4c9c", c2: "#f2c500", pat: "half", isNation: true, flag: flag, rivals: [] };
  }
  function oppObj(g, id) {
    if (typeof id === "string" && id.indexOf("nat:") === 0) return natTeamObj(id.slice(4));
    return D.CLUBS[id];
  }

  // ---------- criação de personagem ----------
  const ATTRS = ["pac", "fin", "pas", "dri", "def", "fis", "bp", "ref", "posn"];

  function overallOf(attrs, pos) {
    const w = D.POSITIONS[pos].weights;
    let s = 0;
    ATTRS.forEach(function (a) { s += (attrs[a] || 0) * (w[a] || 0); });
    return Math.round(s);
  }

  function buildAttrs(pos, archId, legendIds, rng) {
    const P = D.POSITIONS[pos];
    const attrs = {};
    ATTRS.forEach(function (a) {
      attrs[a] = 40 + Math.round((P.weights[a] || 0) * 95) + U.ri(-4, 4, rng);
    });
    // goleiro não finaliza; linha não usa reflexo
    if (pos !== "GOL") attrs.ref = U.ri(28, 42, rng);
    else { attrs.fin = U.ri(22, 34, rng); attrs.dri = U.ri(26, 40, rng); }
    const arch = P.archs.find(function (a) { return a.id === archId; }) || P.archs[0];
    Object.keys(arch.boost).forEach(function (k) { attrs[k] += arch.boost[k]; });
    (legendIds || []).forEach(function (lid) {
      const L = D.LEGENDS.find(function (x) { return x.id === lid; });
      if (L) Object.keys(L.boost).forEach(function (k) { attrs[k] += L.boost[k]; });
    });
    // normaliza overall para 60–70
    const target = U.ri(60, 70, rng);
    const cur = overallOf(attrs, pos);
    const f = target / cur;
    ATTRS.forEach(function (a) { attrs[a] = U.clamp(Math.round(attrs[a] * f), 25, 92); });
    return attrs;
  }

  function newGame(opts) {
    const seed = Date.now() % 100000000;
    const rng = U.mulberry32(seed);
    const attrs = buildAttrs(opts.pos, opts.archId, opts.legendIds, rng);
    const ov = overallOf(attrs, opts.pos);
    const cl = D.CLUBS[opts.clubId];
    const salary = calcSalary(ov, cl.str, cl.league);
    const g = {
      v: 1, seed: seed, year: 2026,
      player: {
        name: opts.name, pos: opts.pos, archId: opts.archId, foot: opts.foot, num: opts.num,
        nat: opts.natId, age: opts.age, attrs: attrs, overall: ov,
        pot: Math.min(99, ov + U.ri(6, 24, rng)),
        clubId: opts.clubId, salary: salary, contractEnd: 2026 + U.ri(1, 2, rng),
        condition: 100, morale: 70, fame: opts.natId === "BR" ? 8 : 5, rep: 55, money: 0, xp: 0,
        injury: 0, disc: {},
        legendIds: opts.legendIds || [],
        takerPen: false, takerFK: false,
        natTeam: { convocado: false, caps: 0, goals: 0, qualified: true },
        career: [], titles: [], awards: [],
        hist: [{ y: 2026, ov: ov }],
        marketValue: 0, milestones: [], assets: [], ballon: [],
        clubGoals: {}, idolClubs: [], compGoals: {},
        traits: [], decisiveGoals: 0, captain: null, squadRole: "titular", potUps: 0,
        records: { hatTricks: 0, bestSeasonG: 0, bestSeasonAvg: 0, biggestWin: null },
        seenLiveIntro: false
      },
      leagueOf: {}, champs: {}, feed: [], customLogos: {},
      boardFail: 0, retired: false, transferRequested: false,
      trainingFocus: "equil", manager: null,
      h2h: { v: 0, e: 0, d: 0 },
      clubRivalry: {},
      pendingOffers: null, pendingSummary: null
    };
    // histórico real pré-carregado
    Object.keys(D.CHAMPS_SEED).forEach(function (k) {
      g.champs[k] = Object.assign({}, D.CHAMPS_SEED[k]);
    });
    g.rival = makeRival(g, rng);
    g.worldStars = makeWorldStars(g, rng);
    g.world = CQ.world.buildWorld(g);
    refreshWorldLeagues(g);
    g.player.marketValue = marketValue(g.player);
    startSeason(g);
    return g;
  }

  // ---------- valor de mercado ----------
  function marketValue(p) {
    const ageF = p.age <= 20 ? 0.82 : p.age <= 27 ? 1.0 : p.age <= 30 ? 0.72 : p.age <= 33 ? 0.42 : 0.18;
    const base = Math.pow(Math.max(0, p.overall - 40) / 10, 3.2) * 850000;
    const v = base * ageF * (1 + p.fame / 170);
    return Math.max(200000, Math.round(v / 100000) * 100000);
  }

  // nomes reais de craques atuais (apenas nomes — fatos, sem imagem/escudo)
  // craques do mundo com CLUBE REAL pareado (nomes são fatos; sem imagem/escudo oficial)
  const REAL_WORLD_STARS = [
    { name: "Kylian Mbappé", club: "Real Madrid", pos: "ATA", ovr: 94 },
    { name: "Erling Haaland", club: "Manchester City", pos: "ATA", ovr: 93 },
    { name: "Vinícius Júnior", club: "Real Madrid", pos: "PON", ovr: 92 },
    { name: "Jude Bellingham", club: "Real Madrid", pos: "MEI", ovr: 91 },
    { name: "Lamine Yamal", club: "Barcelona", pos: "PON", ovr: 90 },
    { name: "Harry Kane", club: "Bayern de Munique", pos: "ATA", ovr: 90 },
    { name: "Mohamed Salah", club: "Liverpool", pos: "PON", ovr: 89 },
    { name: "Rodri", club: "Manchester City", pos: "VOL", ovr: 89 },
    { name: "Lautaro Martínez", club: "Inter de Milão", pos: "ATA", ovr: 88 },
    { name: "Florian Wirtz", club: "Liverpool", pos: "MEI", ovr: 88 },
    { name: "Bukayo Saka", club: "Arsenal", pos: "PON", ovr: 88 },
    { name: "Pedri", club: "Barcelona", pos: "MEI", ovr: 87 },
    { name: "Kevin De Bruyne", club: "Napoli", pos: "MEI", ovr: 87 },
    { name: "Rafael Leão", club: "Milan", pos: "PON", ovr: 86 },
    { name: "Achraf Hakimi", club: "Paris Saint-Germain", pos: "LAT", ovr: 86 }
  ];

  // ---------- craques do mundo (para Bola de Ouro / ranking) ----------
  function makeWorldStars(g, rng) {
    // usa os pareamentos reais (nome↔clube consistente em todo o jogo)
    return REAL_WORLD_STARS.slice(0, 12).map(function (s) {
      return { name: s.name, pos: s.pos, clubName: s.club, ovr: s.ovr - U.ri(0, 1, rng) };
    });
  }

  // pontuação anual de um craque NPC (determinística por temporada)
  function starScore(g, star, idx) {
    const rng = U.rngFor(g.seed, "star", g.year, star.name, idx);
    let s = (star.ovr - 75) * 8.4 + U.ri(3, 26, rng);
    if (U.chance(0.4, rng)) s += U.ri(24, 46, rng); // levou um título grande / grande temporada
    return Math.round(s);
  }

  // evolui os craques do mundo a cada ano
  function worldStarsEnd(g) {
    const rng = U.rngFor(g.seed, "starsend", g.year);
    g.worldStars.forEach(function (st) {
      if (U.chance(0.5, rng)) st.ovr += U.ri(-1, 1, rng);
      st.ovr = U.clamp(st.ovr, 84, 95);
    });
    // um veterano some, entra uma promessa (gerada; nome novo, não reutiliza reais)
    if (U.chance(0.5, rng)) {
      g.worldStars.sort(function (a, b) { return b.ovr - a.ovr; });
      g.worldStars.pop();
      g.worldStars.push({ name: U.nameGen(rng, U.choice(["BR", "AR", "FR"], rng)), pos: U.choice(["ATA", "PON", "MEI"], rng), clubName: U.choice(["Real Madrid", "Manchester City", "Barcelona", "Paris Saint-Germain"], rng), ovr: U.ri(86, 90, rng) });
    }
  }

  // pontuação de Bola de Ouro do jogador nesta temporada
  function ballonScore(g, avg, ligaG) {
    const p = g.player;
    const y = g.year;
    let titleBonus = 0;
    p.titles.filter(function (t) { return t.year === y; }).forEach(function (t) {
      titleBonus += ({ SUPER: 50, WC: 45, UCL: 30, MUN: 26, LIB: 24, EU: 18, CA: 18, BRA: 12, LIGA: 12, CDB: 6, COPA: 6, EST: 2 }[t.key] || 4);
    });
    // defensores/goleiros: a média (avg) já é o "equivalente a gol" da posição
    // (docs/RATING_MODEL.md) — pesa mais aqui pra compensar não ter g/a de peso
    const avgMult = (p.pos === "GOL" || p.pos === "ZAG" || p.pos === "LAT" || p.pos === "VOL") ? 22 : 15;
    let s = p.stats.g * 1.25 + p.stats.a * 0.75 + Math.max(0, avg - 6.8) * avgMult + p.fame * 0.25 + titleBonus + (p.overall - 80) * 3;
    if (p.pos === "GOL") s += p.stats.cs * 1.6; // goleiros pontuam por clean sheets
    else if (p.pos === "ZAG" || p.pos === "LAT") s += p.stats.cs * 1.0; // zaga também
    else if (p.pos === "VOL") s += p.stats.cs * 0.6; // volante protege a zaga, crédito menor
    // ser artilheiro da liga vale muito na corrida
    if (g.season && (g.season.scorerTop != null) && ligaG > g.season.scorerTop) s += 16;
    return Math.round(s);
  }

  // ranking mundial (top jogadores do ano), com o jogador inserido
  function ballonRanking(g, playerScore) {
    const list = g.worldStars.map(function (st, i) {
      return { name: st.name, club: st.clubName, pos: st.pos, score: starScore(g, st, i), me: false };
    });
    list.push({ name: g.player.name, club: myClub(g).name, pos: g.player.pos, score: playerScore, me: true });
    list.sort(function (a, b) { return b.score - a.score; });
    return list;
  }

  function calcSalary(ov, clubStr, league) {
    const mult = isBrazilLeague(league) ? (league === "BRB" ? 0.45 : 1) : 2.3;
    const v = (ov * ov * 9 + Math.max(0, clubStr - 58) * 2600) * mult;
    return Math.round(v / 500) * 500;
  }

  // ---------- rival de geração ----------
  function makeRival(g, rng) {
    const p = g.player;
    const myCl = D.CLUBS[p.clubId];
    let clubPool = (myCl.rivals || []).filter(function (id) { return leagueOf(g, id) === leagueOf(g, p.clubId); });
    if (!clubPool.length) clubPool = D.clubsOf(leagueOf(g, p.clubId)).filter(function (c) { return c.id !== p.clubId && c.str >= 76; }).map(function (c) { return c.id; });
    if (!clubPool.length) clubPool = [p.clubId === "fla" ? "pal" : "fla"];
    return {
      name: U.nameGen(rng, "BR"), pos: p.pos, age: p.age + U.ri(-1, 1, rng),
      clubId: U.choice(clubPool, rng), overall: p.overall + U.ri(-1, 5, rng),
      seasonG: 0, seasonA: 0, careerG: 0, awards: [], gen: 1, retiredNames: []
    };
  }

  function rivalSeasonSim(g) {
    const r = g.rival;
    const rng = U.rngFor(g.seed, "rival", g.year);
    const base = { GOL: 0, ZAG: 2, LAT: 3, VOL: 4, MEI: 9, PON: 14, ATA: 18 }[r.pos] || 8;
    const f = U.clamp((r.overall - 62) / 20, 0.3, 1.8);
    r.seasonG = Math.max(0, Math.round(base * f + U.ri(-3, 5, rng)));
    r.seasonA = Math.max(0, Math.round(base * 0.5 * f + U.ri(-2, 4, rng)));
    r.careerG += r.seasonG;
  }

  function rivalSeasonEnd(g, notes) {
    const r = g.rival;
    const rng = U.rngFor(g.seed, "rivalend", g.year);
    r.age++;
    if (r.age <= 24) r.overall += U.ri(1, 4, rng);
    else if (r.age <= 29) r.overall += U.ri(0, 2, rng);
    else if (r.age <= 33) r.overall += U.ri(-1, 1, rng);
    else r.overall -= U.ri(1, 3, rng);
    r.overall = U.clamp(r.overall, 55, 96);
    // transferência
    if (U.chance(0.22, rng)) {
      let dest;
      if (r.overall >= 81 && U.chance(0.6, rng)) {
        const lg = U.choice(D.EURO_LEAGUES, rng);
        dest = U.choice(D.clubsOf(lg).filter(function (c) { return c.str >= 78; }), rng);
      } else {
        dest = U.choice(D.clubsOf("BRA").filter(function (c) { return c.id !== r.clubId && c.id !== g.player.clubId; }), rng);
      }
      if (dest) { r.clubId = dest.id; notes.push({ t: "rival-transfer", club: dest.name }); }
    }
    // aposentadoria → novo rival (guarda o retrospecto do antigo)
    if (r.age >= 34 && (r.overall < 68 || r.age >= 37)) {
      r.retiredNames.push(r.name);
      const old = r.name;
      g.rivalHistory = g.rivalHistory || [];
      g.rivalHistory.push({
        name: r.name, gen: r.gen, careerG: r.careerG, awards: r.awards.length,
        h2h: { v: g.h2h.v, e: g.h2h.e, d: g.h2h.d }, retiredAt: g.year, age: r.age
      });
      const nr = makeRival(g, rng);
      nr.gen = r.gen + 1; nr.retiredNames = r.retiredNames; nr.careerG = 0;
      nr.age = g.player.age >= 30 ? U.ri(18, 22, rng) : g.player.age + U.ri(-1, 1, rng);
      nr.overall = U.clamp(g.player.overall + U.ri(-4, 3, rng), 60, 90);
      g.rival = nr;
      g.h2h = { v: 0, e: 0, d: 0 };
      notes.push({ t: "rival-retire", old: old, novo: nr.name });
    }
  }

  // ---------- geração de confrontos (round robin círculo) ----------
  function roundsRR(ids, rng) {
    let teams = ids.slice();
    if (rng) teams = U.shuffle(teams, rng);
    if (teams.length % 2) teams.push(null);
    const n = teams.length, half = n / 2, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < half; i++) {
        const a = teams[i], b = teams[n - 1 - i];
        if (a != null && b != null) pairs.push(r % 2 ? [b, a] : [a, b]);
      }
      rounds.push(pairs);
      teams.splice(1, 0, teams.pop());
    }
    return rounds;
  }
  function doubleRR(ids, rng) {
    const first = roundsRR(ids, rng);
    const second = first.map(function (rd) { return rd.map(function (p) { return [p[1], p[0]]; }); });
    return first.concat(second);
  }

  // ---------- temporada ----------
  function startSeason(g) {
    const p = g.player;
    const lg = leagueOf(g, p.clubId);
    const cl = myClub(g);
    const S = { comps: {}, queue: [], idx: 0, lastRes: null, played: 0 };
    g.season = S;
    const rngS = U.rngFor(g.seed, "season", g.year);

    p.disc = {}; // cartões/suspensão zeram por temporada, por competição (ver discGroup)
    p.stats = freshStats();
    S.brazil = isBrazilLeague(lg);

    // meta da diretoria
    g.board = boardGoal(cl, lg);

    if (S.brazil) {
      buildBrazilSeason(g, S, lg, rngS);
    } else {
      buildEuroSeason(g, S, lg, rngS);
    }
    // seleção
    buildNationalCycle(g, S, rngS);
    // Mundial de Clubes / Supermundial (se aplicável)
    buildMundialCycle(g, S);
    // artilheiros NPC da liga (corrida do goleador)
    buildScorers(g, S, lg);
    // técnico do clube (com regressão de confiança à média a cada ano)
    ensureManager(g);
    if (g.manager.clubId === p.clubId && (g.season.played || 0) === 0 && g.year > 2026) seasonConfDrift(g);
  }

  // gera os artilheiros/garçons NPC da liga do jogador
  // melhor atacante REAL de um clube (do mesmo elenco mostrado em Clube→Elenco) —
  // lê do mundo persistente (maior overall entre ATA/PON/MEI) quando existir;
  // fallback pro comportamento antigo (primeiro por ordem de posição) senão.
  function topAttackerName(g, clubId, rng) {
    const roster = g.world && g.world.clubs[clubId] && g.world.clubs[clubId].roster;
    if (roster) {
      const ord = ["ATA", "PON", "MEI"];
      const cands = roster.filter(function (pl) { return ord.indexOf(pl.pos) >= 0; });
      if (cands.length) return cands.reduce(function (a, b) { return b.ovr > a.ovr ? b : a; }).name;
    }
    const sq = D.REAL_SQUADS && D.REAL_SQUADS[clubId];
    if (sq) {
      const ord = ["ATA", "PON", "MEI"];
      for (let k = 0; k < ord.length; k++) {
        const found = sq.find(function (pl) { return pl.p === ord[k]; });
        if (found) return found.n;
      }
      return sq[0].n;
    }
    return U.nameGen(rng, "BR");
  }
  function buildScorers(g, S, lg) {
    const rng = U.rngFor(g.seed, "scorers", lg, g.year);
    // teto do artilheiro conforme a força da liga
    const strong = ["ESP", "ENG", "ITA", "GER", "FRA"].indexOf(lg) >= 0;
    const top = strong ? U.ri(26, 33, rng) : lg === "BRA" ? U.ri(22, 29, rng) : lg === "POR" ? U.ri(23, 30, rng) : U.ri(17, 23, rng);
    // clubes por força (exceto o do jogador) → o artilheiro de cada é o craque REAL do elenco
    const clubs = D.clubsOf(lg).filter(function (c) { return c.id !== g.player.clubId; }).sort(function (a, b) { return b.str - a.str; });
    const scorers = [];
    for (let i = 0; i < Math.min(12, clubs.length); i++) {
      const cl = clubs[i];
      const gTarget = Math.max(6, Math.round(top - i * U.rf(1.4, 2.4, rng)));
      scorers.push({ name: topAttackerName(g, cl.id, rng), clubId: cl.id, g: gTarget, a: U.ri(4, 13, rng) });
    }
    // projeção do rival para a corrida ao vivo
    const rbase = { GOL: 0, ZAG: 2, LAT: 3, VOL: 4, MEI: 9, PON: 14, ATA: 18 }[g.rival.pos] || 8;
    g.rival.seasonProj = Math.max(0, Math.round(rbase * U.clamp((g.rival.overall - 62) / 20, 0.3, 1.8)));
    S.scorers = scorers;
    S.scorerTop = top;
  }

  // progresso da liga (0..1) para projetar os NPCs "ao vivo"
  function ligaProgress(g) {
    const L = g.season.comps.LIGA;
    if (!L) return 0;
    let played = 0;
    for (let r = 1; r <= L.nRounds; r++) if (L.results[r] && L.results[r].length) played++;
    return U.clamp(played / L.nRounds, 0, 1);
  }

  // tabela de artilheiros ao vivo (jogador + rival + NPCs)
  function scoreboard(g, kind) {
    const S = g.season, p = g.player;
    const frac = Math.max(ligaProgress(g), (p.stats.byComp.LIGA ? p.stats.byComp.LIGA.j : 0) / (S.comps.LIGA ? S.comps.LIGA.nRounds : 38));
    const rows = (S.scorers || []).map(function (s) {
      return { name: s.name, clubId: s.clubId, g: Math.round(s.g * frac), a: Math.round(s.a * frac), me: false };
    });
    const my = p.stats.byComp.LIGA || { g: 0, a: 0 };
    rows.push({ name: p.name, clubId: p.clubId, g: my.g, a: my.a, me: true, you: true });
    // rival na mesma liga
    if (leagueOf(g, g.rival.clubId) === leagueOf(g, p.clubId)) {
      const rProj = g.rival.seasonProj || Math.round((g.rival.overall - 60) / 2);
      rows.push({ name: g.rival.name, clubId: g.rival.clubId, g: Math.round(rProj * frac), a: Math.round(rProj * 0.4 * frac), me: false, rival: true });
    }
    rows.sort(function (a, b) { return (kind === "a" ? b.a - a.a : b.g - a.g) || (b.g + b.a) - (a.g + a.a); });
    return rows;
  }

  function freshStats() {
    return { j: 0, g: 0, a: 0, cs: 0, saves: 0, notaSum: 0, notaN: 0, vitimas: {}, byComp: {} };
  }

  function boardGoal(cl, lg) {
    const s = cl.str;
    if (lg === "BRB") return { type: "acesso", desc: "Conquistar o acesso à Série A (G-4)", pos: 4 };
    if (s >= 84) return { type: "titulo", desc: "Brigar pelo título da liga (Top 2)", pos: 2 };
    if (s >= 78) return { type: "continental", desc: "Garantir vaga continental (Top 6)", pos: 6 };
    if (s >= 73) return { type: "meio", desc: "Terminar no meio de tabela (Top 12)", pos: 12 };
    return { type: "fuga", desc: "Fugir do rebaixamento", pos: 16 };
  }

  function leagueComp(g, id, name, teamIds, rounds, rngS) {
    return {
      kind: "league", id: id, name: name, teamIds: teamIds,
      rounds: rounds, results: {}, nRounds: rounds.length
    };
  }

  function buildBrazilSeason(g, S, lg, rngS) {
    const p = g.player, cl = myClub(g);
    // ---- Estadual ----
    if (cl.uf && D.ESTADUAIS[cl.uf]) {
      let field = D.stateField(cl.uf).map(function (c) { return c.id; });
      if (field.length < 6) {
        // completa com vizinhos genéricos do interior
        D.clubsOf("EST").slice(0, 8 - field.length).forEach(function (c) { if (field.indexOf(c.id) < 0) field.push(c.id); });
      }
      field = field.slice(0, 12);
      if (field.indexOf(p.clubId) < 0) field.unshift(p.clubId);
      const allRounds = doubleRR(field, U.rngFor(g.seed, "est", g.year));
      const rounds = allRounds.slice(0, 8).map(function (rd) { return rd; });
      S.comps.EST = leagueComp(g, "EST", D.ESTADUAIS[cl.uf], field, rounds, rngS);
      S.comps.EST.knock = { sf: null, f: null, champion: null, done: false };
      for (let r = 1; r <= 8; r++) S.queue.push({ comp: "EST", round: r });
      S.queue.push({ comp: "EST", stage: "SF" });
      S.queue.push({ comp: "EST", stage: "F" });
    }

    // ---- Liga nacional ----
    const teamIds = leagueTeamIds(g, lg);
    const rounds = doubleRR(teamIds, U.rngFor(g.seed, "liga", lg, g.year));
    S.comps.LIGA = leagueComp(g, lg, D.LEAGUES[lg].name, teamIds, rounds, rngS);

    // ---- Copa do Brasil ----
    const cdbTeams = cupField(g, rngS);
    S.comps.CDB = cupComp("CDB", "Copa do Brasil", cdbTeams, ["R16", "QF", "SF", "F"], U.rngFor(g.seed, "cdb", g.year));

    // ---- Continental ----
    let conti = null;
    const qual = g.lastPos != null ? g.lastPos : strengthRank(g, lg, p.clubId);
    if (lg === "BRA") {
      if (qual <= 6) conti = "LIB";
      else if (qual <= 12) conti = "SUL";
    }
    if (conti) {
      const pool = D.clubsOf("SAM").map(function (c) { return c.id; });
      const rngC = U.rngFor(g.seed, conti, g.year);
      const groupOpps = U.shuffle(pool, rngC).slice(0, 3);
      const gids = [p.clubId].concat(groupOpps);
      S.comps.CONTI = {
        kind: "conti", id: conti, name: conti === "LIB" ? "Libertadores" : "Sul-Americana",
        group: leagueComp(g, conti + "G", "Grupo", gids, doubleRR(gids, rngC), rngS),
        koStages: ["R16", "QF", "SF", "F"], bracket: null, alive: true, champion: null, eliminatedAt: null
      };
    }

    // intercala o returno: liga + copas
    const nR = rounds.length;
    const cdbAfter = { 8: "R16", 14: "QF", 21: "SF", 29: "F" };
    const contiGroupAfter = [3, 5, 7, 9, 11, 13];
    // mata-mata continental de ida e volta: oitavas/quartas/semi têm 2 jogos, final tem 1
    const contiKoAfter = { 16: [0, 1], 18: [0, 2], 21: [1, 1], 23: [1, 2], 26: [2, 1], 28: [2, 2], 32: [3, 0] };
    let cg = 0;
    for (let r = 1; r <= nR; r++) {
      S.queue.push({ comp: "LIGA", round: r });
      if (S.comps.CONTI && contiGroupAfter.indexOf(r) >= 0 && cg < S.comps.CONTI.group.rounds.length) {
        cg++;
        S.queue.push({ comp: "CONTI", phase: "G", round: cg });
      }
      if (cdbAfter[r]) S.queue.push({ comp: "CDB", stage: cdbAfter[r] });
      if (S.comps.CONTI && contiKoAfter[r]) S.queue.push({ comp: "CONTI", phase: "KO", ko: contiKoAfter[r][0], leg: contiKoAfter[r][1] });
    }
  }

  function buildEuroSeason(g, S, lg, rngS) {
    const p = g.player;
    const teamIds = leagueTeamIds(g, lg);
    const rounds = doubleRR(teamIds, U.rngFor(g.seed, "liga", lg, g.year));
    S.comps.LIGA = leagueComp(g, lg, D.LEAGUES[lg].name, teamIds, rounds, rngS);

    // copa nacional
    const others = teamIds.filter(function (id) { return id !== p.clubId; });
    const field = [p.clubId].concat(U.shuffle(others, U.rngFor(g.seed, "copa", g.year)).slice(0, 15));
    S.comps.COPA = cupComp("COPA", D.LEAGUES[lg].cupName, field, ["R16", "QF", "SF", "F"], U.rngFor(g.seed, "copa2", g.year));

    // europa: UCL/UEL/UECL — mesma cascata real da UEFA (quem passa perto da Europa
    // League mas não entra nela vai pra Conference League, "terceiro nível" continental)
    const qual = g.lastPos != null ? g.lastPos : strengthRank(g, lg, p.clubId);
    let conti = null;
    if (qual <= 4) conti = "UCL"; else if (qual <= 6) conti = "UEL"; else if (qual <= 8) conti = "UECL";
    if (conti) {
      const contiStr = { UCL: 78, UEL: 72, UECL: 70 }[conti];
      const pool = [];
      D.EURO_LEAGUES.forEach(function (l) {
        if (l === lg) return;
        D.clubsOf(l).forEach(function (c) { if (c.str >= contiStr) pool.push(c.id); });
      });
      const rngC = U.rngFor(g.seed, conti, g.year);
      const gids = [p.clubId].concat(U.shuffle(pool, rngC).slice(0, 3));
      S.comps.CONTI = {
        kind: "conti", id: conti, name: conti === "UCL" ? "Champions League" : conti === "UEL" ? "Europa League" : "Conference League",
        group: leagueComp(g, conti + "G", "Grupo", gids, doubleRR(gids, rngC), rngS),
        koStages: ["R16", "QF", "SF", "F"], bracket: null, alive: true, champion: null, eliminatedAt: null
      };
    }

    const nR = rounds.length;
    const cupAfter = { 6: "R16", 13: "QF", 20: "SF", 28: "F" };
    const contiGroupAfter = [2, 4, 6, 8, 10, 12];
    // mata-mata continental de ida e volta: oitavas/quartas/semi têm 2 jogos, final tem 1
    const contiKoAfter = { 15: [0, 1], 17: [0, 2], 20: [1, 1], 22: [1, 2], 25: [2, 1], 27: [2, 2], 31: [3, 0] };
    let cg = 0;
    for (let r = 1; r <= nR; r++) {
      S.queue.push({ comp: "LIGA", round: r });
      if (S.comps.CONTI && contiGroupAfter.indexOf(r) >= 0 && cg < S.comps.CONTI.group.rounds.length) {
        cg++;
        S.queue.push({ comp: "CONTI", phase: "G", round: cg });
      }
      if (cupAfter[r]) S.queue.push({ comp: "COPA", stage: cupAfter[r] });
      if (S.comps.CONTI && contiKoAfter[r]) S.queue.push({ comp: "CONTI", phase: "KO", ko: contiKoAfter[r][0], leg: contiKoAfter[r][1] });
    }
  }

  function leagueTeamIds(g, lg) {
    const base = Object.keys(D.CLUBS).filter(function (id) { return leagueOf(g, id) === lg; });
    return base;
  }

  function strengthRank(g, lg, clubId) {
    const ids = leagueTeamIds(g, lg).slice().sort(function (a, b) { return D.CLUBS[b].str - D.CLUBS[a].str; });
    return ids.indexOf(clubId) + 1;
  }

  // ---------- Mundial de Clubes / Supermundial ----------
  // clube (com id de verdade) que "ganhou" a outra competição continental naquele ano —
  // usado para achar o adversário do Mundial de Clubes (não dá pra usar g.champs porque
  // lá só fica guardado o NOME do campeão, não o id do clube).
  function pickContiChampionClub(g, contiId, year) {
    const rng = U.rngFor(g.seed, "mundialopp", contiId, year);
    const pool = contiId === "LIB"
      ? D.clubsOf("SAM").concat(D.clubsOf("BRA").filter(function (c) { return c.str >= 80; }))
      : D.EURO_LEAGUES.reduce(function (acc, l) { return acc.concat(D.clubsOf(l).filter(function (c) { return c.str >= 84; })); }, []);
    return pickWeighted(pool, rng);
  }

  function buildMundialCycle(g, S) {
    const p = g.player, y = g.year;
    const myClubName = myClub(g).name;
    const contiKeys = ["LIB", "UCL"];
    // só conta título ganho enquanto já estava NESTE clube (o convite é do clube, não segue
    // o jogador se ele for pra outro time depois de ser campeão)
    const wonLastSeason = p.titles.find(function (t) { return t.year === y - 1 && contiKeys.indexOf(t.key) >= 0 && t.club === myClubName; });
    const isSuperYear = (y - 2029) % 4 === 0;
    const recentContiWin = p.titles.some(function (t) { return t.year >= y - 4 && t.year <= y - 1 && contiKeys.indexOf(t.key) >= 0 && t.club === myClubName; });

    if (isSuperYear && recentContiWin) {
      // Supermundial: torneio grande e raro (a cada 4 anos), clubes de todas as confederações
      const rng = U.rngFor(g.seed, "super", y);
      const bigPool = D.clubsOf("SAM")
        .concat(D.clubsOf("BRA").filter(function (c) { return c.id !== p.clubId && c.str >= 78; }))
        .concat(D.EURO_LEAGUES.reduce(function (acc, l) { return acc.concat(D.clubsOf(l).filter(function (c) { return c.id !== p.clubId && c.str >= 78; })); }, []));
      const bigIds = bigPool.map(function (c) { return c.id; });
      const groupOpps = U.shuffle(bigIds, rng).slice(0, 3);
      const at = Math.floor(S.queue.length * 0.5);
      const block = groupOpps.map(function (o, i) {
        return { comp: "SUPER", phase: "G", n: i + 1, opp: o, home: i !== 2 };
      });
      const koKeys = ["R16", "QF", "SF", "F"];
      koKeys.forEach(function (k) { block.push({ comp: "SUPER", phase: "KO", stage: k }); });
      S.queue.splice.apply(S.queue, [at, 0].concat(block));
      S.super = { name: "Supermundial", groupPts: 0, groupOpps: groupOpps, alive: true, groupDone: false, koKeys: koKeys, bracket: null, record: [], eliminatedAt: null, champion: null };
    } else if (wonLastSeason) {
      // Mundial de Clubes: confronto único (estilo Intercontinental pré-2000) contra o
      // campeão da outra competição continental
      const oppConti = wonLastSeason.key === "LIB" ? "UCL" : "LIB";
      const oppClub = pickContiChampionClub(g, oppConti, y - 1);
      const homeRng = U.rngFor(g.seed, "mundialhome", y);
      const home = U.chance(0.5, homeRng);
      const at = Math.max(1, Math.floor(S.queue.length * 0.04));
      S.queue.splice(at, 0, { comp: "MUN", opp: oppClub.id, home: home });
      S.mundial = { opp: oppClub.id, done: false, champion: null };
    }
  }

  function cupField(g, rngS) {
    const p = g.player;
    const rng = U.rngFor(g.seed, "cdbfield", g.year);
    const pool = D.clubsOf("BRA").concat(D.clubsOf("BRB")).map(function (c) { return c.id; }).filter(function (id) { return id !== p.clubId; });
    return [p.clubId].concat(U.shuffle(pool, rng).slice(0, 15));
  }

  // twoLeg: mata-mata de ida e volta (competições continentais). A FINAL é sempre jogo
  // único — formato real de Libertadores/Sul-Americana (desde 2019) e de Champions/Europa.
  // Sem o parâmetro, todo estágio nasce com 1 partida: Copa do Brasil, copa nacional,
  // Estadual, Supermundial e mata-mata de Seleção seguem exatamente como sempre foram.
  function cupComp(id, name, teams, stageKeys, rng, twoLeg) {
    const order = U.shuffle(teams, rng);
    return {
      kind: "cup", id: id, name: name, teams: order,
      stages: stageKeys.map(function (k) { return { key: k, ties: null, legs: (twoLeg && k !== "F") ? 2 : 1 }; }),
      curStage: 0, alive: true, champion: null, eliminatedAt: null
    };
  }
  // quantas partidas decidem um estágio (1 = jogo único). Saves antigos não têm o campo —
  // tratar ausência como 1 mantém o comportamento anterior sem migração nenhuma.
  function stageLegs(compCup, stageIdx) {
    const st = compCup && compCup.stages && compCup.stages[stageIdx];
    return (st && st.legs) || 1;
  }
  // soma o agregado do confronto (ida + volta) do ponto de vista do jogador e diz se está
  // empatado. Fixture de jogo único não tem aggMine/aggOpp → cai no placar da partida, que
  // é o comportamento de sempre. Usada pelo motor E pelo modo ao vivo (js/live.js) — uma
  // regra só, pra pênaltis nunca divergirem entre os dois caminhos.
  function tieDrawn(fx, res) {
    return ((fx.aggMine || 0) + res.gm) === ((fx.aggOpp || 0) + res.go);
  }
  const STAGE_NAMES = { R32: "Dezesseis avos de final", R16: "Oitavas de final", QF: "Quartas de final", SF: "Semifinal", F: "FINAL", G: "Fase de grupos", "3RD": "Disputa de 3º lugar" };

  // ---------- ciclo de seleções ----------
  function tournamentOfYear(g) {
    const confed = D.NATIONS[g.player.nat].confed;
    if (g.year % 4 === 2) return { key: "WC", name: "Copa do Mundo" };
    if (g.year % 4 === 0) {
      return {
        CONMEBOL: { key: "CA", name: "Copa América" },
        UEFA: { key: "EU", name: "Eurocopa" },
        CONCACAF: { key: "GC", name: "Copa Ouro" },
        AFC: { key: "AC", name: "Copa da Ásia" }
      }[confed];
    }
    return null;
  }

  function buildNationalCycle(g, S, rngS) {
    const p = g.player;
    if (!p.natTeam.convocado) return;
    const nat = D.NATIONS[p.nat];
    const tour = tournamentOfYear(g);
    const rng = U.rngFor(g.seed, "sel", g.year);
    const pool = D.CONFED_POOL[nat.confed].filter(function (n) { return n !== nat.name; });
    if (!tour) {
      // eliminatórias: 4 janelas de 2 jogos (antes eram só 2 janelas — pouco pra render
      // uma campanha de verdade e dar chance real de se firmar na seleção)
      const need = 8;
      let opps = U.shuffle(pool, rng).slice(0, Math.min(need, pool.length));
      while (opps.length < need) opps = opps.concat(pool.slice(0, need - opps.length));
      const fracs = [0.15, 0.35, 0.55, 0.75];
      const positions = fracs.map(function (f) { return Math.floor(S.queue.length * f); });
      // injeta de trás pra frente pra não bagunçar os índices das janelas já calculadas
      for (let w = fracs.length - 1; w >= 0; w--) {
        S.queue.splice(positions[w], 0,
          { comp: "SEL", kind: "elim", opp: "nat:" + opps[w * 2], home: true },
          { comp: "SEL", kind: "elim", opp: "nat:" + opps[w * 2 + 1], home: false });
      }
      S.sel = { kind: "elim", record: [] };
    } else if (!p.natTeam.qualified) {
      // eliminatória mal-sucedida (ver endSeason) — sem risco real de verdade a
      // classificação era decorativa; sem torneio nenhum pro jogador neste ciclo
      S.sel = { kind: "notqualified", name: tour.name };
    } else {
      // torneio real (Copa do Mundo/Copa América/Eurocopa/Copa Ouro/Copa da Ásia): TODOS os
      // grupos simulados de verdade (não só o do jogador) — mesmo motor de liga
      // (leagueComp/roundsRR/finishLeague/tableOf) já usado pras outras 7 ligas do mundo
      // (refreshWorldLeagues). Mata-mata (2 primeiros de cada grupo + melhores terceiros,
      // conforme TOUR_CONF) usa o mesmo motor de copa já provado na Copa do Brasil
      // (cupComp/buildStageTies/simTie/advanceCup), parametrizado por "myId" em vez de
      // fixo em g.player.clubId, pra poder representar a seleção ("nat:"+nome).
      const cfg = TOUR_CONF[tour.key];
      const tg = buildTourGroups(g, nat, tour.key, cfg, rng);
      const myGrp = tg.groups[tg.myGroup];
      const at = Math.floor(S.queue.length * 0.5);
      const block = [];
      for (let r = 1; r <= myGrp.nRounds; r++) block.push({ comp: "SEL", kind: "tour", phase: "G", round: r });
      cfg.koKeys.forEach(function (k) {
        block.push({ comp: "SEL", kind: "tour", phase: "KO", stage: k });
        if (cfg.thirdPlace && k === "SF") block.push({ comp: "SEL", kind: "tour", phase: "KO", stage: "3RD" });
      });
      S.queue.splice.apply(S.queue, [at, 0].concat(block));
      S.sel = {
        kind: tour.key, name: tour.name, isFullSim: true,
        groups: tg.groups, myGroup: tg.myGroup, groupDone: false,
        koKeys: cfg.koKeys, bracket: null, thirdPlace: null,
        alive: true, eliminatedAt: null, champion: null, record: []
      };
    }
  }

  // ---------- torneios de seleção reais: grupos + mata-mata, parametrizado por competição ----------
  // tamanho de grupo/melhores terceiros/estágios do mata-mata varia por torneio, mas o
  // motor é sempre o mesmo (mesmo padrão de leagueComp/roundsRR/finishLeague pros grupos e
  // cupComp/advanceCup pro mata-mata já provado na Copa do Brasil e na Copa do Mundo)
  // eliminatórias: pontos mínimos pra classificar em 8 jogos (3 vitória/1 empate, 24
  // possíveis) — metade dos pontos disponíveis; ajustar se a taxa de classificação sair
  // muito longe do razoável (ver Verificação)
  const QUALIFY_THRESHOLD = 12;
  const TOUR_CONF = {
    WC: { groupSize: 4, thirds: 8, koKeys: ["R32", "R16", "QF", "SF", "F"], thirdPlace: true },
    CA: { groupSize: 4, thirds: 0, koKeys: ["QF", "SF", "F"], thirdPlace: false },
    EU: { groupSize: 4, thirds: 4, koKeys: ["R16", "QF", "SF", "F"], thirdPlace: false },
    GC: { groupSize: 4, thirds: 0, koKeys: ["QF", "SF", "F"], thirdPlace: false },
    AC: { groupSize: 4, thirds: 4, koKeys: ["R16", "QF", "SF", "F"], thirdPlace: false }
  };

  // campo de seleções de cada torneio: Copa do Mundo usa o pool mundial; Copa América
  // "empresta" 6 seleções da CONCACAF pra fechar 16 (mesma solução da Copa América real,
  // já que a CONMEBOL sozinha só tem 10 membros); as outras 3 usam o pool da própria
  // confederação (já do tamanho real de cada torneio)
  function tourField(nat, key) {
    if (key === "WC") return D.WORLD_POOL.filter(function (n) { return n !== nat.name; });
    if (key === "CA") {
      const guests = D.CONFED_POOL.CONCACAF.slice().sort(function (a, b) { return (D.NAT_STR[b] || 74) - (D.NAT_STR[a] || 74); }).slice(0, 6);
      return D.CONFED_POOL.CONMEBOL.filter(function (n) { return n !== nat.name; }).concat(guests);
    }
    return D.CONFED_POOL[nat.confed].filter(function (n) { return n !== nat.name; });
  }

  function buildTourGroups(g, nat, key, cfg, rng) {
    const others = tourField(nat, key);
    const field = [nat.name].concat(U.shuffle(others, rng));
    const nGroups = Math.floor(field.length / cfg.groupSize);
    const letters = "ABCDEFGHIJKL".split("").slice(0, nGroups);
    const groups = {};
    let myGroup = letters[0];
    letters.forEach(function (l, gi) {
      const names = field.slice(gi * cfg.groupSize, gi * cfg.groupSize + cfg.groupSize);
      const ids = names.map(function (n) { return "nat:" + n; });
      if (names.indexOf(nat.name) >= 0) myGroup = l;
      groups[l] = leagueComp(g, key + "G" + l, "Grupo " + l, ids, roundsRR(ids, U.rngFor(g.seed, "tourgroup", key, l, g.year)));
    });
    return { groups: groups, myGroup: myGroup };
  }

  // resolve todos os grupos por inteiro (mesmo padrão de refreshWorldLeagues — quem não tem
  // o jogador dentro degenera em "resolve tudo de uma vez"; o próprio grupo já deve estar
  // completo a essa altura, isso só é defensivo)
  function finishAllTourGroups(g, T) {
    const myId = "nat:" + D.NATIONS[g.player.nat].name;
    Object.keys(T.groups).forEach(function (l) { finishLeague(g, T.groups[l], myId); });
  }

  // 2 primeiros de cada grupo + N melhores terceiros (N vem de TOUR_CONF; 0 pra torneios
  // sem melhores terceiros — Copa América/Copa Ouro no formato real também não usam)
  function pickTourAdvancers(g, T, cfg) {
    const firsts = [], seconds = [], thirds = [];
    Object.keys(T.groups).forEach(function (l) {
      const tb = tableOf(g, T.groups[l]);
      firsts.push(tb[0].id); seconds.push(tb[1].id);
      if (cfg.thirds > 0) thirds.push({ id: tb[2].id, pts: tb[2].pts, sg: tb[2].gp - tb[2].gc, gp: tb[2].gp });
    });
    if (!cfg.thirds) return firsts.concat(seconds);
    thirds.sort(function (a, b) { return b.pts - a.pts || b.sg - a.sg || b.gp - a.gp; });
    return firsts.concat(seconds, thirds.slice(0, cfg.thirds).map(function (t) { return t.id; }));
  }

  // disputa de 3º lugar (só a Copa do Mundo tem — TOUR_CONF.WC.thirdPlace): os 2 perdedores
  // da semifinal — não faz parte de compCup.stages (esse encadeia só vencedores), por isso
  // fica num campo à parte (T.thirdPlace)
  function resolveTourThird(g, T, myId) {
    if (!T.bracket) return null;
    const sfIdx = T.bracket.stages.findIndex(function (s) { return s.key === "SF"; });
    const sf = T.bracket.stages[sfIdx];
    if (!sf || !sf.ties || !sf.ties.every(function (t) { return t.winner; })) return null; // SF ainda não terminou
    if (!T.thirdPlace) {
      const losers = sf.ties.map(function (t) { return t.winner === t.a ? t.b : t.a; });
      T.thirdPlace = { a: losers[0], b: losers[1], sa: null, sb: null, winner: null, pens: null };
    }
    const tie = T.thirdPlace;
    if (tie.winner) return null;
    if (tie.a !== myId && tie.b !== myId) { simTie(g, T.bracket, "3RD", tie, false, myId); return null; }
    const home = tie.a === myId;
    return mkNatFix(g, T.kind, T.name + " · Disputa de 3º lugar", home ? tie.b : tie.a, home, { decisive: false, knock: true, sel: "tourKO3rd", tie: tie });
  }


  // ---------- tabela / simulação de rodadas de fundo ----------
  function simScore(strH, strA, rng, homeAdv) {
    const adv = homeAdv == null ? 3 : homeAdv;
    // gap de força comprimido → menos goleadas
    const gap = U.clamp((strH + adv - strA) * 0.036, -1.1, 1.1);
    const lh = U.clamp(1.18 + gap, 0.25, 2.9);
    const la = U.clamp(1.05 - gap, 0.2, 2.7);
    return [U.poisson(lh, rng), U.poisson(la, rng)];
  }

  function ensureRound(g, comp, r, myId) {
    const mid = myId != null ? myId : g.player.clubId;
    if (!comp.results[r]) comp.results[r] = [];
    const done = comp.results[r];
    const pairs = comp.rounds[r - 1] || [];
    pairs.forEach(function (pr) {
      const h = pr[0], a = pr[1];
      if (h === mid || a === mid) return; // resolvida pelo jogo real
      if (done.some(function (m) { return m.h === h && m.a === a; })) return;
      const rng = U.rngFor(g.seed, comp.id, g.year, r, h, a);
      const sc = simScore(oppObj(g, h).str, oppObj(g, a).str, rng);
      done.push({ h: h, a: a, hg: sc[0], ag: sc[1] });
    });
  }

  function tableOf(g, comp, uptoRound) {
    const upto = uptoRound || comp.nRounds;
    const T = {};
    comp.teamIds.forEach(function (id) { T[id] = { id: id, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }; });
    for (let r = 1; r <= upto; r++) {
      if (!comp.results[r]) continue;
      comp.results[r].forEach(function (m) {
        const H = T[m.h], A = T[m.a];
        if (!H || !A) return;
        H.j++; A.j++; H.gp += m.hg; H.gc += m.ag; A.gp += m.ag; A.gc += m.hg;
        if (m.hg > m.ag) { H.v++; H.pts += 3; A.d++; }
        else if (m.hg < m.ag) { A.v++; A.pts += 3; H.d++; }
        else { H.e++; A.e++; H.pts++; A.pts++; }
      });
    }
    return Object.keys(T).map(function (k) { return T[k]; }).sort(function (a, b) {
      return b.pts - a.pts || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || (oppObj(g, a.id).name < oppObj(g, b.id).name ? -1 : 1);
    });
  }

  function finishLeague(g, comp, myId) {
    const mid = myId != null ? myId : g.player.clubId;
    for (let r = 1; r <= comp.nRounds; r++) {
      ensureRound(g, comp, r, mid);
      // se a partida do jogador ficou sem resultado (fim de temporada antecipado), simula
      const pairs = comp.rounds[r - 1] || [];
      pairs.forEach(function (pr) {
        const h = pr[0], a = pr[1];
        if (h !== mid && a !== mid) return;
        if (comp.results[r].some(function (m) { return m.h === h && m.a === a; })) return;
        const rng = U.rngFor(g.seed, comp.id, g.year, r, h, a, "late");
        const sc = simScore(oppObj(g, h).str, oppObj(g, a).str, rng);
        comp.results[r].push({ h: h, a: a, hg: sc[0], ag: sc[1] });
      });
    }
    return tableOf(g, comp);
  }

  // ---------- copa: chaveamento ----------
  function buildStageTies(compCup, stageIdx) {
    const st = compCup.stages[stageIdx];
    if (st.ties) return st;
    let entrants;
    if (stageIdx === 0) entrants = compCup.teams.slice();
    else {
      const prev = compCup.stages[stageIdx - 1];
      entrants = prev.ties.map(function (t) { return t.winner; });
    }
    const nLegs = stageLegs(compCup, stageIdx);
    st.ties = [];
    for (let i = 0; i < entrants.length; i += 2) {
      const tie = { a: entrants[i], b: entrants[i + 1], sa: null, sb: null, winner: null, pens: null };
      if (nLegs > 1) tie.legs = []; // ida e volta: [[golsA, golsB], [golsA, golsB]]
      st.ties.push(tie);
    }
    return st;
  }

  // decide o vencedor pelo agregado já gravado em sa/sb (empate → pênaltis). Compartilhado
  // pelo caminho simulado (simTie) e pelo caminho jogado (fillTie), pra não existirem duas
  // regras de desempate.
  function decideTie(tie, rng) {
    if (tie.sa === tie.sb) {
      const pa = 3 + U.ri(0, 2, rng), pb = 3 + U.ri(0, 2, rng);
      tie.pens = pa === pb ? [pa + 1, pb] : [pa, pb];
      tie.winner = tie.pens[0] > tie.pens[1] ? tie.a : tie.b;
    } else tie.winner = tie.sa > tie.sb ? tie.a : tie.b;
  }

  function simTie(g, compCup, stageIdx, tie, skipMine, myId) {
    const mid = myId != null ? myId : g.player.clubId;
    if (tie.winner) return;
    if (skipMine && (tie.a === mid || tie.b === mid)) return;
    const rng = U.rngFor(g.seed, compCup.id, g.year, "st" + stageIdx, tie.a, tie.b);
    const A = oppObj(g, tie.a), B = oppObj(g, tie.b);
    if (stageLegs(compCup, stageIdx) > 1) {
      // ida na casa de A, volta na casa de B — o mando entra pelo simScore, que já dá a
      // vantagem ao primeiro time. Agregado em sa/sb, igual ao jogo único.
      const ida = simScore(A.str, B.str, rng, 1.5);              // A em casa
      const volta = simScore(B.str, A.str, rng, 1.5);            // B em casa
      tie.legs = [[ida[0], ida[1]], [volta[1], volta[0]]];       // sempre [golsA, golsB]
      tie.sa = tie.legs[0][0] + tie.legs[1][0];
      tie.sb = tie.legs[0][1] + tie.legs[1][1];
    } else {
      const sc = simScore(A.str, B.str, rng, 1.5);
      tie.sa = sc[0]; tie.sb = sc[1];
    }
    decideTie(tie, rng);
  }

  function advanceCup(g, compCup, myId) {
    const mid = myId != null ? myId : g.player.clubId;
    // resolve estágios até achar o do jogador pendente ou terminar
    for (let s = 0; s < compCup.stages.length; s++) {
      const st = buildStageTies(compCup, s);
      const mine = st.ties.find(function (t) { return t.a === mid || t.b === mid; });
      const allDone = st.ties.every(function (t) { return t.winner; });
      if (allDone) continue;
      if (mine && !mine.winner && compCup.alive) return { stageIdx: s, tie: mine };
      // sem o jogador: resolve tudo
      st.ties.forEach(function (t) { simTie(g, compCup, s, t, false, mid); });
    }
    const last = compCup.stages[compCup.stages.length - 1];
    if (last.ties && last.ties[0].winner) compCup.champion = oppObj(g, last.ties[0].winner).name;
    return null;
  }

  function completeCup(g, compCup) {
    for (let s = 0; s < compCup.stages.length; s++) {
      const st = buildStageTies(compCup, s);
      st.ties.forEach(function (t) { simTie(g, compCup, s, t, false); });
    }
    const last = compCup.stages[compCup.stages.length - 1];
    compCup.champion = oppObj(g, last.ties[0].winner).name;
  }

  // ---------- resolução de slot → partida concreta ----------
  function currentFixture(g) {
    const S = g.season;
    while (S.idx < S.queue.length) {
      const slot = S.queue[S.idx];
      const fx = resolveSlot(g, slot);
      if (fx) return fx;
      S.idx++;
    }
    return null; // temporada acabou
  }

  function resolveSlot(g, slot) {
    const S = g.season, p = g.player;
    if (slot.comp === "EST") {
      const est = S.comps.EST;
      if (!est) return null;
      if (slot.round) {
        const pair = est.rounds[slot.round - 1].find(function (pr) { return pr[0] === p.clubId || pr[1] === p.clubId; });
        if (!pair) { ensureRound(g, est, slot.round); return null; }
        return mkFix(g, "EST", est.name + " · Rodada " + slot.round, pair, { round: slot.round, decisive: false });
      }
      // mata-mata estadual
      resolveEstKnock(g, est);
      const k = est.knock;
      if (slot.stage === "SF") {
        if (!k.sfMine) return null;
        if (k.sfMine.winner) return null;
        return mkFix(g, "EST", est.name + " · Semifinal", [k.sfMine.a, k.sfMine.b], { stage: "SF", knock: true, decisive: false, tie: k.sfMine, cup: "ESTK" });
      }
      if (slot.stage === "F") {
        if (!k.fMine || k.fMine.winner) { finishEstadual(g, est); return null; }
        return mkFix(g, "EST", est.name + " · FINAL", [k.fMine.a, k.fMine.b], { stage: "F", knock: true, decisive: true, tie: k.fMine, cup: "ESTK" });
      }
      return null;
    }
    if (slot.comp === "LIGA") {
      const L = S.comps.LIGA;
      const pair = L.rounds[slot.round - 1].find(function (pr) { return pr[0] === p.clubId || pr[1] === p.clubId; });
      if (!pair) { ensureRound(g, L, slot.round); return null; }
      const oppId = pair[0] === p.clubId ? pair[1] : pair[0];
      const isClassic = (myClub(g).rivals || []).indexOf(oppId) >= 0;
      const isRivalDuel = oppId === g.rival.clubId;
      // decisivo (modo ao vivo) fica só pras finais de verdade — clássico/duelo de rival
      // continuam com o tempero narrativo (classic/rivalDuel), mas resolvem rápido
      return mkFix(g, "LIGA", L.name + " · Rodada " + slot.round, pair, {
        round: slot.round, decisive: false, classic: isClassic, rivalDuel: isRivalDuel
      });
    }
    if (slot.comp === "CDB" || slot.comp === "COPA") {
      const cup = S.comps[slot.comp];
      if (!cup || !cup.alive) { if (cup) advanceCup(g, cup); return null; }
      const nxt = advanceCup(g, cup);
      if (!nxt) return null;
      const wantIdx = cup.stages.findIndex(function (s) { return s.key === slot.stage; });
      if (nxt.stageIdx !== wantIdx) return null;
      const tie = nxt.tie;
      const pair = tie.a === p.clubId ? [tie.a, tie.b] : [tie.a, tie.b];
      return mkFix(g, slot.comp, cup.name + " · " + STAGE_NAMES[slot.stage], pair, { stage: slot.stage, knock: true, decisive: slot.stage === "F", tie: tie, cup: slot.comp, stageIdx: nxt.stageIdx });
    }
    if (slot.comp === "CONTI") {
      const C = S.comps.CONTI;
      if (!C) return null;
      if (slot.phase === "G") {
        if (!C.alive) return null;
        const pair = C.group.rounds[slot.round - 1].find(function (pr) { return pr[0] === p.clubId || pr[1] === p.clubId; });
        if (!pair) { ensureRound(g, C.group, slot.round); return null; }
        return mkFix(g, C.id, C.name + " · Grupo, jogo " + slot.round, pair, { round: slot.round, phase: "G", decisive: false });
      }
      // mata-mata continental — mesmo motor da Copa do Mundo (cupComp/advanceCup), então
      // o caminho de TODO mundo no chaveamento fica guardado e visível, não só o do jogador
      if (!C.alive) {
        // já eliminado (ou nunca chegou a montar bracket, se caiu nos grupos) — mas o resto
        // do chaveamento (quem não é o jogador) precisa continuar avançando de qualquer jeito
        if (C.bracket) {
          advanceCup(g, C.bracket);
          if (C.bracket.champion && !C.champion) C.champion = C.bracket.champion;
        }
        return null;
      }
      if (slot.ko === 0 && !C.bracket) {
        // classificação: top 2 do grupo
        C.group.nRounds = C.group.rounds.length;
        for (let r = 1; r <= C.group.rounds.length; r++) ensureRound(g, C.group, r);
        const tb = tableOf(g, C.group);
        const myPos = tb.findIndex(function (t) { return t.id === p.clubId; }) + 1;
        if (myPos > 2) { C.alive = false; C.eliminatedAt = "G"; return null; }
        // campo fixo de 16 (jogador + 15 sorteados) — mesmo padrão de cupField (Copa do Brasil)
        const rngK = U.rngFor(g.seed, C.id, g.year, "koteams");
        let pool;
        if (C.id === "LIB" || C.id === "SUL") {
          pool = D.clubsOf("SAM").concat(D.clubsOf("BRA").filter(function (c) { return c.id !== p.clubId && c.str >= 78; }));
        } else {
          const contiStr = { UCL: 78, UEL: 72, UECL: 70 }[C.id] || 78;
          pool = [];
          D.EURO_LEAGUES.forEach(function (l) { D.clubsOf(l).forEach(function (c) { if (c.str >= contiStr && c.id !== p.clubId) pool.push(c); }); });
        }
        const ids = U.shuffle(pool.map(function (c) { return c.id; }), rngK);
        const field = [p.clubId];
        let ci = 0;
        while (field.length < 16) { field.push(ids[ci++] || pool[ci % pool.length].id); }
        C.bracket = cupComp(C.id, C.name, field, C.koStages, rngK, true); // ida e volta (final é jogo único)
      }
      if (!C.bracket) return null; // eliminado nos grupos — nunca chega a montar bracket
      const nxt = advanceCup(g, C.bracket);
      if (C.bracket.champion && !C.champion) C.champion = C.bracket.champion;
      if (!nxt || nxt.stageIdx !== slot.ko) return null;
      const tie = nxt.tie;
      const stage = C.koStages[slot.ko];
      const nLegs = stageLegs(C.bracket, nxt.stageIdx);
      const leg = nLegs > 1 ? (slot.leg || 1) : 0;
      if (leg > nLegs) return null;
      // ida na casa de A, volta na casa de B (jogo único: sempre na casa de A)
      const meIsA = tie.a === p.clubId;
      const home = leg === 2 ? !meIsA : meIsA;
      const oppId = meIsA ? tie.b : tie.a;
      // só a última partida do confronto decide (e leva pênaltis se o agregado empatar)
      const decides = leg !== 1 || nLegs === 1;
      const prev = (leg === 2 && tie.legs && tie.legs[0]) ? tie.legs[0] : null;
      const label = C.name + " · " + STAGE_NAMES[stage] + (nLegs > 1 ? (leg === 1 ? " (ida)" : " (volta)") : "");
      return mkFix(g, C.id, label, home ? [p.clubId, oppId] : [oppId, p.clubId], {
        stage: stage, knock: true, decides: decides, decisive: stage === "F", conti: true,
        tie: tie, stageIdx: nxt.stageIdx, leg: leg || undefined, tieSideA: meIsA,
        aggMine: prev ? (meIsA ? prev[0] : prev[1]) : 0,
        aggOpp: prev ? (meIsA ? prev[1] : prev[0]) : 0
      });
    }
    if (slot.comp === "SEL") {
      const nat = D.NATIONS[p.nat];
      const myId = "nat:" + nat.name;
      if (slot.kind === "elim") {
        return mkNatFix(g, "SEL", "Eliminatórias · " + nat.name, slot.opp, slot.home, { decisive: false, sel: "elim" });
      }
      const T = S.sel;
      if (!T || T.kind === "elim") return null;
      if (T.isFullSim) {
        // ---- torneio real (Copa do Mundo/Copa América/Eurocopa/Copa Ouro/Copa da Ásia):
        // grupos TODOS simulados de verdade + mata-mata com chaveamento visível guardado ----
        if (slot.phase === "G") {
          if (!T.alive) return null;
          const grp = T.groups[T.myGroup];
          const pair = (grp.rounds[slot.round - 1] || []).find(function (pr) { return pr[0] === myId || pr[1] === myId; });
          if (!pair) { ensureRound(g, grp, slot.round, myId); return null; }
          const oppId = pair[0] === myId ? pair[1] : pair[0];
          const home = pair[0] === myId;
          return mkNatFix(g, T.kind, T.name + " · Grupo " + T.myGroup + ", jogo " + slot.round, oppId, home, { decisive: false, sel: "tourG", round: slot.round });
        }
        if (slot.stage === "3RD") return resolveTourThird(g, T, myId);
        if (slot.stage === T.koKeys[0] && T.groupDone !== true) {
          T.groupDone = true;
          finishAllTourGroups(g, T);
          const advancers = pickTourAdvancers(g, T, TOUR_CONF[T.kind]);
          if (advancers.indexOf(myId) < 0) { T.alive = false; T.eliminatedAt = "G"; return null; }
          T.bracket = cupComp(T.kind, T.name, advancers, T.koKeys, U.rngFor(g.seed, "tourbracket", T.kind, g.year));
        }
        if (!T.bracket) return null; // eliminado nos grupos — nunca chega a montar bracket
        // mesmo já eliminado no mata-mata, o resto do chaveamento (o caminho de todo mundo,
        // não só o do jogador) precisa continuar avançando — advanceCup já resolve tudo que
        // não é "meu" de uma vez (mesmo padrão do CDB/COPA: "if (!cup.alive) advanceCup(...)")
        if (!T.alive) {
          advanceCup(g, T.bracket, myId);
          if (T.bracket.champion && !T.champion) T.champion = T.bracket.champion;
          return null;
        }
        const nxt = advanceCup(g, T.bracket, myId);
        if (T.bracket.champion && !T.champion) T.champion = T.bracket.champion;
        if (!nxt) return null;
        const wantIdx = T.bracket.stages.findIndex(function (s) { return s.key === slot.stage; });
        if (nxt.stageIdx !== wantIdx) return null;
        const tie = nxt.tie;
        const home2 = tie.a === myId;
        return mkNatFix(g, T.kind, T.name + " · " + STAGE_NAMES[slot.stage], home2 ? tie.b : tie.a, home2, { decisive: slot.stage === "F", knock: true, sel: "tourKO", stage: slot.stage, tie: tie, stageIdx: nxt.stageIdx });
      }
      return null; // "notqualified" (ou qualquer outro estado sem torneio real) — sem jogo
    }
    if (slot.comp === "MUN") {
      const M = S.mundial;
      if (!M || M.done) return null;
      const pair = slot.home ? [p.clubId, slot.opp] : [slot.opp, p.clubId];
      return mkFix(g, "MUN", "Mundial de Clubes · Confronto único", pair, { decisive: true, knock: true });
    }
    if (slot.comp === "SUPER") {
      const T = S.super;
      if (!T) return null;
      if (slot.phase === "G") {
        if (!T.alive) return null;
        const pair = slot.home ? [p.clubId, slot.opp] : [slot.opp, p.clubId];
        return mkFix(g, "SUPER", "Supermundial · Grupo, jogo " + slot.n, pair, { decisive: false, superPhase: "G", n: slot.n });
      }
      // mata-mata — mesmo motor da Copa do Mundo/Conti (cupComp/advanceCup): chaveamento
      // completo guardado (não só o caminho do jogador), resto continua avançando mesmo
      // após o jogador ser eliminado, campeão sincronizado mesmo perdendo a final
      if (!T.alive) {
        if (T.bracket) {
          advanceCup(g, T.bracket);
          if (T.bracket.champion && !T.champion) T.champion = T.bracket.champion;
        }
        return null;
      }
      const koKeys = T.koKeys;
      if (slot.stage === koKeys[0] && !T.bracket) {
        if (T.groupDone !== true) {
          T.groupDone = true;
          if (T.groupPts < 4) { T.alive = false; T.eliminatedAt = "G"; return null; }
        }
        // campo fixo de 16 (jogador + 15 sorteados) — mesmo padrão de cupField (Copa do Brasil)
        const rngK = U.rngFor(g.seed, "super", g.year, "koteams");
        const bigPool = D.clubsOf("SAM")
          .concat(D.clubsOf("BRA").filter(function (c) { return c.id !== p.clubId && c.str >= 78; }))
          .concat(D.EURO_LEAGUES.reduce(function (acc, l) { return acc.concat(D.clubsOf(l).filter(function (c) { return c.id !== p.clubId && c.str >= 78; })); }, []));
        const ids = U.shuffle(bigPool.map(function (c) { return c.id; }), rngK);
        const field = [p.clubId];
        let ci = 0;
        while (field.length < 16) { field.push(ids[ci++] || bigPool[ci % bigPool.length].id); }
        T.bracket = cupComp("SUPER", "Supermundial", field, koKeys, rngK);
      }
      if (!T.bracket) return null;
      const nxt = advanceCup(g, T.bracket);
      if (T.bracket.champion && !T.champion) T.champion = T.bracket.champion;
      if (!nxt || nxt.stageIdx !== koKeys.indexOf(slot.stage)) return null;
      const tie = nxt.tie;
      const stage = koKeys[nxt.stageIdx];
      const home = tie.a === p.clubId;
      return mkFix(g, "SUPER", "Supermundial · " + STAGE_NAMES[stage], home ? [p.clubId, tie.b] : [tie.a, p.clubId], { stage: stage, knock: true, decisive: stage === "F", superPhase: "KO", tie: tie, stageIdx: nxt.stageIdx });
    }
    return null;
  }

  function mkFix(g, compKey, label, pair, extra) {
    const p = g.player;
    const home = pair[0] === p.clubId;
    const oppId = home ? pair[1] : pair[0];
    return Object.assign({
      compKey: compKey, label: label, oppId: oppId, home: home,
      myTeam: myClub(g), opp: oppObj(g, oppId), isNatMatch: false
    }, extra || {});
  }
  function mkNatFix(g, compKey, label, oppNatId, home, extra) {
    const nat = D.NATIONS[g.player.nat];
    return Object.assign({
      compKey: compKey, label: label, oppId: oppNatId, home: home,
      myTeam: natTeamObj(nat.name), opp: oppObj(g, oppNatId), isNatMatch: true
    }, extra || {});
  }

  // ---- estadual mata-mata ----
  function resolveEstKnock(g, est) {
    const k = est.knock;
    if (k.resolved) return;
    est.nRounds = est.rounds.length;
    for (let r = 1; r <= est.rounds.length; r++) ensureRound(g, est, r);
    const tb = tableOf(g, est, est.rounds.length);
    const top4 = tb.slice(0, 4).map(function (t) { return t.id; });
    k.sf = [
      { a: top4[0], b: top4[3], sa: null, sb: null, winner: null, pens: null },
      { a: top4[1], b: top4[2], sa: null, sb: null, winner: null, pens: null }
    ];
    const mineIdx = k.sf.findIndex(function (t) { return t.a === g.player.clubId || t.b === g.player.clubId; });
    k.sfMine = mineIdx >= 0 ? k.sf[mineIdx] : null;
    // resolve a outra semi
    k.sf.forEach(function (t, i) { if (i !== mineIdx) simTie(g, { id: "ESTK" }, 0, t, false); });
    k.resolved = true;
  }
  function estAfterSF(g, est) {
    const k = est.knock;
    if (k.f) return;
    if (!k.sf.every(function (t) { return t.winner; })) return;
    k.f = { a: k.sf[0].winner, b: k.sf[1].winner, sa: null, sb: null, winner: null, pens: null };
    k.fMine = (k.f.a === g.player.clubId || k.f.b === g.player.clubId) ? k.f : null;
  }
  function finishEstadual(g, est) {
    const k = est.knock;
    if (k.done) return;
    resolveEstKnock(g, est);
    if (k.sfMine && !k.sfMine.winner) simTie(g, { id: "ESTK" }, 0, k.sfMine, false);
    estAfterSF(g, est);
    if (k.f && !k.f.winner) simTie(g, { id: "ESTK" }, 1, k.f, false);
    if (k.f) k.champion = club(k.f.winner).name;
    k.done = true;
  }

  // ---------- jogar / simular / poupar ----------
  function teamStrength(g, fixture, withPlayer) {
    let s = fixture.myTeam.str;
    if (withPlayer) {
      const p = g.player;
      const squadLvl = fixture.isNatMatch ? fixture.myTeam.str - 6 : fixture.myTeam.str - 4;
      s += U.clamp((p.overall - squadLvl) / 8, -2, 3.5) + (p.morale - 60) / 40;
      if (hasTrait(p, "lider") && p.captain === p.clubId) s += 1; // liderança eleva o time
    } else {
      s -= 1.5;
    }
    return s;
  }

  function benchRoll(g, fixture, rng) {
    const p = g.player;
    if (fixture.isNatMatch) return { starts: true, minutes: 90 };
    const squadLvl = fixture.myTeam.str - 4;
    const diff = p.overall - squadLvl;
    let pStart;
    if (diff >= 0) pStart = 0.9;
    else if (diff >= -4) pStart = 0.62;
    else if (diff >= -8) pStart = 0.34;
    else pStart = 0.14;
    // confiança do técnico e papel no elenco pesam de forma transparente
    pStart += (managerConf(g) - 55) / 130;
    pStart += (p.morale - 60) / 400;
    pStart += p.squadRole === "estrela" ? 0.25 : p.squadRole === "rotacao" ? -0.12 : 0;
    if (p.captain === p.clubId) pStart += 0.1;
    if (U.chance(U.clamp(pStart, 0.04, 0.99), rng)) return { starts: true, minutes: 90 };
    if (U.chance(0.55, rng)) return { starts: false, minutes: U.ri(18, 35, rng) };
    return { starts: false, minutes: 0 };
  }

  function playerShare(g, minutes, taker, decisive) {
    const p = g.player;
    const posShare = { ATA: 0.38, PON: 0.30, MEI: 0.20, VOL: 0.08, LAT: 0.07, ZAG: 0.05, GOL: 0 }[p.pos];
    let sh = posShare * (0.55 + p.overall / 140) * (minutes / 90);
    if (taker) sh *= 1.3;
    if (hasTrait(p, "matador")) sh *= 1.13;
    if (decisive && hasTrait(p, "decisivo")) sh *= 1.16;
    return U.clamp(sh, 0, 0.75);
  }
  function assistShare(g, minutes) {
    const p = g.player;
    const posShare = { ATA: 0.16, PON: 0.26, MEI: 0.30, VOL: 0.14, LAT: 0.16, ZAG: 0.04, GOL: 0.01 }[p.pos];
    let sh = posShare * (0.55 + p.overall / 140) * (minutes / 90);
    if (hasTrait(p, "maestro")) sh *= 1.16;
    return U.clamp(sh, 0, 0.62);
  }

  // resolve uma partida do jogador (modo sim ou base do ao-vivo)
  // Determinístico: usa um RNG derivado da seed + ano + índice da partida.
  function resolveMatch(g, fixture, opts) {
    opts = opts || {};
    const p = g.player;
    const rng = U.rngFor(g.seed, "match", g.year, (g.season && g.season.idx) || 0);
    const myDisc = fixture.isNatMatch ? null : (p.disc && p.disc[discGroup(fixture)]);
    const canPlay = !opts.rest && p.injury <= 0 && (fixture.isNatMatch || !myDisc || myDisc.susp <= 0);
    const bench = canPlay ? benchRoll(g, fixture, rng) : { starts: false, minutes: 0 };
    const plays = canPlay && bench.minutes > 0;

    const sMine = teamStrength(g, fixture, plays);
    const sOpp = fixture.opp.str;
    const adv = fixture.home ? 3 : -3;
    const gap = U.clamp((sMine + adv - sOpp) * 0.036, -1.15, 1.15);
    const lh = U.clamp(1.22 + gap, 0.25, 3.0);
    const la = U.clamp(1.08 - gap, 0.2, 2.8);
    let gm = U.poisson(lh, rng), go = U.poisson(la, rng);

    const isGK = p.pos === "GOL";
    const a = p.attrs, pos = p.pos, mf = bench.minutes / 90;
    let pg = 0, pa = 0, saves = 0, bigSaves = 0, nota = null, cardY = false, cardR = false;
    // estatísticas próprias da função (para a nota por posição)
    let tackles = 0, intercepts = 0, duels = 0, clearances = 0, keyPasses = 0, error = false;

    if (plays) {
      const taker = p.takerPen || p.takerFK;
      const shG = playerShare(g, bench.minutes, taker, fixture.decisive);
      const shA = assistShare(g, bench.minutes);
      const press = U.clamp((sOpp - sMine) / 6 + 1.2, 0.4, 2.6); // >1 = sob pressão

      if (!isGK) {
        for (let i = 0; i < gm; i++) {
          if (U.chance(shG, rng)) pg++;
          else if (U.chance(shA / Math.max(0.25, 1 - shG), rng)) pa++;
        }
        const inspired = (a.fin + a.dri) / 2 + (p.morale - 60) / 4;
        if (U.chance(U.clamp((inspired - 68) / 220, 0, 0.14), rng)) { gm++; pg++; }
      } else {
        const murB = hasTrait(p, "muralha") ? 1 : 0;
        saves = Math.max(0, U.poisson(2.2 + Math.max(0, sOpp - sMine) / 14, rng) + Math.round((a.ref - 70) / 18) + murB);
        let stopChance = U.clamp((a.ref - 62) / 90, 0.02, 0.3) + (murB ? 0.05 : 0);
        for (let i = 0; i < go; i++) if (U.chance(stopChance, rng)) bigSaves++;
        go -= bigSaves; saves += bigSaves;
      }

      // ações defensivas / criativas próprias da posição (determinísticas)
      const dvol = { GOL: 0, ZAG: 1.0, LAT: 0.8, VOL: 1.05, MEI: 0.5, PON: 0.35, ATA: 0.3 }[pos];
      const cvol = { GOL: 0, ZAG: 0.15, LAT: 0.55, VOL: 0.55, MEI: 1.0, PON: 0.9, ATA: 0.7 }[pos];
      tackles = U.poisson(dvol * (0.7 + a.def / 120) * press * mf * 2.1, rng);
      intercepts = U.poisson(dvol * (0.6 + a.posn / 130) * press * mf * 1.7, rng);
      duels = U.poisson((0.5 + dvol) * (0.5 + a.fis / 130) * mf * 1.8, rng);
      clearances = pos === "ZAG" ? U.poisson((0.6 + a.def / 120) * press * mf * 2.3, rng) : 0;
      keyPasses = U.poisson(cvol * (0.5 + a.pas / 120) * mf * 1.9, rng);
      const errBase = (72 - (isGK ? a.ref : a.def)) / 420 + (p.condition < 45 ? 0.03 : 0);
      error = go > 0 && U.chance(U.clamp(errBase, 0, 0.13) * mf, rng);

      cardY = U.chance(pos === "ZAG" || pos === "VOL" ? 0.16 : 0.07, rng);
      cardR = U.chance(0.012, rng);

      const win = gm > go, draw = gm === go;
      const cs = go === 0;
      const resB = win ? 0.35 : draw ? 0.05 : -0.4;
      const noise = U.rf(-0.4, 0.5, rng);
      const cardPen = (cardR ? 1.6 : cardY ? 0.2 : 0) + (error ? 1.3 : 0);

      // cada posição atinge nota alta pelas AÇÕES da sua função
      if (pos === "ATA" || pos === "PON") {
        nota = 6.0 + pg * 1.05 + pa * 0.7 + keyPasses * 0.16 + resB + (p.overall - sOpp) / 45 + noise - cardPen;
      } else if (pos === "MEI") {
        nota = 6.05 + pg * 0.9 + pa * 0.8 + keyPasses * 0.22 + tackles * 0.06 + resB + noise - cardPen;
      } else if (pos === "VOL") {
        nota = 6.2 + tackles * 0.14 + intercepts * 0.14 + duels * 0.05 + keyPasses * 0.12 + pg * 0.7 + pa * 0.6 + resB + noise - cardPen;
      } else if (pos === "LAT") {
        nota = 6.28 + tackles * 0.12 + intercepts * 0.12 + keyPasses * 0.17 + pa * 0.72 + pg * 0.6 + (cs ? 0.35 : 0) + resB + noise - cardPen;
      } else if (pos === "ZAG") {
        nota = 6.2 + tackles * 0.12 + intercepts * 0.14 + clearances * 0.08 + duels * 0.05 + (cs ? 0.9 : -go * 0.28) + pg * 0.8 + resB + noise - cardPen;
      } else { // GOL
        nota = 6.1 + saves * 0.15 + bigSaves * 0.3 + (cs ? 0.9 : -go * 0.4) + (win ? 0.3 : draw ? 0.05 : -0.3) + noise - cardPen;
      }
      nota = U.clamp(Math.round(nota * 10) / 10, 3, 10);
    }

    return {
      fixture: fixture, plays: plays, starts: bench.starts, minutes: bench.minutes,
      rest: !!opts.rest, injured: p.injury > 0, susp: !fixture.isNatMatch && !!myDisc && myDisc.susp > 0,
      gm: gm, go: go, pg: pg, pa: pa, saves: saves, bigSaves: bigSaves, nota: nota,
      tackles: tackles, intercepts: intercepts, duels: duels, clearances: clearances, keyPasses: keyPasses, error: error,
      cardY: cardY, cardR: cardR, isGK: isGK,
      win: gm > go, draw: gm === go, loss: gm < go
    };
  }

  // aplica resultado ao estado do jogo
  function applyMatch(g, res) {
    const S = g.season, p = g.player, fx = res.fixture;
    // "decide" = esta partida encerra o confronto. Na IDA de um mata-mata de ida e volta
    // ela é false: empate na ida não vai pra pênaltis, quem decide é o agregado na volta.
    // Fixture de jogo único não traz o campo (undefined), então segue como sempre foi.
    const decides = fx.knock && fx.decides !== false;
    const knockDraw = decides && tieDrawn(fx, res);

    // RNG determinístico de pós-partida (lesão, shootout automático)
    const prng = U.rngFor(g.seed, "post", g.year, S.idx);
    // shootout automático (quando não veio do modo ao vivo)
    if (knockDraw && !res.shootout) {
      const myP = 3 + U.ri(0, 2, prng), opP = 3 + U.ri(0, 2, prng);
      res.shootout = { my: myP === opP ? myP + 1 : myP, opp: opP, auto: true };
      res.shootoutWin = res.shootout.my > res.shootout.opp;
    }
    const myAgg = (fx.aggMine || 0) + res.gm, opAgg = (fx.aggOpp || 0) + res.go;
    const advanced = decides ? (myAgg > opAgg || (myAgg === opAgg && res.shootoutWin)) : null;

    // registra no estado da competição
    if (fx.compKey === "EST" && fx.round) {
      recordLeagueResult(g, S.comps.EST, fx, res);
      ensureRound(g, S.comps.EST, fx.round);
    } else if (fx.compKey === "LIGA") {
      recordLeagueResult(g, S.comps.LIGA, fx, res);
      ensureRound(g, S.comps.LIGA, fx.round);
    } else if (fx.compKey === "EST" && fx.stage) {
      const tie = fx.tie;
      fillTie(tie, fx, res);
      const est = S.comps.EST;
      if (fx.stage === "SF") {
        estAfterSF(g, est);
        if (tie.winner !== p.clubId) { /* eliminado; final será simulada */ }
      } else if (fx.stage === "F") {
        est.knock.champion = club(tie.winner).name;
        est.knock.done = true;
        if (tie.winner === p.clubId) winTitle(g, "EST", est.name);
      }
    } else if (fx.compKey === "CDB" || fx.compKey === "COPA") {
      const cup = S.comps[fx.compKey];
      fillTie(fx.tie, fx, res);
      const st = cup.stages[fx.stageIdx];
      st.ties.forEach(function (t) { simTie(g, cup, fx.stageIdx, t, true); });
      if (fx.tie.winner !== p.clubId) { cup.alive = false; cup.eliminatedAt = fx.stage; }
      else if (fx.stage === "F") { cup.champion = myClub(g).name; winTitle(g, fx.compKey, cup.name); }
    } else if (fx.conti) {
      const C = S.comps.CONTI;
      fillTie(fx.tie, fx, res);
      // na IDA o confronto ainda está aberto: registra o placar e não decide nada
      if (fx.decides !== false) {
        const stC = C.bracket.stages[fx.stageIdx];
        stC.ties.forEach(function (t) { simTie(g, C.bracket, fx.stageIdx, t, true); });
        // sincroniza o campeão real assim que a final termina, ganhando ou perdendo (mesmo
        // raciocínio da Copa do Mundo — senão o resto do chaveamento nunca é conhecido)
        if (fx.stage === "F" && fx.tie.winner) C.bracket.champion = oppObj(g, fx.tie.winner).name;
        if (fx.tie.winner !== p.clubId) { C.alive = false; C.eliminatedAt = fx.stage; }
        else if (fx.stage === "F") { C.alive = false; winTitle(g, C.id, C.name); }
        if (C.bracket.champion && !C.champion) C.champion = C.bracket.champion;
      }
    } else if (fx.compKey === "CONTI" || (S.comps.CONTI && fx.compKey === S.comps.CONTI.id && fx.phase === "G")) {
      recordLeagueResult(g, S.comps.CONTI.group, fx, res);
      ensureRound(g, S.comps.CONTI.group, fx.round);
    } else if (fx.compKey === "MUN") {
      const M = S.mundial;
      if (M) {
        M.done = true;
        if (advanced) { winTitle(g, "MUN", "Mundial de Clubes"); M.champion = myClub(g).name; }
      }
    } else if (fx.superPhase === "KO") {
      const T = S.super;
      fillTie(fx.tie, fx, res);
      const stS = T.bracket.stages[fx.stageIdx];
      stS.ties.forEach(function (t) { simTie(g, T.bracket, fx.stageIdx, t, true); });
      if (fx.stage === "F" && fx.tie.winner) T.bracket.champion = oppObj(g, fx.tie.winner).name;
      if (fx.tie.winner !== p.clubId) { T.alive = false; T.eliminatedAt = fx.stage; }
      else if (fx.stage === "F") { T.alive = false; winTitle(g, "SUPER", "Supermundial"); }
      if (T.bracket.champion && !T.champion) T.champion = T.bracket.champion;
    } else if (fx.superPhase === "G") {
      S.super.groupPts += res.win ? 3 : res.draw ? 1 : 0;
    } else if (fx.isNatMatch) {
      applyNatMatch(g, res);
    }

    // condição, moral, stats
    if (res.rest) {
      p.condition = U.clamp(p.condition + 30, 0, 100);
      p.xp += 0.3;
    } else if (res.plays) {
      p.condition = U.clamp(p.condition - U.ri(13, 19, prng) + 6, 0, 100);
      const st = p.stats;
      st.j++; st.g += res.pg; st.a += res.pa; st.saves += res.saves;
      if (res.isGK && res.go === 0) st.cs++;
      st.notaSum += res.nota; st.notaN++;
      const ck = fx.compKey;
      st.byComp[ck] = st.byComp[ck] || { j: 0, g: 0, a: 0 };
      st.byComp[ck].j++; st.byComp[ck].g += res.pg; st.byComp[ck].a += res.pa;
      if (res.pg > 0 && !fx.isNatMatch) { st.vitimas[fx.oppId] = (st.vitimas[fx.oppId] || 0) + res.pg; p.clubGoals[p.clubId] = (p.clubGoals[p.clubId] || 0) + res.pg; }
      // gols por competição (para perseguir recordes históricos)
      if (res.pg > 0) {
        let ck2 = fx.compKey;
        if (ck2 === "LIGA" && isBrazilLeague(leagueOf(g, p.clubId))) ck2 = "BRA";
        if (!p.compGoals) p.compGoals = {};
        p.compGoals[ck2] = (p.compGoals[ck2] || 0) + res.pg;
      }
      if (res.pg >= 3) { p.records.hatTricks++; res.hatTrick = true; }
      if (fx.decisive && res.pg > 0) p.decisiveGoals = (p.decisiveGoals || 0) + res.pg;
      p.morale = U.clamp(p.morale + (res.win ? 6 : res.draw ? 1 : -7) + res.pg * 3 + res.pa * 1.5, 5, 100);
      const xodoB = hasTrait(p, "xodo") ? 1.3 : 1;
      p.fame = U.clamp(p.fame + (res.pg * (fx.isNatMatch ? 1.6 : 0.8) + res.pa * 0.4 + (res.nota >= 8.5 ? 1 : 0) + (fx.decisive && res.win ? 0.5 : 0)) * xodoB, 0, 100);
      if (fx.isNatMatch) { p.natTeam.caps++; p.natTeam.goals += res.pg; }
      // confiança do técnico (não em jogos de seleção)
      if (!fx.isNatMatch) bumpConf(g, (res.nota - 6.4) * 1.4 + res.pg * 1.2 + (res.win ? 1 : res.loss ? -1.2 : 0));
      // XP
      let xp = Math.max(0, res.nota - 6.1) * 1.35 + 0.3;
      xp *= p.age <= 23 ? 1.5 : p.age <= 27 ? 1.1 : p.age <= 30 ? 0.7 : p.age <= 32 ? 0.35 : p.age <= 34 ? 0.12 : 0.03;
      p.xp += xp;
      // cartões (por competição — um vermelho/acúmulo no Brasileirão não pode suspender na
      // Libertadores nem vice-versa; jogo de seleção nunca gera suspensão de clube)
      if (!fx.isNatMatch && (res.cardR || res.cardY)) {
        p.disc = p.disc || {};
        const grp = discGroup(fx);
        const d = p.disc[grp] || (p.disc[grp] = { y: 0, susp: 0 });
        if (res.cardR) d.susp = U.ri(1, 2, prng);
        else {
          d.y++;
          if (d.y % 3 === 0) { d.susp = 1; res.suspNext = true; }
        }
      }
      // lesão (determinística por partida)
      let pInj = 0.012 + (p.condition < 45 ? 0.03 : 0) + (p.condition < 28 ? 0.04 : 0);
      if (U.chance(pInj, prng)) { p.injury = U.ri(3, 8, prng); res.injuryNew = p.injury; }
      // cobrador oficial
      if (!p.takerPen && (p.attrs.bp >= 74 || p.fame >= 55) && (p.attrs.fin >= 68 || p.pos === "MEI" || p.attrs.bp >= 80)) {
        p.takerPen = true; res.becameTaker = true;
      }
    } else {
      // não jogou (banco/lesão/suspensão)
      p.condition = U.clamp(p.condition + 12, 0, 100);
      if (!res.rest && !res.injured && !res.susp) { p.morale = U.clamp(p.morale - 3, 5, 100); if (!fx.isNatMatch) bumpConf(g, -0.7); }
    }
    if (p.injury > 0 && !res.plays) p.injury--;
    else if (!res.plays && !fx.isNatMatch) {
      const dGrp = p.disc && p.disc[discGroup(fx)];
      if (dGrp && dGrp.susp > 0) dGrp.susp = Math.max(0, dGrp.susp - 1);
    }

    spendXP(g);

    // rival: retrospecto de confronto direto
    if (fx.rivalDuel && !fx.isNatMatch) {
      if (res.win) g.h2h.v++; else if (res.draw) g.h2h.e++; else g.h2h.d++;
    }

    // clássico de clube: retrospecto por rival (distinto do rival de geração acima)
    if (fx.classic && !fx.isNatMatch) {
      g.clubRivalry = g.clubRivalry || {};
      const rec = g.clubRivalry[fx.oppId] || (g.clubRivalry[fx.oppId] = { v: 0, e: 0, d: 0 });
      if (res.win) rec.v++; else if (res.draw) rec.e++; else rec.d++;
    }

    // salário (≈ semanal)
    p.money += Math.round(p.salary / 4);
    // valor de mercado acompanha o momento
    p.marketValue = marketValue(p);
    // marcos de carreira
    res.milestones = checkMilestones(g);
    S.played++;
    S.lastRes = res;
    S.history = S.history || [];
    S.history.push({ win: res.win, draw: res.draw, comp: fx.compKey, opp: fx.opp.name, gm: res.gm, go: res.go, pg: res.pg, pa: res.pa, nota: res.nota, plays: res.plays, home: fx.home, label: fx.label });
    S.idx++;
    if (CQ.nar) CQ.nar.onMatch(g, res);
    return res;
  }

  function fillTie(tie, fx, res) {
    // de que lado do confronto o jogador está. Em jogo único o mando já responde isso (o
    // fixture é montado com o jogador em casa quando ele é o lado A); na ida e volta o
    // mando inverte na volta, então o lado vem explícito no fixture.
    const meIsA = fx.tieSideA != null ? fx.tieSideA : fx.home;
    if (fx.leg) {
      tie.legs = tie.legs || [];
      tie.legs[fx.leg - 1] = meIsA ? [res.gm, res.go] : [res.go, res.gm];
    }
    if (fx.decides === false) return; // ida: registra o placar e para — nada decidido ainda
    if (fx.leg && tie.legs && tie.legs[0] && tie.legs[1]) {
      tie.sa = tie.legs[0][0] + tie.legs[1][0];
      tie.sb = tie.legs[0][1] + tie.legs[1][1];
    } else if (meIsA) { tie.sa = res.gm; tie.sb = res.go; } else { tie.sa = res.go; tie.sb = res.gm; }
    if (res.shootout) tie.pens = meIsA ? [res.shootout.my, res.shootout.opp] : [res.shootout.opp, res.shootout.my];
    const meWin = fx.knock
      ? (tie.sa === tie.sb ? !!res.shootoutWin : (meIsA ? tie.sa > tie.sb : tie.sb > tie.sa))
      : res.win;
    tie.winner = meWin ? (meIsA ? tie.a : tie.b) : (meIsA ? tie.b : tie.a);
  }

  function recordLeagueResult(g, comp, fx, res, myId) {
    const mid = myId != null ? myId : g.player.clubId;
    const r = fx.round;
    comp.results[r] = comp.results[r] || [];
    const h = fx.home ? mid : fx.oppId;
    const a = fx.home ? fx.oppId : mid;
    comp.results[r].push({ h: h, a: a, hg: fx.home ? res.gm : res.go, ag: fx.home ? res.go : res.gm });
  }

  function applyNatMatch(g, res) {
    const S = g.season, fx = res.fixture, T = S.sel;
    if (!T) return;
    T.record.push({ opp: fx.opp.name, gm: res.gm, go: res.go, pg: res.pg });
    if (T.kind === "elim") return;
    const myId = "nat:" + D.NATIONS[g.player.nat].name;
    if (fx.sel === "tourG") {
      recordLeagueResult(g, T.groups[T.myGroup], fx, res, myId);
      ensureRound(g, T.groups[T.myGroup], fx.round, myId);
    } else if (fx.sel === "tourKO") {
      fillTie(fx.tie, fx, res);
      const st = T.bracket.stages[fx.stageIdx];
      st.ties.forEach(function (t) { simTie(g, T.bracket, fx.stageIdx, t, true, myId); });
      // sincroniza o campeão real assim que a final termina, ganhando ou perdendo — sem
      // isso, quando o jogador perde a final, ninguém marca T.bracket.champion (só o
      // advanceCup faz isso, e ele nunca roda de novo depois que o próprio jogo do
      // jogador já resolveu a final via fillTie/simTie acima)
      if (fx.stage === "F" && fx.tie.winner) T.bracket.champion = oppObj(g, fx.tie.winner).name;
      if (fx.tie.winner !== myId) { T.alive = false; T.eliminatedAt = fx.stage; }
      else if (fx.stage === "F") {
        T.alive = false;
        winTitle(g, T.kind, T.name);
        g.player.fame = U.clamp(g.player.fame + 12, 0, 100);
      }
      if (T.bracket.champion && !T.champion) T.champion = T.bracket.champion;
    } else if (fx.sel === "tourKO3rd") {
      // disputa de 3º lugar: só resultado/medalha, sem título nem eliminação
      fillTie(fx.tie, fx, res);
      if (res.win) g.player.fame = U.clamp(g.player.fame + 4, 0, 100);
    }
  }

  function winTitle(g, key, name) {
    const p = g.player;
    const isNat = ["WC", "CA", "EU", "GC", "AC"].indexOf(key) >= 0;
    const withName = isNat ? D.NATIONS[p.nat].name : myClub(g).name;
    p.titles.push({ year: g.year, key: key, name: name, club: withName });
    p.fame = U.clamp(p.fame + ({ SUPER: 22, WC: 15, MUN: 13, UCL: 12, LIB: 10, UEL: 9, GC: 8, AC: 8, CA: 8, EU: 8, LIGA: 8, SUL: 7, UECL: 7, CDB: 6, COPA: 5, EST: 3 }[key] || 5), 0, 100);
    p.morale = U.clamp(p.morale + 12, 5, 100);
    const bonus = ({ SUPER: 4000000, WC: 2500000, UCL: 2000000, MUN: 1500000, LIB: 1200000, UEL: 900000, GC: 700000, AC: 700000, BRA: 900000, LIGA: 900000, SUL: 600000, UECL: 600000, CDB: 500000, COPA: 400000, CA: 800000, EU: 800000, EST: 150000 }[key] || 300000);
    p.money += bonus;
    g.season.lastTitle = { key: key, name: name, bonus: bonus };
  }

  const FOCUS_ATTRS = {
    equil: {}, ataque: { fin: 2.2, posn: 2.0 }, criacao: { pas: 2.2, dri: 2.0 },
    atletico: { pac: 2.2, fis: 2.2 }, defensivo: { def: 2.2, posn: 1.8, ref: 2.0 }, bolaparada: { bp: 2.8 }
  };
  function spendXP(g) {
    const p = g.player;
    const w = D.POSITIONS[p.pos].weights;
    const focus = FOCUS_ATTRS[g.trainingFocus || "equil"] || {};
    // RNG determinístico por partida (mesma seed + ações = mesma evolução)
    const rng = U.rngFor(g.seed, "xp", g.year, (g.season && g.season.idx) || 0);
    let guard = 0;
    while (p.xp >= 1 && guard++ < 30) {
      p.xp -= 1;
      if (p.overall >= p.pot) continue;
      const keys = ATTRS.filter(function (a) { return p.attrs[a] < 95; });
      let total = 0;
      keys.forEach(function (a) { total += ((w[a] || 0.02) + 0.02) * (focus[a] || 1); });
      let roll = rng() * total;
      let pick = keys[0];
      for (let i = 0; i < keys.length; i++) {
        roll -= ((w[keys[i]] || 0.02) + 0.02) * (focus[keys[i]] || 1);
        if (roll <= 0) { pick = keys[i]; break; }
      }
      p.attrs[pick]++;
      const nov = overallOf(p.attrs, p.pos);
      if (nov > p.pot) p.attrs[pick]--;
      else p.overall = nov;
    }
  }

  // ---------- marcos / recordes ----------
  const MILESTONE_DEFS = [
    { field: "goals", label: "gols na carreira", steps: [25, 50, 100, 150, 200, 250, 300] },
    { field: "assists", label: "assistências na carreira", steps: [25, 50, 100, 150] },
    { field: "caps", label: "jogos pela seleção", steps: [10, 25, 50, 75, 100] },
    { field: "natGoals", label: "gols pela seleção", steps: [10, 25, 50] },
    { field: "titles", label: "títulos conquistados", steps: [1, 3, 5, 10, 20] },
    { field: "hatTricks", label: "hat-tricks", steps: [1, 3, 5, 10] }
  ];
  function careerTotals(g) {
    const p = g.player;
    let cg = p.stats ? p.stats.g : 0, ca = p.stats ? p.stats.a : 0;
    p.career.forEach(function (s) { cg += s.g; ca += s.a; });
    return { goals: cg, assists: ca, caps: p.natTeam.caps, natGoals: p.natTeam.goals, titles: p.titles.length, hatTricks: p.records.hatTricks };
  }
  function checkMilestones(g) {
    const p = g.player, tot = careerTotals(g), fresh = [];
    MILESTONE_DEFS.forEach(function (def) {
      def.steps.forEach(function (step) {
        const key = def.field + "-" + step;
        if (tot[def.field] >= step && p.milestones.indexOf(key) < 0) {
          p.milestones.push(key);
          fresh.push({ key: key, n: step, label: def.label, field: def.field });
        }
      });
    });
    return fresh;
  }

  // ---------- estilo de vida (usos do dinheiro) ----------
  const LIFESTYLE = [
    { key: "carro", name: "Carro esportivo", cost: 1500000, desc: "Um bólido pra chamar de seu.", fame: 3, morale: 4 },
    { key: "casa", name: "Mansão", cost: 9000000, desc: "Conforto pra família e pra cabeça.", morale: 7, rep: 2 },
    { key: "iate", name: "Iate", cost: 28000000, desc: "Férias de craque nas redes.", fame: 6, morale: 4 },
    { key: "marketing", name: "Campanha global", cost: 5000000, desc: "Sua imagem em todo lugar.", fame: 12 },
    { key: "invest", name: "Fundo de investimento", cost: 6000000, desc: "Dinheiro trabalhando por você.", income: 900000 },
    { key: "restaurante", name: "Rede de restaurantes", cost: 7000000, desc: "Negócio próprio, renda mensal.", income: 650000, rep: 2 },
    { key: "escolinha", name: "Escolinha de futebol", cost: 3500000, desc: "Revele novos craques no seu nome.", income: 350000, rep: 6 },
    { key: "caridade", name: "Instituto de caridade", cost: 4000000, desc: "Devolva à comunidade.", rep: 12, fame: 3 }
  ];
  function buyAsset(g, key) {
    const p = g.player;
    const item = LIFESTYLE.find(function (x) { return x.key === key; });
    if (!item || p.assets.indexOf(key) >= 0 || p.money < item.cost) return false;
    p.money -= item.cost;
    p.assets.push(key);
    if (item.fame) p.fame = U.clamp(p.fame + item.fame, 0, 100);
    if (item.rep) p.rep = U.clamp(p.rep + item.rep, 0, 100);
    if (item.morale) p.morale = U.clamp(p.morale + item.morale, 5, 100);
    return true;
  }
  function assetIncome(g) {
    let inc = 0;
    g.player.assets.forEach(function (k) {
      const it = LIFESTYLE.find(function (x) { return x.key === k; });
      if (it && it.income) inc += it.income;
    });
    return inc;
  }

  // ---------- traços / especialidades ----------
  const TRAITS = {
    matador: { name: "Finalizador nato", desc: "Faro de gol acima da média — converte mais chances.", icon: "goal" },
    maestro: { name: "Maestro", desc: "Enxerga o passe antes de todos — mais assistências.", icon: "ball" },
    decisivo: { name: "Homem-decisão", desc: "Aparece nos jogos grandes — rende mais em decisões.", icon: "star" },
    muralha: { name: "Muralha", desc: "Pega o impegável — mais defesas e jogos sem sofrer gol.", icon: "glove" },
    xodo: { name: "Xodó da torcida", desc: "Amado nas arquibancadas — ganha fama e moral extra.", icon: "heart" },
    lider: { name: "Líder nato", desc: "Puxa o time nas costas — eleva o rendimento coletivo.", icon: "trophy" },
    veloz: { name: "Míssil", desc: "Explosão de velocidade que ninguém acompanha.", icon: "up" }
  };
  function hasTrait(p, k) { return p.traits && p.traits.indexOf(k) >= 0; }
  function checkTraits(g) {
    const p = g.player, fresh = [];
    function unlock(k, cond) { if (cond && !hasTrait(p, k)) { p.traits.push(k); fresh.push(k); } }
    const ligaG = (p.stats.byComp.LIGA || {}).g || 0;
    unlock("matador", p.pos !== "GOL" && p.stats.g >= 22);
    unlock("maestro", p.stats.a >= 12);
    unlock("decisivo", p.decisiveGoals >= 8);
    unlock("muralha", p.pos === "GOL" && p.stats.cs >= 14);
    unlock("xodo", (p.idolClubs && p.idolClubs.length >= 1) || p.fame >= 82);
    unlock("lider", p.captain && (p.morale >= 70));
    unlock("veloz", p.attrs.pac >= 90);
    fresh.forEach(function (k) { p.fame = U.clamp(p.fame + 3, 0, 100); });
    return fresh;
  }

  // ---------- técnico e confiança ----------
  function baseConfOf(g) {
    const p = g.player;
    const squadLvl = myClub(g).str - 4;
    // jovens têm mais margem de crédito do técnico
    const youthBonus = p.age <= 20 ? 14 : p.age <= 23 ? 7 : 0;
    return U.clamp(48 + (p.overall - squadLvl) * 2.4 + p.fame / 6 + youthBonus, 30, 88);
  }
  function ensureManager(g) {
    const p = g.player;
    if (!g.manager || g.manager.clubId !== p.clubId) {
      const rng = U.rngFor(g.seed, "mgr", p.clubId, g.year);
      g.manager = { clubId: p.clubId, name: U.nameGen(rng, "BR"), conf: Math.round(baseConfOf(g)) };
    }
  }
  // no começo de cada temporada a confiança regride um pouco à média (novo crédito)
  function seasonConfDrift(g) {
    ensureManager(g);
    g.manager.conf = Math.round(U.clamp(g.manager.conf * 0.65 + baseConfOf(g) * 0.35, 12, 100));
  }
  function managerConf(g) { ensureManager(g); return g.manager.conf; }
  function bumpConf(g, d) { ensureManager(g); g.manager.conf = U.clamp(g.manager.conf + d, 5, 100); }

  // capitania: conquistada com confiança alta + fama/tempo de casa
  function checkCaptain(g) {
    const p = g.player;
    if (p.captain === p.clubId) return null;
    ensureManager(g);
    const goalsHere = p.clubGoals[p.clubId] || 0;
    if (g.manager.conf >= 72 && (p.fame >= 55 || (p.idolClubs || []).indexOf(p.clubId) >= 0) && (goalsHere >= 20 || p.overall >= myClub(g).str)) {
      p.captain = p.clubId;
      p.captainYear = g.year;
      p.morale = U.clamp(p.morale + 6, 5, 100);
      return myClub(g).name;
    }
    return null;
  }

  // ---------- fim de temporada ----------
  function seasonOver(g) { return currentFixture(g) === null; }

  function endSeason(g) {
    const S = g.season, p = g.player;
    const notes = [];
    const lg = leagueOf(g, p.clubId);

    // fecha competições pendentes
    if (S.comps.EST) finishEstadual(g, S.comps.EST);
    const table = finishLeague(g, S.comps.LIGA);
    const myPos = table.findIndex(function (t) { return t.id === p.clubId; }) + 1;
    ["CDB", "COPA"].forEach(function (k) { if (S.comps[k]) completeCup(g, S.comps[k]); });
    // Supermundial: mesmo cuidado do CDB/COPA/Conti — força terminar o bracket real (fim de
    // temporada antecipado) antes de qualquer leitura de S.super.champion
    if (S.super && S.super.bracket && !S.super.champion) completeCup(g, S.super.bracket);
    if (S.super && S.super.bracket && S.super.bracket.champion && !S.super.champion) S.super.champion = S.super.bracket.champion;
    let contiResult = null;
    if (S.comps.CONTI) {
      const C = S.comps.CONTI;
      // se o bracket real chegou a ser montado (o jogador se classificou do grupo), força
      // terminar de resolver tudo agora (fim de temporada antecipado) antes de recorrer ao
      // sorteio por força — mesmo padrão já usado pra CDB/COPA (completeCup)
      if (C.bracket && !C.champion) completeCup(g, C.bracket);
      if (C.bracket && C.bracket.champion && !C.champion) C.champion = C.bracket.champion;
      if (!C.champion) {
        const rngC = U.rngFor(g.seed, "contichamp", g.year);
        const pool = (C.id === "LIB" || C.id === "SUL")
          ? D.clubsOf("SAM").concat(D.clubsOf("BRA").filter(function (c) { return c.str >= 80; }))
          : D.EURO_LEAGUES.reduce(function (acc, l) { return acc.concat(D.clubsOf(l).filter(function (c) { return c.str >= 84; })); }, []);
        C.champion = pickWeighted(pool, rngC).name;
      }
      contiResult = C;
    }

    // liga campeão + título do jogador
    const champName = club(table[0].id).name;
    if (myPos === 1) winTitle(g, lg === "BRB" ? "BRB" : (isBrazilLeague(lg) ? "BRA" : "LIGA"), S.comps.LIGA.name);

    // registra campeões no histórico
    recordChampions(g, table, champName, contiResult);

    // média
    const avg = p.stats.notaN ? p.stats.notaSum / p.stats.notaN : 0;

    // prêmios individuais
    rivalSeasonSim(g);
    const awards = computeAwards(g, table, myPos, avg);

    // meta da diretoria — mas seu desempenho pessoal pesa
    const metaOk = evalBoard(g, myPos, table);
    const ligaG0 = (p.stats.byComp.LIGA || {}).g || 0;
    const greatSeason = avg >= 7.2 || ligaG0 >= 15 || awards.won.length >= 1;
    if (metaOk) { p.money += 400000; p.morale = U.clamp(p.morale + 8, 5, 100); g.boardFail = 0; }
    else if (greatSeason) { /* a diretoria culpa o elenco, não você — não conta como falha */ }
    else g.boardFail++;
    // só te empurram para fora se acumular falhas E você também estiver em baixa
    const forcedOut = g.boardFail >= 2 && avg < 7.0 && !greatSeason;

    // rebaixamento / acesso (Brasil)
    const moves = promoteRelegate(g, table, lg);
    // só depois do rebaixamento/acesso (g.leagueOf já atualizado pra próxima temporada) —
    // senão a liga que você acabou de deixar fica de fora do "Mundo" por uma temporada
    // inteira, porque refreshWorldLeagues pula "minha liga" usando o valor ainda antigo
    if (g.world) refreshWorldLeagues(g);

    // envelhecimento
    const aging = applyAging(g, avg);

    // uma promessa jovem excepcional pode elevar o teto — raro e limitado
    if (avg >= 7.8 && p.age <= 22 && p.stats.j >= 20 && (p.potUps || 0) < 4 && p.pot < 95) {
      p.pot = Math.min(95, p.pot + 1);
      p.potUps = (p.potUps || 0) + 1;
      aging.potUp = true;
    }

    // rival evolui
    rivalSeasonEnd(g, notes);
    worldStarsEnd(g);
    if (g.world) CQ.world.advanceWorld(g, notes);
    if (g.world && CQ.market) CQ.market.advanceMarket(g, notes);

    // renda passiva de negócios / estilo de vida
    const income = assetIncome(g);
    if (income) p.money += income;

    // recordes de carreira
    if (p.stats.g > p.records.bestSeasonG) p.records.bestSeasonG = p.stats.g;
    if (avg > p.records.bestSeasonAvg) p.records.bestSeasonAvg = Math.round(avg * 100) / 100;

    // ídolo do clube: muitos gols + títulos no mesmo clube
    let becameIdol = null;
    const clubGoals = p.clubGoals[p.clubId] || 0;
    const clubTitles = p.titles.filter(function (t) { return t.club === myClub(g).name; }).length;
    if (!p.idolClubs) p.idolClubs = [];
    if (!p.idolYears) p.idolYears = {};
    if (p.idolClubs.indexOf(p.clubId) < 0 && ((clubGoals >= 60 && clubTitles >= 2) || clubGoals >= 100 || (clubTitles >= 4))) {
      p.idolClubs.push(p.clubId);
      p.idolYears[p.clubId] = g.year;
      becameIdol = myClub(g).name;
      p.fame = U.clamp(p.fame + 5, 0, 100);
    }
    // capitania e novos traços
    const newCaptain = checkCaptain(g);
    const newTraits = checkTraits(g);

    // fama decai devagar
    p.fame = U.clamp(p.fame * 0.95 - 1 + (avg >= 7.2 ? 1.5 : 0), 0, 100);
    p.marketValue = marketValue(p);

    // convocação para a seleção
    const nat = D.NATIONS[p.nat];
    const wasConv = p.natTeam.convocado;
    // desempenho PELA seleção nesta temporada (eliminatórias ou torneio) — antes o corte
    // olhava só pra forma no clube, então uma boa campanha nas eliminatórias não segurava
    // a vaga se o clube tivesse uma temporada fraca. Agora, quem já estava convocado e se
    // destacou pela seleção ganha um critério mais largo pra continuar.
    const natKeys = ["SEL", "WC", "CA", "EU"];
    let natJ = 0, natG = 0, natA = 0;
    natKeys.forEach(function (k) { const s = p.stats.byComp[k]; if (s) { natJ += s.j; natG += s.g; natA += s.a; } });
    const strongForNat = natJ >= 2 && (natG + natA) >= 2;
    // sem trava de lesão aqui: uma contusão sofrida nas rodadas finais da temporada dura
    // 3-8 jogos e não tem relação nenhuma com o quanto a campanha pela seleção foi boa —
    // não deve zerar de graça o que a temporada inteira mostrou.
    p.natTeam.convocado = (p.overall >= nat.str - 13 && avg >= 6.6 && p.stats.j >= 10 && p.injury <= 2)
      || (wasConv && strongForNat && p.overall >= nat.str - 18 && p.stats.j >= 6);
    const convNews = p.natTeam.convocado && !wasConv ? "convocado" : (!p.natTeam.convocado && wasConv ? "cortado" : null);

    // eliminatórias com risco real: se a temporada que terminou foi de eliminatória (e o
    // jogador chegou a jogar — sem campanha de fundo pra quem não foi convocado, mesmo
    // escopo já usado pro resto do "mundo": só o que o jogador realmente jogou é simulado),
    // soma pontos (3 vitória, 1 empate, sobre os 8 jogos) e decide se a seleção se
    // classifica pro próximo torneio. Antes disso, S.sel.record era escrito e nunca lido
    // em lugar nenhum — a classificação era 100% decorativa.
    if (S.sel && S.sel.kind === "elim" && S.sel.record && S.sel.record.length) {
      let qpts = 0;
      S.sel.record.forEach(function (r) { qpts += r.gm > r.go ? 3 : r.gm === r.go ? 1 : 0; });
      const qualifiedNow = qpts >= QUALIFY_THRESHOLD;
      notes.push({ t: qualifiedNow ? "nat-qualified" : "nat-notqualified", nat: nat.name, pts: qpts });
      p.natTeam.qualified = qualifiedNow;
    }

    // snapshot da carreira
    const seasonRec = {
      year: g.year, clubId: p.clubId, clubName: myClub(g).name, league: S.comps.LIGA.name, pos: myPos,
      j: p.stats.j, g: p.stats.g, a: p.stats.a, cs: p.stats.cs, avg: Math.round(avg * 100) / 100,
      ov: p.overall, titles: p.titles.filter(function (t) { return t.year === g.year; }).map(function (t) { return t.name; }),
      awards: awards.won.map(function (a) { return a.name; })
    };
    p.career.push(seasonRec);
    p.hist.push({ y: g.year + 1, ov: p.overall });

    // maior vítima
    let vit = null, vmax = 0;
    Object.keys(p.stats.vitimas).forEach(function (k) {
      if (p.stats.vitimas[k] > vmax) { vmax = p.stats.vitimas[k]; vit = oppObj(g, k).name; }
    });

    // aposentadoria — gatilhos por idade × overall (arco de carreira realista)
    let retiring = false;
    if (p.age >= 40) retiring = true;
    else if (p.age >= 37 && p.overall < 80) retiring = true;
    else if (p.age >= 35 && p.overall < 74) retiring = true;
    else if (p.age >= 33 && p.overall < 66) retiring = true;

    // mercado da bola
    let offers = null, mustMove = false;
    const contractOver = g.year >= p.contractEnd;
    const wantOut = !!g.transferRequested;
    if (!retiring && (contractOver || forcedOut || wantOut)) {
      offers = makeOffers(g, forcedOut || wantOut, moves);
      mustMove = forcedOut;
      if (wantOut) offers.requested = true;
    }
    g.transferRequested = false;

    const summary = {
      year: g.year, pos: myPos, champName: champName, table: table.slice(0, 8),
      stats: { j: p.stats.j, g: p.stats.g, a: p.stats.a, cs: p.stats.cs, saves: p.stats.saves, avg: avg },
      awards: awards, metaOk: metaOk, meta: g.board, forcedOut: forcedOut,
      aging: aging, vitima: vit ? { name: vit, gols: vmax } : null,
      titles: seasonRec.titles, offers: offers, mustMove: mustMove, retiring: retiring,
      convNews: convNews, notes: notes, moves: moves,
      ballon: g.lastBallon, income: income, marketValue: p.marketValue, becameIdol: becameIdol,
      newCaptain: newCaptain, newTraits: newTraits, managerName: g.manager ? g.manager.name : null, managerConf: g.manager ? g.manager.conf : null,
      rival: { name: g.rival.name, g: g.rival.seasonG, a: g.rival.seasonA, club: club(g.rival.clubId).name }
    };
    g.pendingSummary = summary;
    if (CQ.nar) CQ.nar.onSeasonEnd(g, summary);
    return summary;
  }

  function pickWeighted(pool, rng) {
    // sorteio ponderado por força ao cubo (fortes ganham mais)
    let total = 0;
    pool.forEach(function (c) { total += Math.pow(c.str - 60, 3); });
    let roll = rng() * total;
    for (let i = 0; i < pool.length; i++) {
      roll -= Math.pow(pool[i].str - 60, 3);
      if (roll <= 0) return pool[i];
    }
    return pool[0];
  }

  function recordChampions(g, table, champName, contiResult) {
    const S = g.season, p = g.player, y = g.year;
    function put(key, name) { g.champs[key] = g.champs[key] || {}; g.champs[key][y] = name; }
    const lg = leagueOf(g, p.clubId);
    if (lg === "BRA") put("BRA", champName);
    else if (lg === "BRB") put("BRB", champName);
    else put(lg, champName);

    // ligas que o jogador não disputa: simuladas por força
    const rngY = U.rngFor(g.seed, "champs", y);
    if (lg !== "BRA") put("BRA", pickWeighted(D.clubsOf("BRA"), rngY).name);
    if (S.comps.CDB) put("CDB", S.comps.CDB.champion);
    else put("CDB", pickWeighted(D.clubsOf("BRA"), U.rngFor(g.seed, "cdbx", y)).name);
    if (contiResult && (contiResult.id === "LIB")) put("LIB", contiResult.champion);
    else put("LIB", pickWeighted(D.clubsOf("SAM").concat(D.clubsOf("BRA").filter(function (c) { return c.str >= 80; })), U.rngFor(g.seed, "libx", y)).name);
    if (contiResult && contiResult.id === "UCL") put("UCL", contiResult.champion);
    else {
      const pool = D.EURO_LEAGUES.reduce(function (acc, l) { return acc.concat(D.clubsOf(l).filter(function (c) { return c.str >= 84; })); }, []);
      put("UCL", pickWeighted(pool, U.rngFor(g.seed, "uclx", y)).name);
    }
    if (S.comps.EST) put("EST", S.comps.EST.knock.champion || "—");
    // campeões de TODAS as ligas europeias (as que o jogador não disputa são simuladas)
    D.EURO_LEAGUES.forEach(function (l) {
      if (l === lg) put(l, champName);
      else put(l, pickWeighted(D.clubsOf(l), U.rngFor(g.seed, "lgx", l, y)).name);
    });
    if (lg !== "BRB") put("BRB", pickWeighted(D.clubsOf("BRB"), U.rngFor(g.seed, "brbx", y)).name);
    // torneios de seleções
    const tour = tournamentOfYear(g);
    if (tour) {
      const T = S.sel;
      // fim de temporada antecipado: força terminar de resolver o mata-mata real (mesmo
      // padrão já usado pra CDB/COPA/Conti — completeCup) antes de recorrer ao sorteio
      if (T && T.bracket && !T.champion) completeCup(g, T.bracket);
      if (T && T.bracket && T.bracket.champion && !T.champion) T.champion = T.bracket.champion;
      if (T && T.champion) put(tour.key, T.champion);
      else {
        const poolN = (tour.key === "WC" ? D.WORLD_POOL : D.CONFED_POOL[D.NATIONS[p.nat].confed])
          .map(function (n) { return { name: n, str: D.NAT_STR[n] || 74 }; });
        put(tour.key, pickWeighted(poolN, U.rngFor(g.seed, "selx", y)).name);
      }
    }
  }

  function computeAwards(g, table, myPos, avg) {
    const p = g.player, S = g.season;
    const rng = U.rngFor(g.seed, "awards", g.year);
    const won = [], lost = [];
    const ligaStats = p.stats.byComp.LIGA || { j: 0, g: 0, a: 0 };
    const sameLeague = leagueOf(g, g.rival.clubId) === leagueOf(g, p.clubId);
    const rivalG = sameLeague ? g.rival.seasonG : 0;

    // ---- Artilheiro: precisa bater o melhor NPC da liga (teto alto) e o rival ----
    const npcTop = S.scorerTop || U.ri(20, 28, rng);
    const bestOther = Math.max(npcTop, rivalG);
    if (p.pos !== "GOL") {
      if (ligaStats.g > bestOther) won.push({ key: "artilheiro", name: "Artilheiro da liga", detail: ligaStats.g + " gols" });
      else lost.push({ key: "artilheiro", name: "Artilheiro da liga", by: (rivalG >= npcTop && sameLeague) ? g.rival.name : "o goleador da liga", num: bestOther });
    }
    // ---- Craque do Campeonato: nota de elite + entre os melhores + título/pos ----
    const bestAvg = 7.35 + rng() * 0.45 + (sameLeague && g.rival.overall > p.overall ? 0.15 : 0);
    if (avg >= 7.55 && p.stats.j >= 20 && avg > bestAvg && myPos <= 3) {
      won.push({ key: "craque", name: "Craque do Campeonato", detail: "nota média " + U.fmtNota(avg) });
    } else if (avg >= 7.1 && p.stats.j >= 18) {
      lost.push({ key: "craque", name: "Craque do Campeonato", by: sameLeague && g.rival.overall >= p.overall ? g.rival.name : "outro craque" });
      if (sameLeague && g.rival.overall >= p.overall) g.rival.awards.push({ year: g.year, name: "Craque do Campeonato" });
    }
    // ---- Revelação: sub-21, produção forte, uma única vez na carreira ----
    const jaRevelacao = p.awards.some(function (a) { return a.name === "Revelação do ano"; });
    if (!jaRevelacao && p.age <= 20 && (p.stats.g + p.stats.a >= 18 || avg >= 7.3) && p.stats.j >= 15) {
      won.push({ key: "revelacao", name: "Revelação do ano", detail: p.age + " anos" });
    }
    // ---- Luva de Ouro: clean sheets acima do melhor goleiro NPC ----
    if (p.pos === "GOL") {
      const bestCS = U.ri(14, 19, rng);
      if (p.stats.cs >= bestCS && avg >= 7.1) won.push({ key: "luva", name: "Luva de Ouro", detail: p.stats.cs + " jogos sem sofrer gol" });
      else lost.push({ key: "luva", name: "Luva de Ouro", num: bestCS });
    }
    // ---- Craque do Clube ----
    if (avg >= 7.2 && p.stats.j >= 18) won.push({ key: "clube", name: "Craque do Clube", detail: "eleito pela torcida" });

    // ---- Bola de Ouro: ranking mundial. Só entra na conversa quem bate ao menos
    // o pior dos 12 craques fixos nesta temporada — senão não é indicado (antes,
    // o jogador era sempre inserido na lista de 13 e quase sempre aparecia em
    // último, mesmo em temporadas fracas). Só o nº 1 leva (muito difícil).
    const pScore = ballonScore(g, avg, ligaStats.g);
    const ranking = ballonRanking(g, pScore);
    const worldOnly = ranking.filter(function (r) { return !r.me; });
    const minWorldScore = Math.min.apply(null, worldOnly.map(function (r) { return r.score; }));
    const nominated = pScore >= minWorldScore;
    const myRank = nominated ? ranking.findIndex(function (r) { return r.me; }) + 1 : null;
    p.ballon.push({ year: g.year, rank: myRank, score: pScore });
    g.lastBallon = nominated
      ? { rank: myRank, top: ranking.slice(0, 10), score: pScore }
      : { rank: null, top: worldOnly.slice(0, 10), score: pScore };
    if (myRank === 1) {
      won.push({ key: "bola", name: "Bola de Ouro", detail: "o melhor do mundo em " + g.year });
      p.fame = 100;
    } else if (myRank != null && myRank <= 3) {
      lost.push({ key: "bola", name: "Bola de Ouro", by: ranking[0].name, rank: myRank });
    }

    won.forEach(function (a) {
      p.awards.push({ year: g.year, name: a.name, club: myClub(g).name });
      p.fame = U.clamp(p.fame + (a.key === "bola" ? 0 : 6), 0, 100);
      p.money += a.key === "bola" ? 1500000 : 250000;
    });
    return { won: won, lost: lost, ballonRank: myRank };
  }

  function evalBoard(g, myPos, table) {
    const b = g.board;
    if (!b) return true;
    if (b.type === "fuga") return myPos <= table.length - 4;
    return myPos <= b.pos;
  }

  // tabelas reais das ligas que o jogador NÃO disputa nesta temporada — mesmo motor
  // (leagueComp/finishLeague/tableOf) da liga do próprio jogador, resolvido de uma vez
  // (ninguém acompanha rodada a rodada uma liga que não é a sua). Sobrescreve o
  // snapshot do ano anterior a cada temporada — sem histórico acumulado.
  function refreshWorldLeagues(g) {
    const myLg = leagueOf(g, g.player.clubId);
    g.world.leagues = g.world.leagues || {};
    // a liga que virou "minha" agora não deve carregar um snapshot velho de quando ainda
    // não era (senão fica ali parado, sem atualizar, enquanto for minha liga)
    delete g.world.leagues[myLg];
    Object.keys(D.LEAGUES).forEach(function (lgId) {
      if (lgId === myLg) return; // essa é a S.comps.LIGA real, já simulada pelo próprio jogo
      const teamIds = leagueTeamIds(g, lgId);
      const rounds = doubleRR(teamIds, U.rngFor(g.seed, "wliga", lgId, g.year));
      const comp = leagueComp(g, lgId, D.LEAGUES[lgId].name, teamIds, rounds);
      finishLeague(g, comp); // resolve ensureRound r=1..nRounds inteiro, sem reinventar nada
      g.world.leagues[lgId] = {
        id: comp.id, name: comp.name, teamIds: comp.teamIds,
        nRounds: comp.nRounds, results: comp.results, year: g.year
      };
    });
  }

  function promoteRelegate(g, tableA, lg) {
    const moves = { down: [], up: [], myMove: null };
    if (!isBrazilLeague(lg)) return moves;
    const y = g.year;
    // tabela da outra divisão simulada
    const otherLg = lg === "BRA" ? "BRB" : "BRA";
    const otherIds = leagueTeamIds(g, otherLg);
    const rng = U.rngFor(g.seed, "othertable", y);
    const scored = otherIds.map(function (id) {
      return { id: id, score: club(id).str + U.rf(-7, 7, rng) };
    }).sort(function (a, b) { return b.score - a.score; });

    let braTable, brbOrder;
    if (lg === "BRA") { braTable = tableA.map(function (t) { return t.id; }); brbOrder = scored.map(function (s) { return s.id; }); }
    else { brbOrder = tableA.map(function (t) { return t.id; }); braTable = scored.map(function (s) { return s.id; }); }

    const down = braTable.slice(-4);
    const up = brbOrder.slice(0, 4);
    down.forEach(function (id) { g.leagueOf[id] = "BRB"; moves.down.push(club(id).name); });
    up.forEach(function (id) { g.leagueOf[id] = "BRA"; moves.up.push(club(id).name); });
    if (down.indexOf(g.player.clubId) >= 0) moves.myMove = "down";
    if (up.indexOf(g.player.clubId) >= 0) moves.myMove = "up";
    // campeão da série B no histórico
    g.champs.BRB = g.champs.BRB || {};
    g.champs.BRB[y] = club(brbOrder[0]).name;
    return moves;
  }

  function applyAging(g, avg) {
    const p = g.player;
    const rng = U.rngFor(g.seed, "aging", g.year);
    p.age++;
    const out = { drops: [], note: null };
    // quantos "pontos de queda" por idade — declínio gradual e crescente
    let decl = 0;
    if (p.age >= 36) decl = 6 + (p.age - 36) * 2;
    else if (p.age === 35) decl = 5;
    else if (p.age === 34) decl = 4;
    else if (p.age === 33) decl = 3;
    else if (p.age === 32) decl = 2;
    else if (p.age >= 30) decl = U.chance(0.7, rng) ? 1 : 0;
    else if (p.age >= 28) decl = U.chance(0.35, rng) ? 1 : 0;
    // grande temporada suaviza só 1 ponto (nunca zera a partir dos 32)
    if (avg >= 7.6 && decl > 1) { decl = Math.max(p.age >= 32 ? 1 : 0, decl - 1); if (p.age >= 33) out.note = "Grande temporada suavizou o declínio, mas o tempo cobra."; }
    // físico e ritmo caem primeiro; depois os demais
    const prefer = p.age >= 34 ? ATTRS : ["pac", "fis", "pac", "fis", "dri", "def"];
    for (let i = 0; i < decl; i++) {
      const pool = prefer.filter(function (k) { return p.attrs[k] > 38; });
      const a = pool.length ? U.choice(pool, rng) : U.choice(ATTRS, rng);
      p.attrs[a] = Math.max(30, p.attrs[a] - 1);
      const ex = out.drops.find(function (d) { return d.attr === a; });
      if (ex) ex.d++; else out.drops.push({ attr: a, d: 1 });
    }
    if (decl > 0) p.overall = overallOf(p.attrs, p.pos);
    return out;
  }

  // ---------- mercado ----------
  function makeOffers(g, forcedOut, moves) {
    const p = g.player;
    const rng = U.rngFor(g.seed, "offers", g.year);
    const offers = [];
    const canEurope = p.overall >= 77 || p.fame >= 62;
    const curLg = leagueOf(g, p.clubId);

    function addOffer(cl) {
      if (!cl || cl.id === p.clubId) return;
      if (offers.some(function (o) { return o.clubId === cl.id; })) return;
      const lg2 = leagueOf(g, cl.id);
      const sal = Math.round(calcSalary(p.overall, cl.str, lg2) * U.rf(0.9, 1.25, rng) / 500) * 500;
      // papel proposto conforme o quanto o clube te valoriza
      const gap = p.overall - (cl.str - 4);
      const role = gap >= 3 ? "estrela" : gap >= -3 ? "titular" : "rotacao";
      offers.push({ clubId: cl.id, name: cl.name, league: D.LEAGUES[lg2] ? D.LEAGUES[lg2].short : lg2, salary: sal, years: U.ri(2, 3, rng), role: role });
    }

    const n = U.ri(2, 4, rng);
    // clubes brasileiros compatíveis
    const fit = function (c) { return Math.abs(c.str - 4 - p.overall) <= 12; };
    let pool = D.clubsOf("BRA").concat(p.overall < 72 ? D.clubsOf("BRB") : []);
    pool = pool.filter(fit);
    if (canEurope) {
      D.EURO_LEAGUES.forEach(function (l) {
        D.clubsOf(l).forEach(function (c) {
          if (p.overall >= c.str - 8 && p.overall >= 74) pool.push(c);
        });
      });
    }
    pool = U.shuffle(pool, rng);
    // garante 1-2 europeus quando elegível
    if (canEurope) {
      const eu = pool.filter(function (c) { return !isBrazilLeague(leagueOf(g, c.id)) && leagueOf(g, c.id) !== "SAM" && leagueOf(g, c.id) !== "EST"; });
      if (eu.length) addOffer(eu[0]);
      if (eu.length > 1 && U.chance(0.5, rng)) addOffer(eu[1]);
    }
    for (let i = 0; i < pool.length && offers.length < n; i++) {
      const c = pool[i];
      const l = leagueOf(g, c.id);
      if (l === "EST" || l === "SAM") continue;
      addOffer(c);
    }
    // renovação
    const renew = !forcedOut && !(moves && moves.myMove === "down" && U.chance(0.5, rng));
    return {
      list: offers.slice(0, 4),
      renew: renew ? { salary: Math.round(p.salary * U.rf(1.05, 1.35, rng) / 500) * 500, years: U.ri(2, 3, rng) } : null
    };
  }

  function acceptOffer(g, offer) {
    const p = g.player;
    p.clubId = offer.clubId;
    p.salary = offer.salary;
    p.contractEnd = g.year + 1 + offer.years - 1;
    p.money += Math.round(offer.salary * 2); // luvas
    p.squadRole = offer.role || "titular";
    p.captain = null; // recomeça no novo clube
    g.manager = null; // novo técnico
    g.boardFail = 0;
    g.lastPos = null;
    g.transferRequested = false;
  }
  function acceptRenew(g, renew) {
    const p = g.player;
    p.salary = renew.salary;
    p.contractEnd = g.year + renew.years;
    g.transferRequested = false;
  }

  // pedido de transferência durante a temporada
  function requestTransfer(g) {
    g.transferRequested = true;
    g.player.morale = U.clamp(g.player.morale - 4, 5, 100);
  }
  function cancelTransfer(g) { g.transferRequested = false; }

  // ---------- agenda de partidas (só-leitura, não altera o estado) ----------
  function peekSlot(g, slot) {
    const S = g.season, p = g.player;
    if (slot.comp === "EST") {
      const est = S.comps.EST; if (!est) return null;
      if (slot.round) {
        const pair = (est.rounds[slot.round - 1] || []).find(function (pr) { return pr[0] === p.clubId || pr[1] === p.clubId; });
        if (!pair) return null;
        const opp = pair[0] === p.clubId ? pair[1] : pair[0];
        return { comp: "EST", label: est.name + " · Rodada " + slot.round, oppName: club(opp).name, oppId: opp, home: pair[0] === p.clubId };
      }
      return { comp: "EST", label: est.name + " · " + (slot.stage === "SF" ? "Semifinal" : "Final"), oppName: null, home: null, decisive: slot.stage === "F" };
    }
    if (slot.comp === "LIGA") {
      const L = S.comps.LIGA;
      const pair = (L.rounds[slot.round - 1] || []).find(function (pr) { return pr[0] === p.clubId || pr[1] === p.clubId; });
      if (!pair) return null;
      const opp = pair[0] === p.clubId ? pair[1] : pair[0];
      return { comp: "LIGA", label: L.name + " · Rodada " + slot.round, oppName: club(opp).name, oppId: opp, home: pair[0] === p.clubId };
    }
    if (slot.comp === "CDB" || slot.comp === "COPA") {
      const cup = S.comps[slot.comp]; if (!cup) return null;
      return { comp: slot.comp, label: cup.name + " · " + STAGE_NAMES[slot.stage], oppName: null, home: null, decisive: slot.stage === "F" };
    }
    if (slot.comp === "CONTI") {
      const C = S.comps.CONTI; if (!C) return null;
      if (slot.phase === "G") {
        const pair = (C.group.rounds[slot.round - 1] || []).find(function (pr) { return pr[0] === p.clubId || pr[1] === p.clubId; });
        if (!pair) return null;
        const opp = pair[0] === p.clubId ? pair[1] : pair[0];
        return { comp: C.id, label: C.name + " · Grupo, jogo " + slot.round, oppName: oppObj(g, opp).name, oppId: opp, home: pair[0] === p.clubId };
      }
      const stage = C.koStages[slot.ko];
      const sufixo = slot.leg === 1 ? " (ida)" : slot.leg === 2 ? " (volta)" : "";
      return { comp: C.id, label: C.name + " · " + STAGE_NAMES[stage] + sufixo, oppName: null, home: null, decisive: stage === "F" };
    }
    if (slot.comp === "SEL") {
      const nat = D.NATIONS[p.nat], T = S.sel;
      if (slot.kind === "elim") return { comp: "SEL", label: "Eliminatórias · " + nat.name, oppName: (slot.opp || "").slice(4), home: slot.home, decisive: false };
      if (T && T.isFullSim) {
        if (slot.phase === "G") {
          const myId = "nat:" + nat.name;
          const grp = T.groups[T.myGroup];
          const pair = (grp.rounds[slot.round - 1] || []).find(function (pr) { return pr[0] === myId || pr[1] === myId; });
          if (!pair) return null;
          const opp = pair[0] === myId ? pair[1] : pair[0];
          return { comp: "SEL", label: T.name + " · Grupo " + T.myGroup + ", jogo " + slot.round, oppName: opp.slice(4), oppId: opp, home: pair[0] === myId };
        }
        return { comp: "SEL", label: T.name + " · " + (STAGE_NAMES[slot.stage] || slot.stage), oppName: null, home: null, decisive: slot.stage === "F" };
      }
      return null; // "notqualified" (ou qualquer outro estado sem torneio real) — sem jogo
    }
    if (slot.comp === "MUN") {
      const M = S.mundial; if (!M) return null;
      return { comp: "MUN", label: "Mundial de Clubes · Confronto único", oppName: oppObj(g, M.opp).name, oppId: M.opp, home: slot.home, decisive: true };
    }
    if (slot.comp === "SUPER") {
      const T = S.super; if (!T) return null;
      if (slot.phase === "G") {
        return { comp: "SUPER", label: "Supermundial · Grupo, jogo " + slot.n, oppName: oppObj(g, slot.opp).name, oppId: slot.opp, home: slot.home, decisive: false };
      }
      return { comp: "SUPER", label: "Supermundial · " + STAGE_NAMES[slot.stage], oppName: null, home: null, decisive: slot.stage === "F" };
    }
    return null;
  }

  function peekSchedule(g) {
    const S = g.season, out = [];
    (S.history || []).forEach(function (h) {
      out.push({ done: true, comp: h.comp, label: h.label, oppName: h.opp, home: h.home, gm: h.gm, go: h.go, win: h.win, draw: h.draw, nota: h.nota, plays: h.plays, pg: h.pg, pa: h.pa });
    });
    for (let qi = S.idx; qi < S.queue.length; qi++) {
      const info = peekSlot(g, S.queue[qi]);
      if (info) { info.done = false; out.push(info); }
    }
    return out;
  }

  function nextSeason(g) {
    const sum = g.pendingSummary;
    g.lastPos = sum ? sum.pos : null;
    g.pendingSummary = null;
    g.year++;
    startSeason(g);
  }

  // ---------- utilidades para a UI ----------
  function lastNResults(g, n) {
    const S = g.season;
    return (S.history || []).slice(-n);
  }

  function leagueZones(g, comp) {
    const lg = comp.id;
    if (lg === "BRA") return { lib: 6, sula: 12, reb: comp.teamIds.length - 4 };
    if (lg === "BRB") return { lib: 4, sula: -1, reb: comp.teamIds.length - 4 };
    if (D.EURO_LEAGUES.indexOf(lg) >= 0) return { lib: 4, sula: 6, reb: comp.teamIds.length - 3 };
    return { lib: 4, sula: -1, reb: 99 };
  }

  CQ.engine = {
    ATTRS: ATTRS,
    newGame: newGame, startSeason: startSeason, nextSeason: nextSeason,
    currentFixture: currentFixture, resolveMatch: resolveMatch, applyMatch: applyMatch,
    seasonOver: seasonOver, endSeason: endSeason,
    tableOf: tableOf, ensureRound: ensureRound, leagueZones: leagueZones,
    overallOf: overallOf, buildAttrs: buildAttrs, calcSalary: calcSalary,
    acceptOffer: acceptOffer, acceptRenew: acceptRenew,
    requestTransfer: requestTransfer, cancelTransfer: cancelTransfer, peekSchedule: peekSchedule,
    scoreboard: scoreboard, ballonRanking: ballonRanking, ballonScore: ballonScore, marketValue: marketValue,
    careerTotals: careerTotals, buyAsset: buyAsset, assetIncome: assetIncome,
    LIFESTYLE: LIFESTYLE, MILESTONE_DEFS: MILESTONE_DEFS, FOCUS_ATTRS: FOCUS_ATTRS,
    TRAITS: TRAITS, hasTrait: hasTrait, managerConf: managerConf, ensureManager: ensureManager,
    leagueOf: leagueOf, myClub: myClub, oppObj: oppObj, natTeamObj: natTeamObj,
    refreshWorldLeagues: refreshWorldLeagues,
    STAGE_NAMES: STAGE_NAMES, NAT_FLAGS: NAT_FLAGS, TOUR_CONF: TOUR_CONF, tieDrawn: tieDrawn, discGroup: discGroup,
    teamStrength: teamStrength, simScore: simScore
  };
})();
