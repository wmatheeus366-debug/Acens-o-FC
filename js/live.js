/* CRAQUE — partidas decisivas ao vivo: cronologia minuto a minuto,
   decisões interativas e disputa de pênaltis. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util;

  function minutesFor(n, used, lo, hi) {
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const m = U.ri(lo || 2, hi || 90);
      if (used.indexOf(m) < 0) { used.push(m); out.push(m); }
    }
    return out.sort(function (a, b) { return a - b; });
  }

  function buildLive(g, fixture) {
    const p = g.player;
    const res = CQ.engine.resolveMatch(g, fixture, {});
    const meName = fixture.isNatMatch ? fixture.myTeam.name : CQ.engine.myClub(g).name;
    const events = [];
    const used = [];

    // distribui gols base
    const myGoalMin = minutesFor(res.gm, used, 4, 89);
    const opGoalMin = minutesFor(res.go, used, 4, 89);
    let pgLeft = res.pg, paLeft = res.pa;

    const evs = [];
    myGoalMin.forEach(function (m) {
      let who, text, big = false;
      if (pgLeft > 0) {
        pgLeft--;
        who = p.name;
        text = "GOOOOL! " + p.name + " marca para " + (fixture.home ? "o " + meName : "o " + meName + " fora de casa") + "!";
        big = true;
      } else if (paLeft > 0) {
        paLeft--;
        text = "Gol do " + meName + "! Assistência primorosa de " + p.name + ".";
        big = true;
      } else {
        text = "Gol do " + meName + "! A equipe amplia a pressão.";
      }
      evs.push({ min: m, type: "goal", text: text, big: big });
    });
    opGoalMin.forEach(function (m) {
      evs.push({ min: m, type: "oppgoal", text: "Gol do " + fixture.opp.name + ". Silêncio no setor " + (fixture.home ? "da casa" : "visitante") + "..." });
    });
    if (res.plays && res.cardY) {
      const m = minutesFor(1, used, 20, 85)[0];
      if (m) evs.push({ min: m, type: "card", text: "Cartão amarelo para " + p.name + " após falta dura no meio-campo." });
    }
    if (res.plays && res.cardR) {
      const m = minutesFor(1, used, 55, 88)[0];
      if (m) evs.push({ min: m, type: "redcard", text: "EXPULSO! " + p.name + " recebe o vermelho direto. Que dor de cabeça." });
    }
    // lances de cor
    const colorN = U.ri(2, 4);
    const colorMin = minutesFor(colorN, used, 6, 88);
    const neutralTexts = [
      "Jogo truncado no meio-campo; muitas faltas.",
      "Boa trama do " + meName + " pela direita; cruzamento afastado.",
      "Pressão do " + fixture.opp.name + "; a zaga afasta o perigo.",
      "O técnico gesticula muito à beira do gramado."
    ];
    const colorTexts = !res.plays ? neutralTexts : res.isGK ? [
      p.name + " sai do gol com segurança e fica com a bola.",
      "DEFESAÇA de " + p.name + "! A bola ia no ângulo.",
      p.name + " orienta a linha de defesa em voz alta.",
      "Chute de fora — " + p.name + " encaixa em dois tempos."
    ] : [
      p.name + " arranca pelo meio e sofre falta. Jogo pegado.",
      "Boa trama do " + meName + " pela direita; cruzamento afastado.",
      p.name + " tenta de fora da área — a bola passa raspando!",
      "Pressão do " + fixture.opp.name + "; a zaga afasta o perigo.",
      "Troca de passes envolvente, o estádio aplaude."
    ];
    colorMin.forEach(function (m, i) {
      evs.push({ min: m, type: "info", text: colorTexts[i % colorTexts.length] });
    });

    // eventos de atmosfera em jogos de clima quente (decisivos ou mata-mata — agora que
    // existe o botão "Ao vivo" opcional, faz sentido esses jogos também terem clima)
    if ((fixture.decisive || fixture.knock) && U.chance(0.8)) {
      const flavorPool = [
        { t: "flare", txt: "Sinalizadores acesos na arquibancada; a fumaça toma conta do estádio." },
        { t: "brawl", txt: "Confusão generalizada! Jogadores dos dois times se estranham no gramado. O árbitro tenta apartar." },
        { t: "invasion", txt: "Um torcedor invade o campo e é retirado pelos seguranças. Jogo paralisado." },
        { t: "var", txt: "O árbitro vai ao VAR revisar um lance. Tensão total à beira do gramado." },
        { t: "coach", txt: "Discussão acalorada entre os bancos; um auxiliar recebe cartão." },
        { t: "crowd", txt: "A torcida faz um mosaico gigante e o barulho é ensurdecedor." },
        { t: "dog", txt: "Um cachorro entra correndo no gramado e sai com a bola debaixo do focinho! A torcida ri, o árbitro paralisa o jogo." },
        { t: "rain", txt: "Chuva forte começa a cair; a bola escorrega e o ritmo do jogo muda." },
        { t: "laser", txt: "Um facho de laser da torcida visitante incomoda o goleiro antes da cobrança." },
        { t: "drone", txt: "Um drone sobrevoa o gramado carregando uma bandeira de protesto — a organizada reage aos gritos." }
      ];
      const nFlavor = fixture.stage === "F" || fixture.classic ? U.ri(2, 3) : U.ri(1, 2);
      const fmins = minutesFor(nFlavor, used, 8, 86);
      const chosen = U.shuffle(flavorPool);
      fmins.forEach(function (m, i) {
        const f = chosen[i % chosen.length];
        evs.push({ min: m, type: "flavor", text: f.txt });
      });
    }

    // decisões interativas (apenas se o jogador está em campo)
    if (res.plays) {
      const nDec = fixture.stage === "F" ? 2 : U.chance(0.75) ? 2 : 1;
      const decMin = minutesFor(nDec, used, 12, 84);
      decMin.forEach(function (m) {
        evs.push({ min: m, type: "decision", dec: makeDecision(g, res, fixture) });
      });
    }

    evs.sort(function (a, b) { return a.min - b.min; });
    events.push({ min: 0, type: "ko", text: "Bola rolando! " + meName + (fixture.home ? " × " : " visita o ") + fixture.opp.name + " — " + fixture.label + "." });
    let htDone = false;
    evs.forEach(function (e) {
      if (!htDone && e.min > 45) { events.push({ min: 45, type: "ht", text: "Intervalo." }); htDone = true; }
      events.push(e);
    });
    if (!htDone) events.push({ min: 45, type: "ht", text: "Intervalo." });
    events.push({ min: 90, type: "ft", text: "Apita o árbitro: fim de jogo." });

    return {
      fixture: fixture, res: res, events: events, i: 0,
      // RNG determinístico da partida ao vivo (decisões e pênaltis)
      rng: U.rngFor(g.seed, "live", g.year, (g.season && g.season.idx) || 0),
      score: [0, 0], phase: "run", decision: null, shootout: null, meName: meName
    };
  }

  // decisões possíveis
  function makeDecision(g, res, fixture) {
    const p = g.player, a = p.attrs;
    if (p.pos === "GOL") {
      if (U.chance(0.5)) {
        return {
          kind: "gk-pen", q: "Pênalti contra! O batedor deles ajeita a bola. O que você faz?",
          opts: [
            { label: "Escolher um canto e voar", sub: "Reflexo decide — defesa heroica ou nada", p: U.clamp(0.22 + (a.ref - 60) / 130, 0.15, 0.5), ok: "DEFENDEEEEU! Você voou no canto certo! O estádio vem abaixo!", fail: "Ele bateu no outro canto. Gol deles.", okFx: { nota: 1.2, fame: 2 }, failFx: { oppGoal: true } },
            { label: "Esperar até o último instante", sub: "Mais seguro contra cavadinhas", p: U.clamp(0.14 + (a.posn - 60) / 200, 0.08, 0.3), ok: "Ele cavou! E você ficou! Defesa com o peito, que frieza!", fail: "Bola num canto, você no meio. Gol.", okFx: { nota: 1.0, fame: 1 }, failFx: { oppGoal: true } }
          ]
        };
      }
      return {
        kind: "gk-launch", q: "Bola nas suas mãos e o contra-ataque aberto. Como repõe?",
        opts: [
          { label: "Lançamento longo arriscado", sub: "Se achar o atacante, é chance clara", p: U.clamp(0.3 + (a.pas - 60) / 120, 0.2, 0.65), ok: "Lançamento PERFEITO! O atacante sai na cara e faz! Assistência sua!", fail: "A bola sai direto pela lateral. O técnico esbraveja.", okFx: { teamGoal: true, assist: true, nota: 0.8 }, failFx: { nota: -0.2 } },
          { label: "Reposição curta e segura", sub: "Mantém a posse, sem risco", p: 0.97, ok: "Reposição limpa; o time troca passes e respira.", fail: "Passe interceptado! Quase um desastre.", okFx: { nota: 0.1 }, failFx: { nota: -0.4 } }
        ]
      };
    }
    const roll = U.rf(0, 1);
    if (roll < 0.4) {
      const pShoot = U.clamp(0.55 + (a.bp * 0.6 + a.fin * 0.4 - 65) / 110, 0.45, 0.9);
      return {
        kind: "pen", q: "PÊNALTI A FAVOR! A torcida grita o seu nome. Quem bate?",
        opts: [
          { label: "Eu bato", sub: "Mais risco, mais glória — gol é seu", p: pShoot, ok: "No fundo da rede! Você bateu com categoria! GOL SEU!", fail: "NÃO! O goleiro pegou... A torcida leva as mãos à cabeça.", okFx: { myGoal: true, nota: 0.7, fame: 1 }, failFx: { nota: -0.6, morale: -4 } },
          { label: "Deixar com o companheiro", sub: "O cobrador reserva é seguro", p: 0.76, ok: "O companheiro desloca o goleiro e faz. Gol do time!", fail: "Ele isolou! Inacreditável.", okFx: { teamGoal: true }, failFx: {} }
        ]
      };
    }
    if (roll < 0.68) {
      const pFK = U.clamp(0.16 + (a.bp - 60) / 130, 0.08, 0.5);
      const pCross = U.clamp(0.4 + (a.pas - 60) / 130, 0.3, 0.72);
      return {
        kind: "fk", q: "Falta perigosa na entrada da área, ótima posição pra batida. Como você cobra?",
        opts: [
          { label: "Bater direto no gol", sub: "Na força e no canto — gol é seu · " + Math.round(pFK * 100) + "%", p: pFK, ok: "NO ÂNGULO! Golaço de falta, sem chance pro goleiro! GOL SEU!", fail: "Na barreira! A chance vai embora.", okFx: { myGoal: true, nota: 1.0, fame: 2 }, failFx: { nota: -0.2 } },
          { label: "Cruzar na área", sub: "Buscar a cabeçada do companheiro", p: pCross, ok: "Cruzamento perfeito e é gol de cabeça! Assistência sua!", fail: "A zaga afasta de cabeça.", okFx: { teamGoal: true, assist: true, nota: 0.4 }, failFx: { nota: -0.1 } },
          { label: "Recuar e manter posse", sub: "Sem risco, joga seguro", p: 0.95, ok: "Time recompõe e mantém o controle do jogo.", fail: "Perde a bola na saída. Susto.", okFx: { nota: 0.05 }, failFx: { nota: -0.3 } }
        ]
      };
    }
    const pFin = U.clamp(0.42 + (a.fin - 60) / 110, 0.3, 0.8);
    const pPass = U.clamp(0.5 + (a.pas - 60) / 140, 0.4, 0.8);
    return {
      kind: "counter", q: "Contra-ataque! Você recebe na entrada da área com um companheiro livre à esquerda.",
      opts: [
        { label: "Finalizar", sub: "Confia na batida — gol é seu", p: pFin, ok: "FUZILOU! Sem chance para o goleiro! GOL SEU!", fail: "Bateu por cima... A chance era boa demais.", okFx: { myGoal: true, nota: 0.7 }, failFx: { nota: -0.4 } },
        { label: "Tocar para o companheiro", sub: "Chance mais limpa, assistência sua", p: pPass, ok: "Passe açucarado, ele só empurra. Gol do time e assistência SUA!", fail: "O toque saiu forte e a zaga cortou.", okFx: { teamGoal: true, assist: true, nota: 0.4 }, failFx: { nota: -0.2 } }
      ]
    };
  }

  function chooseDecision(live, optIdx) {
    const dec = live.decision;
    if (!dec) return;
    const opt = dec.opts[optIdx];
    const ok = U.chance(opt.p, live.rng);
    const fx = ok ? opt.okFx : opt.failFx;
    const res = live.res;
    const text = ok ? opt.ok : opt.fail;
    const min = live.events[live.i - 1] ? live.events[live.i - 1].min : 45;
    const ins = { min: min, type: ok ? (fx.myGoal || fx.teamGoal ? "goal" : "info") : (fx.oppGoal ? "oppgoal" : "info"), text: text, big: ok && (fx.myGoal || fx.teamGoal || fx.nota >= 1) };
    // atualiza APENAS o resultado da partida (res). O placar visual (live.score)
    // é alterado exclusivamente por step(), ao revelar o evento inserido — assim
    // cada gol conta exatamente uma vez no placar.
    if (fx.myGoal) { res.gm++; res.pg++; }
    if (fx.teamGoal) { res.gm++; if (fx.assist) res.pa++; }
    if (fx.oppGoal) { res.go++; }
    if (fx.nota) res.nota = U.clamp(Math.round((res.nota + fx.nota) * 10) / 10, 3, 10);
    if (fx.fame) CQ.state.game.player.fame = U.clamp(CQ.state.game.player.fame + fx.fame, 0, 100);
    if (fx.morale) CQ.state.game.player.morale = U.clamp(CQ.state.game.player.morale + fx.morale, 5, 100);
    // reavalia vitória/empate
    res.win = res.gm > res.go; res.draw = res.gm === res.go; res.loss = res.gm < res.go;
    live.events.splice(live.i, 0, ins);
    live.decision = null;
    live.phase = "run";
    return ins;
  }

  // avança até o próximo ponto de parada; retorna eventos revelados
  function step(live) {
    const out = [];
    while (live.i < live.events.length) {
      const e = live.events[live.i];
      live.i++;
      if (e.type === "goal") live.score[0]++;
      else if (e.type === "oppgoal") live.score[1]++;
      else if (e.type === "decision") {
        live.decision = e.dec;
        live.phase = "decision";
        return out;
      } else if (e.type === "ft") {
        out.push(e);
        const res = live.res;
        // recalcula com o placar final (decisões podem ter mudado)
        res.win = res.gm > res.go; res.draw = res.gm === res.go; res.loss = res.gm < res.go;
        // pênaltis só na partida que DECIDE o confronto e só se o AGREGADO empatar — numa
        // ida de mata-mata continental um empate é resultado normal, não vai pra pênaltis
        const decideAqui = live.fixture.knock && live.fixture.decides !== false;
        if (decideAqui && CQ.engine.tieDrawn(live.fixture, res)) {
          live.phase = "shootout";
          live.shootout = initShootout(live);
        } else {
          live.phase = "done";
        }
        return out;
      }
      out.push(e);
      if (e.type === "goal" || e.type === "oppgoal" || e.type === "ht") return out; // pausa dramática
    }
    live.phase = "done";
    return out;
  }

  // ---------- pênaltis ----------
  function initShootout(live) {
    return { picked: null, done: false, myKicks: [], opKicks: [], my: 0, opp: 0, log: [], sudden: false };
  }

  function runShootout(live, slot) {
    // slot: 1..5 = cobrança escolhida pelo jogador; 0 = não bater
    const g = CQ.state.game;
    const p = g.player;
    const so = live.shootout;
    so.picked = slot;
    const isGK = p.pos === "GOL";
    const pMine = U.clamp(0.58 + (p.attrs.bp * 0.55 + p.attrs.fin * 0.45 - 62) / 120, 0.45, 0.92);
    const gkSaveBonus = isGK ? U.clamp((p.attrs.ref - 62) / 260, 0, 0.22) : 0;
    const baseOthers = 0.74;

    function kick(taken, byMe, round) {
      let pS = byMe ? pMine : baseOthers;
      if (!taken) pS -= gkSaveBonus; // chute deles contra nosso goleiro (você)
      const scored = U.chance(U.clamp(pS, 0.05, 0.97), live.rng);
      return scored;
    }

    for (let r = 1; r <= 5; r++) {
      const meKicksThis = slot === r;
      const myOk = kick(true, meKicksThis, r);
      so.myKicks.push(myOk); if (myOk) so.my++;
      so.log.push({ side: "my", round: r, ok: myOk, me: meKicksThis });
      // encerramento antecipado
      if (decided(so, r, true)) break;
      const opOk = kick(false, false, r);
      so.opKicks.push(opOk); if (opOk) so.opp++;
      so.log.push({ side: "op", round: r, ok: opOk });
      if (decided(so, r, false)) break;
    }
    // morte súbita
    let guard = 0;
    while (so.my === so.opp && guard++ < 10) {
      so.sudden = true;
      const a = U.chance(0.72, live.rng), b = U.chance(0.72 - gkSaveBonus, live.rng);
      so.myKicks.push(a); if (a) so.my++;
      so.opKicks.push(b); if (b) so.opp++;
      so.log.push({ side: "my", round: 5 + guard, ok: a, me: false, sudden: true });
      so.log.push({ side: "op", round: 5 + guard, ok: b, sudden: true });
    }
    if (so.my === so.opp) { so.my++; so.log.push({ side: "my", round: 99, ok: true, me: false, sudden: true }); }

    so.done = true;
    const res = live.res;
    res.shootout = { my: so.my, opp: so.opp };
    res.shootoutWin = so.my > so.opp;
    // drama: bateu a 5ª e converteu
    const myPick = so.log.find(function (l) { return l.me; });
    if (myPick) {
      if (myPick.ok) {
        res.nota = U.clamp(res.nota + (slot === 5 ? 0.5 : 0.3), 3, 10);
        if (slot === 5) p.fame = U.clamp(p.fame + 2, 0, 100);
      } else {
        res.nota = U.clamp(res.nota - 0.5, 3, 10);
        p.morale = U.clamp(p.morale - (res.shootoutWin ? 2 : 6), 5, 100);
      }
    }
    // revelação lance a lance na interface
    so.reveal = 0;
    so.myShown = []; so.opShown = [];
    live.phase = "shooting";
    return so;
  }

  // revela a próxima cobrança da disputa; retorna o lance ou null se acabou
  function shootStep(live) {
    const so = live.shootout;
    if (!so || so.reveal >= so.log.length) { live.phase = "done"; return null; }
    const l = so.log[so.reveal++];
    if (l.side === "my") so.myShown.push(l.ok); else so.opShown.push(l.ok);
    if (so.reveal >= so.log.length) live.phase = "done";
    return l;
  }
  function shootRunning(so) { return so && so.reveal < so.log.length; }

  function decided(so, round, afterMine) {
    const myLeft = 5 - round;
    const opLeft = 5 - round + (afterMine ? 1 : 0);
    if (so.my > so.opp + opLeft) return true;
    if (so.opp > so.my + myLeft) return true;
    return false;
  }

  CQ.live = { buildLive: buildLive, step: step, chooseDecision: chooseDecision, runShootout: runShootout, shootStep: shootStep, shootRunning: shootRunning };
})();
