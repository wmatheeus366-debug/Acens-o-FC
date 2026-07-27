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
      delete old.manager; delete old.worldStars; delete old.schemaVersion; delete old.world;
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
    });
  }

  // ---- Mundo persistente: envelhece de verdade e repõe quem se aposenta ----
  function testWorldAging() {
    withTempGame(function () {
      const g = newCareer("ATA");
      assert("mundo: 187 clubes ao criar carreira", Object.keys(g.world.clubs).length === 187, "n=" + Object.keys(g.world.clubs).length);
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
    testLiveScoreSingleCount();
    testImportMigrates();
    testImportRejectsInvalid();
    testDeterminism();
    testLiveDeterminism();
    testPositionRatings();
    testWorldAging();
    testMarketTransfers();
    testAllPositionsSmoke();
    const pass = results.filter(function (r) { return r.pass; }).length;
    console.log("%cCRAQUE regressão: " + pass + "/" + results.length + " passaram", "font-weight:bold");
    results.forEach(function (r) { console.log((r.pass ? "✓" : "✗ FALHOU") + " " + r.name + (r.detail ? "  [" + r.detail + "]" : "")); });
    return { pass: pass, total: results.length, results: results.slice() };
  }

  CQ.tests = { run: run };
})();
