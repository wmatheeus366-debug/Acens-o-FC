/* CRAQUE — renderizador do campo Ao Vivo via PixiJS (motor 2D WebGL).
   Substitui o <canvas> 2D cru (desenho pixel a pixel a cada frame, sem interpolação,
   sprite caindo pro círculo liso quando a imagem ainda não tinha carregado — o bug
   relatado pelo usuário: os 22 jogadores aparecendo como bolinhas vermelhas idênticas)
   por uma cena de verdade: sprites reais (Kenney) com textura carregada de forma
   assíncrona nativa do Pixi (nunca cai pro círculo — o sprite só aparece quando a
   textura está pronta, sem checagem manual de `.complete`), interpolação suave entre
   os frames reais do footballsim (em vez de saltar de posição a cada 40ms), e um campo
   desenhado com proporção oficial (105×68m) via PIXI.Graphics, sem depender do
   football2d pra isso (football2d continua vendorizado — vira só uma referência/
   reserva, já que ele nunca desenhou jogador nenhum, motivo original de precisar dos
   sprites Kenney por cima dele).

   Chamado só de js/ui.js (mountPitchCanvas/canvasPlayFrames/unmountPitchCanvas), que
   tenta este módulo primeiro e cai pro <canvas> 2D cru se `window.PIXI` não carregou ou
   se a criação do contexto WebGL falhar (aparelho sem suporte) — nunca quebra a tela.

   API: CQ.pitchPixi.mount(canvasEl, fx, res, player) -> boolean
        CQ.pitchPixi.playFrames(frames, fromIter, toIter)
        CQ.pitchPixi.unmount() */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util;

  // dimensões oficiais de campo (metros) — só usadas aqui pra desenhar as marcações;
  // a posição real dos jogadores/bola continua vindo do footballsim (PITCH em
  // js/live-sim.js, unidade decímetro, eixo comprido = Y) via fsPt, igual ao <canvas>
  // 2D cru que este módulo substitui.
  const FW = 105, FH = 68;

  let state = null;
  const texCache = {}; // src -> PIXI.Texture, reaproveitado entre partidas (nunca destruído no unmount)
  function texFor(src) {
    if (!texCache[src]) texCache[src] = PIXI.Texture.from(src);
    return texCache[src];
  }

  function fieldRect(w, h) {
    const margin = Math.min(w, h) * 0.035;
    const availW = w - margin * 2, availH = h - margin * 2;
    const ratio = FW / FH;
    let fw = availW, fh = fw / ratio;
    if (fh > availH) { fh = availH; fw = fh * ratio; }
    const x = (w - fw) / 2, y = (h - fh) / 2;
    return { x: x, y: y, width: fw, height: fh, scale: fw / FW };
  }

  function drawField(g, fr) {
    const s = fr.scale;
    g.clear();
    // fundo (área fora do gramado listrado, mesmo verde mais escuro)
    g.beginFill(0x214d2c); g.drawRect(0, 0, fr.x * 2 + fr.width, fr.y * 2 + fr.height); g.endFill();
    // grama "cortada" em faixas alternadas
    const stripes = 10;
    for (let i = 0; i < stripes; i++) {
      g.beginFill(i % 2 === 0 ? 0x2f7d3f : 0x2a7238);
      g.drawRect(fr.x + (fr.width / stripes) * i, fr.y, fr.width / stripes + 0.5, fr.height);
      g.endFill();
    }
    const lw = Math.max(1, s * 0.12);
    g.lineStyle(lw, 0xf5f5f0, 0.92);
    g.drawRect(fr.x, fr.y, fr.width, fr.height);
    // linha e círculo central
    g.moveTo(fr.x + fr.width / 2, fr.y); g.lineTo(fr.x + fr.width / 2, fr.y + fr.height);
    g.drawCircle(fr.x + fr.width / 2, fr.y + fr.height / 2, 9.15 * s);
    g.beginFill(0xf5f5f0); g.drawCircle(fr.x + fr.width / 2, fr.y + fr.height / 2, Math.max(1.5, s * 0.16)); g.endFill();
    const boxD = 16.5 * s, boxW = 40.32 * s, gaD = 5.5 * s, gaW = 18.32 * s, penR = 9.15 * s, penX = 11 * s;
    const cy = fr.y + fr.height / 2;
    [0, 1].forEach(function (side) {
      const gx = side === 0 ? fr.x : fr.x + fr.width; // linha de gol
      const dir = side === 0 ? 1 : -1; // pra dentro do campo
      g.drawRect(gx, cy - boxW / 2, dir * boxD, boxW);
      g.drawRect(gx, cy - gaW / 2, dir * gaD, gaW); // área pequena (profundidade gaD, largura gaW)
      const spotX = gx + dir * penX;
      g.beginFill(0xf5f5f0); g.drawCircle(spotX, cy, Math.max(1.5, s * 0.16)); g.endFill();
      // arco do pênalti — só a parte que fica fora da grande área
      const cosA = U.clamp((boxD - penX) / penR, -1, 1);
      const a = Math.acos(cosA);
      const a0 = side === 0 ? -a : Math.PI - a, a1 = side === 0 ? a : Math.PI + a;
      g.arc(spotX, cy, penR, a0, a1);
      // gol (retângulo pequeno saindo da linha de fundo)
      g.drawRect(gx - (side === 0 ? 2 * s : 0), cy - 3.66 * s, 2 * s, 7.32 * s);
      // arcos de escanteio
      const cx0 = gx, cy0 = fr.y, cy1 = fr.y + fr.height;
      const q = Math.PI / 2;
      if (side === 0) { g.arc(cx0, cy0, s, 0, q); g.arc(cx0, cy1, s, -q, 0); }
      else { g.arc(cx0, cy0, s, q, Math.PI); g.arc(cx0, cy1, s, Math.PI, Math.PI + q); }
    });
  }

  function fsPt(fr, pos) {
    const P = CQ.liveSim.PITCH;
    const pct = CQ.pitch.fsToPct([pos[1], pos[0]], P.pitchHeight, P.pitchWidth);
    return [fr.x + (pct[0] / 100) * fr.width, fr.y + (pct[1] / 100) * fr.height];
  }

  function makePlayer(src, spriteSize) {
    const c = new PIXI.Container();
    const spr = new PIXI.Sprite(texFor(src));
    spr.anchor.set(0.5);
    spr.width = spriteSize; spr.height = spriteSize;
    c.addChild(spr);
    c.cur = [0, 0]; c.target = [0, 0];
    return c;
  }

  function mount(canvasEl, fx, res, player) {
    if (!window.PIXI || !canvasEl || !CQ.liveSim || !CQ.PLAYER_SPRITES) return false;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
    let app;
    try {
      app = new PIXI.Application({ view: canvasEl, width: w, height: h, resolution: 1, antialias: true, backgroundAlpha: 1, background: 0x214d2c });
    } catch (e) { return false; } // WebGL indisponível — quem chamou cai pro <canvas> 2D cru
    const fr = fieldRect(w, h);
    const fieldG = new PIXI.Graphics();
    drawField(fieldG, fr);
    app.stage.addChild(fieldG);

    const sprites = CQ.pitch.pickTeamSprites(fx.myTeam, fx.opp);
    const spriteSize = Math.max(14, fr.width * 0.028);
    const mineIdx = (res && res.plays) ? CQ.pitch.FORMATION.findIndex(function (f) { return f.pos === player.pos; }) : -1;

    const mineLayer = new PIXI.Container(), oppLayer = new PIXI.Container();
    const mineSprites = [], oppSprites = [];
    for (let i = 0; i < 11; i++) { const c = makePlayer(CQ.PLAYER_SPRITES[sprites.mine], spriteSize); mineLayer.addChild(c); mineSprites.push(c); }
    for (let i = 0; i < 11; i++) { const c = makePlayer(CQ.PLAYER_SPRITES[sprites.opp], spriteSize); oppLayer.addChild(c); oppSprites.push(c); }
    app.stage.addChild(mineLayer); app.stage.addChild(oppLayer);

    let meRing = null;
    if (mineIdx >= 0 && mineSprites[mineIdx]) {
      meRing = new PIXI.Graphics();
      meRing.lineStyle(Math.max(1.5, spriteSize * 0.09), 0xe0b13c, 1);
      meRing.drawCircle(0, 0, spriteSize * 0.62);
      app.stage.addChild(meRing);
    }

    const ballSize = Math.max(6, fr.width * 0.016);
    const ballSpr = new PIXI.Sprite(texFor(CQ.PLAYER_SPRITES.ball));
    ballSpr.anchor.set(0.5); ballSpr.width = ballSize; ballSpr.height = ballSize;
    ballSpr.cur = [fr.x + fr.width / 2, fr.y + fr.height / 2]; ballSpr.target = ballSpr.cur.slice();
    app.stage.addChild(ballSpr);

    state = {
      app: app, fr: fr, mineSprites: mineSprites, oppSprites: oppSprites, ballSpr: ballSpr,
      meRing: meRing, mineIdx: mineIdx, stepTimer: null
    };

    const LERP = 0.22;
    app.ticker.add(function () {
      const st = state; if (!st) return;
      function step(c) {
        c.cur[0] += (c.target[0] - c.cur[0]) * LERP;
        c.cur[1] += (c.target[1] - c.cur[1]) * LERP;
        c.x = c.cur[0]; c.y = c.cur[1];
      }
      st.mineSprites.forEach(step); st.oppSprites.forEach(step); step(st.ballSpr);
      if (st.meRing && st.mineSprites[st.mineIdx]) { st.meRing.x = st.mineSprites[st.mineIdx].x; st.meRing.y = st.mineSprites[st.mineIdx].y; }
    });

    if (res.simFrames && res.simFrames.length) setFrame(res.simFrames[0], true);
    return true;
  }

  function setFrame(frame, snap) {
    const st = state; if (!st || !frame) return;
    function apply(list, arr) {
      arr.forEach(function (pos, i) {
        if (!list[i]) return;
        const p = fsPt(st.fr, pos);
        list[i].target = p;
        if (snap) list[i].cur = p.slice();
      });
    }
    apply(st.mineSprites, frame.mine);
    apply(st.oppSprites, frame.opp);
    const bp = fsPt(st.fr, frame.ball);
    st.ballSpr.target = bp;
    if (snap) st.ballSpr.cur = bp.slice();
  }

  // anima uma janela curta de frames reais — mesmo gancho de js/ui.js pitchReact
  // (chamado a cada evento com `.iter`: gol/cartão vindos da simulação real).
  function playFrames(frames, fromIter, toIter) {
    const st = state; if (!st || !frames || !frames.length) return;
    if (st.stepTimer) { clearInterval(st.stepTimer); st.stepTimer = null; }
    const lo = U.clamp(Math.min(fromIter, toIter), 0, frames.length - 1);
    const hi = U.clamp(Math.max(fromIter, toIter), 0, frames.length - 1);
    const seq = frames.slice(lo, hi + 1);
    if (!seq.length) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setFrame(seq[seq.length - 1], true); return; }
    let i = 0;
    st.stepTimer = setInterval(function () {
      if (state !== st) { clearInterval(st.stepTimer); return; }
      setFrame(seq[i], false);
      i++;
      if (i >= seq.length) { clearInterval(st.stepTimer); st.stepTimer = null; }
    }, 40);
  }

  function unmount() {
    const st = state; if (!st) return;
    if (st.stepTimer) clearInterval(st.stepTimer);
    // removeView:false — o <canvas> é o mesmo elemento inserido pelo HTML do overlay,
    // que o próprio closeOverlay() já remove; texture/baseTexture:false preserva o
    // cache de texturas dos sprites (texCache), reaproveitado pela próxima partida.
    try { st.app.destroy(false, { children: true, texture: false, baseTexture: false }); } catch (e) { /* já destruído/contexto perdido — sem problema */ }
    state = null;
  }

  CQ.pitchPixi = { mount: mount, playFrames: playFrames, unmount: unmount };
})();
