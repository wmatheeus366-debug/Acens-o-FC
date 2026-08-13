/* CRAQUE — módulo de persistência (localStorage + arquivo).
   Esquema versionado, migração encadeada e validação. Exposto em CQ.save. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const KEY = "craque-save-v1";
  const SCHEMA_VERSION = 2;

  function save() {
    try {
      if (CQ.state.game) localStorage.setItem(KEY, JSON.stringify(CQ.state.game));
    } catch (e) {
      console.warn("Falha ao salvar:", e);
    }
  }

  function hasSave() {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return validateAndMigrate(JSON.parse(raw));
    } catch (e) {
      console.warn("Save corrompido:", e);
      return null;
    }
  }

  // backfill de campos novos em saves antigos (migração idempotente)
  function migrate(g) {
    const p = g.player;
    if (p.marketValue == null) p.marketValue = 0;
    if (!p.milestones) p.milestones = [];
    if (!p.assets) p.assets = [];
    if (!p.ballon) p.ballon = [];
    if (!p.records) p.records = { hatTricks: 0, bestSeasonG: 0, bestSeasonAvg: 0, biggestWin: null };
    // suspensão passou de contador único global pra um por competição (p.disc[grupo]) —
    // qualquer suspensão em andamento no momento exato da migração se perde (caso raro)
    if (!p.disc) p.disc = {};
    if (!p.clubGoals) p.clubGoals = {};
    if (!p.idolClubs) p.idolClubs = [];
    if (!p.compGoals) p.compGoals = {};
    if (!p.traits) p.traits = [];
    if (p.decisiveGoals == null) p.decisiveGoals = 0;
    if (p.captain === undefined) p.captain = null;
    if (!p.squadRole) p.squadRole = "titular";
    if (p.potUps == null) p.potUps = 0;
    if (p.loan === undefined) p.loan = null; // empréstimo ativo — aditivo
    if (p.firstClassic === undefined) p.firstClassic = null; // marco pra linha do tempo — aditivo
    // save já existia antes desse aviso existir — trata como "já viu" pra não surpreender
    // quem já é veterano do modo ao vivo com um tutorial do nada
    if (p.seenLiveIntro === undefined) p.seenLiveIntro = true;
    if (p.natTeam && p.natTeam.qualified === undefined) p.natTeam.qualified = true;
    if (g.manager === undefined) g.manager = null;
    if (CQ.engine && CQ.engine.ensureManager) CQ.engine.ensureManager(g);
    if (!g.rivalHistory) g.rivalHistory = [];
    if (!g.clubRivalry) g.clubRivalry = {};
    if (!g.trainingFocus) g.trainingFocus = "equil";
    if (!g.worldStars || !g.worldStars.length) {
      const rng = CQ.util.mulberry32((g.seed || 1) ^ 0x9e3779b9);
      g.worldStars = [];
      const clubs = ["Real Madrid", "Barcelona", "Manchester City", "Liverpool", "PSG", "Bayern de Munique", "Inter de Milão", "Benfica", "Flamengo", "Palmeiras", "Arsenal", "Borussia Dortmund"];
      for (let i = 0; i < 12; i++) g.worldStars.push({ name: CQ.util.nameGen(rng, "BR"), pos: "ATA", clubName: clubs[i], ovr: 93 - i });
    }
    if (g.season && !g.season.scorers) g.season.scorers = [];
    if (!g.world) g.world = CQ.world.buildWorld(g);
    if (!g.world.leagues) CQ.engine.refreshWorldLeagues(g);
    g.schemaVersion = SCHEMA_VERSION;
    return g;
  }

  // valida a estrutura mínima e roteia pela MESMA migração do load()
  function validateAndMigrate(game) {
    if (!game || typeof game !== "object") throw new Error("save vazio ou inválido");
    if (!game.player || !game.season) throw new Error("estrutura de carreira ausente");
    if (!game.player.name) throw new Error("jogador sem nome");
    game.player.name = CQ.util.cleanInput(game.player.name, 28) || "Jogador";
    return migrate(game);
  }

  function loadAndPlay() {
    const game = load();
    if (!game) { CQ.ui.toast("Não encontrei um save válido."); return; }
    CQ.state.game = game;
    CQ.state.screen = game.retired ? "retro" : "home";
    CQ.ui.render();
  }

  function exportSave() {
    if (!CQ.state.game) return;
    const blob = new Blob([JSON.stringify(CQ.state.game, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const p = CQ.state.game.player;
    a.download = "craque-" + p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + CQ.state.game.year + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    CQ.ui.toast("Save exportado. Guarde o arquivo com carinho.");
  }

  function importSave() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = function () {
      const f = input.files && input.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const parsed = JSON.parse(String(reader.result));
          const game = validateAndMigrate(parsed); // MESMA validação+migração do load()
          CQ.state.game = game;
          save();
          CQ.state.screen = game.retired ? "retro" : "home";
          CQ.ui.render();
          CQ.ui.toast("Carreira importada com sucesso!");
        } catch (e) {
          CQ.ui.toast("Save inválido: " + (e.message || "arquivo não reconhecido"));
        }
      };
      reader.readAsText(f);
    };
    input.click();
  }

  function resetGame() {
    if (!confirm("Apagar a carreira salva? Essa ação não tem volta (exporte um backup antes, se quiser).")) return;
    try { localStorage.removeItem(KEY); } catch (e) { }
    CQ.state.game = null;
    CQ.state.screen = "cover";
    CQ.ui.render();
  }

  function resetToCover() {
    CQ.state.game = null;
    CQ.state.screen = "cover";
    CQ.ui.render();
  }

  CQ.save = {
    KEY: KEY, SCHEMA_VERSION: SCHEMA_VERSION,
    save: save, load: load, hasSave: hasSave, migrate: migrate, validateAndMigrate: validateAndMigrate,
    loadAndPlay: loadAndPlay, exportSave: exportSave, importSave: importSave,
    resetGame: resetGame, resetToCover: resetToCover
  };
})();
