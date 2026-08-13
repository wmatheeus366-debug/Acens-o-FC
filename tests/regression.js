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
      ["traits", "compGoals", "idolClubs", "clubGoals", "ballon", "milestones", "assets", "records", "captain", "squadRole", "loan", "firstClassic", "genIdolYear", "momentIdol"].forEach(function (k) { delete old.player[k]; });
      delete old.manager; delete old.worldStars; delete old.schemaVersion; delete old.world; delete old.clubRivalry;
      const raw = localStorage.getItem("craque-save-v1");
      localStorage.setItem("craque-save-v1", JSON.stringify(old));
      const loaded = CQ.main.load();
      if (raw != null) localStorage.setItem("craque-save-v1", raw); else localStorage.removeItem("craque-save-v1");
      assert("save: migra campos novos", loaded && Array.isArray(loaded.player.traits) && !!loaded.manager && (loaded.worldStars || []).length === 12, JSON.stringify({ t: !!(loaded && loaded.player.traits), m: !!(loaded && loaded.manager) }));
      assert("save: schemaVersion presente", loaded && loaded.schemaVersion >= 2, "v=" + (loaded && loaded.schemaVersion));
      assert("save: migra ídolo em camadas (genIdolYear null, momentIdol false)",
        loaded && loaded.player.genIdolYear === null && loaded.player.momentIdol === false,
        JSON.stringify({ genIdolYear: loaded && loaded.player.genIdolYear, momentIdol: loaded && loaded.player.momentIdol }));
      const myClubId = loaded && loaded.player.clubId;
      const expectLen = CQ.DATA.REAL_SQUADS[myClubId] ? CQ.DATA.REAL_SQUADS[myClubId].length : 20;
      assert("save: migra g.world (elenco do clube do jogador)",
        loaded && loaded.world && loaded.world.clubs[myClubId] && loaded.world.clubs[myClubId].roster.length === expectLen,
        JSON.stringify({ temMundo: !!(loaded && loaded.world), qtd: loaded && loaded.world && loaded.world.clubs[myClubId] && loaded.world.clubs[myClubId].roster.length, esperado: expectLen }));
      assert("save: migra g.world.leagues (tabelas das outras ligas)",
        loaded && loaded.world && loaded.world.leagues && Object.keys(loaded.world.leagues).length === 7,
        "n=" + (loaded && loaded.world && loaded.world.leagues ? Object.keys(loaded.world.leagues).length : -1));
      assert("save: migra g.clubRivalry", loaded && loaded.clubRivalry && typeof loaded.clubRivalry === "object");
      assert("save: migra p.loan (empréstimo) pra null", loaded && loaded.player.loan === null, "loan=" + JSON.stringify(loaded && loaded.player.loan));
      assert("save: migra p.firstClassic pra null", loaded && loaded.player.firstClassic === null, "firstClassic=" + JSON.stringify(loaded && loaded.player.firstClassic));
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

  // ---- Torneios continentais reais (Copa América/Eurocopa/Copa Ouro/Copa da Ásia) ----
  function testContinentalTours() {
    withTempGame(function () {
      const TOUR_CONF = E().TOUR_CONF;
      // uma nação por confederação, forçando convocação e o torneio certo por ano
      const cases = [
        { natId: "AR", key: "CA" }, { natId: "DE", key: "EU" },
        { natId: "MX", key: "GC" }, { natId: "JP", key: "AC" }
      ];
      cases.forEach(function (c) {
        const g = newCareer("ATA", "fla");
        g.player.nat = c.natId;
        g.player.natTeam.convocado = true;
        g.player.natTeam.qualified = true;
        // avança até o ano do torneio certo (year%4===0) sem passar de uma Copa do Mundo
        while (g.year % 4 !== 0) g.year++;
        E().startSeason(g);
        const T = g.season.sel;
        assert("torneio " + c.key + ": monta S.sel full-sim no ano certo", !!(T && T.isFullSim && T.kind === c.key), T ? (T.kind + "/" + T.isFullSim) : "sem sel");
        if (!(T && T.isFullSim)) return;
        const cfg = TOUR_CONF[c.key];
        const letters = Object.keys(T.groups);
        const expectedGroups = { CA: 4, EU: 6, GC: 4, AC: 6 }[c.key];
        assert("torneio " + c.key + ": número de grupos bate com o formato real", letters.length === expectedGroups, "n=" + letters.length);
        let sizeOk = true, dupOk = true;
        const ids = {};
        letters.forEach(function (l) {
          const grp = T.groups[l];
          if (grp.teamIds.length !== 4) sizeOk = false;
          grp.teamIds.forEach(function (id) { if (ids[id]) dupOk = false; ids[id] = 1; });
        });
        assert("torneio " + c.key + ": todos os grupos com 4 seleções, sem repetição", sizeOk && dupOk);

        let n = 0; while (E().currentFixture(g) && n++ < 400) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        if (T.bracket) {
          const expectedAdv = expectedGroups * 2 + cfg.thirds;
          assert("torneio " + c.key + ": bracket com " + expectedAdv + " classificados (formato real)", T.bracket.teams.length === expectedAdv, "n=" + T.bracket.teams.length);
          assert("torneio " + c.key + ": bracket é potência de 2", (T.bracket.teams.length & (T.bracket.teams.length - 1)) === 0);
        }
        const sum = g.pendingSummary || E().endSeason(g);
        if (T.bracket) assert("torneio " + c.key + ": campeão sempre resolvido ao fim da temporada", !!T.champion, "eliminatedAt=" + T.eliminatedAt);
      });
    });
  }

  // ---- Eliminatórias com risco real: qualificação lida de S.sel.record, não decorativa ----
  function testEliminatoriasQualification() {
    withTempGame(function () {
      const g = newCareer("ZAG", "fla");
      g.player.natTeam.convocado = true;
      // força um ano de eliminatória (year%4 em {1,3}) e simula uma campanha perfeita
      while (g.year % 4 === 0 || g.year % 4 === 2) g.year++;
      E().startSeason(g);
      const T = g.season.sel;
      assert("eliminatórias: S.sel.kind é 'elim' no ano certo", T && T.kind === "elim", T ? T.kind : "sem sel");
      if (!(T && T.kind === "elim")) return;
      let n = 0; while (E().currentFixture(g) && n++ < 200) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
      assert("eliminatórias: S.sel.record acumula os 8 jogos", T.record.length === 8, "n=" + T.record.length);
      const sum = g.pendingSummary || E().endSeason(g);
      let qpts = 0;
      T.record.forEach(function (r) { qpts += r.gm > r.go ? 3 : r.gm === r.go ? 1 : 0; });
      const expected = qpts >= 12;
      assert("eliminatórias: g.player.natTeam.qualified reflete os pontos reais da campanha", g.player.natTeam.qualified === expected, "pts=" + qpts + " qualified=" + g.player.natTeam.qualified);

      // reforça o outro lado: força não-classificado e confirma que o próximo torneio vira "notqualified"
      g.player.natTeam.qualified = false;
      g.player.natTeam.convocado = true;
      while (g.year % 4 !== 0 && g.year % 4 !== 2) g.year++;
      E().startSeason(g);
      const T2 = g.season.sel;
      assert("eliminatórias: não classificado pula o torneio (S.sel.kind='notqualified')", T2 && T2.kind === "notqualified", T2 ? T2.kind : "sem sel");
      assert("eliminatórias: não classificado não tem nenhum jogo de seleção na fila", g.season.queue.filter(function (s) { return s.comp === "SEL" && s.kind === "tour"; }).length === 0);
    });
  }

  // ---- Supermundial: chaveamento real (cupComp/advanceCup), não mais bracketOpp ----
  function testSupermundial() {
    withTempGame(function () {
      const g = newCareer("ZAG", "fla");
      const myClubName = E().myClub(g).name;
      g.player.titles.push({ year: 2028, key: "LIB", name: "Libertadores", club: myClubName });
      g.year = 2029; // (2029-2029)%4===0
      E().startSeason(g);
      const T = g.season.super;
      assert("supermundial: S.super é criado no ciclo certo após título continental", !!T, "sem super");
      if (!T) return;
      let n = 0; while (E().currentFixture(g) && n++ < 400) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
      const sum = g.pendingSummary || E().endSeason(g);
      if (T.eliminatedAt === "G") {
        assert("supermundial: eliminado nos grupos não monta bracket", !T.bracket);
      } else {
        assert("supermundial: bracket com 16 clubes", T.bracket && T.bracket.teams.length === 16, T.bracket ? ("n=" + T.bracket.teams.length) : "sem bracket");
        assert("supermundial: campeão sempre resolvido ao fim da temporada", !!T.champion);
      }
    });
  }

  // ---- Conference League: 3º nível europeu, mesmo motor do Conti já consertado ----
  function testConferenceLeague() {
    withTempGame(function () {
      const g = newCareer("ATA", "bay");
      g.player.nat = "DE";
      g.lastPos = 7; // 7ª posição -> UECL (qual<=8, acima do corte de UEL)
      E().startSeason(g);
      const C = g.season.comps.CONTI;
      assert("conference league: 7ª posição monta S.comps.CONTI.id='UECL'", !!(C && C.id === "UECL"), C ? C.id : "sem conti");
      if (!(C && C.id === "UECL")) return;
      let n = 0; while (E().currentFixture(g) && n++ < 400) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
      const sum = g.pendingSummary || E().endSeason(g);
      assert("conference league: campeão sempre resolvido ao fim da temporada", !!C.champion);
    });
  }

  // ---- Mata-mata continental de ida e volta: agregado decide, final é jogo único ----
  function testContiTwoLeggedTies() {
    withTempGame(function () {
      // varre várias carreiras até achar uma que chegue ao mata-mata continental
      let g = null, C = null, tries = 0;
      while (tries++ < 25) {
        g = newCareer("ATA", tries % 2 ? "fla" : "rma");
        let n = 0; while (E().currentFixture(g) && n++ < 700) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        C = g.season.comps.CONTI;
        if (C && C.bracket) break;
      }
      assert("ida e volta: alcança o mata-mata continental em ≤25 carreiras", !!(C && C.bracket), "tries=" + tries);
      if (!(C && C.bracket)) return;

      let aggOk = true, aggDetail = "", legsOk = true, legsDetail = "";
      let finalUnica = true, semVencedor = "", empateSemPens = "";
      C.bracket.stages.forEach(function (st) {
        (st.ties || []).forEach(function (t) {
          if (!t.winner) semVencedor = st.key;
          if (st.key === "F") {
            if (t.legs) finalUnica = false;
            return;
          }
          if (!t.legs || !t.legs[0] || !t.legs[1]) { legsOk = false; legsDetail = st.key; return; }
          const sa = t.legs[0][0] + t.legs[1][0], sb = t.legs[0][1] + t.legs[1][1];
          if (sa !== t.sa || sb !== t.sb) { aggOk = false; aggDetail = st.key + ": " + t.sa + "-" + t.sb + " vs " + sa + "-" + sb; }
          if (sa === sb && !t.pens) empateSemPens = st.key;
          const esperado = sa > sb ? t.a : sb > sa ? t.b : (t.pens && t.pens[0] > t.pens[1] ? t.a : t.b);
          if (t.winner !== esperado) { aggOk = false; aggDetail = st.key + ": vencedor não bate com o agregado"; }
        });
      });
      assert("ida e volta: oitavas/quartas/semi têm as duas partidas registradas", legsOk, legsDetail);
      assert("ida e volta: sa/sb é a soma das duas partidas e o vencedor bate com o agregado", aggOk, aggDetail);
      assert("ida e volta: agregado empatado sempre vai a pênaltis", !empateSemPens, empateSemPens);
      assert("ida e volta: a FINAL continua jogo único (sem ida e volta)", finalUnica);
      assert("ida e volta: todo confronto do chaveamento tem vencedor", !semVencedor, semVencedor);
    });
  }

  // ---- Empate na IDA não pode ir a pênaltis nem decidir o confronto ----
  function testContiFirstLegNoPenalties() {
    withTempGame(function () {
      let idas = 0, empatesNaIda = 0, penaltisNaIda = "", idaDecidiu = "";
      for (let i = 0; i < 12; i++) {
        const g = newCareer("ATA", i % 2 ? "fla" : "rma");
        let n = 0;
        while (n++ < 700) {
          const fx = E().currentFixture(g);
          if (!fx) break;
          const res = E().resolveMatch(g, fx, {});
          const ehIda = !!(fx.conti && fx.leg === 1);
          E().applyMatch(g, res);
          if (ehIda) {
            idas++;
            if (res.gm === res.go) {
              empatesNaIda++;
              if (res.shootout) penaltisNaIda = fx.stage + " " + res.gm + "-" + res.go;
            }
            if (fx.tie.winner) idaDecidiu = fx.stage;
          }
        }
      }
      assert("ida: o jogador chega a disputar partidas de ida", idas > 0, "n=" + idas);
      assert("ida: empate na ida NUNCA vai a pênaltis", !penaltisNaIda, penaltisNaIda);
      assert("ida: a ida nunca decide o confronto sozinha", !idaDecidiu, idaDecidiu);
      assert("ida: empates na ida acontecem (o caso é realmente exercitado)", empatesNaIda > 0, "n=" + empatesNaIda);
    });
  }

  // ---- A mudança é aditiva: as outras copas seguem com jogo único ----
  function testOtherCupsStaySingleLeg() {
    withTempGame(function () {
      let ties = 0, comLegs = "";
      for (let i = 0; i < 6; i++) {
        const g = newCareer("ATA", i % 2 ? "fla" : "rma");
        let n = 0; while (E().currentFixture(g) && n++ < 700) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        ["CDB", "COPA"].forEach(function (k) {
          const cup = g.season.comps[k];
          if (!cup || !cup.stages) return;
          cup.stages.forEach(function (st) {
            (st.ties || []).forEach(function (t) { ties++; if (t.legs) comLegs = k + " " + st.key; });
          });
        });
      }
      assert("aditivo: Copa do Brasil / copa nacional seguem com jogo único por chave", ties > 0 && !comLegs, comLegs || ("ties=" + ties));
    });
  }

  // ---- Bug real corrigido: suspensão de uma competição não pode bloquear outra ----
  function testDiscGroupIsolation() {
    withTempGame(function () {
      const g = newCareer("VOL", "fla"); // volante: cartão mais provável, mas força mesmo assim
      // acha uma partida de LIGA realmente jogada pelo jogador e força um cartão vermelho
      // nela (sem depender de sorte de cartão, só de bench/condição pra ele estar em campo)
      let n = 0, forced = false;
      while (n++ < 700 && !forced) {
        const fx = E().currentFixture(g);
        if (!fx) break;
        const res = E().resolveMatch(g, fx, {});
        if (fx.compKey === "LIGA" && res.plays) {
          res.cardR = true; // força expulsão nesta partida de LIGA
          E().applyMatch(g, res);
          forced = true;
          continue;
        }
        E().applyMatch(g, res);
      }
      assert("suspensão: consegue forçar um cartão vermelho numa partida de LIGA jogada", forced);
      if (!forced) return;
      assert("suspensão: LIGA fica com suspensão pendente no grupo certo", !!(g.player.disc.LIGA && g.player.disc.LIGA.susp > 0), JSON.stringify(g.player.disc));
      // nenhuma outra competição de clube pode ter sido afetada pelo cartão da LIGA — este
      // é exatamente o bug relatado (suspenso no Brasileirão, barrado também na Libertadores)
      let vazou = "";
      ["LIB", "SUL", "UCL", "UEL", "UECL", "CDB", "COPA", "EST", "MUN", "SUPER"].forEach(function (ck) {
        const grp = E().discGroup({ compKey: ck });
        const d = g.player.disc[grp];
        if (d && d.susp > 0) vazou = ck + " (grupo " + grp + ")";
      });
      assert("suspensão: cartão na LIGA não vaza pra nenhuma outra competição de clube", !vazou, vazou);
    });
  }

  // ---- discGroup: mapeia todas as competições continentais pro mesmo grupo CONTI ----
  function testDiscGroupMapping() {
    const map = { LIGA: "LIGA", EST: "EST", CDB: "CDB", COPA: "CDB", LIB: "CONTI", SUL: "CONTI", UCL: "CONTI", UEL: "CONTI", UECL: "CONTI", MUN: "MUN", SUPER: "SUPER" };
    let ok = true, detail = "";
    Object.keys(map).forEach(function (k) {
      const got = E().discGroup({ compKey: k });
      if (got !== map[k]) { ok = false; detail = k + " -> " + got + " (esperado " + map[k] + ")"; }
    });
    assert("discGroup: mapeia cada competição pro grupo de disciplina certo", ok, detail);
  }

  // ---- Lesão mais rara: taxa observada não pode ficar perto do antigo teto de 14% ----
  function testInjuryRateLower() {
    withTempGame(function () {
      let matches = 0, injuries = 0;
      for (let i = 0; i < 8; i++) {
        const g = newCareer("ATA", i % 2 ? "fla" : "rma");
        let n = 0;
        while (E().currentFixture(g) && n++ < 700) {
          const fx = E().currentFixture(g);
          const res = E().resolveMatch(g, fx, {});
          if (res.plays) matches++;
          E().applyMatch(g, res); // res.injuryNew só é escrito aqui dentro — checar depois
          if (res.injuryNew) injuries++;
        }
      }
      const rate = matches ? injuries / matches : 0;
      assert("lesão: pelo menos 1 lesão aconteceu na amostra (a mecânica não quebrou)", injuries > 0, "matches=" + matches);
      assert("lesão: taxa observada bem abaixo do antigo teto de 14% (condição baixa)", rate < 0.08, "matches=" + matches + " injuries=" + injuries + " rate=" + (rate * 100).toFixed(1) + "%");
    });
  }

  // ---- Notas de partida (MATCH_NOTES): rolam em qualquer partida, não só decisiva ----
  function testMatchNotesAnyMatch() {
    withTempGame(function () {
      const g = newCareer("ATA", "fla");
      const feedBefore = g.feed.length;
      let n = 0;
      while (E().currentFixture(g) && n++ < 700) {
        const fx = E().currentFixture(g);
        E().applyMatch(g, E().resolveMatch(g, fx, {}));
      }
      const notas = g.feed.filter(function (item) { return item.k === "torcida" && /invadiu|pombos|granizo|pipoca|cachorro|repórter|mascote|luz|trave|fumaça/i.test(item.text); });
      assert("eventos: pelo menos 1 nota de partida aleatória apareceu numa temporada inteira", notas.length > 0, "n=" + notas.length);
    });
  }

  // ---- Coletiva de imprensa: sempre 3 perguntas de categorias diferentes em jogo decisivo ----
  function testPressConferenceStructure() {
    const g = { year: 2026, pressSeen: [] };
    const fakeRes = { plays: true, fixture: { decisive: true } };
    const pc = CQ.nar.maybePressConference(g, fakeRes);
    assert("coletiva: dispara em jogo decisivo", !!pc);
    if (!pc) return;
    assert("coletiva: sempre 3 perguntas", pc.questions.length === 3, "n=" + pc.questions.length);
    const semQ = pc.questions.filter(function (q) { return typeof q.q !== "string" || !q.q; });
    assert("coletiva: toda pergunta tem texto e 3 opções", semQ.length === 0 && pc.questions.every(function (q) { return q.options && q.options.length === 3; }));
    // jogo não-decisivo não dispara coletiva
    const pc2 = CQ.nar.maybePressConference(g, { plays: true, fixture: { decisive: false } });
    assert("coletiva: não dispara fora de jogo decisivo", pc2 === null);
    // rodando várias vezes, as perguntas variam (não é sempre o mesmo trio) — evidência de
    // que o sorteio/controle de repetição está de fato funcionando
    const vistos = {};
    for (let i = 0; i < 12; i++) {
      const pcN = CQ.nar.maybePressConference(g, fakeRes);
      pcN.questions.forEach(function (q) { vistos[q.q] = true; });
    }
    assert("coletiva: perguntas variam ao longo de várias coletivas (sem repetir sempre o mesmo trio)", Object.keys(vistos).length > 3, "n=" + Object.keys(vistos).length);
  }

  // ---- Campo 2D animado: formação sempre 11 posições, contagem batendo com probableLineup ----
  function testPitchFormation() {
    const F = CQ.pitch.FORMATION;
    assert("campo: formação tem exatamente 11 posições", F.length === 11, "n=" + F.length);
    const counts = {};
    F.forEach(function (f) { counts[f.pos] = (counts[f.pos] || 0) + 1; });
    const esperado = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2, PON: 1, ATA: 1 };
    let ok = true, detail = "";
    Object.keys(esperado).forEach(function (k) {
      if (counts[k] !== esperado[k]) { ok = false; detail += k + ":" + (counts[k] || 0) + " "; }
    });
    assert("campo: contagem por posição bate com probableLineup (1/2/2/2/2/1/1)", ok, detail);
    const foraDaFaixa = F.filter(function (f) { return f.x < 0 || f.x > 100 || f.y < 0 || f.y > 100; });
    assert("campo: todas as coordenadas x/y ficam entre 0 e 100", foraDaFaixa.length === 0, "fora=" + foraDaFaixa.length);
  }

  // ---- Campo 2D animado: poseFor/poseForKick não lançam exceção pra nenhum evento real ----
  function testPitchPoseForAllEventTypes() {
    let ok = true, detail = "";
    ["ko", "goal", "oppgoal", "card", "redcard", "info", "ht", "ft"].forEach(function (t) {
      try {
        const pose = CQ.pitch.poseFor({ type: t, who: "me" });
        if (!pose || typeof pose !== "object") { ok = false; detail += t + ":vazio "; }
      } catch (e) { ok = false; detail += t + ":" + e.message + " "; }
    });
    // flavor com cada tag do flavorPool (js/live.js) e sem tag (defensivo)
    ["dog", "rain", "flare", "brawl", "invasion", "var", "coach", "crowd", "laser", "drone", undefined].forEach(function (tag) {
      try {
        const pose = CQ.pitch.poseFor({ type: "flavor", t: tag });
        if (!pose.badge) { ok = false; detail += "flavor(" + tag + "):sem badge "; }
      } catch (e) { ok = false; detail += "flavor(" + tag + "):" + e.message + " "; }
    });
    // as 5 variantes de decisão que makeDecision (js/live.js) pode gerar
    ["gk-pen", "gk-launch", "pen", "fk", "counter"].forEach(function (kind) {
      try {
        const pose = CQ.pitch.poseFor({ type: "decision", dec: { kind: kind } });
        if (!pose.ball || pose.ball.length !== 2) { ok = false; detail += "dec(" + kind + "):sem bola "; }
      } catch (e) { ok = false; detail += "dec(" + kind + "):" + e.message + " "; }
    });
    // lances da disputa de pênaltis (js/live.js runShootout/so.log)
    [{ side: "my", ok: true }, { side: "my", ok: false }, { side: "op", ok: true }, { side: "op", ok: false }].forEach(function (l) {
      try {
        const pose = CQ.pitch.poseForKick(l);
        if (!pose.ball || !pose.goalSide) { ok = false; detail += "kick(" + l.side + "," + l.ok + "):incompleto "; }
      } catch (e) { ok = false; detail += "kick:" + e.message + " "; }
    });
    try { CQ.pitch.poseFor({ type: "???" }); } catch (e) { ok = false; detail += "desconhecido:" + e.message; }
    assert("campo: poseFor/poseForKick não lançam exceção pra nenhum evento real do jogo", ok, detail);
  }

  // ---- Campo 3D (js/pitch3d.js): toWorld é o único helper puro-matemático exposto —
  // resto do módulo é WebGL de verdade, sem contexto disponível neste console; a cena
  // em si só se confirma visualmente no navegador (ver docs/CHANGELOG.md). ----
  function testPitch3dToWorld() {
    let ok = true, detail = "";
    const centro = CQ.pitch3d.toWorld(50, 50);
    if (Math.abs(centro.x) > 1e-9 || Math.abs(centro.z) > 1e-9) { ok = false; detail += "centro não é (0,0): " + JSON.stringify(centro) + " "; }
    const esq = CQ.pitch3d.toWorld(0, 50), dir = CQ.pitch3d.toWorld(100, 50);
    if (!(esq.x < 0 && dir.x > 0 && Math.abs(esq.x + dir.x) < 1e-9)) { ok = false; detail += "x não é simétrico em torno do centro "; }
    const cima = CQ.pitch3d.toWorld(50, 0), baixo = CQ.pitch3d.toWorld(50, 100);
    if (!(cima.z < 0 && baixo.z > 0 && Math.abs(cima.z + baixo.z) < 1e-9)) { ok = false; detail += "z não é simétrico em torno do centro "; }
    assert("campo 3D: toWorld mapeia 0-100% pro espaço 3D simetricamente em torno da origem", ok, detail);
  }

  // ---- Campo 2D animado: jerseySVG usa a cor real do clube em cada padrão de listra ----
  function testJerseySVGAllPatterns() {
    const amostra = { plain: "pal", hoops: "fla", stripes: "bot", sash: "sao" };
    let ok = true, detail = "";
    Object.keys(amostra).forEach(function (pat) {
      const club = CQ.DATA.CLUBS[amostra[pat]];
      if (!club || club.pat !== pat) { ok = false; detail += pat + ":amostra não bate(" + (club && club.pat) + ") "; return; }
      const svg = CQ.util.jerseySVG(club, "test-" + pat, 3);
      if (!svg || svg.indexOf(club.c1) < 0) { ok = false; detail += pat + ":sem c1 "; }
    });
    assert("camisa: jerseySVG contém a cor real do clube em cada padrão de listra", ok, detail);
  }

  // ---- Refatoração do brasão: crestSVGProcedural continua consistente após extrair patternFillFor ----
  function testCrestProceduralStillConsistent() {
    let ok = true, detail = "";
    Object.keys(CQ.DATA.CLUBS).slice(0, 30).forEach(function (id) {
      const club = CQ.DATA.CLUBS[id];
      const svg = CQ.util.crestSVGFallback(id, "");
      const hasPattern = club.pat && club.pat !== "plain";
      if (hasPattern && svg.indexOf("<pattern") < 0) { ok = false; detail += id + ":sem pattern esperado "; }
      if (!hasPattern && svg.indexOf("<pattern") >= 0) { ok = false; detail += id + ":pattern inesperado "; }
    });
    assert("brasão: crestSVGProcedural continua consistente (pattern só quando pat != plain) após extrair patternFillFor", ok, detail);
  }

  // ---- Elencos: idade ponderada pro meio de carreira, nunca sai do intervalo pedido ----
  function testWorldAgeDistribution() {
    const rng = CQ.util.rngFor("teste-fixo-idade", "dist");
    let young = 0, prime = 0, vet = 0, n = 2000, ok = true, detail = "";
    for (let i = 0; i < n; i++) {
      const age = CQ.world.rollAge(rng, 35);
      if (age < 18 || age > 35) { ok = false; detail = "age=" + age; break; }
      if (age <= 21) young++; else if (age <= 30) prime++; else vet++;
    }
    assert("idade: rollAge nunca sai do intervalo 18-35 pedido", ok, detail);
    assert("idade: distribuição pesa pro auge da carreira (22-30 é a faixa mais comum)", prime > young && prime > vet, "jovem=" + young + " auge=" + prime + " vet=" + vet);
    assert("idade: jovem (18-21) fica bem abaixo do antigo uniforme (~22%; esperado ~15%)", young / n < 0.22, "jovem=" + (young / n * 100).toFixed(1) + "%");
  }
  function testWorldOvrRange() {
    const rng = CQ.util.rngFor("teste-fixo-ovr", "dist");
    let ok = true, detail = "";
    for (let i = 0; i < 500; i++) {
      const ovr = CQ.world.rollOvr(80, rng);
      if (ovr < 55 || ovr > 93) { ok = false; detail = "ovr=" + ovr; break; }
    }
    assert("overall: rollOvr nunca sai de 55-93 (clube de força 80)", ok, detail);
  }
  // ---- squadOf (fallback, sem CQ.world) e initClubRoster (js/world.js) nunca podem
  // divergir — provam que a duplicação da fórmula de idade/overall foi eliminada de
  // verdade (um helper compartilhado em CQ.world, não 2 cópias que podiam desalinhar) ----
  function testSquadOfMatchesWorldFormula() {
    const g = { seed: "seed-fixa-teste-elenco", year: 2026, world: null, player: { clubId: "fla" } };
    const fromSquadOf = CQ.ui.squadOf(g);
    const fromWorld = CQ.world.buildWorld(g).clubs.fla.roster.slice().sort(function (a, b) { return b.ovr - a.ovr; });
    let ok = fromSquadOf.length === fromWorld.length;
    for (let i = 0; i < fromSquadOf.length && ok; i++) {
      if (fromSquadOf[i].age !== fromWorld[i].age || fromSquadOf[i].ov !== fromWorld[i].ovr) ok = false;
    }
    assert("elenco: squadOf (fallback) e buildWorld nunca divergem (mesma fórmula compartilhada)", ok, "squadOf n=" + fromSquadOf.length + " world n=" + fromWorld.length);
  }

  // ---- Idade real (js/birthdates.js, scripts/sync-ages.mjs): sobrescreve rollAge
  // quando disponível; ausência nunca quebra nada (mapa cresce aos poucos) ----
  function testRealAgeOverridesRollAge() {
    const savedBD = CQ.BIRTHDATES;
    try {
      const g = { seed: "seed-idade-real", year: 2026, world: null, player: { clubId: "fla" } };
      const baseline = CQ.world.buildWorld(g).clubs.fla.roster.find(function (p) { return p.real; });
      if (!baseline) { assert("idade real: achou jogador real do Flamengo pra testar", false); return; }
      CQ.BIRTHDATES = { fla: {} };
      CQ.BIRTHDATES.fla[baseline.name] = (g.year - 27) + "-05-10"; // força 27 anos de propósito
      const withReal = CQ.world.buildWorld(g).clubs.fla.roster.find(function (p) { return p.name === baseline.name; });
      assert("idade real: initClubRoster usa a idade real quando CQ.BIRTHDATES tem o jogador", withReal.age === 27, "age=" + withReal.age);
      const viaSquadOf = CQ.ui.squadOf(g).find(function (p) { return p.name === baseline.name; });
      assert("idade real: squadOf (fallback) também usa a idade real, igual buildWorld", viaSquadOf.age === 27, "age=" + viaSquadOf.age);
    } finally {
      CQ.BIRTHDATES = savedBD;
    }
  }
  function testRealAgeAbsentNeverBreaks() {
    const savedBD = CQ.BIRTHDATES;
    try {
      CQ.BIRTHDATES = undefined;
      const g = { seed: "seed-sem-bd", year: 2026, world: null, player: { clubId: "fla" } };
      let ok = true, detail = "";
      try { CQ.world.buildWorld(g); CQ.ui.squadOf(g); } catch (e) { ok = false; detail = e.message; }
      assert("idade real: CQ.BIRTHDATES ausente/undefined nunca quebra buildWorld/squadOf", ok, detail);
    } finally {
      CQ.BIRTHDATES = savedBD;
    }
  }

  // ---- Criação de personagem: só clubes pequenos/médios pra começar ----
  function testStartClubPoolExcludesBigClubs() {
    const pool = CQ.ui.startClubPool();
    const tooStrong = pool.filter(function (c) { return c.str > 79; });
    assert("clube inicial: nenhum clube listado tem força > 79", tooStrong.length === 0, "n=" + tooStrong.length);
    assert("clube inicial: ainda sobra uma escolha real (>= 5 clubes)", pool.length >= 5, "n=" + pool.length);
    const bigNames = ["Flamengo", "Palmeiras", "Corinthians", "São Paulo"];
    const hasBig = pool.some(function (c) { return bigNames.indexOf(c.name) >= 0; });
    assert("clube inicial: tradicionais/fortes (Flamengo/Palmeiras/Corinthians/São Paulo) não aparecem", !hasBig);
  }

  // ---- Titular/Banco/Fora da lista: a "espiada" de benchRoll bate com o resultado real ----
  function testBenchRollPreviewMatchesReal() {
    withTempGame(function () {
      const g = newCareer("ATA", "vas");
      E().startSeason(g);
      const fx = E().currentFixture(g);
      if (!fx) { assert("titularidade: achou uma partida pra testar", false); return; }
      const previewRng = CQ.util.rngFor(g.seed, "match", g.year, (g.season && g.season.idx) || 0);
      const previewBench = E().benchRoll(g, fx, previewRng);
      const res = E().resolveMatch(g, fx, {});
      assert("titularidade: a 'espiada' bate com o resultado real (titular ou não)", previewBench.starts === res.starts, "preview=" + previewBench.starts + " real=" + res.starts);
      assert("titularidade: a 'espiada' bate com o resultado real (jogou ou não)", (previewBench.minutes > 0) === res.plays, "preview=" + (previewBench.minutes > 0) + " real=" + res.plays);
    });
  }

  // ---- Campeões: as 5 competições continentais entram no histórico todo ano (não só LIB/UCL) ----
  function testChampsCoversAllContis() {
    withTempGame(function () {
      const g = newCareer("ATA", "vas");
      E().startSeason(g);
      let n = 0;
      while (E().currentFixture(g) && n++ < 700) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
      const sum = g.pendingSummary || E().endSeason(g);
      let ok = true, detail = "";
      ["LIB", "SUL", "UCL", "UEL", "UECL"].forEach(function (ck) {
        if (!(g.champs[ck] && g.champs[ck][g.year])) { ok = false; detail += ck + " "; }
      });
      assert("campeões: LIB/SUL/UCL/UEL/UECL todas registradas em g.champs pro ano da temporada", ok, "faltando: " + detail);
    });
  }
  // ---- Bug real corrigido: Mundial de Clubes registra o campeão mesmo quando o jogador perde ----
  function testMundialRegistersChampionEvenLosing() {
    withTempGame(function () {
      const g = newCareer("ATA", "fla");
      g.year = 2027; // fora do ciclo de Supermundial (isSuperYear), pra cair no Mundial de 1 jogo só
      g.player.titles.push({ year: 2026, key: "LIB", name: "Libertadores", club: E().myClub(g).name });
      E().startSeason(g);
      if (!g.season.mundial) { assert("mundial: cenário de teste montou o Mundial (pré-condição)", false, "sem g.season.mundial"); return; }
      let n = 0;
      while (E().currentFixture(g) && n++ < 700) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
      assert("mundial: g.season.mundial.champion sempre fica preenchido (ganhando ou perdendo)", !!g.season.mundial.champion, "champion=" + g.season.mundial.champion);
    });
  }

  // ---- Banner de título por ordem: BICAMPEÃO/PENTACAMPEÃO por competição+clube ----
  function testTituloOrdinalBanner() {
    withTempGame(function () {
      const g = newCareer("ATA", "vas");
      for (let i = 1; i <= 5; i++) { g.year = 2026 + i; E().winTitle(g, "CDB", "Copa do Brasil"); }
      assert("título: 5º título da mesma competição pelo mesmo clube vira nth=5", g.season.lastTitle.nth === 5, "nth=" + g.season.lastTitle.nth);
      assert("título: tituloOrdinal(5) é PENTACAMPEÃO", CQ.util.tituloOrdinal(5) === "PENTACAMPEÃO", CQ.util.tituloOrdinal(5));
      assert("título: tituloOrdinal(2) é BICAMPEÃO", CQ.util.tituloOrdinal(2) === "BICAMPEÃO", CQ.util.tituloOrdinal(2));
      assert("título: tituloOrdinal(1) não tem ordinal (só o 2º título em diante conta)", CQ.util.tituloOrdinal(1) === "", CQ.util.tituloOrdinal(1));
      g.player.clubId = "fla";
      g.year = 2033;
      E().winTitle(g, "CDB", "Copa do Brasil");
      assert("título: mesmo torneio por OUTRO clube volta a contar do 1 (nth=1)", g.season.lastTitle.nth === 1, "nth=" + g.season.lastTitle.nth);
    });
  }

  // ---- Ídolo da geração: 2ª Bola de Ouro (rank 1) acumulada desbloqueia, permanente ----
  function testGenIdolTwoBallons() {
    withTempGame(function () {
      const g = newCareer("ATA");
      E().startSeason(g);
      // fabrica 2 Bolas de Ouro já na carreira — atingir isso organicamente exigiria uma
      // simulação longa demais pra um teste determinístico; a regra em si (>=2 rank:1)
      // é testada aqui como está implementada, não a chance de conquistar cada uma.
      g.player.ballon = [{ year: g.year - 2, rank: 1, score: 999 }, { year: g.year - 1, rank: 1, score: 999 }];
      let n = 0; while (E().currentFixture(g) && n++ < 700) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
      const sum = E().endSeason(g);
      assert("ídolo da geração: g.player.genIdolYear é preenchido com 2 Bolas de Ouro acumuladas", g.player.genIdolYear === g.year, "genIdolYear=" + g.player.genIdolYear + " year=" + g.year);
      assert("ídolo da geração: sum.becameGenIdol sinaliza a UI nesta mesma temporada", sum.becameGenIdol === true);
    });
  }

  // ---- Ídolo do momento: transiente, liga com fama alta ou top-3 do ranking mundial ----
  function testMomentIdolTransient() {
    withTempGame(function () {
      const g = newCareer("ATA");
      E().startSeason(g);
      g.player.fame = 95;
      let n = 0; while (E().currentFixture(g) && n++ < 700) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
      E().endSeason(g);
      assert("ídolo do momento: fama alta (>=90) já liga p.momentIdol", g.player.momentIdol === true, "fame=" + g.player.fame);
    });
  }

  // ---- Decisão que reforça a permanência: renovar sendo ídolo do clube dá lealdade ----
  function testLoyaltyRenewBonus() {
    withTempGame(function () {
      const g = newCareer("ATA", "fla");
      g.player.idolClubs = ["fla"];
      const before = g.player.fame;
      const res = E().acceptRenew(g, { salary: 100000, years: 2 });
      assert("renovação leal: ídolo do clube atual é reconhecido (loyal:true)", res && res.loyal === true);
      assert("renovação leal: fama sobe com a lealdade", g.player.fame === before + 4, "antes=" + before + " depois=" + g.player.fame);

      const g2 = newCareer("ATA", "fla");
      g2.player.idolClubs = [];
      const before2 = g2.player.fame;
      const res2 = E().acceptRenew(g2, { salary: 100000, years: 2 });
      assert("renovação normal: sem ídolo do clube atual, loyal:false e sem bônus de fama", res2 && res2.loyal === false && g2.player.fame === before2);
    });
  }

  // ---- Sistema de empréstimo: dispara quando o jogador fica preso no banco ----
  function testLoanTriggerFires() {
    withTempGame(function () {
      let sum = null, tries = 0;
      while (tries++ < 15 && !(sum && sum.loanOffer)) {
        const g = newCareer("ATA", "fla"); // clube forte, overall de estreante — tende a sobrar banco
        E().startSeason(g);
        let n = 0; while (E().currentFixture(g) && n++ < 700) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        sum = E().endSeason(g);
        if (sum.loanOffer) {
          assert("empréstimo: nunca dispara junto com o mercado normal (offers)", !sum.offers);
          assert("empréstimo: proposta tem clube/salário/duração válidos", !!sum.loanOffer.clubId && sum.loanOffer.salary > 0 && (sum.loanOffer.years === 1 || sum.loanOffer.years === 2), JSON.stringify(sum.loanOffer));
        }
      }
      assert("empréstimo: gatilho dispara pelo menos 1x em " + tries + " tentativas com jogador preso no banco", !!(sum && sum.loanOffer), "tries=" + tries);
    });
  }
  function testAcceptLoanOffer() {
    withTempGame(function () {
      const g = newCareer("ATA", "vas");
      const before = g.year;
      const offer = { clubId: "cor", name: "Corinthians", league: "BRA", salary: 50000, years: 2, role: "titular" };
      E().acceptLoanOffer(g, offer);
      assert("empréstimo: p.loan preenchido corretamente ao aceitar", g.player.loan && g.player.loan.fromClubId === "vas" && g.player.loan.toClubId === "cor" && g.player.loan.returnYear === before + 3, JSON.stringify(g.player.loan));
      assert("empréstimo: clubId muda pro clube emprestador", g.player.clubId === "cor", "clubId=" + g.player.clubId);
      assert("empréstimo: contrato de origem nunca fica menor que a data prevista de volta", g.player.contractEnd >= g.player.loan.returnYear);
    });
  }
  function testLoanReturnsAutomatically() {
    withTempGame(function () {
      const g = newCareer("ATA", "vas");
      E().acceptLoanOffer(g, { clubId: "cor", name: "Corinthians", league: "BRA", salary: 50000, years: 1, role: "titular" });
      g.player.loan.returnYear = g.year + 1; // força a volta já na próxima virada de temporada
      E().nextSeason(g);
      assert("empréstimo: volta automática pro clube de origem no ano certo", g.player.clubId === "vas", "clubId=" + g.player.clubId);
      assert("empréstimo: p.loan zera depois da volta", g.player.loan === null);
      assert("empréstimo: g.pendingReturnFromLoan sinaliza a volta pra UI", g.pendingReturnFromLoan === "Vasco da Gama", "v=" + g.pendingReturnFromLoan);
    });
  }
  function testCareerTracksLoan() {
    withTempGame(function () {
      const g = newCareer("ATA", "vas");
      E().startSeason(g);
      g.player.loan = { fromClubId: "vas", fromClubName: "Vasco da Gama", toClubId: "cor", returnYear: g.year + 2 };
      let n = 0; while (E().currentFixture(g) && n++ < 700) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
      E().endSeason(g);
      const rec = g.player.career[g.player.career.length - 1];
      assert("empréstimo: temporada emprestada fica marcada em p.career (onLoan)", rec && rec.onLoan === true, JSON.stringify(rec && rec.onLoan));
    });
  }

  // ---- Volta a ex-clube: dedup correto de p.career (sem repetição, sem o clube atual) ----
  function testFormerClubsDedup() {
    withTempGame(function () {
      const g = newCareer("ATA", "vas");
      g.player.clubId = "cor";
      g.player.career = [
        { year: 2026, clubId: "vas" }, { year: 2027, clubId: "vas" },
        { year: 2028, clubId: "san" }, { year: 2029, clubId: "cor" }
      ];
      const former = E().formerClubs(g);
      assert("ex-clubes: lista única, sem repetição e sem o clube atual", former.length === 2 && former.indexOf("vas") >= 0 && former.indexOf("san") >= 0 && former.indexOf("cor") < 0, JSON.stringify(former));
    });
  }
  // ---- Volta a ex-clube: gatilho dispara pra veterano 31+ com histórico de clube ----
  function testHomecomingTriggerFires() {
    withTempGame(function () {
      let sum = null, tries = 0;
      while (tries++ < 40 && !(sum && sum.homecomingOffers)) {
        const g = newCareer("ATA", "vas");
        g.player.age = 32;
        g.player.career = [{ year: 2020, clubId: "san" }, { year: 2021, clubId: "san" }];
        E().startSeason(g);
        let n = 0; while (E().currentFixture(g) && n++ < 700) E().applyMatch(g, E().resolveMatch(g, E().currentFixture(g), {}));
        sum = E().endSeason(g);
        if (sum.homecomingOffers) {
          assert("volta a ex-clube: nunca dispara junto com offers/loanOffer", !sum.offers && !sum.loanOffer);
          assert("volta a ex-clube: só propõe clubes que já foram do jogador", sum.homecomingOffers.every(function (o) { return o.clubId === "san"; }), JSON.stringify(sum.homecomingOffers));
        }
      }
      assert("volta a ex-clube: gatilho dispara pelo menos 1x em " + tries + " tentativas (chance de 30%/temporada)", !!(sum && sum.homecomingOffers), "tries=" + tries);
    });
  }
  // ---- Volta a ex-clube: aceitar reaproveita acceptOffer já existente, sem função nova ----
  function testAcceptHomecomingUsesAcceptOffer() {
    withTempGame(function () {
      const g = newCareer("ATA", "vas");
      const offers = E().makeHomecomingOffers(g, ["san"]);
      assert("volta a ex-clube: makeHomecomingOffers gera 1 proposta por ex-clube", offers.length === 1 && offers[0].clubId === "san", JSON.stringify(offers));
      E().acceptOffer(g, offers[0]);
      assert("volta a ex-clube: aceitar muda p.clubId pro ex-clube escolhido", g.player.clubId === "san", "clubId=" + g.player.clubId);
    });
  }

  // ---- Linha do tempo: prólogo sintetizado aparece sempre, mesmo pra calouro sem p.career ----
  function testTimelinePrologueEvents() {
    withTempGame(function () {
      const g = newCareer("ATA", "vas");
      const html = CQ.ui.timelineHTML(g);
      assert("linha do tempo: 'Criação do jogador' aparece mesmo pra calouro", html.indexOf("Criação do jogador") >= 0);
      assert("linha do tempo: 'Assinatura com o' aparece mesmo pra calouro", html.indexOf("Assinatura com o") >= 0);
      assert("linha do tempo: 'Apresentação à torcida' aparece mesmo pra calouro", html.indexOf("Apresentação à torcida") >= 0);
    });
  }
  // ---- Linha do tempo: primeiro clássico registrado só uma vez ----
  function testFirstClassicRecorded() {
    withTempGame(function () {
      const g = newCareer("ATA"); // fla, já tem rivais reais (flu/vas/bot)
      let classics = 0, guard = 0, firstSnapshot = null;
      while (guard++ < 300) {
        const fx = E().currentFixture(g);
        if (!fx) break;
        if (fx.classic) classics++;
        E().applyMatch(g, E().resolveMatch(g, fx, {}));
        if (classics === 1 && !firstSnapshot && g.player.firstClassic) firstSnapshot = JSON.stringify(g.player.firstClassic);
      }
      assert("clássico: pelo menos 1 clássico simulado (pré-condição do teste)", classics > 0, "classics=" + classics + " guard=" + guard);
      assert("clássico: p.firstClassic fica registrado depois do 1º clássico", !!g.player.firstClassic, JSON.stringify(g.player.firstClassic));
      if (classics > 1 && firstSnapshot) {
        assert("clássico: 2º clássico em diante não sobrescreve o primeiro registrado", JSON.stringify(g.player.firstClassic) === firstSnapshot);
      }
    });
  }

  // ---- Hall da Fama: carreira aposentada vira cartão permanente numa chave própria ----
  function testInductAddsToHall() {
    withTempGame(function () {
      const g = newCareer("ATA", "fla");
      g.player.career = [{ year: 2026, clubId: "fla", clubName: "Flamengo", league: "Série A", pos: "ATA", j: 30, g: 20, a: 10, cs: 0, avg: 7.5, ov: 85, titles: [], awards: [], onLoan: false }];
      g.player.titles = [{ year: 2026, key: "LIGA", name: "Brasileirão", club: "Flamengo" }];
      g.year = 2030;
      const rawHall = localStorage.getItem("craque-hall-v1");
      const before = CQ.main.hallList().length;
      CQ.main.induct(g);
      const hall = CQ.main.hallList();
      if (rawHall != null) localStorage.setItem("craque-hall-v1", rawHall); else localStorage.removeItem("craque-hall-v1");
      assert("hall da fama: induct() adiciona 1 cartão numa chave separada do save ativo", hall.length === before + 1, "before=" + before + " depois=" + hall.length);
      const card = hall[hall.length - 1];
      assert("hall da fama: cartão guarda os números certos da carreira", card.name === g.player.name && card.goals === 20 && card.titles === 1 && card.retiredYear === 2030, JSON.stringify(card));
    });
  }

  // ---- Hall da Fama: teto de carreiras guardadas, sempre mantendo as mais recentes ----
  function testHallCapEnforced() {
    withTempGame(function () {
      const raw = localStorage.getItem("craque-hall-v1");
      localStorage.removeItem("craque-hall-v1");
      const g = newCareer("ATA", "fla");
      g.player.career = [{ year: 2026, clubId: "fla", clubName: "Flamengo", league: "Série A", pos: "ATA", j: 10, g: 5, a: 2, cs: 0, avg: 7, ov: 80, titles: [], awards: [], onLoan: false }];
      for (let i = 0; i < 65; i++) { g.year = 2026 + i; g.player.name = "Jogador " + i; CQ.main.induct(g); }
      const hall = CQ.main.hallList();
      if (raw != null) localStorage.setItem("craque-hall-v1", raw); else localStorage.removeItem("craque-hall-v1");
      assert("hall da fama: teto de 60 carreiras respeitado", hall.length === 60, "len=" + hall.length);
      assert("hall da fama: descarta as mais antigas, mantém as mais recentes", hall[hall.length - 1].name === "Jogador 64" && hall[0].name === "Jogador 5", JSON.stringify({ primeiro: hall[0].name, ultimo: hall[hall.length - 1].name }));
    });
  }

  // ---- Hall da Fama: tela renderiza sem exceção, com e sem carreiras guardadas ----
  function testHallHTMLRenders() {
    const raw = localStorage.getItem("craque-hall-v1");
    localStorage.setItem("craque-hall-v1", JSON.stringify([{ id: "x", name: "Craque Teste", pos: "ATA", retiredYear: 2040, age: 35, seasons: 10, clubs: ["Flamengo"], goals: 200, assists: 80, titles: 5, awards: 10, bolas: 2, tier: "LENDA IMORTAL", idolClubNames: ["Flamengo"], genIdol: true, savedAt: Date.now() }]));
    let html = "", ok = true, err = "";
    try { html = CQ.ui.hallHTML(); } catch (e) { ok = false; err = e.message; }
    localStorage.removeItem("craque-hall-v1");
    let emptyOk = true, emptyErr = "";
    try { CQ.ui.hallHTML(); } catch (e) { emptyOk = false; emptyErr = e.message; }
    if (raw != null) localStorage.setItem("craque-hall-v1", raw); else localStorage.removeItem("craque-hall-v1");
    assert("hall da fama: hallHTML() renderiza o cartão guardado sem exceção", ok && html.indexOf("Craque Teste") >= 0 && html.indexOf("LENDA IMORTAL") >= 0, err);
    assert("hall da fama: hallHTML() não lança exceção com o hall vazio", emptyOk, emptyErr);
  }

  // ---- Bug real corrigido: banner de campeão não pode comemorar quando quem venceu foi outra seleção/clube ----
  function testChampionBannerCorrectness() {
    withTempGame(function () {
      const g = newCareer("ZAG", "fla");
      g.player.natTeam.convocado = true;
      g.player.natTeam.qualified = true;
      while (g.year % 4 !== 2) g.year++; // ano de Copa do Mundo
      E().startSeason(g);
      const T = g.season.sel;
      let n = 0, tries = 0;
      // roda até achar uma carreira onde o Brasil é eliminado antes da final (não é campeão)
      while (T.eliminatedAt == null && n++ < 400) { const fx = E().currentFixture(g); if (!fx) break; E().applyMatch(g, E().resolveMatch(g, fx, {})); }
      if (T.eliminatedAt && T.eliminatedAt !== "F") {
        assert("banner de campeão: T.champion nunca é a própria seleção quando ela foi eliminada antes da final", T.champion !== "Brasil", "champion=" + T.champion);
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
    testContinentalTours();
    testEliminatoriasQualification();
    testSupermundial();
    testConferenceLeague();
    testContiTwoLeggedTies();
    testContiFirstLegNoPenalties();
    testOtherCupsStaySingleLeg();
    testDiscGroupIsolation();
    testDiscGroupMapping();
    testInjuryRateLower();
    testMatchNotesAnyMatch();
    testPressConferenceStructure();
    testPitchFormation();
    testPitchPoseForAllEventTypes();
    testJerseySVGAllPatterns();
    testCrestProceduralStillConsistent();
    testWorldAgeDistribution();
    testWorldOvrRange();
    testSquadOfMatchesWorldFormula();
    testRealAgeOverridesRollAge();
    testRealAgeAbsentNeverBreaks();
    testStartClubPoolExcludesBigClubs();
    testBenchRollPreviewMatchesReal();
    testChampsCoversAllContis();
    testMundialRegistersChampionEvenLosing();
    testTituloOrdinalBanner();
    testLoanTriggerFires();
    testAcceptLoanOffer();
    testLoanReturnsAutomatically();
    testCareerTracksLoan();
    testFormerClubsDedup();
    testHomecomingTriggerFires();
    testAcceptHomecomingUsesAcceptOffer();
    testTimelinePrologueEvents();
    testFirstClassicRecorded();
    testChampionBannerCorrectness();
    testRivalsCoverage();
    testClubRivalryScoreboard();
    testScoutingRumor();
    testAllPositionsSmoke();
    testPitch3dToWorld();
    testGenIdolTwoBallons();
    testMomentIdolTransient();
    testLoyaltyRenewBonus();
    testInductAddsToHall();
    testHallCapEnforced();
    testHallHTMLRenders();
    const pass = results.filter(function (r) { return r.pass; }).length;
    console.log("%cCRAQUE regressão: " + pass + "/" + results.length + " passaram", "font-weight:bold");
    results.forEach(function (r) { console.log((r.pass ? "✓" : "✗ FALHOU") + " " + r.name + (r.detail ? "  [" + r.detail + "]" : "")); });
    return { pass: pass, total: results.length, results: results.slice() };
  }

  CQ.tests = { run: run };
})();
