/* CRAQUE — interface: telas, overlays e fluxos de interação. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util, D = CQ.DATA, E = () => CQ.engine, I = CQ.util.I;

  const $ = function (sel) { return document.querySelector(sel); };
  function esc(s) { return U.esc(s); }
  function g() { return CQ.state.game; }

  // ---------------- helpers visuais ----------------
  // "sou eu" tanto pro clube do jogador quanto pra seleção dele (ids "nat:"+nome)
  function isMineId(G, id) {
    if (id === G.player.clubId) return true;
    return typeof id === "string" && id.indexOf("nat:") === 0 && id.slice(4) === D.NATIONS[G.player.nat].name;
  }
  function crest(clubOrId, cls) {
    const c = typeof clubOrId === "string" ? CQ.engine.oppObj(g(), clubOrId) : clubOrId;
    if (c && c.isNation && c.flag) {
      return `<span class="crest ${cls || ""}"><svg viewBox="0 0 40 44"><rect x="3" y="8" width="34" height="24" fill="#ece4d0" stroke="#1b1812"/><image href="https://flagcdn.com/w80/${c.flag}.png" x="4" y="9" width="32" height="22" preserveAspectRatio="xMidYMid slice"/></svg></span>`;
    }
    return U.crestSVG(c, cls);
  }
  function notaPill(n) {
    if (n == null) return '<span class="muted">—</span>';
    const cls = n >= 8 ? "n-great" : n >= 7 ? "n-good" : n >= 5.8 ? "n-mid" : "n-bad";
    return `<span class="nota ${cls}">${U.fmtNota(n)}</span>`;
  }
  function bar(v, max, warm, marker) {
    const pct = U.clamp(v / (max || 100) * 100, 0, 100);
    const mk = marker != null ? `<b style="left:${U.clamp(marker / (max || 100) * 100, 0, 100)}%"></b>` : "";
    return `<div class="bar ${warm ? "warm" : ""}"><i style="width:${pct}%"></i>${mk}</div>`;
  }
  function toast(msg) {
    let w = $(".toast-wrap");
    if (!w) { w = document.createElement("div"); w.className = "toast-wrap"; document.body.appendChild(w); }
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    w.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  // ---------------- navegação ----------------
  const NAV = [
    { id: "home", label: "Início", icon: I.home },
    { id: "career", label: "Carreira", icon: I.user },
    { id: "comps", label: "Torneios", icon: I.trophy },
    { id: "feed", label: "Redes", icon: I.feed },
    { id: "club", label: "Clube", icon: I.club }
  ];

  function go(screen) {
    if (CQ.audio) CQ.audio.play("click");
    CQ.state.screen = screen;
    render();
  }
  // splash de GOL em tela cheia (modo ao vivo)
  function goalSplash(mine, sub) {
    const div = document.createElement("div");
    div.className = "goal-splash" + (mine ? "" : " opp");
    div.innerHTML = `<div class="gs-word">${mine ? "GOL" : "gol"}</div>${sub ? `<div class="gs-sub">${esc(sub)}</div>` : ""}`;
    document.body.appendChild(div);
    if (CQ.audio) CQ.audio.play(mine ? "goal" : "miss");
    setTimeout(function () { div.remove(); }, 1500);
  }

  function render() {
    const s = CQ.state;
    const app = $("#app");
    if (s.screen === "create") { app.innerHTML = createHTML(); runEntranceAnimations(); sweepCrests(); return; }
    if (!s.game || s.screen === "cover") { app.innerHTML = coverHTML(); runEntranceAnimations(); sweepCrests(); return; }
    if (s.game.retired && s.screen !== "retro") s.screen = "retro";
    let body = "";
    switch (s.screen) {
      case "home": body = homeHTML(); break;
      case "career": body = careerHTML(); break;
      case "comps": body = compsHTML(); break;
      case "feed": body = feedHTML(); break;
      case "club": body = clubHTML(); break;
      case "retro": body = retroHTML(); break;
      default: body = homeHTML();
    }
    app.innerHTML = mastheadHTML() + `<main class="page">${body}</main>` + bottomNavHTML();
    runEntranceAnimations();
    sweepCrests();
  }

  // conta números-chave de baixo pra cima e desliza barras de progresso — pinta o
  // valor ANTIGO no HTML (já gerado pelas telas) e troca pro novo em requestAnimationFrame,
  // já que render() recria o DOM inteiro a cada chamada (não há "de onde" transicionar
  // sozinho). Não anima nada na primeira vez que um número é visto (lastSeen ainda nulo).
  function animateCount(el, from, to, ms, fmt) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt ? fmt(to) : Math.round(to);
      return;
    }
    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = from + (to - from) * eased;
      el.textContent = fmt ? fmt(val) : Math.round(val);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function animateBarWidth(el, toPct) {
    if (!el) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.style.width = toPct + "%"; return; }
    // setTimeout (não rAF): dá tempo do navegador pintar a largura antiga antes de
    // trocar pra nova, mas sem depender da aba estar em primeiro plano pra disparar
    setTimeout(function () { el.style.width = toPct + "%"; }, 20);
  }
  function runEntranceAnimations() {
    const ls = CQ.state.lastSeen;
    if (!ls) return;
    const elMoney = $("#cnt-money");
    if (elMoney) {
      const to = +elMoney.dataset.countTo;
      animateCount(elMoney, ls.money == null ? to : ls.money, to, 700, U.fmtBRL);
      ls.money = to;
    }
    const elFame = $("#cnt-fame");
    if (elFame) {
      const to = +elFame.dataset.countTo;
      animateCount(elFame, ls.fame == null ? to : ls.fame, to, 700);
      ls.fame = to;
    }
    document.querySelectorAll("[data-bar-to][id^='marco-bar-']").forEach(function (barEl) {
      const field = barEl.id.replace("marco-bar-", "");
      const to = +barEl.dataset.barTo;
      animateBarWidth(barEl.querySelector("i"), to);
      ls.marcos[field] = to;
    });
  }

  // BUG-06: rede de segurança pros escudos reais. onerror/onload (js/util.js) só pegam
  // bloqueio de REDE e imagem vazia. Faltavam dois casos que deixam um buraco em branco:
  // (a) filtro cosmético de bloqueador de anúncio — a imagem carrega de verdade, mas uma
  // regra CSS injetada a esconde, então nenhum dos dois eventos dispara; (b) requisição
  // que fica pendurada, sem carregar nem falhar. Esta varredura roda um instante após o
  // render e troca pelo brasão vetorial o que não apareceu de fato.
  function sweepCrests() {
    setTimeout(function () {
      // altura da janela: se não der pra saber (0/indisponível), NÃO pula nada — pular por
      // um viewport desconhecido faria a varredura inteira virar no-op silencioso
      const vh = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 0;
      document.querySelectorAll(".crest img[data-crest-club]").forEach(function (img) {
        const holder = img.parentElement;
        if (!holder) return;
        const box = holder.getBoundingClientRect();
        if (box.height === 0) return; // contêiner sem layout: nada a julgar ainda
        // fora da tela: loading="lazy" pode legitimamente não ter carregado ainda —
        // trocar aqui apagaria um escudo real que ia aparecer ao rolar a página
        if (vh > 0 && (box.bottom < 0 || box.top > vh)) return;
        const carregou = img.complete && img.naturalWidth >= 10;
        const r = img.getBoundingClientRect();
        const cs = window.getComputedStyle(img);
        const visivel = r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
        if (carregou && visivel) return;
        holder.outerHTML = U.crestSVGFallback(img.getAttribute("data-crest-club"), img.getAttribute("data-crest-cls") || "");
      });
    }, 1500);
  }

  const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function romano(n) {
    const map = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let out = ""; map.forEach(function (m) { while (n >= m[0]) { out += m[1]; n -= m[0]; } }); return out;
  }
  function mastheadHTML() {
    const G = g(), p = G.player;
    const navBtns = NAV.map(function (n) {
      return `<button class="${CQ.state.screen === n.id ? "on" : ""}" onclick="CQ.ui.go('${n.id}')">${n.icon}${n.label}</button>`;
    }).join("");
    const ed = G.year - 2025;
    return `<header class="masthead"><div class="masthead-inner">
      <div class="masthead-top">
        <div class="mh-side left">Ano <b>${romano(ed)}</b> · Nº ${ed}<br>Edição ${esc(D.LEAGUES[E().leagueOf(G, p.clubId)] ? D.LEAGUES[E().leagueOf(G, p.clubId)].country : "BR")} · Temporada ${G.year}</div>
        <div class="masthead-brand">CRAQUE<span class="dot">.</span></div>
        <div class="mh-side right"><span class="mh-tag">${esc(String(p.name).toUpperCase())}</span><br>${esc(E().myClub(G).name)} · ${D.POSITIONS[p.pos].name} · ${p.age} anos</div>
      </div>
      <nav class="mainnav">${navBtns}</nav>
    </div></header>`;
  }
  function bottomNavHTML() {
    return `<nav class="bottomnav">${NAV.map(function (n) {
      return `<button class="${CQ.state.screen === n.id ? "on" : ""}" onclick="CQ.ui.go('${n.id}')">${n.icon}<span>${n.label}</span></button>`;
    }).join("")}</nav>`;
  }

  // ---------------- capa ----------------
  function coverHTML() {
    const has = CQ.main.hasSave();
    return `<div class="cover">
      <div class="kicker" style="max-width:300px;width:100%">Edição especial · Modo carreira</div>
      <div class="cover-brand">CRAQUE<span class="dot">.</span></div>
      <div class="cover-sub">O boletim da sua carreira no futebol</div>
      <div class="cover-rule"></div>
      <p class="muted" style="max-width:460px">Da base ao topo do mundo: crie seu atleta, escolha seu clube e escreva uma história partida a partida — estaduais, Brasileirão, Libertadores, Europa e Seleção.</p>
      <div class="btnrow">
        <button class="btn btn-pri btn-big" onclick="CQ.ui.startCreate()">Nova carreira</button>
        ${has ? `<button class="btn btn-big" onclick="CQ.main.loadAndPlay()">Continuar carreira</button>` : ""}
        <button class="btn btn-ghost" onclick="CQ.main.importSave()">Importar save</button>
      </div>
      <div class="cover-foot">Roda 100% no seu navegador · progresso salvo localmente</div>
    </div>`;
  }

  // ---------------- criação ----------------
  function startCreate() {
    CQ.state.draft = {
      step: 0, name: "", age: 17, foot: "Destro", num: 10, natId: "BR",
      pos: "ATA", archId: "matador", legendIds: [], clubId: null
    };
    CQ.state.screen = "create";
    render();
  }

  function createHTML() {
    const d = CQ.state.draft;
    const steps = ["Identidade", "Posição", "Os Craques", "Clube"];
    let inner = "";
    if (d.step === 0) inner = createStep0(d);
    else if (d.step === 1) inner = createStep1(d);
    else if (d.step === 2) inner = createStep2(d);
    else inner = createStep3(d);
    return `<main class="page" style="max-width:860px">
      <div class="kicker mt12">Nova carreira · ${steps[d.step]}</div>
      <h1 class="headline mb12">Crie seu <em>craque</em></h1>
      <div class="steps">${steps.map(function (_, i) { return `<i class="${i <= d.step ? "done" : ""}"></i>`; }).join("")}</div>
      <div class="card"><div class="card-b">${inner}</div></div>
    </main>`;
  }

  function createStep0(d) {
    const nats = Object.keys(D.NATIONS).map(function (k) {
      const n = D.NATIONS[k];
      return `<button class="choice ${d.natId === k ? "sel" : ""}" onclick="CQ.ui.dset('natId','${k}')">${U.flagImg(n)}<b>${esc(n.name)}</b><small>${n.confed}</small></button>`;
    }).join("");
    return `
      <div class="field"><label>Nome do jogador</label>
        <input type="text" id="cr-name" maxlength="28" value="${esc(d.name)}" placeholder="Ex.: Kaio Ribeiro" oninput="CQ.state.draft.name=this.value"></div>
      <div class="cols" style="grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="field"><label>Idade inicial</label>
          <select onchange="CQ.ui.dset('age',+this.value)">${[16, 17, 18].map(function (a) { return `<option ${d.age === a ? "selected" : ""} value="${a}">${a} anos</option>`; }).join("")}</select>
          <small class="muted" style="display:block;margin-top:4px">Mais novo = mais temporadas de crescimento antes do declínio por idade.</small></div>
        <div class="field"><label>Pé preferido</label>
          <select onchange="CQ.ui.dset('foot',this.value)">${["Destro", "Canhoto", "Ambidestro"].map(function (f) { return `<option ${d.foot === f ? "selected" : ""}>${f}</option>`; }).join("")}</select>
          <small class="muted" style="display:block;margin-top:4px">Só estética — aparece no seu perfil, sem efeito nos atributos.</small></div>
        <div class="field"><label>Número da camisa</label>
          <input type="number" min="1" max="99" value="${d.num}" onchange="CQ.ui.dset('num',Math.max(1,Math.min(99,+this.value||10)))"></div>
      </div>
      <div class="field"><label>Nacionalidade</label><div class="choice-grid">${nats}</div></div>
      <div class="btnrow mt12"><button class="btn btn-pri" onclick="CQ.ui.createNext()">Continuar ${""}</button></div>`;
  }

  function createStep1(d) {
    const posBtns = Object.keys(D.POSITIONS).map(function (k) {
      const P = D.POSITIONS[k];
      return `<button class="choice ${d.pos === k ? "sel" : ""}" onclick="CQ.ui.dsetPos('${k}')"><b>${P.name}</b><small>${k}</small></button>`;
    }).join("");
    const archs = D.POSITIONS[d.pos].archs.map(function (a) {
      return `<button class="choice ${d.archId === a.id ? "sel" : ""}" onclick="CQ.ui.dset('archId','${a.id}')"><b>${a.name}</b><small>${a.desc}</small></button>`;
    }).join("");
    return `
      <div class="field"><label>Posição</label><div class="choice-grid">${posBtns}</div></div>
      <div class="field"><label>Arquétipo de ${D.POSITIONS[d.pos].name}</label><div class="choice-grid">${archs}</div></div>
      <div class="btnrow mt12">
        <button class="btn btn-ghost" onclick="CQ.ui.dset('step',0)">Voltar</button>
        <button class="btn btn-pri" onclick="CQ.ui.createNext()">Continuar</button>
      </div>`;
  }

  function createStep2(d) {
    const legends = D.LEGENDS.map(function (L) {
      const on = d.legendIds.indexOf(L.id) >= 0;
      return `<button class="choice ${on ? "sel" : ""}" onclick="CQ.ui.toggleLegend('${L.id}')"><b>${esc(L.name)}</b><small>${esc(L.trait)}</small></button>`;
    }).join("");
    return `
      <p class="muted mb12">Escolha até <b>3 lendas</b> que inspiram seu jogo. O traço de cada uma empurra seus atributos naquela direção.</p>
      <div class="choice-grid">${legends}</div>
      <p class="condsmall mt12">${d.legendIds.length}/3 selecionados</p>
      <div class="btnrow mt12">
        <button class="btn btn-ghost" onclick="CQ.ui.dset('step',1)">Voltar</button>
        <button class="btn btn-pri" onclick="CQ.ui.createNext()">Continuar</button>
      </div>`;
  }

  // clubes elegíveis pra COMEÇAR a carreira: só pequenos/médios (força <= 79) — os
  // grandes/tradicionais ficam de fora de propósito. Começar num clube forte com overall
  // baixo de estreante prende o jogador no banco (confiança do técnico cai por não
  // jogar, o que reduz ainda mais a chance de jogar — ver benchRoll/bumpConf,
  // js/engine.js); clubes grandes continuam alcançáveis depois, pelo sistema de ofertas
  // que já existe (makeOffers/acceptOffer) conforme o jogador se destaca.
  function startClubPool() {
    return D.clubsOf("BRA").filter(function (c) { return c.str <= 79; });
  }
  function createStep3(d) {
    const clubs = startClubPool().map(function (c) {
      return `<button class="choice ${d.clubId === c.id ? "sel" : ""}" onclick="CQ.ui.dset('clubId','${c.id}')">
        <span style="float:right">${crest(c, "crest-24")}</span><b>${esc(c.name)}</b><small>Força ${c.str} · ${c.uf}</small></button>`;
    }).join("");
    return `
      <p class="muted mb12">Onde começa a história? Comece pequeno — os grandes clubes da
      Série A te chamam com o tempo, conforme você se destaca, pelo próprio mercado de
      transferências. Ou deixe o destino escolher.</p>
      <div class="btnrow mb12"><button class="btn btn-sm" onclick="CQ.ui.randomClub()">Clube aleatório</button></div>
      <div class="choice-grid">${clubs}</div>
      <div class="btnrow mt16">
        <button class="btn btn-ghost" onclick="CQ.ui.dset('step',2)">Voltar</button>
        <button class="btn btn-green btn-big" onclick="CQ.ui.finishCreate()">Começar carreira</button>
      </div>`;
  }

  function dset(k, v) { CQ.state.draft[k] = v; render(); }
  function dsetPos(k) {
    CQ.state.draft.pos = k;
    CQ.state.draft.archId = D.POSITIONS[k].archs[0].id;
    render();
  }
  function toggleLegend(id) {
    const arr = CQ.state.draft.legendIds;
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1);
    else if (arr.length < 3) arr.push(id);
    render();
  }
  function randomClub() {
    CQ.state.draft.clubId = U.choice(startClubPool()).id;
    render();
  }
  function createNext() {
    const d = CQ.state.draft;
    if (d.step === 0) {
      d.name = U.cleanInput(d.name, 28);
      if (!d.name || d.name.length < 2) { toast("Escolha um nome para o seu jogador."); return; }
    }
    d.step++;
    render();
  }
  function finishCreate() {
    const d = CQ.state.draft;
    if (!d.clubId) { toast("Escolha um clube para começar."); return; }
    const game = E().newGame({
      name: d.name, age: d.age, foot: d.foot, num: d.num, natId: d.natId,
      pos: d.pos, archId: d.archId, legendIds: d.legendIds, clubId: d.clubId
    });
    CQ.state.game = game;
    CQ.nar.post(game, "imprensa", "Promessa na área: o " + E().myClub(game).name + " assina com " + game.player.name + ", " + game.player.age + " anos, apontado como um dos nomes mais quentes da base.", { hot: true });
    CQ.main.save();
    go("home");
  }

  // ---------------- HOME (primeira página) ----------------
  function leadHeadline(fx) {
    const me = fx.myTeam.name, opp = fx.opp.name;
    const recebe = fx.home ? "recebe" : "visita";
    if (fx.stage === "F") return `É a final: ${me} decide o título diante do ${opp}`;
    if (fx.rivalDuel) return `${me} e ${opp} reeditam o duelo de gerações`;
    if (fx.classic) return fx.home ? `Clássico em casa: ${me} recebe o ${opp}` : `${me} encara o ${opp} em clássico fora`;
    if (fx.knock) return `Mata-mata: ${me} ${recebe} o ${opp} valendo a vaga`;
    if (fx.isNatMatch) return `Seleção em campo: ${me} enfrenta ${opp}`;
    if (fx.decisive) return `Jogo grande: ${me} ${recebe} o poderoso ${opp}`;
    return `${me} ${recebe} o ${opp} por mais três pontos`;
  }
  function leadDeck(G, fx) {
    const p = G.player, S = G.season;
    const bits = [];
    const L = S.comps.LIGA;
    const table = E().tableOf(G, L);
    const myIdx = table.findIndex(function (t) { return t.id === p.clubId; });
    if (myIdx >= 0 && table[myIdx].j > 0) bits.push(`O ${esc(E().myClub(G).name)} ocupa a ${myIdx + 1}ª posição na liga`);
    const last5 = (S.history || []).slice(-5);
    if (last5.length) {
      const v = last5.filter(function (h) { return h.win; }).length;
      bits.push(`${v} ${U.plural(v, "vitória", "vitórias")} nos últimos ${last5.length} jogos`);
    }
    if (fx.home) bits.push("mando de campo"); else bits.push("longe de seus domínios");
    return bits.join(" · ") + ".";
  }

  // descreve a atuação com as estatísticas próprias da posição
  function atuacaoBits(lr) {
    const bits = [];
    if (lr.pg) bits.push(`<b>${lr.pg} ${U.plural(lr.pg, "gol", "gols")}</b>`);
    if (lr.pa) bits.push(lr.pa + " assist.");
    if (lr.isGK) {
      bits.push(lr.saves + " defesas");
      if (lr.bigSaves) bits.push(lr.bigSaves + " defesaça" + (lr.bigSaves > 1 ? "s" : ""));
      if (lr.go === 0) bits.push("sem sofrer gol");
    } else {
      if (lr.tackles) bits.push(lr.tackles + " desarmes");
      if (lr.intercepts) bits.push(lr.intercepts + " interceptações");
      if (lr.clearances) bits.push(lr.clearances + " cortes");
      if (lr.keyPasses) bits.push(lr.keyPasses + " passes decisivos");
    }
    if (lr.error) bits.push('<span class="verm">falha no gol</span>');
    if (!lr.starts && lr.plays) bits.push("entrou no 2º tempo");
    return bits;
  }

  // agrupa squadOf por posição e monta uma escalação provável (11 nomes), encaixando
  // o próprio jogador na sua posição quando ele está disponível pra jogar
  function probableLineup(G, fx) {
    const p = G.player;
    const isNat = !!(fx && fx.isNatMatch);
    const buckets = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2, PON: 1, ATA: 1 };
    let squad;
    if (isNat) {
      // jogo de Seleção: NUNCA usar o elenco do clube (bug antigo) — elenco real da
      // seleção quando disponível (NAT_SQUADS), senão gerador procedural com o
      // "sotaque" de nome da própria nacionalidade
      const real = D.NAT_SQUADS && D.NAT_SQUADS[p.nat];
      if (real) {
        squad = real.map(function (j) { return { name: j.n, pos: j.p }; });
      } else {
        const rng = U.rngFor(G.seed, "natsquad", p.nat);
        const POSN = ["GOL", "GOL", "ZAG", "ZAG", "ZAG", "LAT", "LAT", "VOL", "VOL", "MEI", "MEI", "PON", "PON", "ATA", "ATA"];
        squad = POSN.map(function (pos) { return { name: U.nameGen(rng, p.nat), pos: pos }; });
      }
    } else {
      squad = squadOf(G);
    }
    const out = [];
    Object.keys(buckets).forEach(function (pos) {
      out.push.apply(out, squad.filter(function (j) { return j.pos === pos; }).slice(0, buckets[pos]));
    });
    const dGrp = !isNat && fx && p.disc && p.disc[CQ.engine.discGroup(fx)];
    const suspHere = !!(dGrp && dGrp.susp > 0);
    if (p.injury === 0 && (!suspHere || isNat)) {
      const idx = out.findIndex(function (j) { return j.pos === p.pos; });
      const me = { name: p.name, pos: p.pos, ov: p.overall, isMe: true };
      if (idx >= 0) out[idx] = me; else out.push(me);
    }
    return out;
  }

  // banner de ritual pré-jogo: clima/torcida deterministicamente sorteados (mesma
  // seed a cada render, pra não "piscar" enquanto a partida ainda não foi jogada) +
  // escalação provável — 100% flavor, não afeta simulação nem CTA
  function matchdayBanner(G, fx) {
    const p = G.player;
    const rng = U.rngFor(G.seed, "matchday", G.year, G.season.idx);
    const big = !!(fx.classic || fx.rivalDuel || fx.decisive || fx.knock || fx.stage === "F");
    const last5 = (G.season.history || []).slice(-5);
    const wins = last5.filter(function (h) { return h.win; }).length;
    const goodForm = last5.length >= 3 && wins >= Math.ceil(last5.length * 0.6);
    const badForm = last5.length >= 3 && wins <= Math.floor(last5.length * 0.2);

    const bigPool = [
      "O clima no entorno do estádio já é de decisão — bandeiras e cânticos desde cedo.",
      "A torcida lota os arredores horas antes; hoje não é um jogo qualquer.",
      "Imprensa lotada, tensão no ar: é o tipo de jogo que fica na memória.",
      "Faltam poucas horas — já dá pra sentir o peso da partida no ar."
    ];
    const calmPool = [
      "Tarde de sol ameno, movimento tranquilo nos arredores do estádio.",
      "Noite fria, torcida de sempre chegando aos poucos às catracas.",
      "Céu limpo, expectativa normal de rodada — mais um capítulo da temporada.",
      "Chuva fina no horizonte, mas nada que assuste quem já está a caminho do estádio."
    ];
    const weather = U.choice(big ? bigPool : calmPool, rng);

    let mood;
    if (big && goodForm) mood = "A torcida chega confiante — o time embalado por uma boa sequência.";
    else if (big && badForm) mood = "Ambiente tenso: a torcida cobra uma resposta depois de resultados ruins.";
    else if (p.morale >= 75) mood = "Moral alta no elenco depois das últimas atuações.";
    else if (p.morale < 40) mood = "Grupo abalado — a cobrança aumenta a cada rodada.";
    else if (goodForm) mood = "Boa fase recente mantém o ambiente positivo no clube.";
    else if (badForm) mood = "A sequência ruim deixa a torcida impaciente.";
    else mood = "Ambiente normal de rodada, sem climas especiais.";

    const lineupHTML = probableLineup(G, fx).map(function (j) {
      return `<span class="badge ${j.isMe ? "badge-gold" : "badge-soft"}">${j.pos} ${esc(j.name.split(" ")[0])}</span>`;
    }).join(" ");

    return `<div class="notice mt12" style="border-left-color:var(--gold)">
      <div class="small">${esc(weather)} ${esc(mood)}</div>
      <div class="mt8" style="display:flex;gap:6px;flex-wrap:wrap">${lineupHTML}</div>
    </div>`;
  }

  function homeHTML() {
    const G = g(), p = G.player, S = G.season;
    // valor "antigo" pra nascer no HTML e a animação de contagem ter de onde partir
    // (sem isso, o texto já nasceria no valor final e o requestAnimationFrame pularia
    // pra trás antes de recomeçar a contagem — um flash visual, não uma animação limpa)
    const fromMoney = CQ.state.lastSeen.money == null ? p.money : CQ.state.lastSeen.money;
    const fromFame = CQ.state.lastSeen.fame == null ? Math.round(p.fame) : CQ.state.lastSeen.fame;
    const fx = E().currentFixture(G);
    if (fx) CQ.nar.preMatch(G, fx);
    if (!G.season.drawShown) setTimeout(function () { maybeDrawCeremony(G); }, 80);

    // ---- MANCHETE (lead) ----
    let lead;
    if (!fx) {
      lead = `<div class="lead">
        <div class="lead-kicker">Fim de temporada ${G.year}</div>
        <h1 class="lead-head">O apito final soou. Hora do balanço.</h1>
        <p class="lead-deck">Prêmios individuais, metas da diretoria, mercado da bola e o rumo da próxima temporada esperam por você.</p>
        <div class="lead-cta"><div class="btnrow"><button class="btn btn-pri btn-big" onclick="CQ.ui.seasonEndFlow()">Ver balanço da temporada ${I.arrowR}</button></div></div>
      </div>`;
    } else {
      const parts = esc(fx.label).split(" · ");
      const comp = parts[0], sub = parts.slice(1).join(" · ");
      const notices = [];
      if (p.injury > 0) notices.push(`<div class="notice">${I.injury} Lesionado — fora por aproximadamente <b>${p.injury}</b> ${U.plural(p.injury, "jogo", "jogos")}. Você não entra em campo.</div>`);
      const discHere = !fx.isNatMatch && p.disc && p.disc[CQ.engine.discGroup(fx)];
      if (discHere && discHere.susp > 0) notices.push(`<div class="notice warn">Suspenso — cumpre ${discHere.susp} ${U.plural(discHere.susp, "jogo", "jogos")} de gancho nesta competição.</div>`);
      if (p.condition < 40) notices.push(`<div class="notice warn">Condição física baixa (${Math.round(p.condition)}%). Risco de lesão elevado — considere poupar.</div>`);
      // pode jogar? mesma checagem que resolveMatch usa de verdade (canPlay, engine.js) —
      // aqui só decide o RÓTULO do botão principal, não o resultado.
      const canPlayHere = p.injury <= 0 && (fx.isNatMatch || !discHere || discHere.susp <= 0);
      // botão principal: mata-mata (decisivo ou não) já entra direto no modo Ao Vivo —
      // não existe mais um botão "Ao vivo" separado. Jogo comum vira "Acompanhar
      // partida" quando o jogador não pode entrar em campo (lesão/suspensão).
      const playLabel = fx.decisive ? "Entrar em campo — ao vivo"
        : fx.knock ? "Jogar a partida — ao vivo"
        : canPlayHere ? "Jogar a partida" : "Acompanhar partida";
      // status antes da partida: Titular/Banco/Fora da lista. Reconstrói o MESMO RNG
      // que resolveMatch vai usar de verdade (mesma seed+chaves) só pra espiar o
      // resultado de benchRoll — seguro pro determinismo porque rngFor sempre recria um
      // gerador novo a partir da seed, nunca compartilha posição com a resolução real
      // que vai rolar depois quando o jogador de fato clicar em jogar.
      let statusBadge = `<span class="badge badge-verm">Fora da lista</span>`;
      if (canPlayHere) {
        const previewRng = U.rngFor(G.seed, "match", G.year, (G.season && G.season.idx) || 0);
        const bench = E().benchRoll(G, fx, previewRng);
        statusBadge = bench.starts ? `<span class="badge badge-gold">Titular</span>`
          : bench.minutes > 0 ? `<span class="badge">Banco — deve entrar</span>`
          : `<span class="badge badge-soft">Banco</span>`;
      }
      lead = `<div class="lead">
        <div class="lead-kicker">${comp}${sub ? " — " + sub : ""}${fx.decisive ? '<span class="live-flag">Ao vivo</span>' : ""}</div>
        <h1 class="lead-head">${esc(leadHeadline(fx))}</h1>
        <p class="lead-deck">${leadDeck(G, fx)}</p>
        <div class="lead-matchup">
          <div class="lm-team">${crest(fx.home ? fx.myTeam : fx.opp, "")}<span class="lm-name">${esc(fx.home ? fx.myTeam.name : fx.opp.name)}</span><span class="lm-role">Mandante</span></div>
          <div class="lm-vs">×</div>
          <div class="lm-team">${crest(fx.home ? fx.opp : fx.myTeam, "")}<span class="lm-name">${esc(fx.home ? fx.opp.name : fx.myTeam.name)}</span><span class="lm-role">Visitante</span></div>
        </div>
        <p class="mt8">Você: ${statusBadge}</p>
        ${matchdayBanner(G, fx)}
        ${notices.length ? `<div class="stack mt12" style="gap:8px">${notices.join("")}</div>` : ""}
        <div class="lead-cta"><div class="btnrow">
          <button class="btn btn-pri btn-big" onclick="CQ.ui.actionPlay()">${playLabel}</button>
          <button class="btn btn-gold" onclick="CQ.ui.actionRest()">Poupar</button>
          <button class="btn btn-ghost" onclick="CQ.ui.actionSim(1)">Simulação rápida</button>
          <button class="btn btn-ghost" onclick="CQ.ui.actionSim(5)">Simular 5</button>
          <button class="btn btn-ghost" onclick="CQ.ui.actionSim(10)">Simular 10</button>
        </div></div>
      </div>`;
    }

    // ---- TICKER de resultados ----
    const hist = (S.history || []).slice(-12).reverse();
    let ticker = "";
    if (hist.length) {
      const items = hist.map(function (h) {
        const r = h.win ? "win" : h.draw ? "" : "loss";
        const pill = h.win ? "V" : h.draw ? "E" : "D";
        const a = h.home ? h.gm : h.go, b = h.home ? h.go : h.gm;
        return `<div class="ticker-item ${r}"><span class="result-pill ${pill}">${pill}</span><span>${h.home ? "" : "@ "}${esc(h.opp)}</span><span class="ti-sc">${a}-${b}</span></div>`;
      }).join("");
      ticker = `<div class="ticker"><div class="ticker-label">Últimos jogos</div><div class="ticker-track">${items}</div></div>`;
    }

    // ---- BOX-SCORE (última partida) ----
    let boxscore = "";
    const lr = S.lastRes;
    if (lr) {
      const f2 = lr.fixture;
      const hg = f2.home ? lr.gm : lr.go, ag = f2.home ? lr.go : lr.gm;
      const so = lr.shootout ? ` <span class="muted">(${lr.shootout.my}-${lr.shootout.opp} nos pênaltis)</span>` : "";
      let mine = "";
      if (lr.rest) mine = `<span class="badge badge-soft">Você foi poupado</span>`;
      else if (!lr.plays) mine = `<span class="badge badge-soft">${lr.injured ? "Você estava lesionado" : lr.susp ? "Você estava suspenso" : "Você ficou no banco"}</span>`;
      else {
        mine = `${notaPill(lr.nota)} <span>Sua atuação: ${atuacaoBits(lr).join(" · ") || "discreta"}</span>`;
      }
      boxscore = `<div class="boxscore">
        <div class="boxscore-h"><span>Placar da rodada</span><span>${esc(f2.label)}</span></div>
        <div class="boxscore-b">
          <div class="bs-team">${crest(f2.home ? f2.myTeam : f2.opp, "crest-34")}<span class="bs-tn">${esc(f2.home ? f2.myTeam.name : f2.opp.name)}</span></div>
          <div class="bs-score">${hg} <span class="muted">×</span> ${ag}</div>
          <div class="bs-team away"><span class="bs-tn">${esc(f2.home ? f2.opp.name : f2.myTeam.name)}</span>${crest(f2.home ? f2.opp : f2.myTeam, "crest-34")}</div>
        </div>
        <div class="boxscore-line"><span>${mine}</span><span>${so}</span></div>
      </div>`;
    }

    // ---- diretoria (faixa) ----
    const metaCard = `<div class="card"><div class="card-h"><h3>Diretoria &amp; contrato</h3>${G.boardFail > 0 ? '<span class="kicker-side verm">Meta falhada na última temporada</span>' : ""}</div><div class="card-b">
      <div class="flex-b wrap mb8"><span class="small">${I.whistle} Meta da temporada: <b>${esc(G.board.desc)}</b></span></div>
      <div class="tiles">
        <div class="tile"><b class="tnum">${U.fmtBRL(p.salary)}</b><span>Salário/mês</span></div>
        <div class="tile"><b class="tnum" id="cnt-money" data-count-to="${p.money}">${U.fmtBRL(fromMoney)}</b><span>Patrimônio</span></div>
        <div class="tile"><b class="tnum">${p.contractEnd}</b><span>Fim contrato</span></div>
      </div></div></div>`;

    // ---- RAIL: dossiê do jogador ----
    // "Forma recente" (V/E/D dos últimos jogos) foi removida daqui — o Ticker (acima, na
    // coluna principal) já mostra os últimos 12 resultados com placar e adversário, mais
    // completo que os pills soltos que ficavam aqui; duas visões da mesma coisa na mesma
    // tela era redundância, não reforço.
    const st = p.stats;
    const dossier = `<div>
      <div class="section-banner"><span class="sb-title">O Craque</span><span class="sb-meta">Ficha do atleta</span></div>
      <div class="card" style="border-top:none">
        <div class="card-b">
          <div class="flex" style="align-items:center;gap:14px">
            <div class="player-face" style="width:72px;height:72px;flex-shrink:0">${U.portraitSVG(p.name + G.seed, 72)}</div>
            <div style="flex:1;min-width:0">
              <div class="dossier-name">${esc(p.name)}</div>
              <div class="dossier-sub">${D.POSITIONS[p.pos].name} · ${p.age} anos · nº ${p.num}</div>
            </div>
            <div style="text-align:right"><div class="dossier-ov">${p.overall}</div><div class="dossier-sub">Overall</div></div>
          </div>
          <hr class="rule">
          <div class="meter-lbl"><span>Potencial ${p.pot}</span><span>Fama <b id="cnt-fame" data-count-to="${Math.round(p.fame)}">${fromFame}</b></span></div>${bar(p.overall, 100, false, p.pot)}
          <div class="meter-lbl mt8"><span>Condição</span><span class="tnum">${Math.round(p.condition)}%</span></div>${bar(p.condition, 100, p.condition < 40)}
          <div class="meter-lbl mt8"><span>Moral</span><span class="tnum">${Math.round(p.morale)}%</span></div>${bar(p.morale, 100, p.morale < 35)}
          <hr class="rule">
          <div class="tiles">
            <div class="tile"><b class="tnum">${st.j}</b><span>Jogos</span></div>
            ${p.pos === "GOL"
        ? `<div class="tile"><b class="tnum">${st.cs}</b><span>Sem sofrer</span></div><div class="tile"><b class="tnum">${st.saves}</b><span>Defesas</span></div>`
        : `<div class="tile"><b class="tnum">${st.g}</b><span>Gols</span></div><div class="tile"><b class="tnum">${st.a}</b><span>Assist.</span></div>`}
            <div class="tile"><b class="tnum">${st.notaN ? U.fmtNota(st.notaSum / st.notaN) : "—"}</b><span>Nota</span></div>
          </div>
          ${p.takerPen ? '<p class="condsmall mt8">' + I.ball + ' Cobrador oficial de pênaltis</p>' : ""}
        </div>
      </div></div>`;

    // ---- RAIL: standings agate (competição em disputa) ----
    let L = S.comps.LIGA;
    if (fx && fx.compKey === "EST" && S.comps.EST) L = S.comps.EST;
    else if (S.comps.LIGA && E().tableOf(G, S.comps.LIGA)[0].j === 0 && S.comps.EST) L = S.comps.EST;
    const table = E().tableOf(G, L);
    const myIdx = table.findIndex(function (t) { return t.id === p.clubId; });
    const from = U.clamp(myIdx - 2, 0, Math.max(0, table.length - 5));
    const rows = table.slice(from, from + 5).map(function (t, i) {
      const pos = from + i + 1;
      return `<tr class="${t.id === p.clubId ? "me" : ""}"><td class="tnum">${pos}</td><td><span class="clubcell">${crest(t.id, "crest-20")} ${esc(CQ.engine.oppObj(G, t.id).short)}</span></td><td class="num">${t.j}</td><td class="num"><b>${t.pts}</b></td></tr>`;
    }).join("");
    const standings = `<div>
      <div class="section-banner"><span class="sb-title">Classificação</span><span class="sb-meta">${esc(L.name)}</span></div>
      <div class="card" style="border-top:none"><div class="card-b tight"><table class="tbl"><thead><tr><th>#</th><th>Clube</th><th class="num">J</th><th class="num">Pts</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div style="padding:8px 14px;border-top:1px solid var(--rule-soft)"><button class="btn btn-sm btn-block" onclick="CQ.ui.go('comps')">Ver tabela completa</button></div></div></div>`;

    // ---- RAIL: nas redes ----
    const posts = G.feed.slice(0, 3).map(postHTML).join("") || '<div class="card-b muted small">Nada por aqui ainda.</div>';
    const feedCard = `<div>
      <div class="section-banner"><span class="sb-title">Nas redes</span><button class="btn btn-sm" style="box-shadow:none;border-color:var(--newsprint);color:var(--newsprint);background:transparent" onclick="CQ.ui.go('feed')">Tudo</button></div>
      <div class="card" style="border-top:none"><div class="card-b tight">${posts}</div></div></div>`;

    return `<div class="frontpage">
      <div class="fp-main">${lead}${ticker}${boxscore}${metaCard}</div>
      <aside class="fp-rail">${dossier}${standings}${feedCard}</aside>
    </div>`;
  }

  // ---------------- ações de jogo ----------------
  // entra no modo ao vivo de fato (com o aviso de primeira vez). `voltar` é a ação que o
  // botão do aviso dispara — assim o mesmo aviso serve pra qualquer partida de mata-mata.
  function startLive(G, fx, voltar) {
    if (!G.player.seenLiveIntro) {
      G.player.seenLiveIntro = true;
      CQ.main.save();
      overlay(`<div class="card"><div class="card-h"><h3>Modo ao vivo</h3></div>
        <div class="card-b">
          <p>Esta partida você acompanha <b>minuto a minuto</b>: lances, decisões e,
          se empatar, os pênaltis, tudo em tempo real — diferente das partidas normais,
          que são resolvidas com um clique.</p>
          <p class="small muted">Toda partida de mata-mata (final ou não) já entra ao
          vivo direto pelo botão de jogar — jogos normais de liga continuam resolvendo
          num clique só.</p>
        </div>
        <div class="card-b" style="padding-top:0">
          <button class="btn btn-pri btn-block" onclick="${voltar}">Entendi, vamos lá</button>
        </div></div>`);
      return;
    }
    CQ.state.live = CQ.live.buildLive(G, fx);
    renderLiveOverlay(true);
  }

  function actionPlay() {
    const G = g();
    const fx = E().currentFixture(G);
    if (!fx) { seasonEndFlow(); return; }
    // qualquer mata-mata (decisivo ou não) já entra direto ao vivo pelo botão
    // principal — não existe mais um botão "Ao vivo" separado (era redundante).
    if (fx.decisive || fx.knock) { startLive(G, fx, "CQ.ui.actionPlay()"); return; }
    const res = E().resolveMatch(G, fx, {});
    E().applyMatch(G, res);
    CQ.main.save();
    render();
    afterMatchFlow(res);
  }

  // ainda exportada por compatibilidade (nenhum botão chama mais — actionPlay já cobre
  // qualquer mata-mata), mantém o mesmo comportamento caso algo externo dependa dela.
  function actionPlayLive() {
    const G = g();
    const fx = E().currentFixture(G);
    if (!fx) { seasonEndFlow(); return; }
    startLive(G, fx, "CQ.ui.actionPlayLive()");
  }

  function actionRest() {
    const G = g();
    const fx = E().currentFixture(G);
    if (!fx) { seasonEndFlow(); return; }
    const res = E().resolveMatch(G, fx, { rest: true });
    E().applyMatch(G, res);
    CQ.main.save();
    render();
    toast("Você foi poupado. Condição física recuperada.");
    checkSeasonOver();
  }

  function actionSim(n) {
    const G = g();
    for (let i = 0; i < n; i++) {
      const fx = E().currentFixture(G);
      if (!fx) break;
      const res = E().resolveMatch(G, fx, {});
      E().applyMatch(G, res);
    }
    CQ.main.save();
    render();
    checkSeasonOver();
  }

  function checkSeasonOver() {
    if (!E().currentFixture(g())) {
      // deixa o herói de fim de temporada aparecer na home
      if (CQ.state.screen !== "home") go("home");
    }
  }

  // ---------------- CAPA DE JORNAL (momento marcante) ----------------
  // decide se a partida merece uma capa e monta o conteúdo (prioridade: título > marco > hat-trick > estreia)
  function buildFrontPage(G, res) {
    if (!res.plays) return null;
    const p = G.player, fx = res.fixture;
    const meName = fx.isNatMatch ? fx.myTeam.name : E().myClub(G).name;
    const first = String(p.name).split(" ")[0];
    const NAME = String(p.name).toUpperCase();
    const statline = function () {
      const s = [];
      if (res.pg) s.push({ n: res.pg, l: res.pg > 1 ? "Gols" : "Gol" });
      if (res.pa) s.push({ n: res.pa, l: "Assist." });
      if (res.isGK) s.push({ n: res.saves, l: "Defesas" });
      s.push({ n: fx.home ? res.gm + "-" + res.go : res.go + "-" + res.gm, l: "Placar" });
      s.push({ n: U.fmtNota(res.nota), l: "Nota" });
      return s;
    };
    const cap = function (kicker, headline, deck, tag) {
      return { kicker: kicker, headline: headline, deck: deck, tag: tag, seed: p.name + G.seed, stats: statline() };
    };

    // marco histórico (gols de carreira)
    if (res.milestones && res.milestones.length) {
      const m = res.milestones.find(function (x) { return x.field === "goals" && x.n >= 50; }) || res.milestones[0];
      if (m.field === "goals" && m.n >= 50) {
        return cap("Números de lenda · " + G.year, esc(NAME) + ": <em>" + m.n + "</em> gols na carreira",
          "Mais uma página escrita. " + first + " atinge a marca de " + m.n + " gols como profissional e entra de vez para a galeria dos grandes goleadores.",
          "MARCO");
      }
    }
    // hat-trick
    if (res.hatTrick) {
      return cap("Noite inesquecível · " + G.year, "<em>TRINCA!</em> " + esc(first) + " decide sozinho",
        "Três vezes a rede balançou com a assinatura do camisa " + p.num + ". " + meName + " " + (fx.home ? res.gm + " a " + res.go : res.go + " a " + res.gm) + " e um espetáculo que ninguém no estádio vai esquecer.",
        "HAT-TRICK");
    }
    // estreia profissional (primeiro jogo da carreira)
    if (p.stats.j === 1 && p.career.length === 0) {
      return cap("Nasce uma promessa · " + G.year, "O primeiro capítulo de <em>" + esc(first) + "</em>",
        "A camisa " + p.num + " do " + meName + " ganha um novo dono. Aos " + p.age + " anos, " + first + " faz sua estreia no profissional — o começo de uma história que promete.",
        "ESTREIA");
    }
    return null;
  }

  function showFrontPage(capa, next) {
    CQ.state.afterCapa = next;
    const statsHTML = capa.stats.map(function (s) {
      return `<div class="ci-stat"><b class="tnum">${esc(String(s.n))}</b><span>${esc(s.l)}</span></div>`;
    }).join("");
    const ed = g().year - 2025;
    overlay(`<div class="capa">
      <div class="capa-mast">
        <div class="cm-brand">CRAQUE<span class="dot">.</span></div>
        <div class="cm-date"><b>EDIÇÃO EXTRA</b> · ${g().year}<br>Ano ${ed} · O boletim da sua carreira</div>
      </div>
      <div class="capa-kicker">${esc(capa.kicker)}</div>
      <h1 class="capa-headline">${capa.headline}</h1>
      <div class="capa-body">
        <div class="capa-photo">
          <div class="cp-frame">${U.portraitSVG(capa.seed, 200)}</div>
          <div class="cp-cap">${esc(g().player.name)} · ${esc(capa.tag)}</div>
        </div>
        <div class="capa-deck">
          <p class="cd-text">${esc(capa.deck)}</p>
          <div class="capa-infobox"><div class="ci-h">A ficha da partida</div><div class="ci-b">${statsHTML}</div></div>
        </div>
      </div>
      <div class="capa-foot">
        <span class="cf-note">Guarde esta capa — momentos assim não se repetem</span>
        <button class="btn btn-pri btn-big" onclick="CQ.ui.closeCapa()">Seguir a história ${I.arrowR}</button>
      </div>
    </div>`, true);
    const box = $("#cq-overlay .overlay-box");
    if (box) { box.style.background = "transparent"; box.style.border = "none"; box.style.boxShadow = "none"; }
  }
  function closeCapa() {
    closeOverlay();
    const next = CQ.state.afterCapa;
    CQ.state.afterCapa = null;
    if (next) next();
  }

  function afterMatchFlow(res) {
    const G = g();
    // momento marcante → capa de jornal em tela cheia (antes de tudo)
    const capa = buildFrontPage(G, res);
    if (capa) { showFrontPage(capa, function () { afterMatchInterview(res); }); return; }
    afterMatchInterview(res);
  }
  function afterMatchInterview(res) {
    const G = g();
    if (res.hatTrick) toast("HAT-TRICK! Três gols numa partida.");
    if (res.milestones && res.milestones.length) toast("Marco batido: " + res.milestones[0].n + " " + res.milestones[0].label + "!");
    if (res.injuryNew) toast(`Lesão: você fica fora por aproximadamente ${res.injuryNew} ${res.injuryNew === 1 ? "jogo" : "jogos"}.`);
    // jogo importante: coletiva de 3 perguntas no lugar da entrevista de 1 pergunta —
    // as duas juntas ficariam repetitivas pro mesmo jogo
    const pc = res.fixture.decisive ? CQ.nar.maybePressConference(G, res) : null;
    if (pc) { showPressConference(pc); return; }
    const itv = CQ.nar.maybeInterview(G, res);
    if (itv) { showInterview(itv, res); return; }
    afterInterview();
  }
  function afterInterview() {
    const G = g();
    const ev = CQ.nar.maybeLifeEvent(G);
    if (ev) { showLifeEvent(ev); return; }
    CQ.main.save();
    checkSeasonOver();
  }

  // ---------------- overlays genéricos ----------------
  function overlay(html, wide) {
    closeOverlay();
    const div = document.createElement("div");
    div.className = "overlay";
    div.id = "cq-overlay";
    div.innerHTML = `<div class="overlay-box ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(div);
    // acessibilidade: foca o primeiro controle acionável do diálogo
    const first = div.querySelector("button, a, input, select, .dc-opt, .choice, .shoot-slot");
    if (first && first.focus) { try { first.focus(); } catch (e) { } }
    sweepCrests(); // overlays (sorteio de grupos, capa, mercado) não passam por render()
  }
  function closeOverlay() {
    const o = $("#cq-overlay");
    if (o) o.remove();
    // o confete NÃO é removido aqui (ele acompanha a celebração e se auto-remove em ~5s)
  }

  // ---------------- entrevista ----------------
  // chips de efeito coloridos (verde = ganho, vermelho = perda, dourado = dinheiro)
  function fxChips(fx) {
    const c = [];
    function chip(v, label) { if (v) c.push(`<span class="fxchip ${v > 0 ? "up" : "down"}">${v > 0 ? "+" : ""}${v} ${label}</span>`); }
    chip(fx.rep, "reputação"); chip(fx.fame, "fama"); chip(fx.morale, "moral"); chip(fx.cond, "condição");
    if (fx.money) c.push(`<span class="fxchip ${fx.money > 0 ? "money" : "down"}">${fx.money > 0 ? "+" : ""}${U.fmtBRL(fx.money)}</span>`);
    return c.length ? `<div class="o2-fx">${c.join("")}</div>` : "";
  }

  function showInterview(itv, res) {
    CQ.state.itv = itv;
    const opts = itv.options.map(function (o, i) {
      return `<button class="opt2" onclick="CQ.ui.pickInterview(${i})">
        <span class="o2-label">${esc(o.label)} <span class="o2-tone">${esc(o.tone)}</span></span>
        ${fxChips({ rep: o.rep, fame: o.fame, morale: o.morale })}</button>`;
    }).join("");
    overlay(`<div class="modal2">
      <div class="modal2-hero ev-verm">
        <div class="modal2-icon">${I.press}</div>
        <div class="modal2-kicker">${I.press} Zona mista · entrevista pós-jogo</div>
        <div class="modal2-title">"${esc(itv.q)}"</div>
      </div>
      <div class="modal2-body">${opts}</div>
    </div>`);
  }
  function pickInterview(i) {
    const itv = CQ.state.itv;
    CQ.nar.applyInterview(g(), itv, itv.options[i]);
    CQ.state.itv = null;
    closeOverlay();
    CQ.main.save();
    render();
    afterInterview();
  }

  // ---------------- coletiva de imprensa (3 perguntas, jogos importantes) ----------------
  // mesma "casca" visual da entrevista pós-jogo, repetida 3 vezes; CQ.state.press guarda o
  // progresso (mesmo padrão transiente de CQ.state.itv/lifeEv/summary, nunca salvo no save)
  function showPressConference(pc) {
    CQ.state.press = { qs: pc.questions, idx: 0 };
    pressStepRender();
  }
  function pressStepRender() {
    const s = CQ.state.press, item = s.qs[s.idx];
    const opts = item.options.map(function (o, i) {
      return `<button class="opt2" onclick="CQ.ui.pickPress(${i})">
        <span class="o2-label">${esc(o.label)} <span class="o2-tone">${esc(o.tone)}</span></span>
        ${fxChips({ rep: o.rep, fame: o.fame, morale: o.morale })}</button>`;
    }).join("");
    overlay(`<div class="modal2">
      <div class="modal2-hero ev-verm">
        <div class="modal2-icon">${I.press}</div>
        <div class="modal2-kicker">${I.press} Coletiva de imprensa · pergunta ${s.idx + 1} de ${s.qs.length}</div>
        <div class="modal2-title">"${esc(item.q)}"</div>
      </div>
      <div class="modal2-body">${opts}</div>
    </div>`);
  }
  function pickPress(i) {
    const s = CQ.state.press, item = s.qs[s.idx];
    CQ.nar.applyInterview(g(), item, item.options[i]);
    s.idx++;
    if (s.idx < s.qs.length) { pressStepRender(); return; }
    CQ.state.press = null;
    closeOverlay();
    CQ.main.save();
    render();
    afterInterview();
  }

  // ---------------- evento de vida ----------------
  // ícone de atmosfera por tipo de evento de vida
  const LIFE_ICON = {
    hospital: "heart", empresario: "coin", coletiva: "press", aniversario: "heart", colega: "user",
    influencer: "feed", incomodo: "injury", jantar: "trophy", base: "star", documentario: "feed",
    tenis: "coin", torcedor: "heart", arbitro: "whistle", vaquinha: "heart"
  };
  function showLifeEvent(ev) {
    CQ.state.lifeEv = ev;
    const opts = ev.opts.map(function (o, i) {
      const fx = o.fx || {};
      return `<button class="opt2" onclick="CQ.ui.pickLife(${i})">
        <span class="o2-label">${esc(o.label)}</span>
        ${fxChips(fx) || '<div class="o2-fx"><span class="fxchip">sem efeito direto</span></div>'}</button>`;
    }).join("");
    const ico = I[LIFE_ICON[ev.id]] || I.heart;
    overlay(`<div class="modal2">
      <div class="modal2-hero ev-green">
        <div class="modal2-icon">${ico}</div>
        <div class="modal2-kicker">${ico} Fora de campo</div>
        <div class="modal2-title">${esc(ev.title)}</div>
      </div>
      <div class="modal2-body">
        <p class="modal2-desc">${esc(ev.desc)}</p>
        ${opts}
      </div>
    </div>`);
  }
  function pickLife(i) {
    const ev = CQ.state.lifeEv;
    const opt = ev.opts[i];
    CQ.nar.applyLifeEvent(g(), ev, opt);
    CQ.state.lifeEv = null;
    closeOverlay();
    toast(opt.note);
    CQ.main.save();
    render();
    checkSeasonOver();
  }

  // ---------------- partida ao vivo ----------------
  function renderLiveOverlay(fresh) {
    const live = CQ.state.live;
    const fx = live.fixture;
    const header = `<div class="live-head">
      <span class="lh-comp">${esc(fx.label)}</span>
      <span class="live-clock"><span class="liveblink"></span><span id="lv-score" class="tnum">${liveScoreStr(live)}</span></span>
    </div>`;
    // campo 2D animado (js/pitch.js): SVG puro, inserido 1x e mantido vivo no DOM daqui
    // pra frente — liveStep()/liveDecide()/shootReveal() só mexem em classe/transform
    // dele depois, nunca recriam (mesmo padrão de #lv-feed/#lv-score/#lv-foot). Modo
    // largo do overlay dá espaço pro campo sem espremer o feed de texto.
    const pitchHtml = (CQ.pitch && CQ.pitch.buildPitchSVG) ? CQ.pitch.buildPitchSVG(fx, live.res, g().player) : "";
    overlay(`<div class="live-sticky">${header}${pitchHtml}</div><div class="mm-feed" id="lv-feed"></div><div id="lv-foot" style="padding:12px 16px"></div>`, true);
    if (fresh) { if (CQ.audio) CQ.audio.play("whistle"); liveStep(); }
  }

  // ---------------- campo 2D animado: reação a cada evento revelado ----------------
  // Importante pro determinismo do projeto: a posição cosmética da bola/zona (info,
  // falta, contra-ataque) usa RNG NÃO semeada (U.ri sem passar live.rng), de propósito
  // — nunca consome do mesmo gerador que decide resultado real de jogo (live.rng), pra
  // não arriscar mudar a ordem de sorteios reais (chooseDecision/runShootout) conforme
  // o timing de clique do usuário. Mesmo espírito de flavor/feed já usado no projeto:
  // decorativo é decorativo, não precisa ser reproduzível.
  function applyPitchPose(pose) {
    if (!pose) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ball = $("#pv-ball");
    if (ball && pose.ball) ball.setAttribute("transform", `translate(${pose.ball[0]},${pose.ball[1]})`);
    if (pose.goalSide) {
      const svg = $(".pv-svg");
      if (svg) {
        const cls = pose.goalSide === "right" ? "pv-flash-r" : "pv-flash-l";
        svg.classList.remove("pv-flash-r", "pv-flash-l");
        void svg.offsetWidth;
        svg.classList.add(cls);
      }
    }
    if (pose.highlight) {
      const sel = pose.highlight === "me" ? ".pv-me" :
        pose.highlight === "mate" ? ".pv-team-mine .pv-player:not(.pv-me)" : ".pv-team-opp .pv-player";
      const nodes = document.querySelectorAll(sel);
      if (nodes.length) {
        const node = nodes.length > 1 ? nodes[U.ri(0, nodes.length - 1)] : nodes[0];
        const cls = pose.cardType === "y" ? "pv-pulse-y" : pose.cardType === "r" ? "pv-pulse-r" : "pv-pulse-go";
        node.classList.remove("pv-pulse-y", "pv-pulse-r", "pv-pulse-go");
        void node.offsetWidth;
        node.classList.add(cls);
      }
    }
    const wrap = $(".live-pitch");
    if (wrap) wrap.classList.toggle("pv-hold", !!pose.hold);
    if (pose.badge) {
      const b = $("#pv-badge");
      if (b) {
        b.textContent = pose.badge;
        b.classList.remove("pv-badge-show");
        if (!reduced) { void b.offsetWidth; b.classList.add("pv-badge-show"); }
      }
    }
  }

  // vários eventos podem chegar de um só clique (step() só pausa em gol/intervalo/
  // decisão — lances neutros/cartão/clima antes disso vêm juntos); espaça a reação
  // visual pra dar tempo de cada uma se ver, exceto com reduced-motion (aplica só o
  // estado final, sem atraso decorativo — mesmo padrão de animateCount/dropConfetti).
  function pitchReact(events) {
    if (!CQ.pitch || !events || !events.length) return;
    const live = CQ.state.live;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { applyPitchPose(CQ.pitch.poseFor(events[events.length - 1])); return; }
    events.forEach(function (e, i) {
      setTimeout(function () {
        if (CQ.state.live !== live) return; // partida encerrada/trocada antes do timeout
        applyPitchPose(CQ.pitch.poseFor(e));
      }, i * 550);
    });
  }

  function liveScoreStr(live) {
    const fx = live.fixture;
    const a = fx.home ? live.score[0] : live.score[1];
    const b = fx.home ? live.score[1] : live.score[0];
    return `${esc(fx.home ? fx.myTeam.short : fx.opp.short)} ${a} × ${b} ${esc(fx.home ? fx.opp.short : fx.myTeam.short)}`;
  }

  function evIcon(e) {
    if (e.type === "goal") return `<span class="green">${I.goal}</span>`;
    if (e.type === "oppgoal") return `<span class="verm">${I.goal}</span>`;
    if (e.type === "card") return `<span style="color:var(--gold)">${I.card}</span>`;
    if (e.type === "redcard") return `<span class="verm">${I.card}</span>`;
    if (e.type === "ko" || e.type === "ht" || e.type === "ft") return I.whistle;
    if (e.type === "flavor") return `<span class="verm">${I.press}</span>`;
    return I.ball;
  }

  function liveStep() {
    const live = CQ.state.live;
    const revealed = CQ.live.step(live);
    const feedEl = $("#lv-feed");
    revealed.forEach(function (e) {
      const div = document.createElement("div");
      div.className = "mm-ev " + (e.type === "goal" ? "goal" : e.type === "oppgoal" ? "goal-opp" : "") + (e.big ? " big" : "");
      div.innerHTML = `<span class="mmin tnum">${e.min}'</span><span class="mico">${evIcon(e)}</span><span class="mtext">${esc(e.text)}</span>`;
      feedEl.appendChild(div);
      // splash de gol em tela cheia
      if (e.type === "goal") goalSplash(true, e.min + "'");
      else if (e.type === "oppgoal") goalSplash(false, "");
    });
    pitchReact(revealed);
    // a decisão em si não entra em "revealed" (step() para antes de empurrá-la) — reage
    // no campo também, senão ele fica parado na última pose enquanto o painel aparece.
    if (live.phase === "decision" && live.decision) pitchReact([{ type: "decision", dec: live.decision }]);
    const sc = $("#lv-score");
    if (sc) sc.textContent = liveScoreStr(live).replace(/&amp;/g, "&");
    const foot = $("#lv-foot");
    if (live.phase === "decision") {
      const dec = live.decision;
      foot.innerHTML = "";
      const div = document.createElement("div");
      div.className = "decision";
      div.innerHTML = `<div class="dc-h">Decisão · a partida está pausada</div><div class="dc-b"><div class="dc-q">${esc(dec.q)}</div>
        ${dec.opts.map(function (o, i) {
        return `<button class="dc-opt" onclick="CQ.ui.liveDecide(${i})">${esc(o.label)}<small>${esc(o.sub)} · ${Math.round(o.p * 100)}% de chance</small></button>`;
      }).join("")}</div>`;
      foot.appendChild(div);
    } else if (live.phase === "shootout") {
      renderShootoutPick();
    } else if (live.phase === "done") {
      foot.innerHTML = `<button class="btn btn-pri btn-block btn-big" onclick="CQ.ui.finishLive()">Encerrar partida</button>`;
    } else {
      foot.innerHTML = `<button class="btn btn-block" onclick="CQ.ui.liveStep()">Continuar &rsaquo;</button>`;
    }
    const box = $("#cq-overlay .overlay-box");
    if (box) box.scrollTop = box.scrollHeight;
  }

  function liveDecide(i) {
    const live = CQ.state.live;
    // aplica a decisão (insere o evento, atualiza res) e revela pelo caminho único
    // do step(), que é o único que mexe no placar visual — sem duplicar gol.
    CQ.live.chooseDecision(live, i);
    liveStep();
  }

  function renderShootoutPick() {
    const foot = $("#lv-foot");
    const isGK = g().player.pos === "GOL";
    foot.innerHTML = `<div class="decision"><div class="dc-h">Pênaltis · escolha sua cobrança</div><div class="dc-b">
      <div class="dc-q">${isGK ? "Você é o goleiro — mas pode assumir uma cobrança. Em qual bola você vai?" : "Empate no tempo normal. Em qual das 5 cobranças você bate?"}</div>
      <div class="shootout-grid">
        ${[1, 2, 3, 4, 5].map(function (n) {
      const drama = n === 5 ? "A decisiva" : n === 1 ? "Abre a disputa" : n === 4 ? "Pressão alta" : "Meio da lista";
      return `<button class="shoot-slot" onclick="CQ.ui.shootPick(${n})"><b>${n}ª</b><span class="condsmall">${drama}</span></button>`;
    }).join("")}
      </div>
      <button class="dc-opt" onclick="CQ.ui.shootPick(0)">Não bater — deixo com os companheiros<small>${isGK ? "Foco total em defender" : "Menos risco, menos glória"}</small></button>
    </div></div>`;
  }

  function shootPick(slot) {
    const live = CQ.state.live;
    live.shootSlot = slot;
    CQ.live.runShootout(live, slot); // computa toda a disputa; será revelada lance a lance
    renderShootout();
  }

  function renderShootout() {
    const live = CQ.state.live, so = live.shootout, fx = live.fixture;
    const myShort = esc(fx.myTeam.short), opShort = esc(fx.opp.short);
    const running = CQ.live.shootRunning(so);
    // só desenha o que já aconteceu + 1 bolinha "pendente" enquanto a disputa segue —
    // nunca o total de cobranças (so.log.length já é conhecido de antemão, pois
    // runShootout calcula a disputa inteira de uma vez; mostrar esse total de cara
    // entregava de graça quantas cobranças vão rolar, spoiler reportado pelo usuário).
    function dots(shown) {
      let out = shown.map(function (ok) { return `<i class="${ok ? "ok" : "miss"}"></i>`; }).join("");
      if (running) out += `<i class="pending"></i>`;
      return out;
    }
    const myGoals = so.myShown.filter(Boolean).length;
    const opGoals = so.opShown.filter(Boolean).length;
    // qual foi o último lance revelado (para o comentário)
    const last = so.reveal > 0 ? so.log[so.reveal - 1] : null;
    let lastTxt = "Disputa de pênaltis. Nervos de aço.";
    if (last) {
      const who = last.side === "my" ? (last.me ? "VOCÊ" : myShort) : opShort;
      lastTxt = last.ok
        ? (last.me ? "VOCÊ MARCOU! Frieza total na cobrança." : who + " converteu.")
        : (last.me ? "VOCÊ PERDEU... o goleiro pegou!" : who + " desperdiçou! Isso muda tudo.");
    }
    const foot = $("#lv-foot");
    let footHTML = `<div class="shootout-panel">
      <div class="shoot-team"><span>${myShort}</span><span class="shoot-dots">${dots(so.myShown)}</span><b class="tnum">${myGoals}</b></div>
      <div class="shoot-team"><span>${opShort}</span><span class="shoot-dots">${dots(so.opShown)}</span><b class="tnum">${opGoals}</b></div>
      <p class="shoot-comment ${last && last.ok ? "ok" : last ? "miss" : ""}">${esc(lastTxt)}</p>`;
    if (running) {
      footHTML += `<button class="btn btn-pri btn-block" onclick="CQ.ui.shootReveal()">Próxima cobrança &rsaquo;</button>`;
    } else {
      const win = live.res.shootoutWin;
      footHTML += `<div class="notice ${win ? "ok" : ""} mb8"><b>${win ? "CLASSIFICADO" : "ELIMINADO"} nos pênaltis: ${so.my} × ${so.opp}.</b></div>
        <button class="btn btn-pri btn-block btn-big" onclick="CQ.ui.finishLive()">Encerrar partida</button>`;
    }
    footHTML += `</div>`;
    foot.innerHTML = footHTML;
    const box = $("#cq-overlay .overlay-box");
    if (box) box.scrollTop = box.scrollHeight;
  }

  function shootReveal() {
    const live = CQ.state.live;
    const l = CQ.live.shootStep(live);
    if (l && CQ.pitch && CQ.pitch.poseForKick) applyPitchPose(CQ.pitch.poseForKick(l));
    renderShootout();
  }

  function finishLive() {
    const live = CQ.state.live;
    CQ.state.live = null;
    closeOverlay();
    E().applyMatch(g(), live.res);
    CQ.main.save();
    render();
    if (g().season.lastTitle) {
      const t = g().season.lastTitle;
      g().season.lastTitle = null;
      showTitleCelebration(t, function () { afterMatchFlow(live.res); });
      return;
    }
    afterMatchFlow(live.res);
  }

  function showTitleCelebration(t, next) {
    CQ.state.afterTitle = next;
    const cl = E().myClub(g());
    const cores = [cl.c1 || "#b8330f", cl.c2 || "#f5efdf", "#9c7c1e"];
    dropConfetti(cores);
    if (CQ.audio) CQ.audio.play("trophy");
    const ordinal = t.nth >= 2 ? U.tituloOrdinal(t.nth) : "";
    overlay(`<div class="trophy-banner">
      ${trophyIcon(t.key)}
      <div class="tb-k">${ordinal ? esc(ordinal) + " · " : "É campeão · "}${g().year}</div>
      <h2>${esc(t.name)}</h2>
      ${ordinal ? `<p class="mt4 muted">${esc((t.nth) + "º título")}${t.club ? " pelo " + esc(t.club) : ""}</p>` : ""}
      <p class="mt8">Bônus de título: <b>${U.fmtBRL(t.bonus)}</b></p>
    </div>
    <div style="padding:16px"><button class="btn btn-green btn-block btn-big" onclick="CQ.ui.closeTitle()">Levantar a taça</button></div>`);
  }
  // papel picado nas cores do clube (respeita movimento reduzido)
  function dropConfetti(cores) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = document.createElement("div");
    wrap.className = "confetti";
    let html = "";
    for (let i = 0; i < 90; i++) {
      const c = cores[i % cores.length];
      const left = Math.random() * 100;
      const dur = 2.4 + Math.random() * 2.2;
      const delay = Math.random() * 0.8;
      const w = 6 + Math.random() * 6;
      html += `<i style="left:${left}%;background:${c};width:${w}px;height:${w * 1.6}px;animation-duration:${dur}s;animation-delay:${delay}s;transform:rotate(${Math.random() * 360}deg)"></i>`;
    }
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 5200);
  }
  function closeTitle() {
    closeOverlay();
    const cf = document.querySelector(".confetti"); if (cf) cf.remove();
    const next = CQ.state.afterTitle;
    CQ.state.afterTitle = null;
    if (next) next(); else checkSeasonOver();
  }

  // ---------------- fim de temporada ----------------
  function seasonEndFlow() {
    const G = g();
    if (!G.pendingSummary) E().endSeason(G);
    CQ.main.save();
    showSummary();
  }

  function ballonBlock(sum) {
    if (!sum.ballon) return "";
    const b = sum.ballon, G = g();
    // pódio visual dos 3 primeiros (ordem 2-1-3 para o degrau central ser o mais alto)
    const top3 = b.top.slice(0, 3);
    function podFace(r) {
      const seed = r.me ? G.player.name + G.seed : r.name + "star";
      return U.portraitSVG(seed, 46);
    }
    const order = [top3[1], top3[0], top3[2]];
    const cls = ["p2", "p1", "p3"];
    const podium = `<div class="podium">${order.map(function (r, i) {
      if (!r) return "<div></div>";
      const rank = r === top3[0] ? 1 : r === top3[1] ? 2 : 3;
      return `<div class="pod ${cls[i]} ${r.me ? "me" : ""}"><div class="pod-face">${podFace(r)}</div>
        <div class="pod-name">${esc(String(r.name).split(" ")[0])}${r.me ? " (você)" : ""}</div>
        <div class="pod-bar">${rank}º</div></div>`;
    }).join("")}</div>`;
    const rows = b.top.slice(3, 6).map(function (r, i) {
      return `<div class="flex-b" style="padding:3px 0"><span class="small"><span class="tnum" style="display:inline-block;width:22px">${i + 4}º</span> ${esc(r.name)}${r.me ? ' <span class="badge badge-gold">você</span>' : ""}</span><span class="tnum muted small">${r.score}</span></div>`;
    }).join("");
    // sem indicação: o jogador não entrou nem à frente do pior dos craques fixos —
    // mostra o Top 3 do mundo normalmente, mas sem te inserir artificialmente na lista.
    const verdict = b.rank == null ? '<span class="small muted">Você não recebeu indicação ao prêmio este ano.</span>'
      : b.rank === 1 ? '<span class="badge badge-gold">BOLA DE OURO — nº 1 do mundo</span>'
        : b.rank <= 3 ? `<span class="badge">Pódio mundial · ${b.rank}º</span>`
          : `<span class="small muted">Você ficou em ${b.rank}º no ranking mundial.</span>`;
    return `<hr class="rule"><div class="flex-b mb8"><div class="kicker" style="flex:1">Ranking mundial (Bola de Ouro)</div>${verdict}</div>${podium}${rows}`;
  }

  // monta a cerimônia de fim de temporada como uma sequência de "envelopes" — cada
  // passo só entra se tiver conteúdo (mesmas condições que a versão monolítica antiga
  // já checava), e o botão do último passo é o mesmo summaryNext() de sempre, intocado
  function buildSummarySteps(G, sum) {
    const p = G.player, aw = sum.awards;
    const head = `<div class="live-head"><span class="lh-comp">Balanço da temporada ${sum.year}</span>${I.calendar}</div>`;
    const nextBtn = `<div class="btnrow mt16"><button class="btn btn-pri btn-big btn-block" onclick="CQ.ui.summaryNextStep()">Próximo ${I.arrowR}</button></div>`;
    const steps = [];

    // recalcula a partir de p.titles (não só sum.titles, que é só uma lista de nomes)
    // pra poder mostrar o ordinal (BICAMPEÃO/PENTACAMPEÃO/etc) de cada título — o
    // jogador pode ganhar mais de um título no mesmo ano (ex. liga + copa), por isso é
    // por título individual, não um único "lastTitle" (que só guarda o último do ano).
    const titleEntries = p.titles.filter(function (t) { return t.year === sum.year; });
    const titles = titleEntries.length ? `<div class="notice ok mb8">${I.trophy} Títulos: <b>${titleEntries.map(function (t) {
      const nth = p.titles.filter(function (t2) { return t2.key === t.key && t2.club === t.club && t2.year <= t.year; }).length;
      return esc((nth >= 2 ? U.tituloOrdinal(nth) + " · " : "") + t.name);
    }).join(", ")}</b></div>` : "";
    const idol = sum.becameIdol ? `<div class="notice ok mb8">${I.star} <b>Você virou ÍDOLO do ${esc(sum.becameIdol)}!</b> Estátua na entrada do estádio e nome eternizado na história do clube.</div>` : "";
    const capt = sum.newCaptain ? `<div class="notice ok mb8">${I.trophy} <b>Você é o novo capitão do ${esc(sum.newCaptain)}!</b> A braçadeira reconhece sua liderança.</div>` : "";
    const traitsN = sum.newTraits && sum.newTraits.length ? `<div class="notice ok mb8">${I.star} Novo traço desbloqueado: ${sum.newTraits.map(function (k) { return "<b>" + esc(CQ.engine.TRAITS[k].name) + "</b>"; }).join(", ")}.</div>` : "";
    const moves = [];
    if (sum.moves.myMove === "down") moves.push('<div class="notice">Rebaixado! Na próxima temporada, o clube disputa a divisão de baixo.</div>');
    if (sum.moves.myMove === "up") moves.push('<div class="notice ok">ACESSO! Na próxima temporada, o clube sobe de divisão.</div>');
    const convo = sum.convNews === "convocado" ? '<div class="notice ok">Convocado para a Seleção! O ciclo internacional entra no seu calendário.</div>'
      : sum.convNews === "cortado" ? '<div class="notice warn">Você perdeu a vaga na Seleção. Rendimento manda.</div>' : "";
    if (titleEntries.length || sum.becameIdol || sum.newCaptain || (sum.newTraits && sum.newTraits.length) || moves.length || convo) {
      steps.push({
        confetti: titleEntries.length ? [E().myClub(G).c1 || "#b8330f", E().myClub(G).c2 || "#f5efdf", "#9c7c1e"] : null,
        sound: titleEntries.length ? "trophy" : null,
        html: `${head}<div style="padding:16px">${titles}${idol}${capt}${traitsN}${moves.join("")}${convo}${nextBtn}</div>`
      });
    }

    // números da temporada: sempre aparece
    steps.push({
      confetti: null, sound: null,
      html: `${head}<div style="padding:16px">
        <div class="kicker mb8">Números da temporada</div>
        <div class="tiles mb12">
          <div class="tile"><b class="tnum">${sum.stats.j}</b><span>Jogos</span></div>
          ${p.pos === "GOL"
          ? `<div class="tile"><b class="tnum">${sum.stats.cs}</b><span>Sem sofrer</span></div><div class="tile"><b class="tnum">${sum.stats.saves}</b><span>Defesas</span></div>`
          : `<div class="tile"><b class="tnum">${sum.stats.g}</b><span>Gols</span></div><div class="tile"><b class="tnum">${sum.stats.a}</b><span>Assist.</span></div>`}
          <div class="tile"><b class="tnum">${sum.stats.avg ? U.fmtNota(sum.stats.avg) : "—"}</b><span>Nota média</span></div>
          <div class="tile"><b class="tnum">${sum.pos}º</b><span>Na liga</span></div>
        </div>
        ${sum.vitima ? `<p class="small muted mb8">Maior vítima: <b>${esc(sum.vitima.name)}</b> (${sum.vitima.gols} gols sofridos de você).</p>` : ""}
        ${nextBtn}</div>`
    });

    // prêmios individuais: só se houver algo a mostrar
    if ((aw.won && aw.won.length) || (aw.lost && aw.lost.length)) {
      const awardRows = aw.won.map(function (a) {
        return `<div class="flex-b" style="padding:6px 0;border-bottom:1px dashed var(--rule-soft)"><span class="flex">${I.star} <b>${esc(a.name)}</b></span><span class="small muted">${esc(a.detail || "")}</span></div>`;
      }).join("") || '<p class="muted small">Sem prêmios individuais nesta temporada.</p>';
      const lostRows = aw.lost.map(function (a) {
        return `<p class="small muted">· ${esc(a.name)} ficou com ${esc(a.by || (a.num + " do concorrente"))}.</p>`;
      }).join("");
      steps.push({
        confetti: null, sound: null,
        html: `${head}<div style="padding:16px"><div class="kicker mb8">Prêmios</div>${awardRows}${lostRows}${nextBtn}</div>`
      });
    }

    // Bola de Ouro: sempre por último antes do passo administrativo — o maior reveal
    if (sum.ballon) {
      const bolaDeOuro = sum.ballon.rank === 1;
      steps.push({
        confetti: bolaDeOuro ? ["#c9a227", "#9c7c1e", "#f5efdf"] : null,
        sound: bolaDeOuro ? "trophy" : null,
        html: `${head}<div style="padding:16px">${ballonBlock(sum)}${nextBtn}</div>`
      });
    }

    // administrativo (final): sempre aparece, termina no botão já existente, sem mudança
    steps.push({
      confetti: null, sound: null,
      html: `${head}<div style="padding:16px">
        <div class="flex-b wrap mb8">
          <span class="small">Valor de mercado: <b>${U.fmtBRL(sum.marketValue || p.marketValue)}</b></span>
          ${sum.income ? `<span class="badge badge-green">Renda de negócios: ${U.fmtBRL(sum.income)}</span>` : ""}
        </div>
        <div class="flex-b wrap">
          <span class="small">Meta da diretoria: <b>${esc(sum.meta.desc)}</b></span>
          <span class="badge ${sum.metaOk ? "badge-green" : "badge-verm"}">${sum.metaOk ? "Cumprida · bônus " + U.fmtBRL(400000) : "Falhada"}</span>
        </div>
        ${sum.forcedOut ? '<div class="notice mt8">Duas temporadas sem cumprir metas: a diretoria abriu as portas. Você DEVE trocar de clube.</div>' : ""}
        <hr class="rule">
        <p class="small muted">Rival de geração: <b>${esc(sum.rival.name)}</b> fechou o ano com ${sum.rival.g} gols pelo ${esc(sum.rival.club)}.</p>
        ${sum.aging.drops.length ? `<p class="small muted">O tempo cobra: ${sum.aging.drops.map(function (d) { return esc(D.ATTR_NAMES[d.attr]) + " -" + d.d; }).join(", ")}.</p>` : (sum.aging.note ? `<p class="small green">${esc(sum.aging.note)}</p>` : "")}
        ${sum.aging.potUp ? '<p class="small green">Grande temporada: seu teto de crescimento (potencial) aumentou.</p>' : ""}
        <div class="btnrow mt16">
          <button class="btn btn-pri btn-big btn-block" onclick="CQ.ui.summaryNext()">${sum.retiring ? "Encerrar carreira" : sum.offers ? "Ir ao mercado da bola" : "Próxima temporada"}</button>
        </div>
      </div>`
    });

    return steps;
  }

  function showSummary() {
    const G = g(), sum = G.pendingSummary;
    CQ.state.summary = { steps: buildSummarySteps(G, sum), idx: 0 };
    summaryStepRender();
  }

  function summaryStepRender() {
    const s = CQ.state.summary, step = s.steps[s.idx];
    const cf = document.querySelector(".confetti"); if (cf) cf.remove(); // evita empilhar confete entre passos
    if (step.confetti) dropConfetti(step.confetti);
    if (step.sound && CQ.audio) CQ.audio.play(step.sound);
    overlay(step.html, true);
  }

  function summaryNextStep() {
    CQ.state.summary.idx++;
    summaryStepRender();
  }

  function summaryNext() {
    const G = g(), sum = G.pendingSummary;
    closeOverlay();
    CQ.state.summary = null;
    if (sum.retiring) { G.retired = true; CQ.main.save(); go("retro"); return; }
    if (sum.offers) { showMarket(); return; }
    if (sum.loanOffer) { showLoanOffer(); return; }
    E().nextSeason(G);
    CQ.main.save();
    go("home");
    toast(G.pendingReturnFromLoan ? "Empréstimo terminou — você está de volta ao " + G.pendingReturnFromLoan + "!" : "Temporada " + G.year + " começa agora. Boa sorte!");
  }

  function showMarket() {
    const G = g(), sum = G.pendingSummary, p = G.player, of = sum.offers;
    const cards = of.list.map(function (o, i) {
      const c = D.CLUBS[o.clubId];
      const roleLbl = { estrela: "como ESTRELA", titular: "como titular", rotacao: "como rotação" }[o.role] || "como titular";
      return `<button class="dc-opt" onclick="CQ.ui.pickOffer(${i})">
        <span class="flex">${crest(c, "crest-24")} <b>${esc(o.name)}</b> <span class="badge badge-soft">${esc(o.league)}</span> <span class="badge ${o.role === "estrela" ? "badge-gold" : "badge-soft"}">${roleLbl}</span></span>
        <small>Salário ${U.fmtBRL(o.salary)}/mês · contrato de ${o.years} anos · luvas ${U.fmtBRL(o.salary * 2)}</small></button>`;
    }).join("");
    const renewBtn = of.renew ? `<button class="dc-opt" onclick="CQ.ui.pickRenew()">
      <span class="flex">${crest(E().myClub(G), "crest-24")} <b>Renovar com o ${esc(E().myClub(G).name)}</b></span>
      <small>Novo salário ${U.fmtBRL(of.renew.salary)}/mês · mais ${of.renew.years} anos</small></button>`
      : '<p class="small muted">O clube atual não ofereceu renovação.</p>';
    overlay(`<div class="live-head"><span class="lh-comp">Mercado da bola · janela de ${sum.year}</span>${I.coin}</div>
      <div style="padding:16px">
        <h3 class="mb8">Propostas na mesa</h3>
        <p class="small muted mb12">${sum.mustMove ? "A diretoria encerrou seu ciclo — escolha um novo destino." : of.requested ? "Você pediu para sair — estas são as portas que se abriram." : "Seu contrato chegou ao fim. Escolha seu futuro."}</p>
        ${cards || '<p class="muted">Nenhuma proposta externa desta vez.</p>'}
        <hr class="rule">${renewBtn}
      </div>`, true);
  }

  function pickOffer(i) {
    const G = g(), sum = G.pendingSummary;
    const o = sum.offers.list[i];
    E().acceptOffer(G, o);
    CQ.nar.post(G, "imprensa", "MERCADO: " + G.player.name + " é o novo reforço do " + o.name + ". Contrato de " + o.years + " anos.", { hot: true });
    closeOverlay();
    E().nextSeason(G);
    CQ.main.save();
    go("home");
    toast("Bem-vindo ao " + o.name + "!");
  }
  function pickRenew() {
    const G = g(), sum = G.pendingSummary;
    E().acceptRenew(G, sum.offers.renew);
    CQ.nar.post(G, "clube", G.player.name + " renova contrato! O camisa " + G.player.num + " segue com a gente.", { hot: true });
    closeOverlay();
    E().nextSeason(G);
    CQ.main.save();
    go("home");
    toast("Contrato renovado. Nova temporada!");
  }

  // proposta de empréstimo — o clube propõe (não é vitrine), então só 1 destino e a
  // escolha é binária: aceitar ou ficar brigando por espaço no elenco atual.
  function showLoanOffer() {
    const G = g(), sum = G.pendingSummary, o = sum.loanOffer, cl = D.CLUBS[o.clubId];
    overlay(`<div class="live-head"><span class="lh-comp">Proposta de empréstimo · ${sum.year}</span>${I.coin}</div>
      <div style="padding:16px">
        <h3 class="mb8">Pouco espaço no elenco</h3>
        <p class="small muted mb12">Você jogou pouco nesta temporada. O clube avalia que
        um empréstimo te dá minutos de verdade em outro lugar — e continua sendo o dono
        do seu contrato, te espera de volta.</p>
        <button class="dc-opt" onclick="CQ.ui.pickLoan()">
          <span class="flex">${crest(cl, "crest-24")} <b>${esc(o.name)}</b> <span class="badge badge-soft">${esc(o.league)}</span> <span class="badge badge-gold">como titular</span></span>
          <small>Salário ${U.fmtBRL(o.salary)}/mês · empréstimo de ${o.years} ${U.plural(o.years, "temporada", "temporadas")} · volta ao ${esc(E().myClub(G).name)} depois</small></button>
        <button class="dc-opt" onclick="CQ.ui.declineLoan()">
          <span class="flex"><b>Ficar e brigar por espaço</b></span>
          <small>Segue no ${esc(E().myClub(G).name)}, sem garantia de mais minutos</small></button>
      </div>`, true);
  }
  function pickLoan() {
    const G = g(), sum = G.pendingSummary, o = sum.loanOffer;
    E().acceptLoanOffer(G, o);
    CQ.nar.post(G, "imprensa", "EMPRÉSTIMO: " + G.player.name + " é anunciado pelo " + o.name + " até " + G.player.loan.returnYear + ".", { hot: true });
    closeOverlay();
    E().nextSeason(G);
    CQ.main.save();
    go("home");
    toast("Empréstimo fechado — bem-vindo ao " + o.name + "!");
  }
  function declineLoan() {
    const G = g();
    closeOverlay();
    E().nextSeason(G);
    CQ.main.save();
    go("home");
    toast("Você decidiu ficar. Nova temporada, nova chance de conquistar espaço.");
  }

  // ---------------- CARREIRA ----------------
  function careerHTML() {
    const G = g(), p = G.player;
    const tab = CQ.state.ctab || "attrs";
    const nat = D.NATIONS[p.nat];
    const tabs = [["attrs", "Atributos"], ["marcos", "Marcos"], ["evo", "Evolução"], ["linha", "Linha do tempo"], ["hist", "Temporadas"], ["troph", "Conquistas"], ["duel", "Duelo"]];
    const head = `<div class="player-card mb12">
      <div class="player-face">${U.portraitSVG(p.name + G.seed, 96)}</div>
      <div>
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-sub">${U.flagImg(nat)} ${esc(nat.name)} · ${D.POSITIONS[p.pos].name} (${archName(p)}) · ${p.foot} · nº ${p.num}</div>
        <div class="pc-sub">${crest(E().myClub(G), "crest-20")} ${esc(E().myClub(G).name)} · ${p.age} anos · Fama ${Math.round(p.fame)} · Reputação ${Math.round(p.rep)}</div>
      </div>
      <div class="ov-plate"><b>${p.overall}</b><span>Overall</span></div>
    </div>`;
    const subtabs = `<div class="subtabs">${tabs.map(function (t) {
      return `<button class="${tab === t[0] ? "on" : ""}" onclick="CQ.ui.ctab('${t[0]}')">${t[1]}</button>`;
    }).join("")}</div>`;
    let body = "";
    if (tab === "attrs") body = attrsHTML(p);
    else if (tab === "marcos") body = marcosHTML(G);
    else if (tab === "evo") body = evoHTML(p);
    else if (tab === "linha") body = timelineHTML(G);
    else if (tab === "hist") body = histHTML(p);
    else if (tab === "troph") body = trophHTML(p);
    else body = duelHTML(G);
    return head + subtabs + body;
  }

  function marcosHTML(G) {
    const p = G.player;
    const tot = E().careerTotals(G);
    // marcos alcançados e o próximo alvo de cada linha
    const rows = E().MILESTONE_DEFS.map(function (def) {
      const cur = tot[def.field];
      const next = def.steps.find(function (s) { return cur < s; });
      const lastHit = def.steps.filter(function (s) { return cur >= s; }).pop();
      const pct = next ? Math.round(cur / next * 100) : 100;
      const fromPct = CQ.state.lastSeen.marcos[def.field] != null ? CQ.state.lastSeen.marcos[def.field] : pct;
      const marcoBar = `<div class="bar bar-anim" id="marco-bar-${def.field}" data-bar-to="${pct}"><i style="width:${fromPct}%"></i></div>`;
      return `<div style="padding:9px 0;border-bottom:1px dashed var(--rule-soft)">
        <div class="flex-b"><span class="condsmall">${esc(def.label)}</span><b class="tnum" style="font-family:var(--serif);font-size:17px">${cur}</b></div>
        ${next ? `<div class="meter-lbl" style="margin-top:4px"><span>${lastHit ? "último marco " + lastHit : "próximo marco"}</span><span>meta ${next}</span></div>${marcoBar}`
          : `<span class="badge badge-gold mt8">todos os marcos batidos</span>`}
      </div>`;
    }).join("");

    const nominatedRanks = p.ballon.map(function (b) { return b.rank; }).filter(function (r) { return r != null; });
    const bestRank = nominatedRanks.length ? Math.min.apply(null, nominatedRanks) : null;
    const ballonRows = p.ballon.slice().reverse().slice(0, 8).map(function (b) {
      if (b.rank == null) return `<tr><td class="tnum">${b.year}</td><td class="muted">sem indicação</td><td class="num muted">${b.score} pts</td></tr>`;
      return `<tr><td class="tnum">${b.year}</td><td>${b.rank <= 3 ? '<b>' + b.rank + 'º</b>' : b.rank + 'º'} no mundo</td><td class="num muted">${b.score} pts</td></tr>`;
    }).join("") || '<tr><td colspan="3" class="muted small" style="padding:10px">Ainda sem ranking mundial. Ele é calculado ao fim de cada temporada.</td></tr>';

    return `<div class="cols">
      <div class="stack">
        <div class="card"><div class="section-banner"><span class="sb-title">Valor de mercado</span></div>
          <div class="card-b center">
            <div style="font-family:var(--serif);font-weight:900;font-size:38px">${U.fmtBRL(p.marketValue)}</div>
            <p class="small muted mt8">Sobe com overall, fama e momento — e despenca com a idade. Pico entre 24 e 27 anos.</p>
          </div></div>
        <div class="card"><div class="section-banner"><span class="sb-title">Marcos de carreira</span></div>
          <div class="card-b">${rows}</div></div>
      </div>
      <div class="stack">
        <div class="card"><div class="section-banner"><span class="sb-title">Recordes</span></div>
          <div class="card-b"><div class="tiles">
            <div class="tile"><b class="tnum">${p.records.hatTricks}</b><span>Hat-tricks</span></div>
            <div class="tile"><b class="tnum">${p.records.bestSeasonG}</b><span>Recorde de gols/temp.</span></div>
            <div class="tile"><b class="tnum">${p.records.bestSeasonAvg ? U.fmtNota(p.records.bestSeasonAvg) : "—"}</b><span>Melhor nota/temp.</span></div>
            <div class="tile"><b class="tnum">${tot.titles}</b><span>Títulos</span></div>
          </div></div></div>
        <div class="card"><div class="section-banner"><span class="sb-title">Bola de Ouro</span>${bestRank ? `<span class="sb-meta">melhor: ${bestRank}º</span>` : ""}</div>
          <div class="card-b tight"><table class="tbl"><thead><tr><th>Ano</th><th>Colocação</th><th class="num">Pontuação</th></tr></thead><tbody>${ballonRows}</tbody></table></div>
          <p class="small muted" style="padding:8px 14px">Você só recebe indicação nas temporadas em que supera ao menos o pior dos 12 craques de elite do mundo — nas outras, nem entra na conversa. Só o nº 1 leva a Bola de Ouro.</p>
        </div>
      </div>
    </div>`;
  }

  // ---------------- LINHA DO TEMPO DA CARREIRA ----------------
  function timelineHTML(G) {
    const p = G.player;
    const events = [];
    if (p.career.length) {
      const first = p.career[0];
      events.push({ year: first.year, order: 0, cls: "debut", label: "Estreia profissional", detail: "Começou a carreira no " + esc(first.clubName) + "." });
    }
    for (let i = 1; i < p.career.length; i++) {
      const prev = p.career[i - 1], cur = p.career[i];
      if (cur.clubId !== prev.clubId) {
        // 3 casos: saiu emprestado, voltou do empréstimo pro clube dono, ou
        // transferência definitiva de verdade (nenhum dos dois lados em empréstimo)
        if (cur.onLoan && !prev.onLoan) {
          events.push({ year: cur.year, order: 1, cls: "transfer", label: "Empréstimo", detail: "Saiu do " + esc(prev.clubName) + " por empréstimo, rumo ao " + esc(cur.clubName) + "." });
        } else if (prev.onLoan && !cur.onLoan) {
          events.push({ year: cur.year, order: 1, cls: "transfer", label: "Fim do empréstimo", detail: "Encerrou o empréstimo e voltou ao " + esc(cur.clubName) + "." });
        } else {
          events.push({ year: cur.year, order: 1, cls: "transfer", label: "Transferência", detail: "Saiu do " + esc(prev.clubName) + " e assinou com o " + esc(cur.clubName) + "." });
        }
      }
    }
    (p.titles || []).forEach(function (t) {
      events.push({ year: t.year, order: 2, cls: "title", label: esc(t.name), detail: "Conquistado pelo " + esc(t.club) + "." });
    });
    (p.awards || []).filter(function (a) { return a.name !== "Bola de Ouro"; }).forEach(function (a) {
      events.push({ year: a.year, order: 3, cls: "award", label: esc(a.name), detail: "Prêmio individual — " + esc(a.club) + "." });
    });
    (p.ballon || []).filter(function (b) { return b.rank === 1; }).forEach(function (b) {
      events.push({ year: b.year, order: 4, cls: "ballon", label: "Bola de Ouro", detail: "Eleito o melhor jogador do mundo em " + b.year + "." });
    });
    (p.idolClubs || []).forEach(function (clubId) {
      const yr = p.idolYears && p.idolYears[clubId];
      const cName = D.CLUBS[clubId] ? D.CLUBS[clubId].name : clubId;
      if (yr) events.push({ year: yr, order: 5, cls: "idol", label: "Virou ídolo do " + esc(cName), detail: "Nome eternizado na história do clube." });
    });
    if (p.captain && p.captainYear) {
      const cName = D.CLUBS[p.captain] ? D.CLUBS[p.captain].name : p.captain;
      events.push({ year: p.captainYear, order: 6, cls: "captain", label: "Vestiu a braçadeira", detail: "Nomeado capitão do " + esc(cName) + "." });
    }
    if (G.retired && p.career.length) {
      const lastYear = p.career[p.career.length - 1].year;
      events.push({ year: lastYear, order: 9, cls: "retire", label: "Aposentadoria", detail: "Encerrou a carreira aos " + p.age + " anos." });
    }
    events.sort(function (a, b) { return (a.year - b.year) || (a.order - b.order); });

    if (!events.length) {
      return '<div class="card"><div class="card-b muted center" style="padding:30px">A linha do tempo vai se preenchendo conforme sua carreira acontece.</div></div>';
    }
    const rows = events.map(function (e) {
      return `<div class="tl-item tl-${e.cls}">
        <div class="tl-dot"></div>
        <div class="tl-year">${e.year}</div>
        <div class="tl-body"><b>${e.label}</b><span>${e.detail}</span></div>
      </div>`;
    }).join("");
    return `<div class="section-banner"><span class="sb-title">Linha do tempo</span><span class="sb-meta">${events.length} ${U.plural(events.length, "marco", "marcos")}</span></div>
      <div class="card" style="border-top:none"><div class="card-b" style="max-height:480px;overflow-y:auto"><div class="timeline">${rows}</div></div></div>`;
  }

  function archName(p) {
    const a = D.POSITIONS[p.pos].archs.find(function (x) { return x.id === p.archId; });
    return a ? a.name : "";
  }
  function ctab(t) { CQ.state.ctab = t; render(); }

  function attrsHTML(p) {
    const rows = CQ.engine.ATTRS.map(function (a) {
      if (p.pos !== "GOL" && a === "ref") return "";
      if (p.pos === "GOL" && (a === "fin" || a === "dri")) return "";
      return `<div class="attr-row"><span class="alabel">${D.ATTR_NAMES[a]}</span>${bar(p.attrs[a], 100, p.attrs[a] < 55)}<span class="aval tnum">${p.attrs[a]}</span></div>`;
    }).join("");
    const legends = p.legendIds.map(function (id) {
      const L = D.LEGENDS.find(function (x) { return x.id === id; });
      return L ? `<span class="badge badge-gold">${esc(L.name)} · ${esc(L.trait)}</span>` : "";
    }).join(" ");
    // traços/especialidades desbloqueados
    const allTraitKeys = Object.keys(CQ.engine.TRAITS);
    const traitsHTML = allTraitKeys.map(function (k) {
      const t = CQ.engine.TRAITS[k];
      const on = CQ.engine.hasTrait(p, k);
      return `<div class="trait ${on ? "on" : ""}">${on ? I[t.icon] || I.star : I.star}<div><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></div></div>`;
    }).join("");
    const traitsCard = `<div class="card"><div class="card-h"><h3>Traços &amp; especialidades</h3><span class="kicker-side">${p.traits.length}/${allTraitKeys.length}</span></div>
      <div class="card-b"><div class="trait-grid">${traitsHTML}</div>
      <p class="small muted mt8">Desbloqueados por desempenho (gols, assistências, decisões, capitania...). Cada traço melhora seu jogo de verdade.</p></div></div>`;
    return `<div class="cols"><div class="stack">
      <div class="card"><div class="card-h"><h3>Atributos</h3><span class="kicker-side">Potencial ${p.pot}</span></div>
      <div class="card-b">${rows}</div></div>
      ${traitsCard}
    </div><div class="stack">
      <div class="card"><div class="card-h"><h3>Inspirações — Os Craques</h3></div><div class="card-b">${legends || '<span class="muted small">Nenhuma lenda escolhida.</span>'}</div></div>
      <div class="card"><div class="card-h"><h3>Seleção ${esc(D.NATIONS[p.nat].name)}</h3></div><div class="card-b">
        ${p.natTeam.convocado ? '<span class="badge badge-green">Convocado no ciclo atual</span>' : '<span class="badge badge-soft">Fora da lista</span>'}
        <div class="tiles mt12">
          <div class="tile"><b class="tnum">${p.natTeam.caps}</b><span>Jogos</span></div>
          <div class="tile"><b class="tnum">${p.natTeam.goals}</b><span>Gols</span></div>
        </div></div></div>
    </div></div>`;
  }

  function evoHTML(p) {
    const H = p.hist;
    if (H.length < 2) {
      return `<div class="card"><div class="card-b center muted">A curva de evolução aparece a partir da segunda temporada.<br><br>${chartSVG(H, p)}</div></div>`;
    }
    return `<div class="card"><div class="card-h"><h3>Evolução do overall</h3><span class="kicker-side">${H[0].y}–${H[H.length - 1].y}</span></div>
      <div class="card-b chart-wrap">${chartSVG(H, p)}</div></div>`;
  }

  function chartSVG(H, p) {
    const W = Math.max(560, H.length * 60), Ht = 220, pad = 34;
    const ovs = H.map(function (h) { return h.ov; });
    const lo = Math.min.apply(null, ovs.concat([p.pot])) - 4;
    const hi = Math.max.apply(null, ovs.concat([p.pot])) + 4;
    function x(i) { return pad + i * (W - pad * 2) / Math.max(1, H.length - 1); }
    function y(v) { return Ht - pad - (v - lo) * (Ht - pad * 2) / (hi - lo); }
    const line = H.map(function (h, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(h.ov).toFixed(1); }).join(" ");
    const dots = H.map(function (h, i) {
      return `<circle cx="${x(i)}" cy="${y(h.ov)}" r="3.4" fill="#bf3711"/><text x="${x(i)}" y="${y(h.ov) - 9}" text-anchor="middle" font-size="11" font-family="Barlow Condensed" fill="#1b1812">${h.ov}</text><text x="${x(i)}" y="${Ht - 10}" text-anchor="middle" font-size="10" font-family="Barlow Condensed" fill="#7a7261">${h.y}</text>`;
    }).join("");
    const potY = y(p.pot);
    return `<svg width="${W}" height="${Ht}" viewBox="0 0 ${W} ${Ht}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${pad}" y1="${potY}" x2="${W - pad}" y2="${potY}" stroke="#9c7c1e" stroke-dasharray="5 4" stroke-width="1.4"/>
      <text x="${W - pad}" y="${potY - 6}" text-anchor="end" font-size="10.5" font-family="Barlow Condensed" fill="#9c7c1e">POTENCIAL ${p.pot}</text>
      <path d="${line}" fill="none" stroke="#17563a" stroke-width="2.4"/>
      ${dots}</svg>`;
  }

  function histHTML(p) {
    const rows = p.career.slice().reverse().map(function (s) {
      return `<tr><td class="tnum">${s.year}</td><td><span class="clubcell">${crest(s.clubId, "crest-20")} ${esc(s.clubName)}</span></td>
        <td class="small">${esc(s.league)}</td><td class="num">${s.pos}º</td><td class="num">${s.j}</td>
        <td class="num">${p.pos === "GOL" ? s.cs : s.g}</td><td class="num">${s.a}</td><td class="num">${notaPill(s.avg)}</td><td class="num tnum">${s.ov}</td></tr>`;
    }).join("");
    if (!rows) return '<div class="card"><div class="card-b muted center">Sua primeira temporada ainda está em andamento.</div></div>';
    return `<div class="card"><div class="card-h"><h3>Histórico temporada a temporada</h3></div>
      <div class="card-b tight" style="overflow-x:auto;max-height:480px;overflow-y:auto"><table class="tbl tbl-zebra">
      <thead><tr><th>Ano</th><th>Clube</th><th>Liga</th><th class="num">Pos</th><th class="num">J</th><th class="num">${p.pos === "GOL" ? "SG" : "G"}</th><th class="num">A</th><th class="num">Nota</th><th class="num">OVR</th></tr></thead>
      <tbody>${rows}</tbody></table></div></div>`;
  }

  function trophHTML(p) {
    const titles = p.titles.slice().reverse().map(function (t) {
      return `<div class="flex-b" style="padding:7px 0;border-bottom:1px dashed var(--rule-soft)"><span class="flex">${trophyIcon(t.key)} <span><b>${esc(t.name)}</b>${t.club ? `<br><span class="condsmall">pelo ${esc(t.club)}</span>` : ""}</span></span><span class="tnum muted">${t.year}</span></div>`;
    }).join("") || '<p class="muted small">A sala de troféus ainda espera o primeiro.</p>';
    const awards = p.awards.slice().reverse().map(function (a) {
      return `<div class="flex-b" style="padding:7px 0;border-bottom:1px dashed var(--rule-soft)"><span class="flex">${I.star} <span>${esc(a.name)}${a.club ? `<br><span class="condsmall">no ${esc(a.club)}</span>` : ""}</span></span><span class="tnum muted">${a.year}</span></div>`;
    }).join("") || '<p class="muted small">Nenhum prêmio individual ainda.</p>';
    // vitrine visual de troféus
    let room = "";
    if (p.titles.length) {
      const cells = p.titles.slice().reverse().map(function (t) {
        const big = ["WC", "UCL", "LIB"].indexOf(t.key) >= 0;
        return `<div class="trophy-cell ${big ? "big" : ""}">${trophyIcon(t.key)}<span class="tc-n">${esc(D.COMP_NAMES[t.key] || t.name)}</span><span class="tc-y">${t.year}</span></div>`;
      }).join("");
      room = `<div style="grid-column:1/-1"><div class="card"><div class="section-banner"><span class="sb-title">Sala de troféus</span><span class="sb-meta">${p.titles.length} ${U.plural(p.titles.length, "taça", "taças")}</span></div>
        <div class="card-b" style="padding:0"><div class="trophy-room">${cells}</div></div></div></div>`;
    }
    return `<div class="cols">
      ${room}
      <div class="card"><div class="card-h"><h3>Títulos coletivos</h3><span class="kicker-side">${p.titles.length}</span></div><div class="card-b" style="max-height:420px;overflow-y:auto">${titles}</div></div>
      <div class="card"><div class="card-h"><h3>Prêmios individuais</h3><span class="kicker-side">${p.awards.length}</span></div><div class="card-b" style="max-height:420px;overflow-y:auto">${awards}</div></div>
    </div>`;
  }

  function clubRivalryCard(G) {
    const cr = G.clubRivalry || {};
    const keys = Object.keys(cr);
    if (!keys.length) return "";
    const rows = keys.map(function (oppId) {
      const rec = cr[oppId], oc = D.CLUBS[oppId];
      if (!oc) return "";
      const total = rec.v + rec.e + rec.d;
      const verdict = rec.v > rec.d ? "vantagem" : rec.v < rec.d ? "desvantagem" : "equilibrado";
      return `<tr><td><span class="clubcell">${crest(oc, "crest-20")} ${esc(oc.name)}</span></td>
        <td class="num tnum">${rec.v}-${rec.e}-${rec.d}</td>
        <td class="small ${rec.v > rec.d ? "green" : rec.v < rec.d ? "verm" : "muted"}">${total ? verdict : "sem duelos"}</td></tr>`;
    }).join("");
    return `<div class="card" style="grid-column:1/-1"><div class="section-banner"><span class="sb-title">Rivalidade de clube</span><span class="sb-meta">${esc(E().myClub(G).name)}</span></div>
      <div class="card-b tight" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Rival</th><th class="num">V-E-D</th><th>Balanço</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  function duelHTML(G) {
    const r = G.rival, p = G.player, h = G.h2h;
    const rc = D.CLUBS[r.clubId];
    const hist = (G.rivalHistory || []);
    const histRows = hist.slice().reverse().map(function (rv) {
      const total = rv.h2h.v + rv.h2h.e + rv.h2h.d;
      const verdict = rv.h2h.v > rv.h2h.d ? "levou a melhor" : rv.h2h.v < rv.h2h.d ? "levou a pior" : "empate técnico";
      return `<tr><td>${esc(rv.name)}</td><td class="small">geração ${rv.gen}</td>
        <td class="num tnum">${rv.h2h.v}-${rv.h2h.e}-${rv.h2h.d}</td>
        <td class="small ${rv.h2h.v > rv.h2h.d ? "green" : rv.h2h.v < rv.h2h.d ? "verm" : "muted"}">${total ? verdict : "sem duelos"}</td>
        <td class="num tnum">${rv.careerG}</td></tr>`;
    }).join("");
    const histCard = hist.length ? `<div class="card"><div class="section-banner"><span class="sb-title">Rivais anteriores</span><span class="sb-meta">${hist.length} ${U.plural(hist.length, "geração", "gerações")}</span></div>
      <div class="card-b tight" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Rival</th><th>Ger.</th><th class="num">V-E-D</th><th>Balanço</th><th class="num">Gols carr.</th></tr></thead><tbody>${histRows}</tbody></table></div>
      <p class="small muted" style="padding:8px 14px">Cada geração traz um novo desafiante. O retrospecto zera quando um rival se aposenta.</p></div>` : "";
    return `<div class="cols">
      <div class="card"><div class="card-h"><h3>Rival de geração</h3><span class="kicker-side">Eleito pela mídia · geração ${r.gen}</span></div>
        <div class="card-b">
          <div class="player-card" style="grid-template-columns:72px 1fr auto;border-width:1px">
            <div class="player-face" style="width:72px;height:72px">${U.portraitSVG(r.name + "rival" + r.gen, 72)}</div>
            <div><div class="pc-name" style="font-size:19px">${esc(r.name)}</div>
            <div class="pc-sub">${crest(rc, "crest-20")} ${esc(rc.name)} · ${D.POSITIONS[r.pos].name} · ${r.age} anos</div></div>
            <div class="ov-plate"><b>${r.overall}</b><span>OVR</span></div>
          </div>
          <div class="tiles mt12">
            <div class="tile"><b class="tnum">${r.overall}</b><span>OVR (você ${p.overall})</span></div>
            <div class="tile"><b class="tnum">${r.careerG}</b><span>Gols (você ${E().careerTotals(G).goals})</span></div>
            <div class="tile"><b class="tnum">${r.awards.length}</b><span>Prêmios (você ${p.awards.length})</span></div>
          </div>
        </div></div>
      <div class="card"><div class="card-h"><h3>Retrospecto atual</h3></div>
        <div class="card-b center">
          <div class="scoreline" style="grid-template-columns:1fr auto 1fr">
            <div class="team"><span class="tname">${esc(String(p.name).split(" ")[0])}</span><b style="font-family:var(--serif);font-size:38px" class="tnum">${h.v}</b><span class="condsmall">vitórias</span></div>
            <div class="score" style="font-size:20px;color:var(--ink-3)">${h.e}<small>empates</small></div>
            <div class="team"><span class="tname">${esc(String(r.name).split(" ")[0])}</span><b style="font-family:var(--serif);font-size:38px" class="tnum">${h.d}</b><span class="condsmall">vitórias</span></div>
          </div>
          <p class="small muted mt12">Confrontos diretos em jogos de clube contra o rival atual.</p>
        </div></div>
      ${clubRivalryCard(G)}
      ${histCard ? '<div style="grid-column:1/-1">' + histCard + '</div>' : ""}
    </div>`;
  }

  // taças vetoriais próprias por tipo de competição (não são réplicas oficiais)
  // desenhos vetoriais próprios (não fotos/traçado copiado), inspirados na silhueta real
  // de cada família de troféu — reconhecíveis mesmo em ~24-40px, sem depender de imagem
  // externa (mesmo espírito de crestSVG/portraitSVG: procedural, 100% offline)
  function trophyIcon(key) {
    const tier = ["SUPER", "MUN", "WC", "UCL", "LIB"].indexOf(key) >= 0 ? "big" : ["CA", "EU", "BRA", "LIGA", "SUL", "UEL", "ESP", "ENG", "ITA", "GER", "FRA", "POR"].indexOf(key) >= 0 ? "mid" : "small";
    const c = tier === "big" ? "var(--gold)" : tier === "mid" ? "var(--ink-2)" : "var(--ink-3)";
    const sizeStyle = tier === "big" ? ' style="width:1.15em;height:1.15em"' : "";
    // Copa do Mundo / Mundial de Clubes / Supermundial — fitas espiraladas erguendo um globo
    if (key === "WC" || key === "MUN" || key === "SUPER") {
      return `<svg viewBox="0 0 24 28" fill="none" stroke="${c}" stroke-width="1.4"${sizeStyle}>
        <rect x="9" y="21.2" width="6" height="2.2" rx="0.4" fill="${c}" stroke="none" opacity="0.9"/>
        <path d="M7 25.4h10M8 25.4l.8-1.9h6.4l.8 1.9"/>
        <path d="M12 21.2v-3.6"/>
        <path d="M12 17.6c-2.1-1-3.4-2.9-3-5.2C9.4 10 10.7 8.4 12 7c1.3 1.4 2.6 3 3 5.4.4 2.3-.9 4.2-3 5.2z"/>
        <path d="M9.3 12.6c-1.5.6-2.8 1.7-2.8 3.2M14.7 12.6c1.5.6 2.8 1.7 2.8 3.2"/>
        <circle cx="12" cy="5.4" r="2.5" fill="${c}" fill-opacity="0.2"/>
        <circle cx="12" cy="5.4" r="2.5"/>
        <path d="M9.7 5.4h4.6M12 3.1v4.6" stroke-width="0.8" opacity="0.6"/>
      </svg>`;
    }
    // Champions/Europa League — taça bojuda com as duas "orelhas" enormes e curvas
    if (key === "UCL" || key === "UEL" || key === "UECL") {
      return `<svg viewBox="0 0 24 28" fill="none" stroke="${c}" stroke-width="1.4"${sizeStyle}>
        <path d="M8 25.4h8"/>
        <path d="M10 25.4v-2.2h4v2.2"/>
        <path d="M12 21v-2.6"/>
        <path d="M8.2 12.2c0 3 1.6 5.2 3.8 5.2s3.8-2.2 3.8-5.2V8.4H8.2v3.8z" fill="${c}" fill-opacity="0.16"/>
        <path d="M8.2 12.2c0 3 1.6 5.2 3.8 5.2s3.8-2.2 3.8-5.2V8.4H8.2v3.8z"/>
        <path d="M8.2 9.4c-2.6 0-4.4 1.7-4.4 3.9s1.8 3.6 3.9 3.6"/>
        <path d="M15.8 9.4c2.6 0 4.4 1.7 4.4 3.9s-1.8 3.6-3.9 3.6"/>
        <path d="M7.4 8.4h9.2"/>
      </svg>`;
    }
    // Libertadores/Sul-Americana — base em degraus empilhados, bem característica
    if (key === "LIB" || key === "SUL") {
      return `<svg viewBox="0 0 24 28" fill="none" stroke="${c}" stroke-width="1.4"${sizeStyle}>
        <path d="M6 25.4h12"/>
        <path d="M7.5 25.4v-2h9v2"/>
        <path d="M8.6 23.4v-2h6.8v2"/>
        <path d="M9.6 21.4v-1.6h4.8v1.6"/>
        <path d="M12 19.8v-2.4"/>
        <path d="M8.6 11c0 2.9 1.5 5.2 3.4 5.2s3.4-2.3 3.4-5.2V7.4H8.6V11z" fill="${c}" fill-opacity="0.16"/>
        <path d="M8.6 11c0 2.9 1.5 5.2 3.4 5.2s3.4-2.3 3.4-5.2V7.4H8.6V11z"/>
        <path d="M7.4 7.4h9.2"/>
        <path d="M8.6 8.6c-1.5.2-2.4 1.1-2.4 2.4M15.4 8.6c1.5.2 2.4 1.1 2.4 2.4"/>
      </svg>`;
    }
    // copas domésticas de mata-mata — corpo mais curto e largo, com tampa/domo e
    // pomo no topo (bem diferente da taça de liga, sem tampa, aberta em cima)
    if (key === "CDB" || key === "COPA") {
      return `<svg viewBox="0 0 24 28" fill="none" stroke="${c}" stroke-width="1.5"${sizeStyle}>
        <path d="M8 25.4h8"/>
        <path d="M9.6 25.4v-1.8h4.8v1.8"/>
        <path d="M12 21.4v-2"/>
        <path d="M8.4 12.6c0 2.6 1.5 4.6 3.6 4.6s3.6-2 3.6-4.6V9.4H8.4v3.2z" fill="${c}" fill-opacity="0.16"/>
        <path d="M8.4 12.6c0 2.6 1.5 4.6 3.6 4.6s3.6-2 3.6-4.6V9.4H8.4v3.2z"/>
        <path d="M7.6 9.4h8.8"/>
        <path d="M8.4 10.6c-1.5.1-2.4.9-2.4 2M15.6 10.6c1.5.1 2.4.9 2.4 2"/>
        <path d="M9.4 9.4c0-1.6 1.2-2.8 2.6-2.8s2.6 1.2 2.6 2.8" fill="${c}" fill-opacity="0.22"/>
        <path d="M9.4 9.4c0-1.6 1.2-2.8 2.6-2.8s2.6 1.2 2.6 2.8"/>
        <circle cx="12" cy="5.6" r="0.9" fill="${c}" stroke="none"/>
      </svg>`;
    }
    // genérico (ligas nacionais, estaduais, seleção, continental de seleções etc.) — taça
    // aberta clássica, sem tampa (a "família" de troféu de liga por pontos corridos)
    return `<svg viewBox="0 0 24 28" fill="none" stroke="${c}" stroke-width="1.5"${sizeStyle}>
      <path d="M8 25.4h8"/>
      <path d="M9.6 25.4v-1.8h4.8v1.8"/>
      <path d="M12 21.4v-2.2"/>
      <path d="M8.6 11.4c0 2.7 1.5 4.8 3.4 4.8s3.4-2.1 3.4-4.8V8H8.6v3.4z" fill="${c}" fill-opacity="0.14"/>
      <path d="M8.6 11.4c0 2.7 1.5 4.8 3.4 4.8s3.4-2.1 3.4-4.8V8H8.6v3.4z"/>
      <path d="M8.6 9c-1.8.15-2.9 1.1-2.9 2.5M15.4 9c1.8.15 2.9 1.1 2.9 2.5"/>
      <path d="M7.4 8h9.2"/>
    </svg>`;
  }

  // ---------------- TORNEIOS ----------------
  function compsHTML() {
    const G = g(), S = G.season;
    const tab = CQ.state.ttab || "pano";
    const tabs = [["pano", "Panorama"], ["cal", "Calendário"], ["liga", "Liga"], ["art", "Artilharia"]];
    if (S.comps.EST) tabs.push(["est", "Estadual"]);
    if (S.comps.CDB) tabs.push(["cdb", "Copa do Brasil"]);
    if (S.comps.COPA) { const lgc = D.LEAGUES[E().leagueOf(G, G.player.clubId)]; tabs.push(["cdb", lgc ? lgc.cupName : S.comps.COPA.name]); }
    if (S.comps.CONTI) tabs.push(["conti", S.comps.CONTI.name]);
    if (S.sel) tabs.push(["sel", "Seleção"]);
    if (S.super) tabs.push(["super", "Supermundial"]);
    tabs.push(["mundo", "Mundo"]);
    tabs.push(["champ", "Campeões"]);
    const subtabs = `<div class="subtabs">${tabs.map(function (t) {
      return `<button class="${tab === t[0] ? "on" : ""}" onclick="CQ.ui.ttab('${t[0]}')">${esc(t[1])}</button>`;
    }).join("")}</div>`;
    let body = "";
    const none = '<div class="card"><div class="card-b muted">Sua equipe não disputa esta competição nesta temporada.</div></div>';
    if (tab === "pano") body = panoramaHTML(G);
    else if (tab === "cal") body = calendarHTML(G);
    else if (tab === "liga") body = leagueTableHTML(S.comps.LIGA, true);
    else if (tab === "art") body = scorersHTML(G);
    else if (tab === "est") body = S.comps.EST ? estHTML(S.comps.EST) : none;
    else if (tab === "cdb") body = (S.comps.CDB || S.comps.COPA) ? cupHTML(S.comps.CDB || S.comps.COPA) : none;
    else if (tab === "conti") body = S.comps.CONTI ? contiHTML(S.comps.CONTI) : none;
    else if (tab === "sel") body = selHTML(S);
    else if (tab === "super") body = S.super ? superHTML(G) : none;
    else if (tab === "mundo") body = worldLeaguesHTML(G);
    else body = champsHTML(G);
    return subtabs + body;
  }
  function ttab(t) { CQ.state.ttab = t; render(); }

  const COMP_ABBR = { EST: "EST", LIGA: "LIGA", BRA: "LIGA", BRB: "SÉRIE B", CDB: "COPA BR", COPA: "COPA", LIB: "LIBERT", SUL: "SULA", UCL: "UCL", UEL: "UEL", UECL: "CONFERENCE", SEL: "SELEÇÃO", WC: "COPA", CA: "COPA AM", EU: "EURO", GC: "COPA OURO", AC: "COPA ÁSIA", MUN: "MUNDIAL", SUPER: "SUPERMUNDIAL" };
  // classe de cor por competição (para diferenciar no calendário/panorama)
  const COMP_COLOR = { EST: "c-est", LIGA: "c-liga", BRA: "c-liga", BRB: "c-serieb", CDB: "c-copa", COPA: "c-copa", LIB: "c-lib", SUL: "c-sula", UCL: "c-ucl", UEL: "c-uel", UECL: "c-uel", SEL: "c-sel", WC: "c-sel", CA: "c-sel", EU: "c-sel", GC: "c-sel", AC: "c-sel", MUN: "c-mun", SUPER: "c-mun" };
  function compTag(comp) {
    return `<span class="cal-tag ${COMP_COLOR[comp] || ""}">${esc(COMP_ABBR[comp] || comp)}</span>`;
  }
  function calendarHTML(G) {
    const sched = E().peekSchedule(G);
    const nextIdx = sched.findIndex(function (m) { return !m.done; });
    let played = 0, wins = 0;
    const rows = sched.map(function (m, i) {
      const isNext = i === nextIdx;
      const opp = m.oppName ? esc(m.oppName) : "<span class='muted'>a definir</span>";
      const oppCrest = m.oppId ? crest(m.oppId, "crest-20") : (m.comp === "SEL" && m.oppName ? "" : "");
      let localTag, statusCell;
      if (m.home === true) localTag = '<span class="cal-loc home">Casa</span>';
      else if (m.home === false) localTag = '<span class="cal-loc away">Fora</span>';
      else localTag = '<span class="cal-loc muted">—</span>';
      if (m.done) {
        played++;
        const w = m.win, d = m.draw;
        if (w) wins++;
        const pill = w ? "V" : d ? "E" : "D";
        const a = m.home ? m.gm : m.go, b = m.home ? m.go : m.gm;
        const mine = m.plays ? notaPill(m.nota) : '<span class="cal-dnp">—</span>';
        statusCell = `<span class="cal-res"><span class="result-pill ${pill}">${pill}</span> <b class="tnum">${a}-${b}</b></span>`;
        return `<tr class="cal-done"><td>${compTag(m.comp)}</td><td><span class="clubcell">${oppCrest} ${opp}</span></td><td>${localTag}</td><td class="num">${statusCell}</td><td class="num">${mine}</td></tr>`;
      }
      statusCell = isNext ? '<span class="cal-next">Próximo</span>' : '<span class="muted small">Agendado</span>';
      return `<tr class="${isNext ? "cal-now" : ""}"><td>${compTag(m.comp)}${m.decisive ? ' <span class="cal-dec">decisivo</span>' : ""}</td><td><span class="clubcell">${oppCrest} ${opp}</span></td><td>${localTag}</td><td class="num" colspan="2">${statusCell}</td></tr>`;
    }).join("");
    const upcoming = sched.length - played;
    return `<div class="card">
      <div class="section-banner"><span class="sb-title">Calendário da temporada</span><span class="sb-meta">${G.year}</span></div>
      <div class="tiles" style="border-top:none;border-bottom:1px solid var(--ink)">
        <div class="tile"><b class="tnum">${sched.length}</b><span>Jogos no ano</span></div>
        <div class="tile"><b class="tnum">${played}</b><span>Disputados</span></div>
        <div class="tile"><b class="tnum">${upcoming}</b><span>A jogar</span></div>
        <div class="tile"><b class="tnum">${played ? Math.round(wins / played * 100) : 0}%</b><span>Aproveit. (V)</span></div>
      </div>
      <div class="card-b tight" style="overflow-x:auto"><table class="tbl">
        <thead><tr><th>Competição</th><th>Adversário</th><th>Local</th><th class="num">Resultado</th><th class="num">Nota</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="muted center" style="padding:16px">Temporada ainda não iniciada.</td></tr>'}</tbody>
      </table></div>
      <p class="small muted" style="padding:8px 14px">Jogos de mata-mata mostram o adversário assim que o chaveamento é sorteado.</p>
    </div>`;
  }

  // lista todas as competições da temporada com status e próximo confronto
  function seasonComps(G) {
    const S = G.season, p = G.player, out = [];
    function pushComp(key, name, phase, nextOpp, statusTag) { out.push({ key: key, name: name, phase: phase, nextOpp: nextOpp, statusTag: statusTag }); }
    const fx = E().currentFixture(G);
    const nextByComp = {};
    E().peekSchedule(G).forEach(function (m) { if (!m.done && !nextByComp[m.comp]) nextByComp[m.comp] = m; });
    if (S.comps.EST) { const k = S.comps.EST; pushComp("EST", k.name, k.knock && k.knock.champion ? "Encerrado" : "Em disputa", nextByComp.EST, k.knock && k.knock.champion ? (k.knock.champion === E().myClub(G).name ? "campeão" : "encerrado") : "ativo"); }
    if (S.comps.LIGA) { const tb = E().tableOf(G, S.comps.LIGA); const pos = tb.findIndex(function (t) { return t.id === p.clubId; }) + 1; pushComp("LIGA", S.comps.LIGA.name, pos ? pos + "º na tabela" : "A começar", nextByComp.LIGA, "ativo"); }
    ["CDB", "COPA"].forEach(function (ck) { if (S.comps[ck]) { const cup = S.comps[ck]; pushComp(ck, cup.name, cup.champion ? "Campeão!" : cup.alive ? "Vivo no mata-mata" : "Eliminado", nextByComp[ck], cup.champion ? "campeão" : cup.alive ? "ativo" : "fora"); } });
    if (S.comps.CONTI) { const C = S.comps.CONTI; pushComp("CONTI", C.name, C.champion ? "Campeão!" : C.alive ? (C.koIdx >= 0 ? "No mata-mata" : "Fase de grupos") : "Eliminado", nextByComp.CONTI, C.champion ? "campeão" : C.alive ? "ativo" : "fora"); }
    if (S.sel) { const T = S.sel; pushComp("SEL", T.kind === "elim" ? "Eliminatórias · " + D.NATIONS[p.nat].name : T.name, T.champion ? "Campeão!" : T.eliminatedAt ? "Eliminado" : (T.kind === "elim" ? "Em disputa" : "No torneio"), nextByComp.SEL, T.champion ? "campeão" : T.eliminatedAt ? "fora" : "ativo"); }
    return out;
  }

  function panoramaHTML(G) {
    const comps = seasonComps(G);
    const cards = comps.map(function (c) {
      const badgeCls = c.statusTag === "campeão" ? "badge-gold" : c.statusTag === "fora" ? "badge-verm" : c.statusTag === "encerrado" ? "badge-soft" : "badge-green";
      const next = c.nextOpp;
      return `<div class="card" style="box-shadow:none">
        <div class="card-h"><h3>${compTag(c.key === "CONTI" && G.season.comps.CONTI ? G.season.comps.CONTI.id : c.key)} ${esc(c.name)}</h3><span class="badge ${badgeCls}">${esc(c.statusTag)}</span></div>
        <div class="card-b">
          <div class="flex-b"><span class="condsmall">Situação</span><b class="small">${esc(c.phase)}</b></div>
          <hr class="rule">
          <div class="flex-b"><span class="condsmall">Próximo jogo</span>
            <span class="small">${next ? `${next.oppName ? esc(next.oppName) : "a definir"} ${next.home === true ? "(casa)" : next.home === false ? "(fora)" : ""}` : "—"}</span></div>
        </div></div>`;
    }).join("");
    return `<div class="card"><div class="section-banner"><span class="sb-title">Panorama da temporada</span><span class="sb-meta">${G.year} · ${comps.length} competições</span></div>
      <div class="card-b"><div class="choice-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${cards}</div>
      <p class="small muted mt12">Todas as competições que você disputa neste ano. Use as abas ao lado para ver tabelas, grupos, chaveamentos e o calendário completo.</p></div></div>`;
  }

  // ---------------- SORTEIO DE GRUPOS (cerimônia) ----------------
  function pendingDraws(G) {
    const S = G.season, draws = [];
    if (S.comps.CONTI && S.comps.CONTI.group) {
      const C = S.comps.CONTI;
      draws.push({ key: C.id, name: C.name, sub: "Fase de grupos", teams: C.group.teamIds.map(function (id) { return { id: id, name: CQ.engine.oppObj(G, id).name, me: id === G.player.clubId }; }) });
    }
    if (S.sel && S.sel.kind !== "elim" && S.sel.groupOpps) {
      const nat = D.NATIONS[G.player.nat];
      const members = [nat.name].concat(S.sel.groupOpps);
      draws.push({ key: S.sel.kind, name: S.sel.name, sub: "Fase de grupos", teams: members.map(function (n) { return { id: "nat:" + n, name: n, me: n === nat.name }; }) });
    }
    return draws;
  }

  function maybeDrawCeremony(G) {
    if (G.season.drawShown) return false;
    if (document.getElementById("cq-overlay")) return false; // aguarda fechar outro overlay
    const draws = pendingDraws(G);
    G.season.drawShown = true;
    if (!draws.length) return false;
    showDrawCeremony(draws);
    return true;
  }

  function showDrawCeremony(draws) {
    const cards = draws.map(function (d, di) {
      const pots = d.teams.map(function (t, ti) {
        return `<div class="draw-ball" style="animation-delay:${(di * d.teams.length + ti) * 0.22}s">
          ${t.id.indexOf("nat:") === 0 ? crest(t.id, "crest-24") : crest(t.id, "crest-24")}
          <span>${esc(t.name)}</span>${t.me ? '<b class="verm">VOCÊ</b>' : ""}</div>`;
      }).join("");
      return `<div class="draw-group"><div class="draw-group-h">${compTag(d.key)} ${esc(d.name)} · ${esc(d.sub)}</div>
        <div class="draw-balls">${pots}</div></div>`;
    }).join("");
    overlay(`<div class="live-head"><span class="lh-comp">Sorteio dos grupos · ${g().year}</span>${I.trophy}</div>
      <div style="padding:16px">
        <p class="small muted mb12">As bolinhas estão saindo da urna... veja em que grupo você caiu.</p>
        ${cards}
        <div class="btnrow mt16"><button class="btn btn-pri btn-block btn-big" onclick="CQ.ui.closeDraw()">Bola pra frente ${I.arrowR}</button></div>
      </div>`, true);
  }
  function closeDraw() { closeOverlay(); CQ.main.save(); }

  function scorersHTML(G) {
    const kind = CQ.state.artKind || "g";
    const field = kind === "a" ? "a" : "g";
    const unit = kind === "a" ? "assistência" : "gol", unitP = kind === "a" ? "assistências" : "gols";
    const board = E().scoreboard(G, kind);
    const me = board.find(function (s) { return s.you; });

    // só mostra "você" na lista quando, NO RITMO ATUAL projetado pra temporada inteira,
    // estiver perto (≤2) de quem vem logo à frente — igual à regra da Bola de Ouro.
    // Comparar números AO VIVO (proporcionais ao quanto já rolou de temporada) engana:
    // no início, todo mundo — inclusive os craques — tem poucos gols, e qualquer
    // diferença de 1-2 parece "perto" mesmo sem sentido nenhum.
    const NEAR = 2, MIN_GAMES = 5;
    const S = G.season, nRounds = S.comps.LIGA ? S.comps.LIGA.nRounds : 38;
    const ligaStats = G.player.stats.byComp.LIGA || { j: 0, g: 0, a: 0 };
    let showMe = false, gap = 0, aboveName = "", aboveVal = 0, tooEarly = true;
    if (ligaStats.j >= MIN_GAMES) {
      tooEarly = false;
      const myProjected = Math.round((ligaStats[field] || 0) / ligaStats.j * nRounds);
      const peers = (S.scorers || []).map(function (s) { return { name: s.name, val: s[field] }; });
      if (E().leagueOf(G, G.rival.clubId) === E().leagueOf(G, G.player.clubId)) {
        const rProj = G.rival.seasonProj || 0;
        peers.push({ name: G.rival.name, val: field === "a" ? Math.round(rProj * 0.4) : rProj });
      }
      const above = peers.filter(function (pe) { return pe.val > myProjected; }).sort(function (a, b) { return a.val - b.val; })[0];
      gap = above ? above.val - myProjected : 0;
      showMe = !above || gap <= NEAR;
      if (above) { aboveName = above.name; aboveVal = above.val; }
    }
    const list = showMe ? board : board.filter(function (s) { return !s.you; });
    const top = list.slice(0, 14);
    const rows = top.map(function (s, i) {
      const cls = s.you ? "me" : s.rival ? "rival-row" : "";
      const tag = s.you ? ' <span class="badge badge-gold">você</span>' : s.rival ? ' <span class="badge badge-soft">rival</span>' : "";
      return `<tr class="${cls}"><td class="tnum">${i + 1}</td>
        <td><span class="clubcell">${crest(s.clubId, "crest-20")} ${esc(s.name)}${tag}</span></td>
        <td class="small muted">${esc(CQ.engine.oppObj(G, s.clubId).short)}</td>
        <td class="num ${kind === "g" ? "" : "muted"}"><b>${s.g}</b></td>
        <td class="num ${kind === "a" ? "" : "muted"}"><b>${s.a}</b></td></tr>`;
    }).join("");
    const foot = tooEarly
      ? `Ainda é cedo pra dizer — dispute mais jogos da liga pra sua colocação na artilharia aparecer aqui.`
      : showMe
        ? `Projeção ao vivo da temporada. Para levar a Chuteira de Ouro, precisa terminar em 1º — e os artilheiros da liga chegam fácil aos ${G.season.scorerTop || 25} gols.`
        : `No seu ritmo atual, você projeta ficar a <b>${gap}</b> ${U.plural(gap, unit, unitP)} de ${esc(aboveName)} (~${aboveVal} na temporada) — ainda fora da briga direta, por isso não aparece na lista.`;
    return `<div class="card">
      <div class="section-banner"><span class="sb-title">${kind === "g" ? "Artilharia" : "Assistências"} · ${esc(G.season.comps.LIGA.name)}</span><span class="sb-meta">${G.year}</span></div>
      <div class="subtabs" style="border-bottom:1px solid var(--ink);margin:0">
        <button class="${kind === "g" ? "on" : ""}" onclick="CQ.state.artKind='g';CQ.ui.render()">Goleadores</button>
        <button class="${kind === "a" ? "on" : ""}" onclick="CQ.state.artKind='a';CQ.ui.render()">Garçons</button>
      </div>
      <div class="card-b tight" style="overflow-x:auto"><table class="tbl">
        <thead><tr><th>#</th><th>Jogador</th><th>Clube</th><th class="num">Gols</th><th class="num">Assist.</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <p class="small muted" style="padding:8px 14px">${foot}</p>
    </div>`;
  }

  function worldLeaguesHTML(G) {
    const wl = (G.world && G.world.leagues) || {};
    const keys = Object.keys(wl);
    if (!keys.length) return '<div class="card"><div class="card-b muted">Tabelas do mundo ainda não disponíveis.</div></div>';
    let f = CQ.state.worldLeague;
    if (!f || !wl[f]) f = keys[0];
    const sel = `<select onchange="CQ.state.worldLeague=this.value;CQ.ui.render()" style="border:1px solid var(--ink);background:var(--paper-2);color:var(--ink);padding:6px 10px;font-size:14px">
      ${keys.map(function (k) { return `<option value="${k}" ${f === k ? "selected" : ""}>${esc(D.LEAGUES[k].name)}</option>`; }).join("")}</select>`;
    const comp = wl[f];
    return `<div class="card mb12"><div class="card-h"><h3>Outras ligas do mundo</h3>${sel}</div>
      <div class="card-b muted small" style="padding:4px 14px 10px">Temporada simulada partida a partida (mesmo motor da sua liga).</div></div>`
      + leagueTableHTML(comp, true, comp.year);
  }

  function leagueTableHTML(L, zones, year) {
    const G = g();
    const table = E().tableOf(G, L);
    const z = zones ? E().leagueZones(G, L) : null;
    const rows = table.map(function (t, i) {
      const pos = i + 1;
      let zc = "";
      if (z) {
        if (pos <= z.lib) zc = "z-lib";
        else if (z.sula > 0 && pos <= z.sula) zc = "z-sula";
        else if (pos > z.reb) zc = "z-reb";
      }
      const c = CQ.engine.oppObj(G, t.id);
      return `<tr class="${isMineId(G, t.id) ? "me" : ""} ${zc}">
        <td class="tnum">${pos}</td><td><span class="clubcell">${crest(c, "crest-20")} ${esc(c.name)}</span></td>
        <td class="num">${t.j}</td><td class="num">${t.v}</td><td class="num">${t.e}</td><td class="num">${t.d}</td>
        <td class="num">${t.gp - t.gc > 0 ? "+" : ""}${t.gp - t.gc}</td><td class="num"><b>${t.pts}</b></td></tr>`;
    }).join("");
    const legend = z ? `<div class="legend-dots">
      <span><i class="lg-lib"></i>Zona continental principal</span>
      ${z.sula > 0 ? '<span><i class="lg-sula"></i>Segunda vaga continental</span>' : ""}
      <span><i class="lg-reb"></i>Rebaixamento</span></div>` : "";
    return `<div class="card"><div class="card-h"><h3>${esc(L.name)} · ${year != null ? year : g().year}</h3></div>
      <div class="card-b tight" style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>#</th><th>Clube</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th class="num">SG</th><th class="num">Pts</th></tr></thead>
      <tbody>${rows}</tbody></table>${legend}</div></div>`;
  }

  function estHTML(est) {
    const k = est.knock;
    let knock = "";
    if (k && k.sf) {
      knock = `<div class="card mt16"><div class="card-h"><h3>Mata-mata</h3></div><div class="card-b">
        <div class="bracket">
          <div class="br-round"><h4>Semifinais</h4>${k.sf.map(tieHTML).join("")}</div>
          <div class="br-round"><h4>Final</h4>${k.f ? tieHTML(k.f) : '<div class="br-tie"><div class="br-t muted">A definir</div></div>'}</div>
        </div>
        ${k.champion ? `<p class="mt8"><b>Campeão: ${esc(k.champion)}</b></p>` : ""}
      </div></div>`;
    }
    return leagueTableHTML(est, false) + knock;
  }

  function tieHTML(t) {
    const G = g();
    const a = CQ.engine.oppObj(G, t.a), b = CQ.engine.oppObj(G, t.b);
    const mine = isMineId(G, t.a) || isMineId(G, t.b);
    const pens = t.pens ? `<span class="condsmall">(${t.pens[0]}-${t.pens[1]} pên.)</span>` : "";
    // ida e volta: o placar principal é o AGREGADO, e as duas partidas aparecem embaixo
    let legs = "";
    if (t.legs && (t.legs[0] || t.legs[1])) {
      const rot = ["ida", "volta"].map(function (nome, i) {
        const l = t.legs[i];
        return l ? `${nome} ${l[0]}-${l[1]}` : null;
      }).filter(Boolean).join(" · ");
      if (rot) legs = `<div class="br-legs">${rot}</div>`;
    }
    return `<div class="br-tie ${mine ? "mine" : ""}">
      <div class="br-t ${t.winner === t.a ? "wn" : ""}"><span class="clubcell">${crest(a, "crest-20")} ${esc(a.short)}</span><span class="sc">${t.sa != null ? t.sa : ""}</span></div>
      <div class="br-t ${t.winner === t.b ? "wn" : ""}"><span class="clubcell">${crest(b, "crest-20")} ${esc(b.short)}</span><span class="sc">${t.sb != null ? t.sb : ""} ${pens}</span></div>
      ${legs}
    </div>`;
  }

  function cupHTML(cup) {
    if (!cup) return '<div class="card"><div class="card-b muted">Sem copa nesta temporada.</div></div>';
    const rounds = cup.stages.map(function (st, i) {
      const ties = st.ties ? st.ties.map(tieHTML).join("") : '<div class="br-tie"><div class="br-t muted">A definir</div></div>';
      return `<div class="br-round"><h4>${CQ.engine.STAGE_NAMES[st.key]}</h4>${ties}</div>`;
    }).join("");
    const status = cup.champion ? `<p class="mt8"><b>Campeão: ${esc(cup.champion)}</b></p>`
      : !cup.alive ? `<p class="mt8 muted">Sua equipe foi eliminada nas ${CQ.engine.STAGE_NAMES[cup.eliminatedAt] || "fases iniciais"}.</p>` : "";
    return `<div class="card"><div class="card-h"><h3>${esc(cup.name)} · ${g().year}</h3></div>
      <div class="card-b"><div class="bracket">${rounds}</div>${status}</div></div>`;
  }

  function contiHTML(C) {
    const group = leagueTableHTML(C.group, false).replace("card-h\"><h3>" + esc(C.group.name), "card-h\"><h3>" + esc(C.name) + " · Grupo");
    let ko = "";
    if (C.bracket) {
      ko = '<div class="mt16">' + cupHTML(C.bracket) + '</div>';
    } else if (C.eliminatedAt === "G") {
      ko = `<div class="notice mt12">Eliminado na fase de grupos.</div>`;
    }
    return group + ko;
  }

  function selTourHTML(G, T, p, nat) {
    // T.champion é sincronizado assim que o bracket termina de resolver — inclusive quando
    // NÃO é o jogador quem vence (o resto do chaveamento continua avançando mesmo depois
    // da sua eliminação). Só comemora quando o campeão é de fato a própria seleção.
    const status = T.champion === nat.name ? `<div class="notice ok">${I.trophy} CAMPEÃO! ${esc(T.name)} conquistada com a ${esc(nat.name)}!</div>`
      : T.eliminatedAt ? `<div class="notice">Eliminado (${CQ.engine.STAGE_NAMES[T.eliminatedAt] || "fase de grupos"}).${T.champion ? " Campeão: " + esc(T.champion) + "." : ""}</div>` : "";

    const cfg = CQ.engine.TOUR_CONF[T.kind] || { thirds: 0 };
    const letters = Object.keys(T.groups);
    const totalQualifiers = letters.length * 2 + cfg.thirds;
    const thirdsTxt = cfg.thirds > 0 ? `, mais os ${cfg.thirds} melhores terceiros colocados entre os ${letters.length} grupos` : "";
    let gf = CQ.state.wcGroup;
    if (!gf || letters.indexOf(gf) < 0) gf = T.myGroup;
    const sel = `<select onchange="CQ.state.wcGroup=this.value;CQ.ui.render()" style="border:1px solid var(--ink);background:var(--paper-2);color:var(--ink);padding:6px 10px;font-size:14px">
      ${letters.map(function (l) { return `<option value="${l}" ${gf === l ? "selected" : ""}>Grupo ${l}${l === T.myGroup ? " (você)" : ""}</option>`; }).join("")}</select>`;
    const groupBlock = `<div class="card mb12"><div class="card-h"><h3>Fase de grupos</h3>${sel}</div>
      <div class="card-b tight" style="padding:0">${leagueTableHTML(T.groups[gf], false)}</div>
      <p class="small muted" style="padding:0 14px 10px">Classificam-se os 2 primeiros de cada grupo${thirdsTxt}.</p></div>`;

    const bracketBlock = T.bracket ? cupHTML(T.bracket)
      : (T.eliminatedAt === "G" ? `<div class="notice mt12">Eliminado na fase de grupos — não ficou entre as ${totalQualifiers} melhores.</div>`
        : '<div class="card"><div class="card-b muted">Mata-mata ainda não definido.</div></div>');

    const thirdBlock = T.thirdPlace ? `<div class="card mt16"><div class="card-h"><h3>Disputa de 3º lugar</h3></div>
      <div class="card-b"><div class="bracket"><div class="br-round">${tieHTML(T.thirdPlace)}</div></div></div></div>` : "";

    return `<div class="card mb12"><div class="section-banner"><span class="sb-title">${esc(T.name)} ${g().year}</span><span class="sb-meta">${p.natTeam.caps} caps · ${p.natTeam.goals} gols pela seleção</span></div>
      <div class="card-b">${status}</div></div>
      ${groupBlock}${bracketBlock}${thirdBlock}`;
  }

  function selHTML(S) {
    const G = g(), T = S.sel, p = G.player, nat = D.NATIONS[p.nat];
    if (!T) return "";
    if (T.kind === "notqualified") {
      return `<div class="card"><div class="section-banner"><span class="sb-title">${esc(T.name)} ${g().year}</span><span class="sb-meta">${p.natTeam.caps} caps · ${p.natTeam.goals} gols pela seleção</span></div>
        <div class="card-b"><div class="notice">A ${esc(nat.name)} não se classificou pro ${esc(T.name)} nesta edição — a campanha nas eliminatórias não rendeu pontos suficientes. Sem jogos de seleção neste ciclo.</div></div></div>`;
    }
    if (T.isFullSim) return selTourHTML(G, T, p, nat);
    const title = T.kind === "elim" ? "Eliminatórias" : T.name;
    const status = T.champion ? `<div class="notice ok">${I.trophy} CAMPEÃO! ${esc(T.name)} conquistada com a ${esc(nat.name)}!</div>`
      : T.eliminatedAt ? `<div class="notice">Eliminado (${CQ.engine.STAGE_NAMES[T.eliminatedAt] || "grupos"}).</div>` : "";

    // todos os confrontos da seleção nesta temporada (jogados + agendados)
    const selFix = E().peekSchedule(G).filter(function (m) { return m.comp === "SEL"; });
    const fixRows = selFix.map(function (m) {
      if (m.done) {
        const pill = m.win ? "V" : m.draw ? "E" : "D";
        return `<tr><td><span class="clubcell">${m.oppName ? crest("nat:" + m.oppName, "crest-20") : ""} ${esc(m.oppName || "—")}</span></td>
          <td class="num"><span class="cal-res"><span class="result-pill ${pill}">${pill}</span> <b class="tnum">${m.gm}-${m.go}</b></span></td>
          <td class="num">${m.plays && m.pg ? notaPill(m.nota) : (m.plays ? notaPill(m.nota) : '<span class="muted">—</span>')}</td></tr>`;
      }
      return `<tr><td><span class="clubcell">${m.oppName ? crest("nat:" + m.oppName, "crest-20") : ""} ${esc(m.oppName || "<span class=muted>a definir</span>")}</span></td>
        <td class="num muted small" colspan="2">${m.label.indexOf("Grupo") >= 0 ? "grupo" : m.label.split("·").pop().trim()} · agendado</td></tr>`;
    }).join("") || '<tr><td colspan="3" class="muted small" style="padding:10px">Ainda sem jogos neste ciclo.</td></tr>';

    // grupo (torneios) ou lista de adversários (eliminatórias)
    let groupCard = "";
    if (T.kind !== "elim" && T.groupOpps) {
      const members = [nat.name].concat(T.groupOpps);
      groupCard = `<div class="card mb12"><div class="section-banner"><span class="sb-title">Fase de grupos</span><span class="sb-meta">${esc(T.name)}</span></div>
        <div class="card-b"><div class="choice-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
          ${members.map(function (n) { return `<div class="choice" style="cursor:default"><span class="flex">${crest("nat:" + n, "crest-20")} <b>${esc(n)}</b></span>${n === nat.name ? '<small class="verm">sua seleção</small>' : ""}</div>`; }).join("")}
        </div><p class="small muted mt8">Classificam-se os 2 primeiros do grupo (você precisa de ${4} pontos).</p></div></div>`;
    }

    return groupCard + `<div class="card"><div class="section-banner"><span class="sb-title">${esc(title)} ${g().year}</span><span class="sb-meta">${p.natTeam.caps} caps · ${p.natTeam.goals} gols pela seleção</span></div>
      <div class="card-b">${status}</div>
      <div class="card-b tight" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Adversário</th><th class="num">Placar</th><th class="num">Nota</th></tr></thead><tbody>${fixRows}</tbody></table></div></div>`;
  }

  function superHTML(G) {
    const T = G.season.super;
    const myName = E().myClub(G).name;
    // T.champion é sincronizado assim que o bracket termina de resolver, inclusive quando
    // NÃO é o clube do jogador quem vence — só comemora quando o campeão é o próprio clube.
    const status = T.champion === myName ? `<div class="notice ok">${I.trophy} CAMPEÃO! Supermundial conquistado com o ${esc(myName)}!</div>`
      : T.eliminatedAt ? `<div class="notice">Eliminado (${CQ.engine.STAGE_NAMES[T.eliminatedAt] || "fase de grupos"}).${T.champion ? " Campeão: " + esc(T.champion) + "." : ""}</div>` : "";
    const groupRows = (T.groupOpps || []).map(function (oppId) {
      return `<div class="choice" style="cursor:default"><span class="flex">${crest(oppId, "crest-20")} <b>${esc(CQ.engine.oppObj(G, oppId).name)}</b></span></div>`;
    }).join("");
    const groupBlock = `<div class="card mb12"><div class="section-banner"><span class="sb-title">Fase de grupos</span><span class="sb-meta">Supermundial</span></div>
      <div class="card-b"><div class="choice-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${groupRows}</div>
      <p class="small muted mt8">Classifica-se ao mata-mata quem somar pelo menos 4 pontos nos 3 jogos de grupo.</p></div></div>`;
    const bracketBlock = T.bracket ? cupHTML(T.bracket)
      : (T.eliminatedAt === "G" ? '<div class="notice mt12">Eliminado na fase de grupos — não avançou ao mata-mata de 16.</div>'
        : '<div class="card"><div class="card-b muted">Mata-mata ainda não definido.</div></div>');
    return `<div class="card mb12"><div class="section-banner"><span class="sb-title">Supermundial ${g().year}</span></div>
      <div class="card-b">${status}</div></div>
      ${groupBlock}${bracketBlock}`;
  }

  function champsHTML(G) {
    const f = CQ.state.champFilter || "BRA";
    const keys = Object.keys(G.champs).filter(function (k) { return Object.keys(G.champs[k]).length; });
    const names = {};
    keys.forEach(function (k) {
      names[k] = D.COMP_NAMES[k] || (D.LEAGUES[k] ? D.LEAGUES[k].name : k);
    });
    const sel = `<select onchange="CQ.state.champFilter=this.value;CQ.ui.render()" style="border:1px solid var(--ink);background:var(--paper-2);color:var(--ink);padding:6px 10px;font-size:14px">
      ${keys.map(function (k) { return `<option value="${k}" ${f === k ? "selected" : ""}>${esc(names[k])}</option>`; }).join("")}</select>`;
    const data = G.champs[f] || {};
    const rows = Object.keys(data).sort(function (a, b) { return b - a; }).map(function (y) {
      const isMe = data[y] === E().myClub(G).name || data[y] === D.NATIONS[G.player.nat].name;
      return `<tr><td class="tnum">${y}</td><td><b>${esc(data[y])}</b> ${isMe && +y >= 2026 ? '<span class="badge badge-gold">com você</span>' : ""}</td></tr>`;
    }).join("");
    return `<div class="card"><div class="card-h"><h3>Histórico de campeões</h3>${sel}</div>
      <div class="card-b tight" style="max-height:480px;overflow-y:auto"><table class="tbl tbl-zebra"><thead><tr><th>Ano</th><th>Campeão</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="small muted" style="padding:8px 14px">Edições até 2026 são fatos reais; a partir de 2027, a história é escrita por você.</p></div>
      ${hallScorersHTML(G, f)}`;
  }

  // artilheiros históricos reais da competição, com você inserido
  function hallScorersHTML(G, key) {
    const hall = D.HALL_SCORERS[key];
    if (!hall) return "";
    const p = G.player;
    const mine = (p.compGoals && p.compGoals[key]) || 0;
    // só entra na lista ranqueada quem já marcou; com 0 gols, você aparece separado no rodapé
    const base = hall.list.map(function (s) { return { name: s.name, n: s.n, me: false }; });
    const ranked = base.slice();
    if (mine > 0) ranked.push({ name: p.name, n: mine, me: true });
    ranked.sort(function (a, b) { return b.n - a.n; });
    const myRank = mine > 0 ? ranked.findIndex(function (s) { return s.me; }) + 1 : null;
    const passed = base.filter(function (s) { return s.n < mine; }).length;
    const rows = ranked.map(function (s, i) {
      return `<tr class="${s.me ? "me" : ""}"><td class="tnum">${i + 1}º</td><td>${esc(s.name)}${s.me ? ' <span class="badge badge-gold">você</span>' : ""}</td><td class="num"><b>${s.n}</b></td></tr>`;
    }).join("");
    // linha do jogador quando ainda não pontuou
    const myFoot = mine === 0
      ? `<tr class="me"><td class="tnum">—</td><td>${esc(p.name)} <span class="badge badge-gold">você</span></td><td class="num"><b>0</b></td></tr>`
      : "";
    return `<div class="card mt16"><div class="section-banner"><span class="sb-title">Artilheiros de todos os tempos</span><span class="sb-meta">${base.length} lendas · dados reais</span></div>
      <div class="card-b tight" style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>Jogador</th><th class="num">Gols</th></tr></thead><tbody>${rows}${myFoot}</tbody></table></div>
      <p class="small muted" style="padding:8px 14px">${mine > 0 ? `Você tem <b>${mine}</b> gols nesta competição — <b>${myRank}º</b> na lista histórica de ${base.length + 1}${passed ? `, já passou ${passed} ${U.plural(passed, "lenda", "lendas")}` : ""}. ` : `Você ainda não marcou nesta competição. Comece a fazer gols para escalar a lista dos <b>${base.length}</b> maiores goleadores da história do torneio.`}</p></div>`;
  }

  // ---------------- FEED ----------------
  function postHTML(post) {
    let av;
    if (post.clubAv) av = crest(post.clubAv, "");
    else if (post.natAv && D.NATIONS[post.natAv]) av = U.natAvatar(D.NATIONS[post.natAv]);
    else if (post.k === "voce") av = U.portraitSVG(g().player.name + g().seed, 42);
    else if (post.k === "rival") av = U.portraitSVG(post.name + "rival", 42);
    else {
      const P = CQ.nar.PROFILES[post.k];
      av = P && P.av ? P.av() : CQ.nar.PROFILES.imprensa.av();
    }
    const body = post.poll ? pollHTML(post) : `<div class="pbody">${esc(post.text)}</div>`;
    return `<div class="post ${post.hot ? "hot" : ""}">
      <div class="pavatar">${av}</div>
      <div><div class="phead"><span class="pname">${esc(post.name)}</span><span class="phandle">${esc(post.handle || "")}</span><span class="ptag">${esc(post.tag)}</span></div>
      ${body}
      <div class="pmeta"><span>${I.heart} ${fmtK(post.likes)}</span><span>${I.repost} ${fmtK(post.rp)}</span><span>${post.year}</span></div></div>
    </div>`;
  }

  function pollHTML(post) {
    const poll = post.poll;
    const voted = poll.voted != null;
    const total = poll.opts.reduce(function (s, o) { return s + o.base; }, 0) || 1;
    const opts = poll.opts.map(function (o, i) {
      const pct = Math.round(o.base / total * 100);
      if (voted) {
        return `<div class="poll-opt ${poll.voted === i ? "mine" : ""}"><span class="poll-bar" style="width:${pct}%"></span><span>${esc(o.label)} <span class="poll-pct">${pct}%</span></span></div>`;
      }
      return `<button class="poll-opt" onclick="CQ.ui.votePoll(${post.id},${i})"><span>${esc(o.label)}</span></button>`;
    }).join("");
    return `<div class="pbody"><div class="poll"><div class="poll-q">${esc(poll.q)}</div>${opts}${voted ? `<span class="poll-voted-tag">Você votou · ${fmtK(total)} votos</span>` : `<span class="poll-voted-tag">Toque para votar</span>`}</div></div>`;
  }
  function votePoll(feedId, optIdx) {
    const fx = CQ.nar.applyVote(g(), feedId, optIdx);
    CQ.main.save();
    render();
    if (fx) {
      const bits = [];
      if (fx.fame) bits.push((fx.fame > 0 ? "+" : "") + fx.fame + " fama");
      if (fx.rep) bits.push((fx.rep > 0 ? "+" : "") + fx.rep + " reputação");
      if (fx.morale) bits.push((fx.morale > 0 ? "+" : "") + fx.morale + " moral");
      if (bits.length) toast("Voto registrado: " + bits.join(", "));
    }
  }
  function fmtK(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",") + " mil" : n; }

  function feedHTML() {
    const G = g(), p = G.player;
    const f = CQ.state.feedFilter || "all";
    const openPolls = G.feed.filter(function (po) { return po.poll && po.poll.voted == null; }).length;
    const tabs = [["all", "Tudo"], ["imprensa", "Imprensa"], ["torcida", "Torcida"], ["poll", "Enquetes" + (openPolls ? " (" + openPolls + ")" : "")]];
    const list = G.feed.filter(function (po) {
      if (f === "poll") return !!po.poll;
      if (f === "all") return true;
      if (f === "imprensa") return po.tag === "Imprensa";
      if (f === "torcida") return po.tag === "Torcida" || po.tag === "Rival";
      return true;
    });
    const subtabs = `<div class="subtabs">${tabs.map(function (t) {
      return `<button class="${f === t[0] ? "on" : ""}" onclick="CQ.state.feedFilter='${t[0]}';CQ.ui.render()">${t[1]}</button>`;
    }).join("")}</div>`;
    const posts = list.length ? list.map(postHTML).join("")
      : `<div class="feed-empty">${I.feed}<b>Silêncio nas redes</b><span>Entre em campo e dê o que falar — a imprensa e a torcida vão reagir.</span></div>`;

    // rail: termômetro da imagem
    const buzz = `<div>
      <div class="section-banner"><span class="sb-title">Termômetro</span><span class="sb-meta">Sua imagem</span></div>
      <div class="card" style="border-top:none"><div class="card-b">
        <div class="meter-lbl"><span>Fama</span><span class="tnum">${Math.round(p.fame)}</span></div>${bar(p.fame, 100)}
        <div class="meter-lbl mt8"><span>Reputação</span><span class="tnum">${Math.round(p.rep)}</span></div>${bar(p.rep, 100)}
        <div class="meter-lbl mt8"><span>Moral</span><span class="tnum">${Math.round(p.morale)}%</span></div>${bar(p.morale, 100, p.morale < 35)}
        ${openPolls ? `<p class="condsmall mt8">${I.feed} ${openPolls} ${U.plural(openPolls, "enquete aberta", "enquetes abertas")} esperando seu voto.</p>` : ""}
      </div></div></div>`;

    // rail: o rival
    let rivalCard = "";
    const rv = G.rival;
    if (rv) {
      const rvClub = E().oppObj(G, rv.clubId);
      const myG = p.stats.g, rvG = rv.seasonG || 0;
      const verdict = myG > rvG ? "Você lidera o duelo da temporada." : myG < rvG ? "Ele está na frente. A resposta é em campo." : "Duelo particular empatado. Tudo em aberto.";
      rivalCard = `<div>
        <div class="section-banner"><span class="sb-title">O Rival</span><span class="sb-meta">De olho</span></div>
        <div class="card" style="border-top:none"><div class="card-b">
          <div class="flex" style="align-items:center;gap:12px">
            <div class="player-face" style="width:54px;height:54px;flex-shrink:0">${U.portraitSVG(rv.name + "rival", 54)}</div>
            <div style="flex:1;min-width:0">
              <div class="dossier-name" style="font-size:18px">${esc(rv.name)}</div>
              <div class="dossier-sub">${esc(rvClub.short || rvClub.name)} · ${D.POSITIONS[rv.pos].name} · ${rv.age} anos</div>
            </div>
            <div style="text-align:right"><div class="dossier-ov" style="font-size:30px">${rv.overall}</div><div class="dossier-sub">Overall</div></div>
          </div>
          <hr class="rule">
          <div class="tiles"><div class="tile"><b class="tnum">${myG}</b><span>Seus gols</span></div><div class="tile"><b class="tnum">${rvG}</b><span>Gols dele</span></div></div>
          <p class="condsmall mt8">${verdict}</p>
        </div></div></div>`;
    }

    return `<div class="section-banner"><span class="sb-title">A Rede</span><span class="sb-meta">O que falam de você</span></div>
    <div class="cols mt12">
      <div class="stack">${subtabs}<div class="card"><div class="card-b tight">${posts}</div></div></div>
      <div class="stack">${buzz}${rivalCard}</div>
    </div>`;
  }

  // ---------------- CLUBE ----------------
  function squadOf(G) {
    const cl = E().myClub(G);
    // lê do mundo persistente (identidade estável, envelhece de verdade) quando existir;
    // fallback pro gerador antigo (save em migração, ou clube sem dado no mundo)
    if (G.world && G.world.clubs[cl.id]) {
      return G.world.clubs[cl.id].roster.map(function (pl) {
        return { name: pl.name, pos: pl.pos, age: pl.age, ov: pl.ovr, real: pl.real };
      }).sort(function (a, b) { return b.ov - a.ov; });
    }
    // fallback (sem CQ.world): mesma chave de RNG e mesmos helpers de idade/overall
    // que initClubRoster (js/world.js) usa, pra nunca divergir do mundo persistente.
    const rng = U.rngFor(G.seed, "squad", cl.id, G.year);
    const real = D.REAL_SQUADS && D.REAL_SQUADS[cl.id];
    if (real) {
      return real.map(function (pl) {
        const rolled = CQ.world.rollAge(rng, 35); // sempre rola (consumo de RNG constante — ver comentário em initClubRoster)
        const trueAge = CQ.world.realAge(G, cl.id, pl.n);
        return { name: pl.n, pos: pl.p, age: trueAge != null ? trueAge : rolled, ov: CQ.world.rollOvr(cl.str, rng), real: true };
      }).sort(function (a, b) { return b.ov - a.ov; });
    }
    const POSN = ["GOL", "GOL", "ZAG", "ZAG", "ZAG", "LAT", "LAT", "LAT", "VOL", "VOL", "VOL", "MEI", "MEI", "MEI", "PON", "PON", "PON", "ATA", "ATA", "ATA"];
    return POSN.map(function (pos, i) {
      return { name: U.nameGen(rng, "BR"), pos: pos, age: CQ.world.rollAge(rng, 34), ov: CQ.world.rollOvr(cl.str, rng, 5, 4, 52, 92) };
    }).sort(function (a, b) { return b.ov - a.ov; });
  }

  function baseHTML(G) {
    const cl = E().myClub(G);
    const rows = squadOf(G)
      .filter(function (j) { return j.age <= 20; })
      .sort(function (a, b) { return b.ov - a.ov || a.age - b.age; })
      .map(function (j) {
        return `<tr><td>${esc(j.name)}</td><td>${D.POSITIONS[j.pos].name}</td><td class="num">${j.age}</td><td class="num"><b>${j.ov}</b></td></tr>`;
      }).join("");
    return `<div class="card"><div class="card-h"><h3>Base ${esc(cl.name)}</h3><span class="kicker-side">jogadores até 20 anos</span></div>
      <div class="card-b tight" style="overflow-x:auto"><table class="tbl tbl-zebra"><thead><tr><th>Jogador</th><th>Posição</th><th class="num">Idade</th><th class="num">OVR</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" class="small muted" style="padding:10px 14px">Nenhum jogador de base (≤20 anos) no elenco no momento.</td></tr>`}</tbody></table></div>
      <p class="small muted" style="padding:8px 14px">Promessas da base envelhecem e evoluem normalmente — fique de olho, algumas podem virar peças importantes com o tempo.</p></div>`;
  }

  const MGR_LINES = {
    3: ["Pode contar comigo até o fim.", "Você é o motivo de eu dormir tranquilo antes do jogo.", "Enquanto eu mandar aqui, sua vaga é garantida."],
    2: ["Sigo confiando no seu trabalho.", "Você tem meu apoio — continue assim.", "Ainda é minha primeira opção pra escalação."],
    1: ["Preciso ver mais consistência de você.", "Talento não falta, mas o lugar se conquista toda semana.", "Ainda estou te conhecendo dentro de campo."],
    0: ["Preciso de mais de você, e rápido.", "Não posso segurar sua vaga pra sempre.", "A cobrança vai aumentar se isso continuar assim."]
  };
  // fala curta do técnico, seedada pela faixa de confiança (não pelo número cru, que
  // pode oscilar ±1 sem evento real) — clubHTML re-renderiza a cada troca de sub-aba,
  // então precisa ser estável enquanto nada relevante muda (mesmo padrão do matchdayBanner)
  function managerConfTier(conf) {
    return conf >= 75 ? 3 : conf >= 55 ? 2 : conf >= 35 ? 1 : 0;
  }
  function managerLine(G, conf) {
    const tier = managerConfTier(conf);
    const rng = U.rngFor(G.seed, "mgrline", G.year, G.season.idx, tier);
    return U.choice(MGR_LINES[tier], rng);
  }

  function clubHTML() {
    const G = g(), p = G.player, cl = E().myClub(G);
    const lg = E().leagueOf(G, p.clubId);
    const tab = CQ.state.clubTab || "info";
    const tabs = [["info", "Visão geral"], ["elenco", "Elenco"], ["base", "Base"], ["vida", "Estilo de vida"], ["fin", "Contrato & mercado"], ["save", "Save & dados"]];
    const subtabs = `<div class="subtabs">${tabs.map(function (t) {
      return `<button class="${tab === t[0] ? "on" : ""}" onclick="CQ.state.clubTab='${t[0]}';CQ.ui.render()">${t[1]}</button>`;
    }).join("")}</div>`;
    let body = "";
    if (tab === "info") {
      body = `<div class="cols"><div class="stack">
        <div class="card"><div class="card-h"><h3>${esc(cl.name)}</h3><span class="kicker-side">${D.LEAGUES[lg] ? esc(D.LEAGUES[lg].name) : lg}</span></div>
          <div class="card-b"><div class="flex" style="align-items:flex-start">
            ${crest(cl, "crest-48")}
            <div style="flex:1">
              <div class="tiles"><div class="tile"><b class="tnum">${cl.str}</b><span>Força do elenco</span></div>
              <div class="tile"><b>${cl.uf || "—"}</b><span>Estado</span></div>
              <div class="tile"><b class="tnum">${G.boardFail}</b><span>Metas falhadas</span></div></div>
              <div class="notice ${G.boardFail ? "warn" : "ok"} mt12">${I.whistle} Meta da temporada: <b>${esc(G.board.desc)}</b>${G.boardFail ? " — a paciência da diretoria está curta." : ""}</div>
              ${p.idolClubs && p.idolClubs.indexOf(p.clubId) >= 0 ? `<div class="notice ok mt8">${I.star} <b>Ídolo do ${esc(cl.name)}</b> — estátua e nome eternizado. ${p.clubGoals[p.clubId] || 0} gols com essa camisa.</div>` : `<p class="small muted mt8">Gols por este clube: <b>${p.clubGoals[p.clubId] || 0}</b>. Faça história (100 gols, ou 60 gols + 2 títulos) para virar ídolo eterno.</p>`}
              ${p.captain === p.clubId ? `<div class="notice ok mt8">${I.trophy} <b>Capitão do ${esc(cl.name)}</b> — a braçadeira é sua.</div>` : ""}
            </div>
          </div></div></div>
        <div class="card"><div class="card-h"><h3>Centro de treinamento</h3></div><div class="card-b">
          <p class="small muted mb8">Escolha o <b>foco de treino</b>: seus pontos de evolução vão priorizar esses atributos. Boas atuações rendem mais pontos (${p.age <= 24 ? "e até os 24 o crescimento é mais rápido" : p.age <= 33 ? "evolução gradual na sua fase" : "aqui o desafio é segurar o nível"}).</p>
          <div class="choice-grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">
            ${[["equil", "Equilibrado", "sem prioridade"], ["ataque", "Ataque", "finalização + posição"], ["criacao", "Criação", "passe + drible"], ["atletico", "Atlético", "ritmo + físico"], ["defensivo", "Defesa", "marcação + reflexo"], ["bolaparada", "Bola parada", "faltas e pênaltis"]].map(function (f) {
        return `<button class="choice ${G.trainingFocus === f[0] ? "sel" : ""}" onclick="CQ.ui.setFocus('${f[0]}')"><b>${f[1]}</b><small>${f[2]}</small></button>`;
      }).join("")}
          </div>
          <div class="meter-lbl mt12"><span>Progresso até o próximo ponto</span><span class="tnum">${Math.round((p.xp % 1) * 100)}%</span></div>${bar((p.xp % 1) * 100, 100)}
        </div></div>
      </div><div class="stack">
        ${(function () {
        const conf = E().managerConf(G);
        const mgr = G.manager ? G.manager.name : "—";
        const confLbl = conf >= 75 ? "Confia cegamente em você" : conf >= 55 ? "Conta com você" : conf >= 35 ? "Ainda te avalia" : "Desconfiado — sua vaga corre risco";
        const roleLbl = { estrela: "Estrela do time", titular: "Titular", rotacao: "Peça de rotação" }[p.squadRole] || "Titular";
        return `<div class="card"><div class="card-h"><h3>Técnico &amp; vestiário</h3></div><div class="card-b">
          <div class="flex" style="align-items:center;gap:12px">
            <div class="player-face" style="width:52px;height:52px;flex-shrink:0">${U.portraitSVG("mgr" + mgr, 52)}</div>
            <div style="flex:1;min-width:0"><b style="font-family:var(--serif);font-size:16px">${esc(mgr)}</b><div class="condsmall">Treinador · ${esc(roleLbl)}</div></div>
          </div>
          <div class="meter-lbl mt12"><span>Confiança do técnico</span><span class="tnum">${Math.round(conf)}%</span></div>${bar(conf, 100, conf < 40)}
          <p class="small muted mt8">${esc(confLbl)}. A confiança sobe com boas atuações e cai quando você não rende ou fica no banco — e decide sua titularidade.</p>
          <blockquote class="mgr-quote">"${esc(managerLine(G, conf))}"</blockquote>
          ${p.captain === p.clubId ? `<span class="badge badge-gold mt8">${I.trophy} Capitão</span>` : ""}
        </div></div>`;
      })()}
        <div class="card"><div class="card-h"><h3>Escudo personalizado</h3></div><div class="card-b">
          <p class="small muted mb8">Não usamos logotipos oficiais. Se você tiver o escudo do clube em PNG, cole a URL (ou caminho local do arquivo) abaixo:</p>
          <div class="field"><input type="text" id="logo-url" placeholder="https://... ou file:///C:/escudos/meu.png" value="${esc(G.customLogos[cl.id] || "")}"></div>
          <div class="btnrow"><button class="btn btn-sm" onclick="CQ.ui.setLogo('${cl.id}')">Aplicar</button>
          <button class="btn btn-sm btn-ghost" onclick="CQ.ui.clearLogo('${cl.id}')">Voltar ao brasão desenhado</button></div>
        </div></div>
      </div></div>`;
    } else if (tab === "elenco") {
      const squad = squadOf(G);
      const rows = squad.map(function (j) {
        return `<tr><td>${esc(j.name)}</td><td>${D.POSITIONS[j.pos].name}</td><td class="num">${j.age}</td><td class="num"><b>${j.ov}</b></td></tr>`;
      }).join("");
      const meRow = `<tr class="me"><td>${esc(p.name)} <span class="badge badge-gold">você</span></td><td>${D.POSITIONS[p.pos].name}</td><td class="num">${p.age}</td><td class="num"><b>${p.overall}</b></td></tr>`;
      const realCount = squad.filter(function (j) { return j.real; }).length;
      const kicker = !realCount ? "nomes fictícios" : realCount === squad.length ? "elenco real" : realCount + " de " + squad.length + " nomes reais";
      body = `<div class="card"><div class="card-h"><h3>Elenco ${esc(cl.name)}</h3><span class="kicker-side">${kicker}</span></div>
        <div class="card-b tight" style="overflow-x:auto"><table class="tbl tbl-zebra"><thead><tr><th>Jogador</th><th>Posição</th><th class="num">Idade</th><th class="num">OVR</th></tr></thead>
        <tbody>${meRow}${rows}</tbody></table></div>
        <p class="small muted" style="padding:8px 14px">Se o seu overall ficar muito abaixo do nível do elenco, o técnico vai te deixar no banco — titularidade se conquista.</p></div>`;
    } else if (tab === "base") {
      body = baseHTML(G);
    } else if (tab === "vida") {
      const inc = E().assetIncome(G);
      const items = E().LIFESTYLE.map(function (it) {
        const owned = p.assets.indexOf(it.key) >= 0;
        const canBuy = !owned && p.money >= it.cost;
        const fx = [];
        if (it.fame) fx.push("+" + it.fame + " fama");
        if (it.rep) fx.push("+" + it.rep + " reputação");
        if (it.morale) fx.push("+" + it.morale + " moral");
        if (it.income) fx.push(U.fmtBRL(it.income) + "/ano");
        return `<div class="card" style="box-shadow:none">
          <div class="card-b">
            <div class="flex-b"><b style="font-family:var(--serif);font-size:16px">${esc(it.name)}</b>${owned ? '<span class="badge badge-green">adquirido</span>' : `<b class="tnum small">${U.fmtBRL(it.cost)}</b>`}</div>
            <p class="small muted" style="margin:4px 0 8px">${esc(it.desc)}</p>
            <div class="flex-b wrap"><span class="condsmall">${fx.join(" · ")}</span>
            ${owned ? "" : `<button class="btn btn-sm ${canBuy ? "btn-pri" : ""}" ${canBuy ? "" : "disabled"} onclick="CQ.ui.buyAsset('${it.key}')">Comprar</button>`}</div>
          </div></div>`;
      }).join("");
      body = `<div class="card"><div class="section-banner"><span class="sb-title">Estilo de vida &amp; negócios</span><span class="sb-meta">Patrimônio ${U.fmtBRL(p.money)}</span></div>
        <div class="tiles" style="border-top:none;border-bottom:1px solid var(--ink)">
          <div class="tile"><b class="tnum">${U.fmtBRL(p.money)}</b><span>Disponível</span></div>
          <div class="tile"><b class="tnum">${inc ? U.fmtBRL(inc) : "—"}</b><span>Renda passiva/ano</span></div>
          <div class="tile"><b class="tnum">${p.assets.length}</b><span>Bens & negócios</span></div>
        </div>
        <div class="card-b"><div class="choice-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${items}</div>
        <p class="small muted mt12">Alguns bens dão fama/reputação na hora; negócios geram renda passiva creditada a cada fim de temporada. O dinheiro finalmente serve pra algo.</p></div>
      </div>`;
    } else if (tab === "fin") {
      const yearsLeft = Math.max(0, p.contractEnd - G.year);
      const canEurope = p.overall >= 77 || p.fame >= 62;
      const transferPanel = G.transferRequested
        ? `<div class="notice warn mb8">${I.arrowR} Pedido de transferência entregue à diretoria. Ao fim da temporada, propostas de outros clubes vão aparecer no mercado da bola.</div>
           <button class="btn btn-ghost" onclick="CQ.ui.cancelTransfer()">Voltar atrás — quero ficar</button>`
        : `<p class="small muted mb8">Quer mudar de ares? Você pode pedir para deixar o clube. Isso <b>garante que propostas apareçam ao fim da temporada</b> (mesmo com contrato em vigor) — mas mexe com a sua moral e com a diretoria.</p>
           <button class="btn" onclick="CQ.ui.requestTransfer()">Pedir para deixar o clube</button>`;
      body = `<div class="cols"><div class="stack">
        <div class="card"><div class="card-h"><h3>Contrato atual</h3></div><div class="card-b">
          <div class="flex mb8">${crest(cl, "crest-34")}<div><b style="font-family:var(--serif);font-size:18px">${esc(cl.name)}</b><div class="condsmall">${D.LEAGUES[lg] ? esc(D.LEAGUES[lg].name) : lg}</div></div></div>
          <div class="tiles">
            <div class="tile"><b class="tnum">${U.fmtBRL(p.salary)}</b><span>Salário mensal</span></div>
            <div class="tile"><b class="tnum">${p.contractEnd}</b><span>Vínculo até</span></div>
            <div class="tile"><b>${{ estrela: "Estrela", titular: "Titular", rotacao: "Rotação" }[p.squadRole] || "Titular"}</b><span>Papel no elenco</span></div>
          </div>
          <p class="small muted mt12">${p.squadRole === "estrela" ? "Como estrela do time, você tem prioridade na escalação." : p.squadRole === "rotacao" ? "Como peça de rotação, precisa brigar por minutos." : "Como titular, mantém a vaga com bom desempenho."} ${canEurope ? "Sua fama já abre portas na Europa." : "Ganhe fama e overall para atrair clubes maiores."}</p>
        </div></div>
        <div class="card"><div class="card-h"><h3>Patrimônio</h3></div><div class="card-b">
          <div class="tiles">
            <div class="tile"><b class="tnum">${U.fmtBRL(p.money)}</b><span>Acumulado</span></div>
            <div class="tile"><b class="tnum">${U.fmtBRL(p.salary * 12)}</b><span>Por ano (base)</span></div>
          </div>
          <p class="small muted mt12">Cresce com salários, luvas de transferência, bônus de metas (${U.fmtBRL(400000)}) e premiações.</p>
        </div></div>
      </div><div class="stack">
        <div class="card"><div class="card-h"><h3>Pedido de transferência</h3></div><div class="card-b">${transferPanel}</div></div>
        <div class="card"><div class="card-h"><h3>Como funciona o mercado</h3></div><div class="card-b">
          <p class="small muted">Ao fim de cada temporada, se o contrato terminar, se você for dispensado ou se pedir para sair, chega o <b>mercado da bola</b>: 2 a 4 propostas reais (com salário e duração) e a opção de renovar. Fama alta destrava ofertas da Europa.</p>
        </div></div>
      </div></div>`;
    } else {
      body = `<div class="card"><div class="card-h"><h3>Save &amp; dados</h3></div><div class="card-b">
        <p class="small muted mb12">Seu progresso é salvo automaticamente no navegador. Exporte um arquivo de backup para não perder a carreira.</p>
        <div class="btnrow">
          <button class="btn btn-green" onclick="CQ.main.exportSave()">Exportar save (.json)</button>
          <button class="btn" onclick="CQ.main.importSave()">Importar save</button>
          <button class="btn btn-ghost" onclick="CQ.main.resetGame()">Apagar carreira</button>
        </div>
      </div></div>`;
    }
    return subtabs + body;
  }

  function setLogo(clubId) {
    const v = U.cleanInput($("#logo-url").value, 300);
    if (v) g().customLogos[clubId] = v; else delete g().customLogos[clubId];
    CQ.main.save(); render();
  }
  function clearLogo(clubId) {
    delete g().customLogos[clubId];
    CQ.main.save(); render();
  }
  function requestTransfer() {
    E().requestTransfer(g());
    CQ.nar.post(g(), "imprensa", g().player.name + " pede para deixar o " + E().myClub(g()).name + ". O estafe do jogador já negocia uma saída para o fim da temporada.", { hot: true });
    CQ.main.save(); render();
    toast("Pedido de transferência entregue à diretoria.");
  }
  function cancelTransfer() {
    E().cancelTransfer(g());
    CQ.main.save(); render();
    toast("Pedido retirado. Você segue no clube.");
  }
  function setFocus(f) {
    g().trainingFocus = f;
    CQ.main.save(); render();
  }
  function buyAsset(key) {
    const ok = E().buyAsset(g(), key);
    if (!ok) { toast("Patrimônio insuficiente."); return; }
    const it = E().LIFESTYLE.find(function (x) { return x.key === key; });
    CQ.main.save(); render();
    toast(esc(it.name) + " adquirido!");
    if (it.fame >= 10 || it.rep >= 10) CQ.nar.post(g(), "imprensa", g().player.name + " investe em " + it.name.toLowerCase() + " e vira assunto fora de campo.");
  }

  // avalia o legado da carreira (tier + pontuação)
  function careerLegacy(p) {
    const tot = E().careerTotals(g());
    const bolas = p.awards.filter(function (a) { return a.name === "Bola de Ouro"; }).length;
    const wc = p.titles.filter(function (t) { return t.key === "WC"; }).length;
    const ucl = p.titles.filter(function (t) { return t.key === "UCL" || t.key === "LIB"; }).length;
    let score = tot.goals * 1.2 + tot.assists * 0.8 + p.titles.length * 8 + p.awards.length * 6 + bolas * 40 + wc * 30 + ucl * 15 + p.natTeam.caps * 0.5;
    score = Math.round(score);
    let tier;
    if (bolas >= 3 || (wc >= 1 && bolas >= 1) || score >= 900) tier = { t: "LENDA IMORTAL", d: "Seu nome entra para o panteão dos maiores de todos os tempos. Gerações vão contar suas histórias." };
    else if (bolas >= 1 || score >= 600) tier = { t: "CRAQUE HISTÓRICO", d: "Um dos melhores da sua era. A bola sentiu sua falta no dia da despedida." };
    else if (p.titles.length >= 5 || score >= 380) tier = { t: "GRANDE ÍDOLO", d: "Vitorioso e querido. Sua camisa vira relíquia nas arquibancadas." };
    else if (p.titles.length >= 1 || score >= 200) tier = { t: "JOGADOR RESPEITADO", d: "Uma carreira sólida, com dias de glória que ninguém vai esquecer." };
    else tier = { t: "CARREIRA PROFISSIONAL", d: "Viveu do futebol e deixou sua marca por onde passou. Missão cumprida." };
    tier.score = score; tier.bolas = bolas;
    return tier;
  }

  // ---------------- aposentadoria ----------------
  function retroHTML() {
    const G = g(), p = G.player;
    const totalJ = p.career.reduce(function (s, c) { return s + c.j; }, 0);
    const totalG = p.career.reduce(function (s, c) { return s + c.g; }, 0);
    const totalA = p.career.reduce(function (s, c) { return s + c.a; }, 0);
    const clubs = [];
    p.career.forEach(function (c) { if (clubs.indexOf(c.clubName) < 0) clubs.push(c.clubName); });
    const leg = careerLegacy(p);
    const idols = p.idolClubs && p.idolClubs.length ? p.idolClubs : [];
    return `<div class="trophy-banner" style="border:2px solid var(--gold)">
      <div class="tb-k">Edição histórica · aposentadoria</div>
      <h2>${esc(p.name)} pendura as chuteiras</h2>
      <p class="mt8 muted">${p.age} anos · ${p.career.length} temporadas como profissional</p>
    </div>
    <div class="card mt16" style="border:2px solid var(--gold)"><div class="card-b center">
      <div class="tb-k gold" style="font-family:var(--cond);letter-spacing:.2em;text-transform:uppercase;font-size:12px">Veredito da carreira</div>
      <h2 style="font-size:30px;font-style:italic;margin:6px 0">${leg.t}</h2>
      <p class="muted" style="max-width:560px;margin:0 auto">${leg.d}</p>
      ${leg.bolas ? `<p class="mt8"><span class="badge badge-gold">${leg.bolas}× Bola de Ouro</span></p>` : ""}
      ${idols.length ? `<p class="small mt8">Eternizado como <b>ídolo</b> de: ${idols.map(function (id) { return esc(D.CLUBS[id] ? D.CLUBS[id].name : id); }).join(", ")} — com estátua e nome na história do clube.</p>` : ""}
    </div></div>
    <div class="cols mt16">
      <div class="stack">
        <div class="card"><div class="card-h"><h3>Números da carreira</h3></div><div class="card-b">
          <div class="tiles">
            <div class="tile"><b class="tnum">${totalJ}</b><span>Jogos</span></div>
            <div class="tile"><b class="tnum">${p.pos === "GOL" ? p.career.reduce(function (s, c) { return s + c.cs; }, 0) : totalG}</b><span>${p.pos === "GOL" ? "Jogos sem sofrer" : "Gols"}</span></div>
            <div class="tile"><b class="tnum">${totalA}</b><span>Assistências</span></div>
            <div class="tile"><b class="tnum">${p.titles.length}</b><span>Títulos</span></div>
            <div class="tile"><b class="tnum">${p.awards.length}</b><span>Prêmios</span></div>
            <div class="tile"><b class="tnum">${U.fmtBRL(p.money)}</b><span>Patrimônio</span></div>
          </div>
          <p class="small muted mt12">Clubes defendidos: ${clubs.map(esc).join(", ") || esc(E().myClub(G).name)}.</p>
        </div></div>
        ${trophHTML(p)}
      </div>
      <div class="stack">
        ${histHTML(p)}
        <div class="card"><div class="card-b center">
          <button class="btn btn-pri btn-big" onclick="CQ.main.resetToCover()">Começar nova carreira</button>
        </div></div>
      </div>
    </div>`;
  }

  CQ.ui = {
    go: go, render: render, startCreate: startCreate,
    dset: dset, dsetPos: dsetPos, toggleLegend: toggleLegend, randomClub: randomClub,
    createNext: createNext, finishCreate: finishCreate,
    actionPlay: actionPlay, actionPlayLive: actionPlayLive, actionRest: actionRest, actionSim: actionSim,
    liveStep: liveStep, liveDecide: liveDecide, shootPick: shootPick, shootReveal: shootReveal, finishLive: finishLive,
    pickInterview: pickInterview, pickPress: pickPress, pickLife: pickLife,
    seasonEndFlow: seasonEndFlow, summaryNext: summaryNext, summaryNextStep: summaryNextStep, pickOffer: pickOffer, pickRenew: pickRenew,
    pickLoan: pickLoan, declineLoan: declineLoan,
    managerLine: managerLine, managerConfTier: managerConfTier, MGR_LINES: MGR_LINES,
    ctab: ctab, ttab: ttab, closeTitle: closeTitle, closeDraw: closeDraw, closeCapa: closeCapa, votePoll: votePoll,
    setLogo: setLogo, clearLogo: clearLogo, toast: toast,
    requestTransfer: requestTransfer, cancelTransfer: cancelTransfer,
    setFocus: setFocus, buyAsset: buyAsset,
    startClubPool: startClubPool, squadOf: squadOf
  };
})();
