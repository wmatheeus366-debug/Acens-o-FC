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

  // idade ponderada pro meio de carreira — jovem 18-21 (~15%), auge 22 até hi-5 (~65%),
  // veterano hi-4..hi (~20%). Substitui o antigo U.ri(18,hi,rng) uniforme, que dava a
  // mesma chance de um garoto de 18 e um veterano de 35 (causa raiz do bug relatado:
  // jogador real famoso e experiente podia cair em qualquer idade do intervalo,
  // inclusive ≤20 e entrar na aba Base). Consome sempre 2 sorteios (determinístico,
  // reproduzível pra mesma seed). Exportada — reaproveitada por squadOf (js/ui.js) pra
  // não duplicar a fórmula em 2 lugares.
  function rollAge(rng, hi) {
    hi = hi || 35;
    const roll = U.rf(0, 1, rng);
    if (roll < 0.15) return U.ri(18, 21, rng);
    if (roll < 0.80) return U.ri(22, hi - 5, rng);
    return U.ri(hi - 4, hi, rng);
  }
  // overall ao redor da força do clube. Sem dado real de qualidade por jogador em
  // REAL_SQUADS (só nome+posição — ver js/data.js), não dá pra saber quem é o craque e
  // quem é reserva; a mitigação aqui é só deixar o ruído mais contido (era ±6, agora
  // ±4 por padrão) pra não oscilar tão selvagem em torno da força do clube.
  function rollOvr(clubStr, rng, base, noise, lo, hi) {
    base = base == null ? 4 : base; noise = noise == null ? 4 : noise;
    lo = lo == null ? 55 : lo; hi = hi == null ? 93 : hi;
    return U.clamp(clubStr - base + U.ri(-noise, noise, rng), lo, hi);
  }

  // elenco inicial de um clube — MESMA chave de RNG que squadOf sempre usou, pra
  // migração de saves antigos ser invisível (só a fórmula de idade/overall mudou nesta
  // sessão — ver rollAge/rollOvr acima — então os valores em si são novos, mas a chave
  // determinística continua a mesma pros dois caminhos nunca divergirem entre si).
  function initClubRoster(g, clubId) {
    const cl = D.CLUBS[clubId];
    const real = D.REAL_SQUADS && D.REAL_SQUADS[clubId];
    const rng = U.rngFor(g.seed, "squad", clubId, g.year);
    if (real) {
      return real.map(function (pl, idx) {
        return {
          id: clubId + "_" + idx, name: pl.n, pos: pl.p,
          age: rollAge(rng, 35), ovr: rollOvr(cl.str, rng),
          real: true
        };
      });
    }
    const POSN = ["GOL", "GOL", "ZAG", "ZAG", "ZAG", "LAT", "LAT", "LAT", "VOL", "VOL", "VOL", "MEI", "MEI", "MEI", "PON", "PON", "PON", "ATA", "ATA", "ATA"];
    return POSN.map(function (pos, idx) {
      return {
        id: clubId + "_" + idx, name: U.nameGen(rng, natHintForClub(clubId)), pos: pos,
        age: rollAge(rng, 34), ovr: rollOvr(cl.str, rng, 5, 4, 52, 92),
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

  CQ.world = { buildWorld: buildWorld, advanceWorld: advanceWorld, rollAge: rollAge, rollOvr: rollOvr };
})();
