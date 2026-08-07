/* CRAQUE — testes de regressão (Fase de Estabilidade)
   Executável no navegador com o jogo carregado:
     1. abra index.html (ou CRAQUE.html)
     2. no console:  CQ.tests.run()
   Não altera o save do usuário (usa carreiras temporárias e restaura o estado).
   Cada teste é determinístico o suficiente para servir de regressão. */
(function () {
  "use strict";
  window.CQ = window.CQ || {};
  const results = [];
  function assert(name, cond, detail) {
    results.push({ name: name, pass: !!cond, detail: detail || "" });
  }
  const E = () => CQ.engine, L = () => CQ.live;

  function withTempGame(fn) {
    const prev = CQ.state.game, prevScreen = CQ.state.screen, prevLive = CQ.state.live;
    CQ.state.live = null; // isolamento: sem estado ao vivo vazando para o teste
    try { fn(); } finally { CQ.state.game = prev; CQ.state.screen = prevScreen; CQ.state.live = prevLive; }
  }

  function newCareer(pos, clubId) {
    return E().newGame({
      name: "Teste " + pos, age: 18, foot: "Destro", num: 9, natId: "BR",
      pos: pos, archId: CQ.DATA.POSITIONS[pos].archs[0].id, legendIds: [], clubId: clubId || "fla"
    });
  }

  // ---- Bola de Ouro: defensores/goleiros de elite pontuam mais que antes ----
  function testBallonScoreDefenders() {
    const fakeZag = { year: 2030, season: null, player: { titles: [], stats: { g: 2, a: 3, cs: 18 }, fame: 60, overall: 84, pos: "ZAG" } };
    const avg = 8.3;
    const newScore = E().ballonScore(fakeZag, avg, 0);
    // fórmula antiga (referência local, só pra confirmar que a mudança favorece o zagueiro)
    const oldScore = Math.round(fakeZag.player.stats.g * 1.25 + fakeZag.player.stats.a * 0.75 + Math.max(0, avg - 6.8) * 15 + fakeZag.player.fame * 0.25 + (fakeZag.player.overall - 80) * 3);
    assert("bola de ouro: fórmula nova favorece zagueiro de elite vs a antiga", newScore > oldScore, "novo=" + newScore + " antigo=" + oldScore);
    ["GOL", "LAT", "VOL"].forEach(function (pos) {
      const g2 = { year: 2030, season: null, player: { titles: [], stats: { g: 1, a: 1, cs: 15 }, fame: 55, overall: 83, pos: pos } };
      const score = E().ballonScore(g2, 8.0, 0);
      assert("bola de ouro: " + pos + " recebe crédito real por clean sheets", score >= 60, pos + "=" + score);
    });
  }

  // ---- BUG-01: cada gol conta uma vez no placar ao vivo ----
  function testLiveScoreSingleCount() {
    withTempGame(function () {
      const g = newCareer("ATA"); CQ.state.game = g;
      const fx = { compKey: "CDB", label: "Final", oppId: "pal", home: true, myTeam: E().myClub(g), opp: E().oppObj(g, "pal"), knock: true, decisive: true, stage: "F" };
      const live = L().buildLive(g, fx); CQ.state.live = live;
      live.events = [
        { min: 0, type: "ko", text: "KO" },
        { min: 20, type: "decision", dec: { kind: "pen", q: "Pên", opts: [{ label: "bato", sub: "", p: 1, ok: "GOL", fail: "x", okFx: { myGoal: true }, failFx: {} }] } },
        { min: 90, type: "ft", text: "FT" }
      ];
      live.i = 0; live.score = [0, 0]; live.res.gm = 0; live.res.go = 0; live.res.pg = 0;
      L().step(live); L().step(live); // chega na decisão
      L().chooseDecision(live, 0);
      assert("live: chooseDecision não mexe no placar visual", live.score[0] === 0, "score=" + live.score[0]);
      assert("live: res.gm sobe na decisão", live.res.gm === 1, "gm=" + live.res.gm);
      L().step(live); // revela o gol
      assert("live: placar visual conta o gol exatamente 1x", live.score[0] === 1, "score=" + live.score[0]);
    });
  }

  // ---- BUG-02: import/load migram e validam ----
  function testImportMigrates() {
    withTempGame(function () {
      const g = newCareer("MEI");
      const old = JSON.parse(JSON.stringify(g));
      ["traits", "compGoals", "idolClubs", "clubGoals", "ballon", "milestones", "assets", "records", "captain", "squadRole"].forEach(function (k) { delete old.player[k]; });
      delete old.manager; delete old.worldStars; delete old.schemaVersion; delete old.world; delete old.clubRivalry;
      const raw = localStorage.getItem("craque-save-v1");
      localStorage.setItem("craque-save-v1", JSON.stringify(old));
      const loaded = CQ.main.load();
      if (raw != null) localStorage.setItem("craque-save-v1", raw); else localStorage.removeItem("craque-save-v1");
      assert("save: migra campos novos", loaded && Array.isArray(loaded.player.traits) && !!loaded.manager && (loaded.worldStars || []).length === 12, JSON.stringify({ t: !!(loaded && loaded.player.traits), m: !!(loaded && loaded.manager) }));
      assert("save: schemaVersion presente", loaded && loaded.schemaVersion >= 2, "v=" + (loaded && loaded.schemaVersion));
      const myClubId = loaded && loaded.player.clubId;
      const expectLen = CQ.DATA.REAL_SQUADS[myClubId] ? CQ.DATA.REAL_SQUADS[myClubId].length : 20;
      assert("save: migra g.world (elenco do clube do jogador)",
        loaded && loaded.world && loaded.world.clubs[myClubId] && loaded.world.clubs[myClubId].roster.length === expectLen,
        JSON.stringify({ temMundo: !!(loaded && loaded.world), qtd: loaded && loaded.world && loaded.world.clubs[myClubId] && loaded.world.clubs[myClubId].roster.length, esperado: expectLen }));
      assert("save: migra g.world.leagues (tabelas das outras ligas)",
        loaded && loaded.world && loaded.world.leagues && Object.keys(loaded.world.leagues).length === 7,
        "n=" + (loaded && loaded.world && loaded.world.leagues ? Object.keys(loaded.world.leagues).length : -1));
      assert("save: migra g.clubRivalry", loaded && loaded.clubRivalry && typeof loaded.clubRivalry === "object");
    });
  }

  // ---- Mundo persistente: tabelas reais das ligas que o jogador não disputa ----
  function testWorldLeagueTables() {
    withTempGame(function () {
      const g = newCareer("ATA"); // fla -> BRA
      const myLg = E().leagueOf(g, g.player.clubId);
      const otherKeys = Object.keys(CQ.DATA.LEAGUES).filter(function (k) { return k !== myLg; });

      assert("mundo-ligas: todas as 7 outras ligas presentes ao criar carreira",
        otherKeys.length === 7 && otherKeys.every(function (k) { return !!g.world.leagues[k]; }), "n=" + otherKeys.length);

      let structOk = true, structDetail = "";
      otherKeys.forEach(function (k) {
        const L = g.world.leagues[k];
        const N = L.teamIds.length;
        const table = E().tableOf(g, L);
        const totalMatches = N * (N - 1);
        const sumJ = table.reduce(function (a, t) { return a + t.j; }, 0);
        const sumPts = table.reduce(function (a, t) { return a + t.pts; }, 0);
        const sumGp = table.reduce(function (a, t) { return a + t.gp; }, 0);
        const sumGc = table.reduce(function (a, t) { return a + t.gc; }, 0);
        if (table.length !== N) { structOk = false; structDetail = k + ":rows"; }
        if (sumJ !== totalMatches * 2) { structOk = false; structDetail = k + ":j " + sumJ + "!=" + (totalMatches * 2); }
        if (sumGp !== sumGc) { structOk = false; structDetail = k + ":gp!=gc"; }
        if (sumPts < totalMatches * 2 || sumPts > totalMatches * 3) { structOk = false; structDetail = k + ":pts " + sumPts; }
      });
      assert("mundo-ligas: J/Pts/gols batem para cada liga simulada", structOk, structDetail);

      let n = 0; while (E().currentFixture(g) && n++ < 160) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
      const sum = g.pendingSummary || E().endSeason(g);
      const y0 = g.year;
      const anyStale = otherKeys.some(function (k) { return g.world.leagues[k].year !== y0; });
      assert("mundo-ligas: snapshot renovado no endSeason (ano bate)", !anyStale, "y0=" + y0);
      if (sum.offers) {
        if (sum.offers.renew) E().acceptRenew(g, sum.offers.renew);
        else if (sum.offers.list && sum.offers.list[0]) E().acceptOffer(g, sum.offers.list[0]);
      }
      E().nextSeason(g);
      const myLg2 = E().leagueOf(g, g.player.clubId);
      const otherKeys2 = Object.keys(CQ.DATA.LEAGUES).filter(function (k) { return k !== myLg2; });
      assert("mundo-ligas: ainda 7 outras ligas após virar temporada",
        otherKeys2.length === 7 && otherKeys2.every(function (k) { return !!g.world.leagues[k]; }), "n=" + otherKeys2.length);
    });
  }

  // ---- Mundo persistente: envelhece de verdade e repõe quem se aposenta ----
  function testWorldAging() {
    withTempGame(function () {
      const g = newCareer("ATA");
      assert("mundo: 191 clubes ao criar carreira", Object.keys(g.world.clubs).length === 191, "n=" + Object.keys(g.world.clubs).length);
      const clubId = g.player.clubId;
      const before = g.world.clubs[clubId].roster.map(function (pl) { return { id: pl.id, age: pl.age }; });
      let guard = 0, seasons = 0; // 'seasons' só conta endSeason/advanceWorld executados de verdade
      // (o loop pode ter uma iteração a mais que reaproveita um pendingSummary já em cache
      // antes de quebrar — guard sozinho não é a contagem confiável de avanços do mundo)
      while (guard++ < 15) {
        let n = 0; while (E().currentFixture(g) && n++ < 160) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        const hadPending = !!g.pendingSummary;
        const sum = g.pendingSummary || E().endSeason(g);
        if (!hadPending) seasons++;
        if (sum.retiring) break;
        if (sum.offers) {
          if (sum.offers.renew) E().acceptRenew(g, sum.offers.renew);
          else if (sum.offers.list && sum.offers.list[0]) E().acceptOffer(g, sum.offers.list[0]);
        }
        E().nextSeason(g);
      }
      const after = g.world.clubs[clubId].roster;
      // o mundo inteiro (clube do jogador incluso) avançou 'seasons' temporadas — quem
      // sobreviveu (mesmo id) precisa ter envelhecido exatamente isso; quem se aposentou
      // virou outro id.
      let agedOk = true, sameIdCount = 0;
      before.forEach(function (b, i) {
        const a = after[i];
        if (a.id === b.id) { sameIdCount++; if (a.age !== b.age + seasons) agedOk = false; }
      });
      assert("mundo: quem não se aposentou envelheceu exatamente 1 ano/temporada", agedOk, "sameId=" + sameIdCount + " seasons=" + seasons);
      let totalReal = 0, totalSwapped = 0;
      Object.keys(g.world.clubs).forEach(function (cid) {
        g.world.clubs[cid].roster.forEach(function (pl) { if (pl.real) totalReal++; else totalSwapped++; });
      });
      assert("mundo: pelo menos uma reposição (aposentadoria) em " + guard + " temporadas", totalSwapped > 0, "reais=" + totalReal + " repostos=" + totalSwapped);
    });
  }
  // ---- Mercado autônomo entre NPCs: transfere sem estourar tamanho de elenco nem duplicar id ----
  function testMarketTransfers() {
    withTempGame(function () {
      const g = newCareer("ATA");
      const initialSizes = {};
      Object.keys(g.world.clubs).forEach(function (cid) { initialSizes[cid] = g.world.clubs[cid].roster.length; });
      const allNotes = [];
      let guard = 0;
      while (guard++ < 15) {
        let n = 0; while (E().currentFixture(g) && n++ < 160) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        const hadPending = !!g.pendingSummary;
        const sum = g.pendingSummary || E().endSeason(g);
        if (!hadPending && sum.notes) allNotes.push.apply(allNotes, sum.notes);
        if (sum.retiring) break;
        if (sum.offers) {
          if (sum.offers.renew) E().acceptRenew(g, sum.offers.renew);
          else if (sum.offers.list && sum.offers.list[0]) E().acceptOffer(g, sum.offers.list[0]);
        }
        E().nextSeason(g);
      }
      let sizeOk = true, sizeDetail = "";
      Object.keys(g.world.clubs).forEach(function (cid) {
        if (g.world.clubs[cid].roster.length !== initialSizes[cid]) { sizeOk = false; sizeDetail = cid; }
      });
      assert("mercado: tamanho de cada elenco não muda com transferências", sizeOk, sizeDetail);
      let dupOk = true, dupDetail = "";
      Object.keys(g.world.clubs).forEach(function (cid) {
        const ids = g.world.clubs[cid].roster.map(function (pl) { return pl.id; });
        if (new Set(ids).size !== ids.length) { dupOk = false; dupDetail = cid; }
      });
      assert("mercado: nenhum id duplicado dentro do mesmo elenco", dupOk, dupDetail);
      const transferNews = allNotes.filter(function (n) { return n.t === "world-transfer"; });
      assert("mercado: pelo menos 1 notícia de transferência em 15 temporadas", transferNews.length > 0, "n=" + transferNews.length);
    });
  }

  // ---- Copa do Mundo real de 48 seleções: 12 grupos + mata-mata de 32 + disputa de 3º ----
  function testWorldCup48() {
    withTempGame(function () {
      const g = newCareer("ZAG");
      let guard = 0;
      while (g.year % 4 !== 2 && guard++ < 8) {
        let n = 0; while (E().currentFixture(g) && n++ < 200) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        const sum = g.pendingSummary || E().endSeason(g);
        if (sum.offers) {
          if (sum.offers.renew) E().acceptRenew(g, sum.offers.renew);
          else if (sum.offers.list && sum.offers.list[0]) E().acceptOffer(g, sum.offers.list[0]);
        }
        E().nextSeason(g);
      }
      assert("copa do mundo: alcança um ano de Copa do Mundo (ano%4===2)", g.year % 4 === 2, "year=" + g.year);
      // força convocação e reconstrói a temporada — a elegibilidade de verdade não é o alvo
      // deste teste, o alvo é a GEOMETRIA da Copa de 48 (12 grupos, 32 no mata-mata, 3º lugar)
      g.player.natTeam.convocado = true;
      E().startSeason(g);
      const T = g.season.sel;
      assert("copa do mundo: S.sel existe e é full-sim na temporada de Copa", !!(T && T.isFullSim), T ? (T.kind + "/" + T.isFullSim) : "sem sel");
      if (!(T && T.isFullSim)) return;

      const letters = Object.keys(T.groups);
      assert("copa do mundo: exatamente 12 grupos", letters.length === 12, "n=" + letters.length);
      let groupsOk = true, detail = "";
      const allIds = {};
      letters.forEach(function (l) {
        const grp = T.groups[l];
        if (grp.teamIds.length !== 4) { groupsOk = false; detail = l + ":size=" + grp.teamIds.length; }
        if (grp.rounds.length !== 3) { groupsOk = false; detail = l + ":rounds=" + grp.rounds.length; }
        grp.teamIds.forEach(function (id) {
          if (allIds[id]) { groupsOk = false; detail = "repetido:" + id; }
          allIds[id] = true;
        });
      });
      const nUnique = Object.keys(allIds).length;
      assert("copa do mundo: 48 seleções únicas em 12 grupos de 4, turno único (3 rodadas)", groupsOk && nUnique === 48, detail || ("n=" + nUnique));

      // joga a temporada inteira (grupo + mata-mata do jogador, se avançar)
      let n2 = 0; while (E().currentFixture(g) && n2++ < 300) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));

      let jOk = true, jDetail = "";
      letters.forEach(function (l) {
        const table = E().tableOf(g, T.groups[l]);
        const sumJ = table.reduce(function (a, t) { return a + t.j; }, 0);
        if (sumJ !== 12) { jOk = false; jDetail = l + ":j=" + sumJ; } // 4 seleções, turno único = 6 jogos = 12 "j" somados
      });
      assert("copa do mundo: cada um dos 12 grupos completa 6 jogos (turno único)", jOk, jDetail);

      if (T.eliminatedAt === "G") {
        assert("copa do mundo: eliminado nos grupos não monta bracket", !T.bracket);
      } else if (T.bracket) {
        assert("copa do mundo: bracket com 32 seleções (2 primeiros x12 + 8 melhores terceiros)", T.bracket.teams.length === 32, "n=" + T.bracket.teams.length);
        assert("copa do mundo: 5 estágios de mata-mata (dezesseis avos → final)", T.bracket.stages.length === 5, "n=" + T.bracket.stages.length);
        if (T.thirdPlace) {
          const sf = T.bracket.stages.find(function (s) { return s.key === "SF"; });
          assert("copa do mundo: disputa de 3º lugar só existe com as 2 semis já resolvidas", sf && sf.ties && sf.ties.every(function (t) { return t.winner; }));
        }
      }
    });
  }

  // ---- Olheiro de base: promessa notável vira notícia + aba Base bem formada ----
  function testProspectBreakout() {
    withTempGame(function () {
      const g = newCareer("ATA");
      const allNotes = [];
      let guard = 0;
      while (guard++ < 20) {
        let n = 0; while (E().currentFixture(g) && n++ < 160) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        const hadPending = !!g.pendingSummary;
        const sum = g.pendingSummary || E().endSeason(g);
        if (!hadPending && sum.notes) allNotes.push.apply(allNotes, sum.notes);
        if (sum.retiring) break;
        if (sum.offers) {
          if (sum.offers.renew) E().acceptRenew(g, sum.offers.renew);
          else if (sum.offers.list && sum.offers.list[0]) E().acceptOffer(g, sum.offers.list[0]);
        }
        E().nextSeason(g);
      }
      const breakouts = allNotes.filter(function (n) { return n.t === "prospect-breakout"; });
      assert("base: pelo menos 1 notícia de promessa de base em 20 temporadas", breakouts.length > 0, "n=" + breakouts.length);
      let shapeOk = true;
      breakouts.forEach(function (n) {
        if (!n.player || !n.pos || typeof n.ovr !== "number" || typeof n.age !== "number" || !n.club) shapeOk = false;
      });
      assert("base: shape da nota prospect-breakout está completo", shapeOk);

      const myClubId = g.player.clubId;
      const base = g.world.clubs[myClubId].roster.filter(function (pl) { return pl.age <= 20; });
      let baseOk = true;
      base.forEach(function (pl) { if (!(pl.ovr >= 40 && pl.ovr <= 96) || !pl.pos || !pl.name) baseOk = false; });
      assert("base: dados da aba Base (idade<=20) bem formados", baseOk, "n=" + base.length);
    });
  }

  // ---- Rivalidade de clubes: cobertura total + placar histórico do clássico ----
  function testRivalsCoverage() {
    const CLUBS = CQ.DATA.CLUBS;
    const ids = Object.keys(CLUBS);
    const allHaveRival = ids.every(function (id) { return CLUBS[id].rivals.length > 0; });
    assert("rivais: todo clube tem ao menos 1 rival", allHaveRival);
    let symOk = true, symDetail = "";
    ids.forEach(function (id) {
      CLUBS[id].rivals.forEach(function (rid) {
        if (CLUBS[rid].rivals.indexOf(id) < 0) { symOk = false; symDetail = id + "<->" + rid; }
      });
    });
    assert("rivais: toda relação é simétrica (bidirecional)", symOk, symDetail);
    const curated = [["fla", "flu"], ["pal", "cor"], ["rma", "bar"], ["riv", "boc"]];
    const curatedOk = curated.every(function (pr) { return CLUBS[pr[0]].rivals.indexOf(pr[1]) >= 0; });
    assert("rivais: pares curados reais permanecem intactos", curatedOk);
  }

  function testClubRivalryScoreboard() {
    withTempGame(function () {
      const g = newCareer("ATA"); // fla, já tem rivais reais (flu/vas/bot)
      let found = false, guard = 0;
      while (!found && guard++ < 200) {
        const fx = E().currentFixture(g);
        if (!fx) break;
        if (fx.classic) found = true;
        const res = E().resolveMatch(g, fx, {});
        E().applyMatch(g, res);
      }
      assert("clubRivalry: encontrou pelo menos 1 clássico simulado", found, "guard=" + guard);
      const total = Object.keys(g.clubRivalry).reduce(function (acc, k) {
        const r = g.clubRivalry[k]; return acc + r.v + r.e + r.d;
      }, 0);
      assert("clubRivalry: contabilizou pelo menos 1 confronto de clássico", total > 0, "total=" + total);
    });
  }

  // ---- Olheiro de base: promessa Europa-relevante gera o rumor de olheiro europeu ----
  // checa o feed logo após CADA temporada (não só no final) — g.feed é limitado a 140
  // posts, então checar só ao fim de 20 temporadas simuladas deixaria os posts antigos
  // já descartados antes da checagem, dando falso negativo.
  function testScoutingRumor() {
    withTempGame(function () {
      const g = newCareer("ATA");
      let euroWorthy = 0, rumorsFound = 0, guard = 0;
      while (guard++ < 20) {
        let n = 0; while (E().currentFixture(g) && n++ < 160) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        const hadPending = !!g.pendingSummary;
        const sum = g.pendingSummary || E().endSeason(g);
        if (!hadPending && sum.notes) {
          sum.notes.filter(function (n2) { return n2.t === "prospect-breakout" && n2.ovr >= 78; }).forEach(function (n2) {
            euroWorthy++;
            if (g.feed.some(function (post) { return post.text.indexOf(n2.player) >= 0 && post.text.indexOf("Europa") >= 0; })) rumorsFound++;
          });
        }
        if (sum.retiring) break;
        if (sum.offers) {
          if (sum.offers.renew) E().acceptRenew(g, sum.offers.renew);
          else if (sum.offers.list && sum.offers.list[0]) E().acceptOffer(g, sum.offers.list[0]);
        }
        E().nextSeason(g);
      }
      assert("base: há promessas com overall Europa-relevante em 20 temporadas", euroWorthy > 0, "n=" + euroWorthy);
      assert("base: cada promessa Europa-relevante gera o rumor de olheiro europeu", rumorsFound === euroWorthy, rumorsFound + "/" + euroWorthy);
    });
  }

  // ---- Fala do técnico: linha certa por faixa de confiança + determinística ----
  function testManagerLine() {
    const fakeG = { seed: 12345, year: 2030, season: { idx: 5 } };
    [80, 60, 40, 10].forEach(function (conf) {
      const tier = CQ.ui.managerConfTier(conf);
      const line1 = CQ.ui.managerLine(fakeG, conf);
      const line2 = CQ.ui.managerLine(fakeG, conf);
      assert("fala do técnico: linha pertence ao pool da faixa certa (conf=" + conf + ")", CQ.ui.MGR_LINES[tier].indexOf(line1) >= 0, line1);
      assert("fala do técnico: mesma chamada é determinística (conf=" + conf + ")", line1 === line2, line1 + " vs " + line2);
    });
  }

  function testImportRejectsInvalid() {
    withTempGame(function () {
      const raw = localStorage.getItem("craque-save-v1");
      localStorage.setItem("craque-save-v1", JSON.stringify({ season: {} })); // sem player
      const r = CQ.main.load();
      if (raw != null) localStorage.setItem("craque-save-v1", raw); else localStorage.removeItem("craque-save-v1");
      assert("save: rejeita estrutura inválida", r === null, "r=" + (r === null ? "null" : "aceitou"));
    });
  }

  // ---- Smoke: nova carreira em todas as posições + 1 temporada ----
  function testAllPositionsSmoke() {
    withTempGame(function () {
      Object.keys(CQ.DATA.POSITIONS).forEach(function (pos) {
        let ok = true, err = "";
        try {
          const g = newCareer(pos, pos === "GOL" ? "mir" : "fla");
          let n = 0;
          while (E().currentFixture(g) && n++ < 140) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
          const sum = E().endSeason(g);
          if (!sum || sum.stats.j < 0) { ok = false; err = "sem resumo"; }
        } catch (e) { ok = false; err = e.message; }
        assert("smoke: temporada completa como " + pos, ok, err);
      });
    });
  }

  // ---- Determinismo: mesmo estado inicial + mesmas ações = mesmo resultado ----
  function testDeterminism() {
    withTempGame(function () {
      const base = newCareer("ATA");            // um único jogo (seed, rival, worldStars fixos)
      function simFrom(snapshot) {
        const g = JSON.parse(JSON.stringify(snapshot)); // clone profundo do MESMO estado
        const trace = [];
        let n = 0;
        while (E().currentFixture(g) && n++ < 30) {
          const res = E().resolveMatch(g, E().currentFixture(g), {});
          trace.push(res.gm + "-" + res.go + ":" + res.pg + ":" + (res.nota || 0) + ":" + res.tackles);
          E().applyMatch(g, res);
        }
        return trace.join("|") + "#ov" + g.player.overall;
      }
      const snap = JSON.parse(JSON.stringify(base));
      const a = simFrom(snap);
      const b = simFrom(snap);
      assert("determinismo: mesmo estado → mesmo resultado", a === b, a === b ? "" : "divergiu");
      // seed diferente deve mudar o resultado
      const other = JSON.parse(JSON.stringify(base)); other.seed = (base.seed ^ 0x5bd1e995) >>> 0;
      const c = simFrom(other);
      assert("determinismo: seed diferente → resultado diferente", a !== c, a !== c ? "" : "iguais (suspeito)");
    });
  }

  // ---- Notas por posição: defensores tiram nota alta pela função ----
  function testPositionRatings() {
    withTempGame(function () {
      Object.keys(CQ.DATA.POSITIONS).forEach(function (pos) {
        const g = newCareer(pos, "fla");
        // reforça atributos da posição p/ garantir amostragem boa
        Object.keys(g.player.attrs).forEach(function (k) { g.player.attrs[k] = 82; });
        g.player.overall = E().overallOf(g.player.attrs, pos);
        E().startSeason(g);
        let best = 0, n = 0;
        while (E().currentFixture(g) && n++ < 40) {
          const res = E().resolveMatch(g, E().currentFixture(g), {});
          if (res.plays && res.nota > best) best = res.nota;
          E().applyMatch(g, res);
        }
        assert("nota: " + pos + " alcança nota alta pela função", best >= 7.5, "melhor=" + best);
      });
    });
  }

  // ---- Determinismo do modo ao vivo: mesma seed + mesma escolha = mesmo resultado ----
  function testLiveDeterminism() {
    withTempGame(function () {
      const base = newCareer("ATA");
      function liveOutcome(snapshot) {
        const g = JSON.parse(JSON.stringify(snapshot));
        CQ.state.game = g;
        const fx = { compKey: "CDB", label: "Final", oppId: "pal", home: true, myTeam: E().myClub(g), opp: E().oppObj(g, "pal"), knock: true, decisive: true, stage: "F" };
        const live = L().buildLive(g, fx);
        CQ.state.live = live;
        live.decision = { kind: "pen", q: "x", opts: [{ label: "a", sub: "", p: 0.5, ok: "GOL", fail: "x", okFx: { myGoal: true }, failFx: { nota: -0.2 } }] };
        live.i = 1;
        L().chooseDecision(live, 0);
        return live.res.gm + ":" + live.res.pg + ":" + live.res.nota;
      }
      const snap = JSON.parse(JSON.stringify(base));
      const a = liveOutcome(snap), b = liveOutcome(snap);
      assert("live: mesma seed+escolha → mesmo resultado", a === b, a + " vs " + b);
    });
  }

  function run() {
    results.length = 0;
    testBallonScoreDefenders();
    testManagerLine();
    testLiveScoreSingleCount();
    testImportMigrates();
    testImportRejectsInvalid();
    testDeterminism();
    testLiveDeterminism();
    testPositionRatings();
    testWorldAging();
    testMarketTransfers();
    testProspectBreakout();
    testWorldLeagueTables();
    testWorldCup48();
    testRivalsCoverage();
    testClubRivalryScoreboard();
    testScoutingRumor();
    testAllPositionsSmoke();
    const pass = results.filter(function (r) { return r.pass; }).length;
    console.log("%cCRAQUE regressão: " + pass + "/" + results.length + " passaram", "font-weight:bold");
    results.forEach(function (r) { console.log((r.pass ? "✓" : "✗ FALHOU") + " " + r.name + (r.detail ? "  [" + r.detail + "]" : "")); });
    return { pass: pass, total: results.length, results: results.slice() };
  }

  CQ.tests = { run: run };
})();
