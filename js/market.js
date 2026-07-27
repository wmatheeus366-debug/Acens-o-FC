/* CRAQUE — mercado autônomo entre NPCs (Fatia 2 de "Mundo Real 2026"): clubes comprando
   e vendendo jogadores entre si, sem envolver o jogador. Distinto de makeOffers/acceptOffer
   (que são só pro PRÓPRIO jogador). Roda 1x por temporada, dentro de endSeason, logo depois
   de CQ.world.advanceWorld — reaproveita o mesmo array roster de CQ.world, sem estado novo
   por NPC. Depende de util, DATA, world (nameGen/formula de reposição) e engine (leagueOf). */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util, D = CQ.DATA;

  const GAP_MIN = 6;
  const UPGRADE_MARGIN = 2;
  const FIT_WINDOW = 12;
  const EURO_UNLOCK_OVR = 78;
  const CAP = 18;

  // mesma lógica de world.js (privada lá) — duplicar é mais simples que exportar só pra isso
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

  function candidatesFor(g) {
    const list = [];
    Object.keys(g.world.clubs).forEach(function (clubId) {
      const cl = D.CLUBS[clubId];
      if (!cl) return;
      g.world.clubs[clubId].roster.forEach(function (pl, idx) {
        const gap = pl.ovr - (cl.str - 4);
        if (gap >= GAP_MIN) list.push({ clubId: clubId, idx: idx, pl: pl, cl: cl, gap: gap });
      });
    });
    list.sort(function (a, b) {
      return b.gap - a.gap || (a.clubId + a.idx).localeCompare(b.clubId + b.idx);
    });
    return list;
  }

  function findDestination(g, rng, cand, touched) {
    const originLeague = CQ.engine.leagueOf(g, cand.clubId);
    let pool = D.clubsOf(originLeague);
    if (cand.pl.ovr >= EURO_UNLOCK_OVR && U.chance(0.5, rng)) {
      pool = pool.concat(D.EURO_LEAGUES.reduce(function (acc, lg) { return acc.concat(D.clubsOf(lg)); }, []));
    }
    pool = pool.filter(function (c) {
      return c.id !== cand.clubId && !touched[c.id]
        && c.str > cand.cl.str + UPGRADE_MARGIN
        && Math.abs((c.str - 4) - cand.pl.ovr) <= FIT_WINDOW;
    });
    return pool.length ? U.choice(pool, rng) : null;
  }

  // mesma curva de marketValue (engine.js), mas sem persistir nada — NPC não tem
  // overall/fame guardados, é só pra dar um número plausível na notícia
  function estimateValue(pl) {
    const ageF = pl.age <= 20 ? 0.82 : pl.age <= 27 ? 1.0 : pl.age <= 30 ? 0.72 : pl.age <= 33 ? 0.42 : 0.18;
    const base = Math.pow(Math.max(0, pl.ovr - 40) / 10, 3.2) * 850000;
    return Math.max(200000, Math.round(base * ageF / 100000) * 100000);
  }

  function doTransfer(g, rng, year, cand, dest, notes) {
    const origin = g.world.clubs[cand.clubId].roster;
    const target = g.world.clubs[dest.id].roster;
    const pl = cand.pl;

    origin[cand.idx] = {
      id: cand.clubId + "_t" + year + "_" + cand.idx,
      name: U.nameGen(rng, natHintForClub(cand.clubId)), pos: pl.pos,
      age: U.ri(17, 20, rng), ovr: U.clamp((cand.cl ? cand.cl.str : 70) - 14 + U.ri(-4, 6, rng), 45, 84),
      real: false
    };
    // promessa notável (olheiro de base) no backfill da saída, independente da
    // notícia de transferência abaixo — mesmo limiar de world.js
    const repl = origin[cand.idx];
    if (repl.ovr >= (cand.cl ? cand.cl.str : 70) - 9 && CQ.engine.leagueOf(g, cand.clubId) === CQ.engine.leagueOf(g, g.player.clubId)) {
      notes.push({ t: "prospect-breakout", player: repl.name, pos: repl.pos, ovr: repl.ovr, age: repl.age, club: cand.cl ? cand.cl.name : cand.clubId });
    }

    const samePos = target.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) { return x.p.pos === pl.pos; });
    const pool = samePos.length ? samePos : target.map(function (p, i) { return { p: p, i: i }; });
    const weakest = pool.reduce(function (a, b) { return b.p.ovr < a.p.ovr ? b : a; });
    target[weakest.i] = pl;

    const big = pl.real || pl.ovr >= 80
      || CQ.engine.leagueOf(g, cand.clubId) === CQ.engine.leagueOf(g, g.player.clubId)
      || CQ.engine.leagueOf(g, dest.id) === CQ.engine.leagueOf(g, g.player.clubId);
    if (big) {
      notes.push({
        t: "world-transfer", player: pl.name, pos: pl.pos, ovr: pl.ovr,
        fromClub: cand.cl.name, toClub: dest.name, valueHint: estimateValue(pl)
      });
    }
  }

  function advanceMarket(g, notes) {
    const year = g.year;
    const rng = U.rngFor(g.seed, "market", year);
    const touched = {};
    let cap = CAP, moved = 0;
    candidatesFor(g).forEach(function (cand) {
      if (cap <= 0 || touched[cand.clubId]) return;
      const dest = findDestination(g, rng, cand, touched);
      if (!dest) return;
      doTransfer(g, rng, year, cand, dest, notes);
      touched[cand.clubId] = touched[dest.id] = true;
      cap--; moved++;
    });
    return { moved: moved };
  }

  CQ.market = { advanceMarket: advanceMarket };
})();
