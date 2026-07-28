/* CRAQUE — mundo persistente (Fatia 1 de "Mundo Real 2026"): identidade estável de
   NPCs em todos os 191 clubes, com envelhecimento e aposentadoria reais ano a ano.
   Antes, squadOf recalculava idade/overall do zero a cada chamada (determinístico,
   mas sem memória). Agora cada clube guarda um elenco que envelhece de verdade e se
   aposenta/repõe — igual ao que g.rival e REAL_WORLD_STARS já faziam, só que pro
   mundo inteiro. Depende só de CQ.util + CQ.DATA (carrega antes de engine.js). */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util, D = CQ.DATA;

  // "nacionalidade" de nome pra gerar promessas na aposentadoria (nameGen só distingue
  // BR/PT, hispânico ou europeu genérico — não precisa de mais granularidade que isso)
  function natHintForClub(clubId) {
    const cl = D.CLUBS[clubId];
    if (!cl) return "BR";
    const lg = cl.league;
    if (lg === "BRA" || lg === "BRB" || lg === "EST") return "BR";
    if (lg === "POR") return "PT";
    if (lg === "ESP") return "ES";
    if (lg === "SAM") return "AR";
    return "EN";
  }

  // elenco inicial de um clube — MESMA fórmula e MESMA chave de RNG que squadOf
  // sempre usou, pra migração de saves antigos ser invisível: reproduz byte a byte
  // o que a tela de elenco já mostrava um instante antes de existir o mundo.
  function initClubRoster(g, clubId) {
    const cl = D.CLUBS[clubId];
    const real = D.REAL_SQUADS && D.REAL_SQUADS[clubId];
    const rng = U.rngFor(g.seed, "squad", clubId, g.year);
    if (real) {
      return real.map(function (pl, idx) {
        return {
          id: clubId + "_" + idx, name: pl.n, pos: pl.p,
          age: U.ri(18, 35, rng), ovr: U.clamp(cl.str - 4 + U.ri(-6, 6, rng), 55, 93),
          real: true
        };
      });
    }
    const POSN = ["GOL", "GOL", "ZAG", "ZAG", "ZAG", "LAT", "LAT", "LAT", "VOL", "VOL", "VOL", "MEI", "MEI", "MEI", "PON", "PON", "PON", "ATA", "ATA", "ATA"];
    return POSN.map(function (pos, idx) {
      return {
        id: clubId + "_" + idx, name: U.nameGen(rng, natHintForClub(clubId)), pos: pos,
        age: U.ri(18, 34, rng), ovr: U.clamp(cl.str - 5 + U.ri(-5, 6, rng), 52, 92),
        real: false
      };
    });
  }

  function buildWorld(g) {
    const clubs = {};
    Object.keys(D.CLUBS).forEach(function (clubId) {
      clubs[clubId] = { roster: initClubRoster(g, clubId) };
    });
    return { v: 1, clubs: clubs };
  }

  // evolui idade/overall em uma temporada — espelha as mesmas quebras de idade de
  // applyAging (engine.js), só que em cima de um único número de overall: nenhum dos
  // consumidores (squadOf, topAttackerName, buildScorers) lê atributo fino, só overall.
  function advancePlayer(pl, rng) {
    pl.age++;
    let delta;
    if (pl.age <= 21) delta = U.ri(0, 3, rng);
    else if (pl.age <= 27) delta = U.chance(0.5, rng) ? U.ri(0, 1, rng) : 0;
    else if (pl.age <= 29) delta = U.chance(0.4, rng) ? -1 : 0;
    else if (pl.age <= 31) delta = U.chance(0.7, rng) ? -U.ri(1, 2, rng) : 0;
    else if (pl.age === 32) delta = -U.ri(1, 2, rng);
    else if (pl.age === 33) delta = -U.ri(2, 3, rng);
    else if (pl.age === 34) delta = -U.ri(2, 4, rng);
    else if (pl.age === 35) delta = -U.ri(3, 5, rng);
    else delta = -(6 + (pl.age - 36) * 2);
    pl.ovr = U.clamp(pl.ovr + delta, 40, 96);
  }

  // mesmos limiares de aposentadoria do próprio jogador (engine.js)
  function isRetiring(pl) {
    return pl.age >= 40 || (pl.age >= 37 && pl.ovr < 80) || (pl.age >= 35 && pl.ovr < 74) || (pl.age >= 33 && pl.ovr < 66);
  }

  // avança o mundo inteiro em uma temporada: envelhece todo mundo, aposenta e repõe
  // quem passou do ponto (chamado 1x por virada de temporada, em endSeason)
  function advanceWorld(g, notes) {
    const year = g.year;
    Object.keys(g.world.clubs).forEach(function (clubId) {
      const cl = D.CLUBS[clubId];
      const roster = g.world.clubs[clubId].roster;
      const rng = U.rngFor(g.seed, "worldend", year, clubId);
      roster.forEach(function (pl, idx) {
        advancePlayer(pl, rng);
        if (isRetiring(pl)) {
          // substitui no mesmo índice (mantém o equilíbrio posicional do elenco);
          // NUNCA reaproveita nome do REAL_SQUADS — sempre passa por nameGen.
          const repl = {
            id: clubId + "_r" + year + "_" + idx,
            name: U.nameGen(rng, natHintForClub(clubId)), pos: pl.pos,
            age: U.ri(17, 20, rng), ovr: U.clamp((cl ? cl.str : 70) - 14 + U.ri(-4, 6, rng), 45, 84),
            real: false
          };
          roster[idx] = repl;
          // promessa notável (olheiro de base): rolagem próxima do teto da faixa +
          // relevante pro jogador (mesma liga) — vira notícia em onSeasonEnd
          if (notes && repl.ovr >= (cl ? cl.str : 70) - 9 && CQ.engine.leagueOf(g, clubId) === CQ.engine.leagueOf(g, g.player.clubId)) {
            notes.push({ t: "prospect-breakout", player: repl.name, pos: repl.pos, ovr: repl.ovr, age: repl.age, club: cl ? cl.name : clubId });
          }
        }
      });
    });
  }

  CQ.world = { buildWorld: buildWorld, advanceWorld: advanceWorld };
})();
