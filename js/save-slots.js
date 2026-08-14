/* CRAQUE — múltiplos saves via IndexedDB (idb, js/vendor/idb.umd.js).
   Aditivo e separado do save único de sempre (localStorage, js/save.js) — nunca
   substitui o fluxo normal de "salva sozinho a cada ação", só dá um jeito de guardar
   VÁRIAS carreiras lado a lado (um slot por carreira) sem precisar exportar/importar
   arquivo .json na mão toda vez que quiser alternar. Mesma disciplina defensiva do
   projeto inteiro: sem window.idb (IndexedDB indisponível/bloqueado), toda função aqui
   vira no-op segura — a tela de Save&dados simplesmente não mostra a seção de slots. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const DB_NAME = "craque-slots", STORE = "saves", DB_VERSION = 1, CAP = 20;

  function hasIdb() { return !!(window.idb && window.idb.openDB); }

  function db() {
    return window.idb.openDB(DB_NAME, DB_VERSION, {
      upgrade: function (d) {
        const store = d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("updatedAt", "updatedAt");
      }
    });
  }

  // cache local (lista leve, sem o `data` pesado de cada slot) + auto-atualização de
  // tela: render() (js/ui.js) chama getCached() de forma síncrona; a 1ª chamada devolve
  // null e dispara a busca async em segundo plano, que re-renderiza sozinha ao terminar
  // — mesmo espírito do resto do projeto (nunca trava a tela esperando uma Promise).
  let cache = null, loading = false;
  function refreshCache() {
    if (!hasIdb() || loading) return;
    loading = true;
    listSlots().then(function (arr) {
      cache = arr; loading = false;
      if (CQ.ui && CQ.ui.render) CQ.ui.render();
    }).catch(function () { loading = false; });
  }
  function getCached() {
    if (cache === null && !loading) refreshCache();
    return cache;
  }

  function listSlots() {
    if (!hasIdb()) return Promise.resolve([]);
    return db().then(function (d) { return d.getAll(STORE); }).then(function (all) {
      return all.sort(function (a, b) { return b.updatedAt - a.updatedAt; })
        .map(function (r) { return { id: r.id, name: r.name, updatedAt: r.updatedAt, meta: r.meta }; });
    });
  }

  // guarda uma cópia completa e independente de `g` (JSON round-trip — nunca compartilha
  // referência com o objeto vivo em CQ.state.game, senão editar a carreira ativa depois
  // mudaria o slot salvo sem o jogador pedir); teto de CAP slots, remove o mais antigo
  // quando cheio (mesmo padrão do Hall da Fama em js/save.js).
  function saveSlot(g, name) {
    if (!hasIdb()) return Promise.reject(new Error("IndexedDB indisponível neste navegador"));
    const cl = CQ.engine.myClub(g);
    const rec = {
      name: name || (g.player.name + " — " + g.year), updatedAt: Date.now(),
      meta: { playerName: g.player.name, pos: g.player.pos, clubName: cl.name, year: g.year, overall: g.player.overall, seasons: g.player.career.length },
      data: JSON.parse(JSON.stringify(g))
    };
    return db().then(function (d) {
      return d.getAll(STORE).then(function (all) {
        if (all.length < CAP) return d.add(STORE, rec);
        const oldest = all.slice().sort(function (a, b) { return a.updatedAt - b.updatedAt; })[0];
        return d.delete(STORE, oldest.id).then(function () { return d.add(STORE, rec); });
      });
    });
  }

  // devolve uma carreira jogável — mesma validação/migração do save único (validateAndMigrate),
  // pra um slot antigo (esquema velho) nunca quebrar a tela ao carregar.
  function loadSlot(id) {
    if (!hasIdb()) return Promise.resolve(null);
    return db().then(function (d) { return d.get(STORE, id); }).then(function (rec) {
      if (!rec) return null;
      return CQ.save.validateAndMigrate(JSON.parse(JSON.stringify(rec.data)));
    });
  }

  function deleteSlot(id) {
    if (!hasIdb()) return Promise.resolve();
    return db().then(function (d) { return d.delete(STORE, id); });
  }

  CQ.saveSlots = {
    hasIdb: hasIdb, getCached: getCached, refreshCache: refreshCache,
    listSlots: listSlots, saveSlot: saveSlot, loadSlot: loadSlot, deleteSlot: deleteSlot
  };
})();
