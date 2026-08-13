/* CRAQUE — campo 2D animado do modo Ao Vivo: formação, desenho do campo (SVG) e
   tradução de cada evento da partida num "alvo visual" (posição da bola, quem destacar,
   que ícone mostrar). Puramente lógica/geração de string — nenhuma manipulação de DOM
   aqui (isso é trabalho de js/ui.js, que já é o único módulo que toca o DOM no projeto).

   É uma visualização ESTILIZADA sincronizada com os mesmos eventos abstratos que
   js/live.js já gera (gol/cartão/lance/clima/decisão) — não é um replay físico real,
   não simula posse de bola nem movimento livre de 22 jogadores com IA. Time do jogador
   sempre desenhado atacando a direita, adversário a esquerda, independente do mando de
   campo real — simplificação de apresentação deliberada. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util;

  // 11 posições por time, em % (0-100) dentro do campo inteiro — meu time ocupa a
  // metade esquerda (x até ~54, o suficiente pra alcançar o meio-campo), espelhado
  // (100-x) pro adversário. Contagem por função idêntica à de probableLineup
  // (js/ui.js): 1 GOL, 2 ZAG, 2 LAT, 2 VOL, 2 MEI, 1 PON, 1 ATA = 11.
  const FORMATION = [
    { pos: "GOL", x: 6, y: 50 },
    { pos: "ZAG", x: 16, y: 34 }, { pos: "ZAG", x: 16, y: 66 },
    { pos: "LAT", x: 22, y: 12 }, { pos: "LAT", x: 22, y: 88 },
    { pos: "VOL", x: 30, y: 38 }, { pos: "VOL", x: 30, y: 62 },
    { pos: "MEI", x: 40, y: 26 }, { pos: "MEI", x: 40, y: 74 },
    { pos: "PON", x: 48, y: 16 },
    { pos: "ATA", x: 54, y: 50 }
  ];

  // ícone de canto por tipo de lance de clima (js/live.js flavorPool) — chaves iguais
  // ao campo "t" que cada entrada do flavorPool já carrega.
  const FLAVOR_ICON = {
    flare: "🔥", brawl: "🥊", invasion: "🏃", var: "📺", coach: "🗣️",
    crowd: "📣", dog: "🐶", rain: "🌧️", laser: "🔺", drone: "🛸"
  };

  // ---------- marcador de jogador: sprite real (js/vendor/player-sprites.js) ----------
  // Substitui o círculo SVG com <pattern> listrado/diagonal — o padrão nunca aparecia
  // direito num marcador tão pequeno (o tile do <pattern> era maior que o próprio
  // marcador) e times com cor verde ficavam ilegíveis em cima do gramado (também verde).
  // 4 cores fixas do pacote (a 5ª, verde, é deliberadamente excluída daqui — é o motivo
  // original desse bug); cada clube escolhe a cor mais parecida com sua cor real.
  const SPRITE_REF = { blue: [65, 159, 221], red: [232, 106, 23], white: [255, 255, 255], special: [255, 204, 0] };
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [136, 136, 136];
  }
  function distRgb(a, b) { return Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2); }
  // devolve as 4 cores de SPRITE_REF ordenadas da mais próxima pra mais longe da cor do clube
  function rankedSpriteColors(club) {
    const rgb = hexToRgb(club && club.c1);
    return Object.keys(SPRITE_REF).sort(function (a, b) { return distRgb(rgb, SPRITE_REF[a]) - distRgb(rgb, SPRITE_REF[b]); });
  }
  // escolhe 1 cor de sprite por time — garante que os 2 times nunca ficam com a mesma
  // cor (se o 1º colocado do adversário empatar com o do meu time, cai pro 2º colocado
  // dele), pra sempre dar pra distinguir "meu time" de "adversário" de relance.
  function pickTeamSprites(mine, opp) {
    const mineRank = rankedSpriteColors(mine), oppRank = rankedSpriteColors(opp);
    const mineColor = mineRank[0];
    const oppColor = oppRank[0] !== mineColor ? oppRank[0] : oppRank[1];
    return { mine: mineColor, opp: oppColor };
  }

  function buildPitchSVG(fx, res, player) {
    const mine = fx.myTeam, opp = fx.opp;
    const sprites = pickTeamSprites(mine, opp);
    const myPlayers = FORMATION.map(function (f, i) {
      return { pos: f.pos, x: f.x, y: f.y, uid: "pvm" + i };
    });
    const opPlayers = FORMATION.map(function (f, i) {
      return { pos: f.pos, x: 100 - f.x, y: f.y, uid: "pvo" + i };
    });
    // marca o jogador do usuário no primeiro slot da posição dele, se estiver em campo
    let mineIdx = -1;
    if (res && res.plays && player) {
      mineIdx = FORMATION.findIndex(function (f) { return f.pos === player.pos; });
    }
    // fallback (CQ.PLAYER_SPRITES ausente, ex. arquivo vendor não carregado): volta pro
    // círculo com o padrão do clube que já existia — nunca quebra a tela.
    function markerBody(side) {
      const src = CQ.PLAYER_SPRITES && CQ.PLAYER_SPRITES[side === "mine" ? sprites.mine : sprites.opp];
      if (src) return `<image href="${src}" x="-2.3" y="-3.4" width="4.6" height="6.8"/>`;
      return U.jerseySVG(side === "mine" ? mine : opp, "pv" + side, 3);
    }
    function playerG(p, i, side, isMe) {
      const ring = isMe ? `<circle r="4.3" class="pv-ring"/><text y="1.1" text-anchor="middle" class="pv-num">${U.esc(String((player && player.num) || ""))}</text>` : "";
      // .pv-inner sem transform próprio: CSS Transforms sobrescreve (não soma) o atributo
      // transform="translate(...)" do SVG quando ambos caem no mesmo elemento — o pulso
      // (transform:scale via CSS) precisa animar um filho sem posição própria, senão a
      // animação "teleportaria" o marcador pra origem do campo a cada pulso.
      return `<g class="pv-player pv-${side}${isMe ? " pv-me" : ""}" data-slot="${side === "mine" ? "m" : "o"}${i}" transform="translate(${p.x},${p.y})"><g class="pv-inner">${markerBody(side)}${ring}</g></g>`;
    }
    const myG = myPlayers.map(function (p, i) { return playerG(p, i, "mine", i === mineIdx); }).join("");
    const opG = opPlayers.map(function (p, i) { return playerG(p, i, "opp", false); }).join("");
    const ballSrc = CQ.PLAYER_SPRITES && CQ.PLAYER_SPRITES.ball;
    const ballBody = ballSrc ? `<image href="${ballSrc}" x="-1.9" y="-1.9" width="3.8" height="3.8"/>` : `<circle r="1.7"/>`;
    return `<div class="live-pitch"><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="pv-svg" role="img" aria-label="Campo da partida">
      <rect x="0" y="0" width="100" height="100" class="pv-grass"/>
      <g class="pv-lines">
        <rect x="2" y="3" width="96" height="94" fill="none"/>
        <line x1="50" y1="3" x2="50" y2="97"/>
        <circle cx="50" cy="50" r="11" fill="none"/>
        <rect x="2" y="28" width="12" height="44" fill="none"/>
        <rect x="86" y="28" width="12" height="44" fill="none"/>
      </g>
      <g class="pv-team-mine">${myG}</g>
      <g class="pv-team-opp">${opG}</g>
      <g id="pv-ball" class="pv-ball" transform="translate(50,50)">${ballBody}</g>
      <text id="pv-badge" class="pv-badge" x="50" y="14" text-anchor="middle"></text>
    </svg></div>`;
  }

  function poseForDecision(dec, rng) {
    const k = dec && dec.kind;
    if (k === "gk-pen") return { ball: [12, 50], highlight: "me" };
    if (k === "pen") return { ball: [88, 50], highlight: "me" };
    if (k === "fk") return { ball: [76, 22 + U.ri(0, 56, rng)], highlight: "me" };
    if (k === "gk-launch") return { ball: [20, 50], highlight: "me" };
    return { ball: [64, 22 + U.ri(0, 56, rng)], highlight: "me" }; // counter
  }

  // traduz um evento de js/live.js (buildLive/chooseDecision) num "alvo visual":
  // { ball:[x,y]|null, highlight:"me"|"mate"|"opp"|null, cardType:"y"|"r"|null,
  //   badge:string|null, goalSide:"left"|"right"|null, hold:boolean }
  // ball:null significa "não mexe" (mantém onde estava). rng é o mesmo live.rng já
  // semeado pela partida — determinístico, reproduzível como o resto do projeto.
  function poseFor(ev, rng) {
    switch (ev.type) {
      case "ko":
        return { ball: [50, 50], highlight: null, cardType: null, badge: null, goalSide: null, hold: false };
      case "goal":
        return { ball: [88, 30 + U.ri(0, 40, rng)], highlight: ev.who === "me" ? "me" : "mate", cardType: null, badge: null, goalSide: "right", hold: false };
      case "oppgoal":
        return { ball: [12, 30 + U.ri(0, 40, rng)], highlight: "opp", cardType: null, badge: null, goalSide: "left", hold: false };
      case "card":
        return { ball: null, highlight: "me", cardType: "y", badge: null, goalSide: null, hold: false };
      case "redcard":
        return { ball: null, highlight: "me", cardType: "r", badge: null, goalSide: null, hold: false };
      case "info":
        return { ball: [26 + U.ri(0, 48, rng), 12 + U.ri(0, 76, rng)], highlight: null, cardType: null, badge: null, goalSide: null, hold: false };
      case "flavor":
        return { ball: null, highlight: null, cardType: null, badge: (ev.t && FLAVOR_ICON[ev.t]) || FLAVOR_ICON.crowd, goalSide: null, hold: false };
      case "decision": {
        const p = poseForDecision(ev.dec, rng);
        return { ball: p.ball, highlight: p.highlight, cardType: null, badge: null, goalSide: null, hold: true };
      }
      case "ht":
        return { ball: [50, 50], highlight: null, cardType: null, badge: "⏸️", goalSide: null, hold: false };
      case "ft":
        return { ball: [50, 50], highlight: null, cardType: null, badge: "🏁", goalSide: null, hold: false };
      default:
        return { ball: null, highlight: null, cardType: null, badge: null, goalSide: null, hold: false };
    }
  }

  // pose de um lance específico da disputa de pênaltis (js/live.js runShootout/log[i]).
  // side "my" = eu bato (contra o gol deles, direita); "op" = eles batem contra o meu
  // goleiro (contra o meu gol, esquerda).
  function poseForKick(l) {
    const side = l.side === "my" ? "right" : "left";
    return { ball: [l.side === "my" ? 88 : 12, 50], result: l.ok ? "goal" : "miss", goalSide: side };
  }

  CQ.pitch = {
    FORMATION: FORMATION, FLAVOR_ICON: FLAVOR_ICON, buildPitchSVG: buildPitchSVG, poseFor: poseFor, poseForKick: poseForKick,
    SPRITE_REF: SPRITE_REF, rankedSpriteColors: rankedSpriteColors, pickTeamSprites: pickTeamSprites
  };
})();
