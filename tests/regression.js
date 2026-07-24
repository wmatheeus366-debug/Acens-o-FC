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
      delete old.manager; delete old.worldStars; delete old.schemaVersion;
      const raw = localStorage.getItem("craque-save-v1");
      localStorage.setItem("craque-save-v1", JSON.stringify(old));
      const loaded = CQ.main.load();
      if (raw != null) localStorage.setItem("craque-save-v1", raw); else localStorage.removeItem("craque-save-v1");
      assert("save: migra campos novos", loaded && Array.isArray(loaded.player.traits) && !!loaded.manager && (loaded.worldStars || []).length === 12, JSON.stringify({ t: !!(loaded && loaded.player.traits), m: !!(loaded && loaded.manager) }));
      assert("save: schemaVersion presente", loaded && loaded.schemaVersion >= 2, "v=" + (loaded && loaded.schemaVersion));
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
    testAllPositionsSmoke();
    const pass = results.filter(function (r) { return r.pass; }).length;
    console.log("%cCRAQUE regressão: " + pass + "/" + results.length + " passaram", "font-weight:bold");
    results.forEach(function (r) { console.log((r.pass ? "✓" : "✗ FALHOU") + " " + r.name + (r.detail ? "  [" + r.detail + "]" : "")); });
    return { pass: pass, total: results.length, results: results.slice() };
  }

  CQ.tests = { run: run };
})();
