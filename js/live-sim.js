/* CRAQUE — adaptador do motor de simulação real (js/vendor/footballsim.js) pro modo Ao
   Vivo. Só entra em ação dentro de js/live.js `buildLive`, ou seja, só quando o
   jogador está assistindo uma partida decisiva/mata-mata ao vivo — a temporada
   inteira (as ~180 partidas/rodada dos outros 187 clubes, partidas não assistidas do
   próprio jogador, mercado, lesão, disciplina, narrativa) continua 100% no motor
   estatístico de sempre (`resolveMatch`, js/engine.js), sem nenhuma mudança.

   Três responsabilidades, na ordem que `run(g, fixture)` executa:
   1. buildTeams  — nosso modelo de elenco (squadOf/G.world.clubs) -> Team/Player do
      footballsim (11 titulares por lado, mapa de posição 7->4, mapa de atributo).
   2. runMatch    — roda a simulação (determinística via setMatchSeed) com orçamento
      de tempo/iterações; nunca deixa a UI travada se o motor externo se comportar mal.
   3. translate   — devolve exatamente a mesma forma de `res` que `resolveMatch` já
      produz + a mesma forma de eventos que `buildLive` já monta — nenhum consumidor a
      jusante (applyMatch, disciplina, narrativa, pitchReact) precisa saber que a fonte
      mudou. `nota` continua calculada pela NOSSA fórmula (js/engine.js) — só os
      números de entrada dela (gols/cartões/desarmes/etc.) passam a vir de uma partida
      simulada de verdade em vez de dados/Poisson.

   Qualquer exceção em qualquer etapa (dado incompleto, motor externo indisponível,
   orçamento de tempo estourado) faz `run()` devolver `null` — `js/live.js` cai de
   volta pro caminho estatístico de sempre, sem quebrar a tela pro jogador. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util, D = CQ.DATA;

  // campo métrico real (105m x 68m, unidade = decímetro) — mesmos valores usados pelo
  // demo oficial do footballsim (eozgit/footballsim-demo).
  const PITCH = { pitchWidth: 680, pitchHeight: 1050, goalWidth: 90 };
  const POS_MAP = { GOL: "goalkeeper", ZAG: "defender", LAT: "defender", VOL: "midfielder", MEI: "midfielder", PON: "forward", ATA: "forward" };
  // formação inicial (frações 0-1 do campo) — o motor não tem gerador de formação
  // próprio (só devolve o jogador pra originPOS quando reposiciona, ver
  // setVariables.resetPlayerPositions no repo), precisa vir de quem chama. Ordem
  // igual à de bucketEleven/probableLineup (GOL,ZAG,ZAG,LAT,LAT,VOL,VOL,MEI,MEI,PON,
  // ATA) — index a index. kickOffTeam (nosso time) defende perto de fy=0 e ataca pra
  // fy=1; o adversário é espelhado (fy'=1-fy) pra ficar de frente, mesmo campo.
  const FORMATION_FS = [
    { pos: "GOL", fx: 0.50, fy: 0.05 },
    { pos: "ZAG", fx: 0.28, fy: 0.18 }, { pos: "ZAG", fx: 0.72, fy: 0.18 },
    { pos: "LAT", fx: 0.08, fy: 0.26 }, { pos: "LAT", fx: 0.92, fy: 0.26 },
    { pos: "VOL", fx: 0.35, fy: 0.40 }, { pos: "VOL", fx: 0.65, fy: 0.40 },
    { pos: "MEI", fx: 0.22, fy: 0.56 }, { pos: "MEI", fx: 0.78, fy: 0.56 },
    { pos: "PON", fx: 0.50, fy: 0.68 },
    { pos: "ATA", fx: 0.50, fy: 0.85 }
  ];
  function originFor(i, mine) {
    const f = FORMATION_FS[i] || FORMATION_FS[FORMATION_FS.length - 1];
    const fy = mine ? f.fy : 1 - f.fy;
    return [Math.round(f.fx * PITCH.pitchWidth), Math.round(fy * PITCH.pitchHeight)];
  }
  // calibração inicial (sem documentação oficial de quantas iterações = 90 min — ver
  // scripts/live-sim-check.mjs pra medir/ajustar isso com dados reais).
  const ITERS_PER_HALF = 2700;
  // orçamento de tempo do Worker: medido na prática (scripts/live-sim-check.mjs) em
  // ~1.9ms/iteração, ~10-12s pra uma partida inteira (5400 iterações) — 20s dá margem
  // confortável pra aparelhos mais lentos sem deixar o jogador esperando de verdade
  // (acima disso, cai pro fallback estatístico normalmente, sem travar a tela).
  const TIME_BUDGET_MS = 20000;

  function emptyStats() {
    return {
      goals: 0, saves: 0,
      shots: { total: 0, on: 0, off: 0, fouls: 0 },
      passes: { total: 0, on: 0, off: 0, fouls: 0 },
      tackles: { total: 0, on: 0, off: 0, fouls: 0 },
      cards: { yellow: 0, red: 0 }
    };
  }

  // skill real (0-100, escala já compatível com nossos atributos 0-99) — só o próprio
  // jogador do usuário tem essa granularidade (p.attrs.*).
  function skillFromAttrs(a, pos) {
    return {
      passing: a.pas, shooting: a.fin, tackling: a.def,
      saving: pos === "GOL" ? a.ref : 40,
      agility: a.pac, strength: a.fis, penalty_taking: a.bp, jumping: a.fis
    };
  }
  // aproximação determinística a partir de um "ovr" agregado — é tudo que os NPCs do
  // mundo persistente (G.world.clubs[...].roster) guardam hoje pra companheiros de
  // time e adversários. Gira em torno do overall com um leve viés por função.
  function skillFromOvr(ovr, pos, rng) {
    const j = function (spread) { return U.clamp(ovr + U.ri(-spread, spread, rng), 30, 99); };
    const s = {
      passing: j(8), shooting: j(10), tackling: j(8),
      saving: pos === "GOL" ? U.clamp(ovr + U.ri(-6, 6, rng), 30, 99) : 40,
      agility: j(8), strength: j(8), penalty_taking: j(10), jumping: j(8)
    };
    if (pos === "ZAG" || pos === "LAT") s.tackling = U.clamp(s.tackling + 6, 30, 99);
    if (pos === "ATA" || pos === "PON") s.shooting = U.clamp(s.shooting + 6, 30, 99);
    return s;
  }

  function buildPlayer(name, pos, num, skill, playerID, origin) {
    return {
      name: name, shirtNumber: num, position: POS_MAP[pos] || "midfielder",
      rating: "70", skill: skill,
      currentPOS: origin.slice(), fitness: 100, injured: false, playerID: playerID,
      originPOS: origin.slice(), intentPOS: origin.slice(), action: "", offside: false, hasBall: false,
      stats: emptyStats()
    };
  }

  // bucket de 11 titulares (1 GOL,2 ZAG,2 LAT,2 VOL,2 MEI,1 PON,1 ATA) a partir de uma
  // lista { name, pos, ov } — mesmo formato que squadOf/probableLineup já produzem.
  const BUCKETS = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2, PON: 1, ATA: 1 };
  function bucketEleven(list) {
    const out = [];
    Object.keys(BUCKETS).forEach(function (pos) {
      out.push.apply(out, list.filter(function (j) { return j.pos === pos; })
        .sort(function (a, b) { return (b.ov || 0) - (a.ov || 0); })
        .slice(0, BUCKETS[pos]));
    });
    return out;
  }

  // acha o código de 2 letras (chave de D.NAT_SQUADS) a partir do nome de exibição da
  // seleção (fixture.opp.name, vindo de natTeamObj) — só usado quando o adversário é
  // uma seleção (Copa do Mundo/continental), não um clube.
  function natCodeFor(name) {
    const codes = Object.keys(D.NATIONS || {});
    return codes.find(function (c) { return D.NATIONS[c].name === name; });
  }

  function opponentEleven(g, fixture, rng) {
    let raw;
    if (fixture.isNatMatch) {
      const code = natCodeFor(fixture.opp.name);
      const real = code && D.NAT_SQUADS && D.NAT_SQUADS[code];
      raw = real ? real.map(function (j) { return { name: j.n, pos: j.p, ov: fixture.opp.str + U.ri(-6, 6, rng) }; }) : null;
    } else {
      const world = g.world && g.world.clubs[fixture.opp.id];
      raw = world ? world.roster.map(function (j) { return { name: j.name, pos: j.pos, ov: j.ovr }; }) : null;
    }
    if (!raw || !raw.length) throw new Error("sem elenco pro adversário (" + fixture.opp.id + ")");
    return bucketEleven(raw);
  }

  function buildTeams(g, fixture) {
    const rng = U.rngFor(g.seed, "footballsim-roster", g.year, (g.season && g.season.idx) || 0, fixture.oppId);
    const p = g.player;
    const mineList = CQ.ui.probableLineup(g, fixture); // já resolve titular/lesão/suspensão/isMe
    const oppList = opponentEleven(g, fixture, rng);
    if (mineList.length !== 11 || oppList.length !== 11) {
      throw new Error("escalação incompleta (mine=" + mineList.length + " opp=" + oppList.length + ")");
    }
    let myPlayerID = null;
    const minePlayers = mineList.map(function (j, i) {
      const isMe = !!j.isMe;
      const skill = isMe ? skillFromAttrs(p.attrs, p.pos) : skillFromOvr(j.ov || p.overall, j.pos, rng);
      const id = i + 1;
      if (isMe) myPlayerID = id;
      return buildPlayer(j.name, j.pos, i + 1, skill, id, originFor(i, true));
    });
    const oppPlayers = oppList.map(function (j, i) {
      return buildPlayer(j.name, j.pos, i + 1, skillFromOvr(j.ov, j.pos, rng), 100 + i, originFor(i, false));
    });
    const mine = { name: fixture.myTeam.name, description: "", primaryColour: fixture.myTeam.c1 || "#888", secondaryColour: fixture.myTeam.c2 || "#fff", awayColour: fixture.myTeam.c2 || "#fff", rating: fixture.myTeam.str || 70, players: minePlayers, intent: "none", teamID: 1 };
    const opp = { name: fixture.opp.name, description: "", primaryColour: fixture.opp.c1 || "#888", secondaryColour: fixture.opp.c2 || "#fff", awayColour: fixture.opp.c2 || "#fff", rating: fixture.opp.str || 70, players: oppPlayers, intent: "none", teamID: 2 };
    return { mine: mine, opp: opp, myPlayerID: myPlayerID };
  }

  // Loop de simulação PURO (só usa os próprios parâmetros — nenhuma variável de fora),
  // de propósito: além de rodar direto (teste/diagnóstico), o mesmo código também é
  // serializado via .toString() dentro do Worker (ver runMatchAsync) — uma cópia só,
  // nunca duplicada entre "rodar aqui" e "rodar no worker".
  //
  // Detecta gol/cartão comparando as estatísticas de cada jogador a cada iteração
  // (setKickOffTeamGoalScored/etc., dentro do footballsim, incrementam
  // team.players[i].stats.goals/cards — não existe um "log de eventos" pronto pra
  // consumir, ver docs/ARCHITECTURE.md) — guarda o número da iteração de cada evento
  // pra depois virar um minuto real (proporção iteração/total), em vez do sorteio de
  // minuto que buildLive usava no caminho estatístico.
  function simulateLoop(FS, mine, opp, pitch, seed, itersPerHalf) {
    FS.setMatchSeed(seed >>> 0);
    var md = FS.initiateGame(mine, opp, pitch);
    var totalIters = itersPerHalf * 2;
    var frames = [];
    var events = [];
    function snapshot(team) {
      var m = {};
      team.players.forEach(function (pl) { m[pl.name] = { g: pl.stats.goals, y: pl.stats.cards.yellow, r: pl.stats.cards.red }; });
      return m;
    }
    function posXY(pos) { return [typeof pos[0] === "number" ? pos[0] : 0, pos[1]]; }
    var prevMine = snapshot(md.kickOffTeam), prevOpp = snapshot(md.secondTeam);
    var prevMineGoals = md.kickOffTeamStatistics.goals, prevOppGoals = md.secondTeamStatistics.goals;
    for (var i = 0; i < totalIters; i++) {
      if (i === itersPerHalf) md = FS.startSecondHalf(md);
      md = FS.playIteration(md);
      var mineGoals = md.kickOffTeamStatistics.goals, oppGoals = md.secondTeamStatistics.goals;
      if (mineGoals > prevMineGoals || oppGoals > prevOppGoals) {
        var side = mineGoals > prevMineGoals ? "mine" : "opp";
        var scTeam = side === "mine" ? md.kickOffTeam : md.secondTeam;
        var scPrev = side === "mine" ? prevMine : prevOpp;
        var scorer = scTeam.players.find(function (pl) { return pl.stats.goals > (scPrev[pl.name] ? scPrev[pl.name].g : 0); });
        events.push({ iter: i, type: "goal", side: side, name: scorer ? scorer.name : null });
        prevMineGoals = mineGoals; prevOppGoals = oppGoals;
      }
      ["mine", "opp"].forEach(function (side) {
        var team = side === "mine" ? md.kickOffTeam : md.secondTeam;
        var prevSnap = side === "mine" ? prevMine : prevOpp;
        team.players.forEach(function (pl) {
          var prev = prevSnap[pl.name] || { g: 0, y: 0, r: 0 };
          if (pl.stats.cards.yellow > prev.y) events.push({ iter: i, type: "card", side: side, name: pl.name });
          if (pl.stats.cards.red > prev.r) events.push({ iter: i, type: "redcard", side: side, name: pl.name });
        });
      });
      prevMine = snapshot(md.kickOffTeam); prevOpp = snapshot(md.secondTeam);
      frames.push({
        iter: i, ball: posXY(md.ball.position),
        mine: md.kickOffTeam.players.map(function (pl) { return posXY(pl.currentPOS); }),
        opp: md.secondTeam.players.map(function (pl) { return posXY(pl.currentPOS); })
      });
    }
    return {
      gm: md.kickOffTeamStatistics.goals, go: md.secondTeamStatistics.goals,
      mineStats: md.kickOffTeam.players.map(function (pl) {
        return { name: pl.name, goals: pl.stats.goals, cardY: pl.stats.cards.yellow, cardR: pl.stats.cards.red, tackles: pl.stats.tackles.total, passes: pl.stats.passes.on || pl.stats.passes.total, saves: pl.stats.saves || 0 };
      }),
      events: events, frames: frames, totalIters: totalIters
    };
  }

  // roda simulateLoop dentro de um Web Worker (medido na prática: ~1.9ms/iteração,
  // ~10s pra uma partida inteira — rodar isso bloqueando a thread principal travaria a
  // aba; num Worker roda em segundo plano). O Worker é montado a partir de um Blob (o
  // projeto inteiro vira UM arquivo HTML só — não existe "js/vendor/footballsim.js"
  // como URL separada pra usar em `new Worker(url)`), combinando o texto do bundle
  // (CQ.FOOTBALLSIM_SRC) com o próprio simulateLoop serializado por .toString().
  function runMatchAsync(g, fixture, teams) {
    if (typeof Worker === "undefined") return Promise.reject(new Error("Worker indisponível neste navegador"));
    const src = window.CQ_FOOTBALLSIM_SRC;
    if (!src) return Promise.reject(new Error("js/vendor/footballsim.js não carregado"));
    const seed = U.hashStr(g.seed + "|footballsim|" + fixture.oppId + "|" + g.year + "|" + ((g.season && g.season.idx) || 0)) >>> 0;
    const workerSrc = src + "\nself.onmessage = function (e) {\n" +
      "  try {\n" +
      "    var r = (" + simulateLoop.toString() + ")(self.CQ_FOOTBALLSIM, e.data.mine, e.data.opp, e.data.pitch, e.data.seed, e.data.itersPerHalf);\n" +
      "    self.postMessage({ ok: true, result: r });\n" +
      "  } catch (err) {\n" +
      "    self.postMessage({ ok: false, error: String(err && err.message || err) });\n" +
      "  }\n" +
      "};\n";
    const blob = new Blob([workerSrc], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    return new Promise(function (resolve, reject) {
      let settled = false;
      const worker = new Worker(url);
      const timeout = setTimeout(function () {
        if (settled) return;
        settled = true;
        worker.terminate();
        URL.revokeObjectURL(url);
        reject(new Error("footballsim: worker excedeu o tempo limite (" + TIME_BUDGET_MS + "ms)"));
      }, TIME_BUDGET_MS);
      worker.onmessage = function (e) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(url);
        if (e.data && e.data.ok) resolve(e.data.result); else reject(new Error((e.data && e.data.error) || "erro desconhecido no worker do footballsim"));
      };
      worker.onerror = function (e) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(url);
        reject(new Error("footballsim worker error: " + (e.message || "desconhecido")));
      };
      worker.postMessage({ mine: teams.mine, opp: teams.opp, pitch: PITCH, seed: seed, itersPerHalf: ITERS_PER_HALF });
    });
  }

  // traduz o resultado real da simulação pra forma que resolveMatch/buildLive já
  // produzem — nenhum consumidor a jusante (applyMatch, js/pitch.js, narrativa) muda.
  // Além de `res` (mesmo shape de resolveMatch), monta a lista de EVENTOS com minuto
  // real (proporção iteração/total) — js/live.js consome isso no lugar do sorteio de
  // minuto do caminho estatístico (minutesFor).
  function translate(g, fixture, teams, sim) {
    const p = g.player;
    const gm = sim.gm, go = sim.go;
    const meName = fixture.isNatMatch ? fixture.myTeam.name : CQ.engine.myClub(g).name;
    const canPlay = teams.myPlayerID != null;
    const myStats = canPlay ? sim.mineStats.find(function (s) { return s.name === p.name; }) : null;
    const isGK = p.pos === "GOL";

    const pg = myStats ? myStats.goals : 0;
    const cardY = myStats ? myStats.cardY > 0 : false;
    const cardR = myStats ? myStats.cardR > 0 : false;
    const tackles = myStats ? myStats.tackles : 0;
    const keyPasses = myStats ? myStats.passes : 0;
    const saves = myStats ? myStats.saves : 0;
    // sem equivalente de assistência no footballsim (Stats não tem esse campo) —
    // aproximação pequena e determinística, mesmo espírito do que resolveMatch já
    // fazia, só que agora escalado pelos gols de TIME realmente simulados.
    const rngA = U.rngFor(g.seed, "footballsim-assist", g.year, (g.season && g.season.idx) || 0);
    let pa = 0;
    if (canPlay && !isGK) {
      for (let i = 0; i < Math.max(0, gm - pg); i++) if (U.chance(0.22, rngA)) pa++;
    }
    const error = false; // footballsim não modela "erro individual" como evento à parte
    let nota = null;
    if (canPlay) {
      const rngN = U.rngFor(g.seed, "footballsim-nota", g.year, (g.season && g.season.idx) || 0);
      // mesma fórmula/pesos por posição de sempre (js/engine.js computeNota) — só os
      // números de entrada vêm da partida real simulada, não de Poisson.
      nota = CQ.engine.computeNota(p.pos, {
        gm: gm, go: go, pg: pg, pa: pa, keyPasses: keyPasses, tackles: tackles,
        intercepts: 0, duels: 0, clearances: 0, cardY: cardY, cardR: cardR, error: error,
        saves: saves, bigSaves: 0, overall: p.overall, oppStr: fixture.opp.str || 70
      }, rngN);
    }

    // minuto real = proporção da iteração dentro dos 90 minutos (2-88, deixa espaço
    // pra acréscimos não estourarem o intervalo que js/live.js já espera)
    function minuteOf(ev) { return U.clamp(Math.round((ev.iter / sim.totalIters) * 86) + 2, 2, 89); }
    const simEvents = sim.events.map(function (ev) {
      return {
        min: minuteOf(ev), type: ev.type, side: ev.side, name: ev.name,
        isMe: canPlay && ev.name === p.name,
        iter: ev.iter // pra js/ui.js animar os frames reais ao redor do evento (canvas)
      };
    });

    return {
      fixture: fixture, plays: canPlay, starts: canPlay, minutes: canPlay ? 90 : 0,
      rest: false, injured: p.injury > 0, susp: false,
      gm: gm, go: go, pg: pg, pa: pa, saves: saves, bigSaves: 0, nota: nota,
      tackles: tackles, intercepts: 0, duels: 0, clearances: 0, keyPasses: keyPasses, error: error,
      cardY: cardY, cardR: cardR, isGK: isGK,
      win: gm > go, draw: gm === go, loss: gm < go,
      simEvents: simEvents, simFrames: sim.frames, simTotalIters: sim.totalIters, meName: meName
    };
  }

  // API pública: devolve uma Promise (sempre resolve — nunca rejeita — com `null` em
  // caso de qualquer falha, pra js/live.js só precisar de um `.then` sem `.catch`
  // duplicado; cai pro caminho estatístico de sempre sem quebrar a tela).
  function runAsync(g, fixture) {
    if (!window.CQ_FOOTBALLSIM_SRC) return Promise.resolve(null);
    let teams;
    try {
      teams = buildTeams(g, fixture);
    } catch (e) {
      return Promise.resolve(null);
    }
    return runMatchAsync(g, fixture, teams).then(function (sim) {
      try { return translate(g, fixture, teams, sim); } catch (e) { return null; }
    }, function () { return null; });
  }

  CQ.liveSim = {
    runAsync: runAsync, buildTeams: buildTeams, simulateLoop: simulateLoop, translate: translate,
    skillFromAttrs: skillFromAttrs, skillFromOvr: skillFromOvr, bucketEleven: bucketEleven,
    ITERS_PER_HALF: ITERS_PER_HALF, PITCH: PITCH
  };
})();
