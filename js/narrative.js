/* CRAQUE — camada narrativa: feed de redes sociais, entrevistas
   pós-jogo, eventos de vida e o rival de geração. */
window.CQ = window.CQ || {};

(function () {
  "use strict";
  const U = CQ.util, D = CQ.DATA;

  // ---------- perfis do feed ----------
  const PROFILES = {
    imprensa: { name: "Boletim da Bola", handle: "@boletimdabola", tag: "Imprensa", av: avPress },
    mesa: { name: "Mesa Redonda 90", handle: "@mesa90", tag: "Imprensa", av: avMic },
    torcida: { name: "Central da Torcida", handle: "@centraldatorcida", tag: "Torcida", av: avFan },
    zoeira: { name: "Zoeira FC", handle: "@zoeirafc", tag: "Rival", av: avTroll },
    clube: { name: null, handle: "@oficial", tag: "Clube", av: null },
    selecao: { name: null, handle: "@selecao", tag: "Seleção", av: null },
    voce: { name: null, handle: null, tag: "Você", av: null },
    rival: { name: null, handle: null, tag: "Rival de geração", av: avStar }
  };

  function avPress() {
    return '<svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#1b1812"/><rect x="8" y="10" width="24" height="4" fill="#f4efe2"/><rect x="8" y="18" width="24" height="2.5" fill="#c9bfa4"/><rect x="8" y="23" width="18" height="2.5" fill="#c9bfa4"/><rect x="8" y="28" width="21" height="2.5" fill="#c9bfa4"/></svg>';
  }
  function avMic() {
    return '<svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#17563a"/><rect x="17" y="8" width="6" height="14" rx="3" fill="#f4efe2"/><path d="M13 18v2a7 7 0 0014 0v-2" stroke="#f4efe2" stroke-width="2.4" fill="none"/><rect x="18.8" y="27" width="2.4" height="6" fill="#f4efe2"/></svg>';
  }
  function avFan() {
    return '<svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#bf3711"/><circle cx="20" cy="16" r="6" fill="#f4efe2"/><path d="M8 34c2-8 7-10 12-10s10 2 12 10z" fill="#f4efe2"/><path d="M6 8l5 3-5 3zM34 8l-5 3 5 3z" fill="#f2c500"/></svg>';
  }
  function avTroll() {
    return '<svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#274a78"/><circle cx="20" cy="20" r="11" fill="#f4efe2"/><path d="M14 18l4 2-4 2zM26 18l-4 2 4 2z" fill="#1b1812"/><path d="M14 27q6-5 12 0" stroke="#1b1812" stroke-width="2" fill="none"/></svg>';
  }
  function avStar() {
    return '<svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#9c7c1e"/><path d="M20 8l3.2 7 7.6.9-5.6 5.2 1.5 7.5L20 24.8l-6.7 3.8 1.5-7.5-5.6-5.2 7.6-.9z" fill="#f4efe2"/></svg>';
  }

  // ---------- publicação ----------
  let SEQ = 1;
  function post(g, profileKey, text, opts) {
    opts = opts || {};
    const P = PROFILES[profileKey] || PROFILES.imprensa;
    const p = g.player;
    let name = P.name, handle = P.handle, avatar = profileKey;
    if (profileKey === "clube") { name = CQ.engine.myClub(g).name; handle = "@" + CQ.engine.myClub(g).id + "oficial"; }
    if (profileKey === "selecao") { const n = D.NATIONS[p.nat]; name = "Seleção " + (n ? n.name : ""); handle = "@selecao"; }
    if (profileKey === "voce") { name = p.name; handle = "@" + p.name.toLowerCase().replace(/[^a-z0-9]+/g, ""); }
    if (profileKey === "rival") { name = g.rival.name; handle = "@" + g.rival.name.toLowerCase().replace(/[^a-z0-9]+/g, ""); }
    const famefac = 1 + p.fame * p.fame / 900;
    g.feed.unshift({
      id: SEQ++,
      k: profileKey, name: name, handle: handle, tag: P.tag,
      text: text,
      likes: Math.round(U.ri(40, 900) * famefac * (opts.hot ? 2.4 : 1)),
      rp: Math.round(U.ri(6, 140) * famefac * (opts.hot ? 2.2 : 1)),
      year: g.year, idx: g.season ? g.season.idx : 0,
      hot: !!opts.hot,
      clubAv: profileKey === "clube" ? g.player.clubId : null,
      natAv: profileKey === "selecao" ? p.nat : null
    });
    if (g.feed.length > 140) g.feed.length = 140;
  }

  function first(name) { return String(name).split(" ")[0]; }

  // ---------- enquetes (interativas, com influência no jogo) ----------
  let POLL_SEQ = 1;
  const POLL_TEMPLATES = [
    { by: "mesa", q: "Enquete: {name} já é o melhor jogador do {club}?", opts: [
      { t: "Disparado, é o craque", fx: { fame: 1 } }, { t: "Está entre os melhores", fx: {} }, { t: "Ainda precisa provar", fx: {} } ] },
    { by: "mesa", q: "A torcida decide: {name} deve ser o batedor oficial de pênaltis?", opts: [
      { t: "Sim, é o mais frio", fx: { morale: 1 } }, { t: "Só em jogos normais", fx: {} }, { t: "Prefiro outro", fx: {} } ] },
    { by: "torcida", q: "Você renovaria com o {club} agora mesmo?", opts: [
      { t: "Fico e beijo o escudo", fx: { morale: 2, rep: 3 } }, { t: "Depende do projeto", fx: {} }, { t: "Sonho com a Europa", fx: { fame: 2, rep: -2 } } ] },
    { by: "zoeira", q: "Sincerão: o {name} aguenta a pressão de um clube grande?", opts: [
      { t: "Aguenta e sobra", fx: { morale: 1 } }, { t: "No sufoco", fx: {} }, { t: "Vai amarelar", fx: { morale: -1 } } ] },
    { by: "mesa", q: "Convocação: {name} merece vaga na Seleção?", opts: [
      { t: "Titular absoluto", fx: { fame: 2 } }, { t: "Merece ser lembrado", fx: { fame: 1 } }, { t: "Ainda não", fx: {} } ] },
    { by: "torcida", q: "Camisa 10 do coração: {name} entra na galeria de ídolos?", opts: [
      { t: "Já é ídolo", fx: { rep: 2, morale: 2 } }, { t: "Caminho certo", fx: { morale: 1 } }, { t: "Cedo pra dizer", fx: {} } ] },
    { by: "mesa", q: "Duelo de gerações: hoje, quem está melhor — {name} ou {rival}?", opts: [
      { t: "{name}, disparado", fx: { fame: 1 } }, { t: "Tá de igual pra igual", fx: {} }, { t: "{rival} está na frente", fx: { morale: -1 } } ] },
    { by: "imprensa", q: "Rumor do mercado: {name} teria sondagem da Europa. Você acredita?", opts: [
      { t: "Acredito, é hora de voar", fx: { fame: 1 } }, { t: "Fumaça sem fogo", fx: {} }, { t: "Espero que fique", fx: { morale: 1 } } ] },
    { by: "torcida", q: "O {club} vai brigar pelo título este ano?", opts: [
      { t: "Vamos ser campeões!", fx: { morale: 1 } }, { t: "Briga por vaga na Libertadores", fx: {} }, { t: "Ano de reconstrução", fx: {} } ] },
    { by: "mesa", q: "{name} tem perfil pra vestir a braçadeira de capitão do {club}?", opts: [
      { t: "Já devia ser capitão", fx: { rep: 2 } }, { t: "Com mais tempo de casa, sim", fx: {} }, { t: "Ainda não tem liderança pra isso", fx: { rep: -1 } } ] },
    { by: "zoeira", q: "Sincerão: a cobrança em cima do {name} é exagerada?", opts: [
      { t: "É demais, deixem o menino em paz", fx: { morale: 1 } }, { t: "Na medida certa", fx: {} }, { t: "Podia cobrar mais", fx: { morale: -1 } } ] },
    { by: "imprensa", q: "Debate: quem leva a Bola de Ouro deste ano?", opts: [
      { t: "{name} tem estatísticas pra isso", fx: { fame: 1 } }, { t: "É cedo pra apostar", fx: {} }, { t: "Tem craque melhor por aí", fx: {} } ] },
    { by: "mesa", q: "Qual é mais dura de ganhar: uma Libertadores ou uma Champions League?", opts: [
      { t: "Libertadores, sem dúvida", fx: {} }, { t: "Champions, o nível é outro", fx: {} }, { t: "Empatadas em dificuldade", fx: {} } ] },
    { by: "torcida", q: "O técnico do {club} está fazendo um bom trabalho?", opts: [
      { t: "Time joga bem sob o comando dele", fx: {} }, { t: "Já deu o que tinha que dar", fx: {} }, { t: "Precisa de mais tempo", fx: {} } ] },
    { by: "zoeira", q: "Se o {name} fosse embora amanhã, o {club} sentiria falta?", opts: [
      { t: "Muito, é peça-chave", fx: { rep: 2 } }, { t: "Um pouco, mas o time segue", fx: {} }, { t: "Sinceramente, não tanto", fx: { morale: -2 } } ] },
    { by: "mesa", q: "Qual traço melhor descreve o momento de {name}?", opts: [
      { t: "Em ascensão, só cresce", fx: { fame: 1 } }, { t: "Estável, cumprindo tabela", fx: {} }, { t: "Precisa reagir logo", fx: { morale: -1 } } ] }
  ];

  function injectPoll(g, tmpl) {
    const p = g.player;
    const club = CQ.engine.myClub(g).name;
    const rivalName = first(g.rival.name);
    const P = PROFILES[tmpl.by] || PROFILES.mesa;
    function fill(s) { return s.replace(/\{name\}/g, first(p.name)).replace(/\{club\}/g, club).replace(/\{rival\}/g, rivalName); }
    const q = fill(tmpl.q);
    const opts = tmpl.opts.map(function (o) { return { label: fill(o.t), fx: o.fx || {}, base: U.ri(80, 900) }; });
    g.feed.unshift({
      id: SEQ++, k: tmpl.by, name: tmpl.by === "torcida" ? "Central da Torcida" : tmpl.by === "zoeira" ? "Zoeira FC" : "Mesa Redonda 90",
      handle: P.handle, tag: P.tag, text: "", poll: { id: POLL_SEQ++, q: q, opts: opts, voted: null, total: 0 },
      likes: U.ri(300, 1500), rp: U.ri(40, 260), year: g.year, idx: g.season ? g.season.idx : 0, hot: false
    });
    if (g.feed.length > 140) g.feed.length = 140;
  }

  function maybePoll(g) {
    g.pollSeen = g.pollSeen || [];
    if (!U.chance(0.35)) return;
    // evita enquete duplicada aberta no topo do feed
    if (g.feed.slice(0, 6).some(function (f) { return f.poll && f.poll.voted == null; })) return;
    const tmpl = U.choice(POLL_TEMPLATES);
    injectPoll(g, tmpl);
  }

  // ---------- matérias de mundo (bastidores do futebol, sem ser sobre você) ----------
  function maybeWorldNews(g) {
    if (!U.chance(0.22)) return;
    const p = g.player;
    const lg = CQ.engine.leagueOf(g, p.clubId);
    const others = (D.clubsOf(lg) || []).filter(function (c) { return c.id !== p.clubId; });
    if (others.length < 2) return;
    const clubA = U.choice(others);
    const clubB = U.choice(others.filter(function (c) { return c.id !== clubA.id; }));
    const compKeys = Object.keys(D.CHAMPS_SEED || {});
    let histLine = "";
    if (compKeys.length) {
      const histKey = U.choice(compKeys);
      const histYears = Object.keys(D.CHAMPS_SEED[histKey] || {});
      if (histYears.length) {
        const histYear = U.choice(histYears);
        const histChamp = D.CHAMPS_SEED[histKey][histYear];
        const histCompName = (D.COMP_NAMES && D.COMP_NAMES[histKey]) || histKey;
        histLine = "Relembre: em " + histYear + ", o " + histChamp + " levantou a taça da " + histCompName + ".";
      }
    }
    const templates = [
      { by: "imprensa", text: "Mercado da bola: " + clubA.name + " negocia a contratação de um reforço estrangeiro para a próxima janela." },
      { by: "mesa", text: "Pressão aumenta no " + clubA.name + ": torcida cobra o técnico após sequência de resultados ruins." },
      { by: "imprensa", text: "Base do " + clubA.name + " revela uma joia de 17 anos que já chama atenção de olheiros europeus." },
      { by: "torcida", text: "Público recorde neste fim de semana: " + clubA.name + " x " + clubB.name + " lotou as arquibancadas." },
      { by: "mesa", text: "A arbitragem da rodada dá o que falar de novo — dessa vez o alvo é o jogo do " + clubA.name + "." },
      { by: "zoeira", text: clubA.name + " perde mais um e a zoeira já começou nas redes." },
      { by: "mesa", text: "Analistas debatem: o nível técnico do campeonato está mais equilibrado do que em anos anteriores." },
      { by: "imprensa", text: "Bastidores: " + clubA.name + " estuda renovar o contrato do capitão para blindar o elenco." },
      { by: "torcida", text: "Enquete informal nas redes: torcedores rivais já discutem quem é o favorito da temporada." },
      { by: "imprensa", text: "Boato do dia: " + clubB.name + " estaria de olho num treinador estrangeiro para o próximo ano." }
    ];
    if (histLine) templates.push({ by: "mesa", text: histLine });
    const tmpl = U.choice(templates);
    post(g, tmpl.by, tmpl.text, {});
  }

  function applyVote(g, feedId, optIdx) {
    const item = g.feed.find(function (f) { return f.id === feedId; });
    if (!item || !item.poll || item.poll.voted != null) return;
    const poll = item.poll;
    poll.voted = optIdx;
    poll.opts[optIdx].base += U.ri(60, 260); // seu voto conta
    poll.total = poll.opts.reduce(function (s, o) { return s + o.base; }, 0);
    const fx = poll.opts[optIdx].fx || {};
    const p = g.player;
    if (fx.fame) p.fame = U.clamp(p.fame + fx.fame, 0, 100);
    if (fx.rep) p.rep = U.clamp(p.rep + fx.rep, 0, 100);
    if (fx.morale) p.morale = U.clamp(p.morale + fx.morale, 5, 100);
    return fx;
  }

  // curiosidades/flavor de estádio — rolada em QUALQUER partida (onMatch roda depois de
  // toda partida, simulada ou ao vivo, uma vez só). O flavorPool de js/live.js só existe
  // dentro do modo ao vivo (minoria das partidas); isto aqui cobre o resto: um post curto
  // no feed, sem interação, sem efeito no jogo — só cor.
  const MATCH_NOTES = [
    "Um cachorro invadiu o gramado durante o jogo e saiu correndo com a bola — a torcida aplaudiu de pé.",
    "Um torcedor pulou o alambrado pra abraçar o ídolo e foi retirado pela segurança em meio a risadas.",
    "Faltou luz por alguns segundos no estádio; o jogo parou até o gerador entrar.",
    "Um vendedor de pipoca 'invadiu' a bola de vista da câmera e virou meme nas redes ainda durante a partida.",
    "A bola bateu na trave e voltou tão forte que quicou até a arquibancada — susto geral.",
    "Um bando de pombos atravessou o gramado no meio de um lance e atrapalhou a jogada.",
    "Choveu granizo por 5 minutos; a partida seguiu debaixo de guarda-chuvas na área técnica.",
    "A organizada soltou fumaça colorida demais e o jogo ficou parado até a fumaça baixar.",
    "Um repórter caiu no gramado tentando fugir de um chute que foi longe demais — está tudo bem, ele levantou rindo.",
    "O mascote do time adversário tentou provocar a torcida e quase apanhou dos seguranças."
  ];
  function maybeMatchNote(g) {
    if (!U.chance(0.06)) return;
    post(g, "torcida", U.choice(MATCH_NOTES));
  }

  // ---------- reações pós-jogo ----------
  function onMatch(g, res) {
    const p = g.player, fx = res.fixture;
    const opp = fx.opp.name;
    const score = res.gm + " a " + res.go;
    const meName = fx.isNatMatch ? fx.myTeam.name : CQ.engine.myClub(g).name;

    maybeMatchNote(g);

    if (res.injuryNew) {
      post(g, "imprensa", "🚑 Baixa no " + meName + ": " + p.name + " deixa o gramado lesionado e vira dúvida pelas próximas " + res.injuryNew + " rodadas.", { hot: true });
    }
    if (res.becameTaker) {
      post(g, "clube", "A partir de hoje a bola parada tem dono: " + p.name + " assume as cobranças oficiais do time.", {});
    }
    if (!res.plays) {
      if (res.susp) post(g, "imprensa", p.name + " cumpre suspensão e assiste do vestiário o " + meName + " " + (res.win ? "vencer" : res.draw ? "empatar com" : "cair diante de") + " " + opp + " por " + score + ".");
      else if (res.injured) { if (U.chance(0.3)) post(g, "torcida", U.choice(["Que saudade do " + first(p.name) + " em campo... melhora logo, craque!", "Sem o " + first(p.name) + " o time não é o mesmo. Volta logo!", "Torcendo pela recuperação do " + first(p.name) + ". Faz falta demais."])); }
      else if (!res.rest && !res.starts && U.chance(0.5)) {
        const fn = first(p.name);
        const benchLines = res.win
          ? ["Ganhou de novo sem precisar do " + fn + "? Interessante isso, hein 🤔", "Banco confortável esse do " + fn + ". Time nem sente falta kkkk"]
          : res.loss
            ? [fn + " no banco e o " + meName + " perdendo. Coincidência? A torcida acha que não.", "Tá esperando o quê pra botar o " + fn + " em campo? Assim não dá."]
            : ["Banco de novo, " + fn + "? Tá pesado o banco do " + meName + " kkkk", fn + " esquentando o banco há quantas rodadas já? Perdi a conta.", "O aquecimento do " + fn + " tá melhor que a atuação de muita gente em campo kkk"];
        post(g, "zoeira", U.choice(benchLines), { hot: false });
      }
      return;
    }

    // atuação
    if (res.pg >= 3) post(g, "imprensa", "NOITE HISTÓRICA! " + p.name + " marca TRÊS na " + (res.win ? "vitória" : "partida") + " por " + score + " sobre o " + opp + ". Nota " + U.fmtNota(res.nota) + ".", { hot: true });
    else if (res.pg === 2) post(g, "imprensa", p.name + " decide com dois gols: " + meName + " " + score + " " + opp + ".", { hot: true });
    else if (res.pg === 1 && fx.decisive) post(g, "imprensa", "Gol de " + p.name + " no duelo contra o " + opp + ". Placar final: " + score + ".", { hot: true });
    else if (res.isGK && res.go === 0 && res.saves >= 4) post(g, "imprensa", "MURALHA! " + p.name + " faz " + res.saves + " defesas e sai de campo sem ser vazado contra o " + opp + ".", { hot: true });
    else if (res.nota >= 8.3) post(g, "imprensa", "Atuação de gala: " + p.name + " é o melhor em campo (nota " + U.fmtNota(res.nota) + ") contra o " + opp + ".");
    else if (res.nota <= 5 && U.chance(0.7)) post(g, "zoeira", first(p.name) + " hoje jogou de terno, porque só assistiu. Nota " + U.fmtNota(res.nota) + " kkkkk", {});

    if (res.win && fx.classic) post(g, "torcida", "CLÁSSICO É NOSSO! " + meName + " " + score + " " + opp + ". Dia de zoar o vizinho.", { hot: true });
    else if (res.loss && fx.classic) post(g, "zoeira", "Perdeu o clássico em casa é? " + first(p.name) + " sumiu quando mais precisavam dele.", {});
    else if (res.win && U.chance(0.35)) post(g, "torcida", "Vitória boa demais! " + score + " no " + opp + "." + (res.pg ? " E o " + first(p.name) + " marcou de novo!" : ""));

    // duelo com o rival de geração
    if (fx.rivalDuel) {
      const r = g.rival;
      if (res.win) post(g, "rival", "Parabéns ao " + meName + " pelo resultado. A gente se vê no returno. Isso ainda não acabou.", { hot: true });
      else if (res.loss) post(g, "rival", "Falaram a semana inteira desse duelo... e deu a lógica. " + r.name + " 1, mídia 0.", { hot: true });
      else post(g, "rival", "Jogo duro, empate justo. Mas todo mundo viu quem era o melhor em campo hoje.", {});
    }

    // gol contra a "maior vítima" repetida
    if (res.pg > 0 && p.stats.vitimas[fx.oppId] >= 5) {
      post(g, "torcida", "O " + opp + " vê o " + first(p.name) + " até em sonho: já são " + p.stats.vitimas[fx.oppId] + " gols dele contra essa equipe!");
    }

    // marcos de carreira
    if (res.milestones && res.milestones.length) {
      res.milestones.forEach(function (m) {
        post(g, "imprensa", "MARCO: " + p.name + " atinge " + m.n + " " + m.label + " na carreira. Números de quem faz história.", { hot: true });
      });
    }

    // de vez em quando, uma enquete quente aparece no feed
    if (res.plays) { maybePoll(g); maybeWorldNews(g); }
  }

  // hype antes de duelo com o rival de geração
  function preMatch(g, fx) {
    if (!fx || !fx.rivalDuel) return;
    g.hyped = g.hyped || {};
    const key = g.year + "-" + g.season.idx;
    if (g.hyped[key]) return;
    g.hyped[key] = 1;
    const r = g.rival;
    const h = g.h2h;
    post(g, "mesa", "DUELO DE GERAÇÃO: " + g.player.name + " x " + r.name + " se reencontram nesta rodada. Retrospecto do confronto: " + h.v + "V " + h.e + "E " + h.d + "D. Quem leva a melhor?", { hot: true });
    if (U.chance(0.6)) post(g, "rival", "Rodada especial essa... Alguém aí vai assistir de camarote de novo? 😏", {});
  }

  // ---------- coletiva de imprensa (jogos importantes) ----------
  // 3 perguntas sempre de categorias diferentes (vida/temporada/carreira), nunca repetindo
  // dentro da mesma categoria até esgotar o pool — mesmo raciocínio de g.lifeSeen.
  // Mesmo formato de opção que a entrevista pós-jogo (tone/label/rep/fame/morale), reaproveitado.
  const PRESS_Q = {
    vida: [
      { q: "Como está sendo conciliar a vida pessoal com a pressão da temporada?", options: [
        { tone: "humilde", label: "\"Não é fácil, mas minha família me ajuda a manter os pés no chão.\"", rep: +4, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Aprendi a lidar com isso. Hoje consigo separar bem as coisas.\"", rep: 0, fame: +2, morale: +2 },
        { tone: "provocador", label: "\"Prefiro não falar da minha vida pessoal aqui, não é da conta de vocês.\"", rep: -4, fame: +3, morale: 0 }
      ] },
      { q: "Muita gente comenta sua vida fora de campo. Como você lida com a exposição?", options: [
        { tone: "humilde", label: "\"Sei que faz parte da profissão. Tento não deixar isso me afetar.\"", rep: +3, fame: +1, morale: +1 },
        { tone: "confiante", label: "\"Já me acostumei. Quanto mais falam, mais sei que estou fazendo diferença.\"", rep: 0, fame: +4, morale: +1 },
        { tone: "provocador", label: "\"Tem gente com tempo demais pra ficar comentando a vida dos outros.\"", rep: -5, fame: +3, morale: +1 }
      ] },
      { q: "Dá pra ter vida normal sendo quem você é hoje?", options: [
        { tone: "humilde", label: "\"Não totalmente, mas não troco por nada. É o preço do sonho.\"", rep: +4, fame: 0, morale: +2 },
        { tone: "confiante", label: "\"Eu vivo do meu jeito, sem me importar muito com o que acham.\"", rep: 0, fame: +2, morale: +2 },
        { tone: "provocador", label: "\"Vida normal? Isso ficou pra trás faz tempo, e tá ótimo assim.\"", rep: -3, fame: +4, morale: +1 }
      ] },
      { q: "O que te tira do sério fora das quatro linhas?", options: [
        { tone: "humilde", label: "\"Prefiro focar no que me deixa bem. Não vale a pena alimentar isso.\"", rep: +3, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Nada me tira do sério hoje em dia. Aprendi a controlar as coisas.\"", rep: +1, fame: +2, morale: +2 },
        { tone: "provocador", label: "\"Gente que fala sem saber o que eu passo. Isso me incomoda, sim.\"", rep: -4, fame: +3, morale: 0 }
      ] },
      { q: "Como sua família tem lidado com a sua rotina de jogador profissional?", options: [
        { tone: "humilde", label: "\"Eles são minha base. Sem eles eu não estaria aqui.\"", rep: +5, fame: 0, morale: +2 },
        { tone: "confiante", label: "\"Todo mundo já entendeu a rotina. Funciona bem do nosso jeito.\"", rep: +1, fame: +1, morale: +1 },
        { tone: "provocador", label: "\"Minha família é assunto meu, não de entrevista.\"", rep: -3, fame: +1, morale: 0 }
      ] }
    ],
    temporada: [
      { q: "Como você avalia a temporada até aqui?", options: [
        { tone: "humilde", label: "\"Ainda dá pra melhorar muito. O grupo sabe disso.\"", rep: +3, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Estamos no caminho certo. Temporada sólida até aqui.\"", rep: 0, fame: +2, morale: +2 },
        { tone: "provocador", label: "\"Pra mim está sendo ótima. Quem acha o contrário não está prestando atenção.\"", rep: -3, fame: +3, morale: +2 }
      ] },
      { q: "A cobrança por títulos aumentou. Como o grupo lida com essa pressão?", options: [
        { tone: "humilde", label: "\"É natural cobrarem. A gente trabalha pra merecer essa expectativa.\"", rep: +4, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"A pressão é combustível pra gente. Time grande vive disso.\"", rep: 0, fame: +3, morale: +2 },
        { tone: "provocador", label: "\"Pressão é pra quem não está preparado. Aqui a gente já sabe lidar.\"", rep: -4, fame: +4, morale: +2 }
      ] },
      { q: "Qual é a meta de vocês pra reta final da temporada?", options: [
        { tone: "humilde", label: "\"Focar jogo a jogo. É assim que a gente vai longe.\"", rep: +3, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Nossa meta é clara: brigar por tudo até o fim.\"", rep: 0, fame: +2, morale: +2 },
        { tone: "provocador", label: "\"Nossa meta é ganhar tudo. Quem duvidar vai ver.\"", rep: -3, fame: +4, morale: +2 }
      ] },
      { q: "O que precisa melhorar no time pro restante do ano?", options: [
        { tone: "humilde", label: "\"Vários detalhes. A gente treina isso todo dia.\"", rep: +3, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Pequenos ajustes. A base do time já está muito boa.\"", rep: 0, fame: +2, morale: +1 },
        { tone: "provocador", label: "\"O time está bom. Talvez falte a imprensa reconhecer isso.\"", rep: -3, fame: +3, morale: +1 }
      ] },
      { q: "Você sente que o nível de exigência mudou desde o início da temporada?", options: [
        { tone: "humilde", label: "\"Sim, e é justo. Quanto mais crescemos, mais se espera da gente.\"", rep: +4, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Mudou, mas a gente também evoluiu junto. Está tudo sob controle.\"", rep: 0, fame: +2, morale: +2 },
        { tone: "provocador", label: "\"Sempre exigiram muito de mim. Isso não é novidade.\"", rep: -3, fame: +3, morale: +1 }
      ] }
    ],
    carreira: [
      { q: "Olhando pra trás, você mudaria alguma decisão na sua carreira?", options: [
        { tone: "humilde", label: "\"Cada escolha me trouxe até aqui. Não mudaria nada.\"", rep: +4, fame: 0, morale: +2 },
        { tone: "confiante", label: "\"Talvez um ou outro detalhe, mas no geral trilhei o caminho certo.\"", rep: +1, fame: +2, morale: +1 },
        { tone: "provocador", label: "\"Mudaria ter ignorado quem duvidou de mim mais cedo.\"", rep: -3, fame: +3, morale: +1 }
      ] },
      { q: "O que ainda falta pra você conquistar no futebol?", options: [
        { tone: "humilde", label: "\"Muita coisa ainda. Sigo trabalhando um passo de cada vez.\"", rep: +4, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Sei exatamente o que quero conquistar, e vou atrás.\"", rep: 0, fame: +3, morale: +2 },
        { tone: "provocador", label: "\"Já conquistei mais que muita gente que fala da minha carreira.\"", rep: -4, fame: +4, morale: +2 }
      ] },
      { q: "Como você imagina o resto da sua carreira daqui pra frente?", options: [
        { tone: "humilde", label: "\"Um degrau de cada vez, sem pular etapas.\"", rep: +3, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Vejo um futuro grande pela frente, e vou atrás dele.\"", rep: 0, fame: +3, morale: +2 },
        { tone: "provocador", label: "\"Vejo meu nome onde poucos chegaram. E vai ser assim mesmo.\"", rep: -3, fame: +4, morale: +2 }
      ] },
      { q: "Que conselho você daria pro jogador que você era no início?", options: [
        { tone: "humilde", label: "\"Diria pra ter paciência. Tudo tem seu tempo.\"", rep: +4, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Diria pra confiar mais no próprio taco desde cedo.\"", rep: +1, fame: +2, morale: +2 },
        { tone: "provocador", label: "\"Diria pra ignorar quem nunca acreditou. Eu tinha razão.\"", rep: -3, fame: +3, morale: +1 }
      ] },
      { q: "Existe algum título ou marca que você sonha em alcançar?", options: [
        { tone: "humilde", label: "\"Sonho em ajudar meu time a conquistar o que for possível.\"", rep: +4, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Tenho metas bem claras na cabeça, e trabalho todo dia por elas.\"", rep: 0, fame: +3, morale: +2 },
        { tone: "provocador", label: "\"Quero um lugar que poucos ocupam na história. Sem medo de dizer isso.\"", rep: -3, fame: +4, morale: +2 }
      ] }
    ]
  };
  function maybePressConference(g, res) {
    const fx = res.fixture;
    if (!fx.decisive) return null;
    g.pressSeen = g.pressSeen || [];
    const cats = ["vida", "temporada", "carreira"];
    const questions = cats.map(function (cat) {
      let pool = PRESS_Q[cat].filter(function (item) { return g.pressSeen.indexOf(cat + ":" + item.q) < 0; });
      if (!pool.length) {
        g.pressSeen = g.pressSeen.filter(function (id) { return id.indexOf(cat + ":") !== 0; });
        pool = PRESS_Q[cat];
      }
      const picked = U.choice(pool);
      g.pressSeen.push(cat + ":" + picked.q);
      return picked;
    });
    return { questions: questions };
  }

  // ---------- entrevistas pós-jogo ----------
  function maybeInterview(g, res) {
    const fx = res.fixture;
    if (!res.plays) return null;
    const notable = res.pg >= 2 || (fx.decisive && res.win && res.pg > 0) || (fx.classic && res.win) ||
      (fx.classic && res.loss) || (res.isGK && res.go === 0 && fx.decisive) || (res.nota <= 4.6) ||
      (fx.stage === "F" && (res.win || res.shootoutWin));
    if (!notable || !U.chance(0.85)) return null;
    const opp = fx.opp.name;
    let q;
    if (res.loss) q = "Derrota dura hoje contra o " + opp + ". O que faltou para a equipe?";
    else if (res.pg >= 2) q = "Mais uma noite de gols. Qual é o segredo dessa fase artilheira?";
    else if (fx.classic) q = "Clássico é sempre outra história, né? Como foi vencer esse jogo?";
    else q = "Grande resultado contra o " + opp + ". Como você avalia a atuação?";
    return {
      q: q,
      options: [
        { tone: "humilde", label: "\"Mérito do grupo. Eu só faço o meu papel, quem decide é o coletivo.\"", rep: +4, fame: 0, morale: +1 },
        { tone: "confiante", label: "\"Trabalhei a semana toda pra isso. Estou num grande momento e quero mais.\"", rep: 0, fame: +3, morale: +2 },
        { tone: "provocador", label: "\"Falaram demais antes do jogo. Hoje a bola falou por mim.\"", rep: -5, fame: +5, morale: +2 }
      ]
    };
  }

  function applyInterview(g, itv, opt) {
    const p = g.player;
    p.rep = U.clamp(p.rep + opt.rep, 0, 100);
    p.fame = U.clamp(p.fame + opt.fame, 0, 100);
    p.morale = U.clamp(p.morale + opt.morale, 5, 100);
    post(g, "voce", opt.label.replace(/^"|"$/g, ""), { hot: opt.tone === "provocador" });
    if (opt.tone === "provocador" && U.chance(0.65)) {
      post(g, "zoeira", "Olha a marra do " + first(p.name) + " na entrevista... depois não reclama da pressão hein 👀");
    } else if (opt.tone === "humilde" && U.chance(0.4)) {
      post(g, "mesa", "Maturidade impressionante de " + p.name + " na zona mista hoje. Discurso de líder.");
    }
  }

  // ---------- eventos de vida ----------
  const LIFE_EVENTS = [
    {
      id: "hospital", title: "Visita ao hospital infantil",
      desc: "A assessoria do clube organizou uma visita ao hospital infantil da cidade. As crianças pediram você.",
      opts: [
        { label: "Ir e passar a tarde com as crianças", fx: { rep: +6, fame: +2, cond: -4 }, note: "As fotos correram as redes. O gesto tocou a cidade." },
        { label: "Ir rapidinho, tirar fotos e sair", fx: { rep: +1, fame: +1 }, note: "Cumpriu tabela. Passou despercebido." },
        { label: "Recusar para focar no treino", fx: { rep: -4, cond: +5 }, note: "O corpo agradece, mas a imprensa registrou a ausência." }
      ]
    },
    {
      id: "empresario", title: "Reunião com o empresário",
      desc: "Seu empresário apareceu com um contrato de publicidade de uma marca de energético.",
      opts: [
        { label: "Assinar o contrato", fx: { money: 350000, fame: +3, rep: -2 }, note: "Outdoor na avenida principal. O bolso agradece." },
        { label: "Pedir mais tempo para pensar", fx: {}, note: "O empresário torceu o nariz, mas aceitou." },
        { label: "Recusar: imagem vem antes de dinheiro", fx: { rep: +4 }, note: "A decisão virou pauta positiva nos jornais." }
      ]
    },
    {
      id: "coletiva", title: "Coletiva de imprensa",
      desc: "O clube pediu que você participe da coletiva da semana. Os jornalistas estão afiados.",
      opts: [
        { label: "Responder tudo com diplomacia", fx: { rep: +3 }, note: "Saiu ileso e elogiado pela postura." },
        { label: "Alfinetar o próximo adversário", fx: { fame: +4, rep: -3, morale: +2 }, note: "Manchete no dia seguinte. O clima do jogo esquentou." },
        { label: "Dar respostas curtas e ir embora", fx: { rep: -2, cond: +3 }, note: "A imprensa achou arrogante, mas você descansou." }
      ]
    },
    {
      id: "aniversario", title: "Aniversário da namorada",
      desc: "O aniversário dela caiu na véspera de jogo. Ela quer uma festa; o preparador quer você na cama às 22h.",
      opts: [
        { label: "Festa completa até tarde", fx: { morale: +8, cond: -10, rep: -2 }, note: "A festa foi linda. O treino do dia seguinte, nem tanto." },
        { label: "Jantar íntimo e voltar cedo", fx: { morale: +4, cond: -2 }, note: "Equilíbrio de atleta profissional." },
        { label: "Adiar a comemoração", fx: { morale: -5, cond: +4, rep: +1 }, note: "Foco total no jogo... e um gelo em casa." }
      ]
    },
    {
      id: "colega", title: "Colega de elenco em crise",
      desc: "Um companheiro vem sendo massacrado pela torcida após falhas seguidas. O vestiário está dividido.",
      opts: [
        { label: "Defendê-lo publicamente", fx: { rep: +5, morale: +3 }, note: "O elenco fechou com você. Liderança reconhecida." },
        { label: "Apoiar só no privado", fx: { morale: +2 }, note: "Ele agradeceu. Ninguém ficou sabendo." },
        { label: "Ficar de fora da polêmica", fx: { rep: -2 }, note: "Neutralidade também é escolha — e o grupo percebeu." }
      ]
    },
    {
      id: "influencer", title: "Convite de influencer",
      desc: "Um influencer gigante chamou você para um vídeo de desafios no CT. O clube liberou, mas em dia de folga.",
      opts: [
        { label: "Gravar o vídeo", fx: { fame: +6, cond: -5 }, note: "Milhões de views. Seu nome explodiu nas redes." },
        { label: "Só se for depois da temporada", fx: { fame: +1 }, note: "Ficou a promessa. O influencer entendeu." },
        { label: "Recusar: folga é folga", fx: { cond: +6, fame: -1 }, note: "Descanso completo. As redes que esperem." }
      ]
    },
    {
      id: "incomodo", title: "Incômodo muscular",
      desc: "Você sentiu o posterior da coxa no treino de quinta. Nada grave... por enquanto.",
      opts: [
        { label: "Avisar o DM e fazer tratamento", fx: { cond: +8, morale: -2 }, note: "Sessão dupla de fisioterapia. Risco controlado." },
        { label: "Jogar no sacrifício sem contar", fx: { cond: -8, rep: +1 }, note: "Ninguém soube. Torça para aguentar." }
      ]
    },
    {
      id: "jantar", title: "Jantar com a diretoria",
      desc: "O presidente do clube convidou você para um jantar em família. Sinal de prestígio — ou de cobrança.",
      opts: [
        { label: "Ir e conversar sobre o futuro", fx: { rep: +3, morale: +3 }, note: "Saiu do jantar com moral e promessas." },
        { label: "Ir, mas só ouvir", fx: { rep: +1 }, note: "Educado e discreto. Anotaram." },
        { label: "Inventar compromisso", fx: { rep: -4, cond: +3 }, note: "A cadeira vazia foi notada na mesa do presidente." }
      ]
    },
    {
      id: "base", title: "Visita à base",
      desc: "O coordenador da base pediu que você passe uma tarde com os meninos do sub-15. Muitos têm você como ídolo.",
      opts: [
        { label: "Passar a tarde e dar uma palestra", fx: { rep: +5, morale: +4, cond: -3 }, note: "Os meninos não esqueceram. Você também não." },
        { label: "Mandar um vídeo gravado", fx: { rep: +1 }, note: "Melhor que nada, disse o coordenador." }
      ]
    },
    {
      id: "documentario", title: "Proposta de documentário",
      desc: "Uma plataforma de streaming quer produzir um documentário sobre a sua vida e carreira.",
      opts: [
        { label: "Topar e abrir a intimidade", fx: { fame: +8, rep: -1, money: 400000 }, note: "Câmeras te seguem por meses. O público amou." },
        { label: "Só se focar no futebol", fx: { fame: +3 }, note: "Um recorte respeitoso — e bem recebido." },
        { label: "Recusar: prefiro privacidade", fx: { rep: +3 }, note: "Sua vida continua sua. A imprensa respeitou." }
      ]
    },
    {
      id: "tenis", title: "Chuteira nova de patrocínio",
      desc: "Uma fabricante lançou uma chuteira e quer você como rosto da campanha, com um modelo exclusivo.",
      opts: [
        { label: "Assinar contrato milionário", fx: { money: 700000, fame: +5 }, note: "Sua chuteira esgota nas lojas em uma semana." },
        { label: "Pedir modelo personalizado", fx: { money: 300000, morale: +2 }, note: "Cores do seu jeito. Estilo é tudo." },
        { label: "Manter a marca antiga", fx: { rep: +2 }, note: "Fidelidade também tem valor." }
      ]
    },
    {
      id: "torcedor", title: "Torcedor doente no hospital",
      desc: "Um torcedor internado, fã incondicional seu, fez o pedido de te conhecer antes de uma cirurgia importante.",
      opts: [
        { label: "Ir pessoalmente ao hospital", fx: { rep: +8, morale: +3, cond: -2 }, note: "Um momento que nenhum troféu paga. Ele foi pra cirurgia sorrindo." },
        { label: "Enviar camisa autografada e vídeo", fx: { rep: +3 }, note: "O gesto emocionou a família." }
      ]
    },
    {
      id: "arbitro", title: "Polêmica com a arbitragem",
      desc: "Um pênalti não marcado custou pontos ao time. Os repórteres cercam você querendo declaração.",
      opts: [
        { label: "Detonar a arbitragem publicamente", fx: { fame: +4, rep: -4, morale: +2 }, note: "Manchete garantida — e possível multa da federação." },
        { label: "Reclamar com diplomacia", fx: { rep: +1 }, note: "Firme, mas sem passar do ponto." },
        { label: "Dizer que erros fazem parte", fx: { rep: +4, morale: -1 }, note: "Maturidade elogiada nos estúdios." }
      ]
    },
    {
      id: "vaquinha", title: "Causa social na comunidade",
      desc: "Sua comunidade de origem pede ajuda para reformar o campinho onde você começou a jogar.",
      opts: [
        { label: "Bancar a reforma inteira", fx: { money: -500000, rep: +10, morale: +4 }, note: "O campo agora leva o seu nome. Gerações vão jogar ali." },
        { label: "Doar uma parte e mobilizar", fx: { money: -150000, rep: +5 }, note: "Você deu o pontapé; a comunidade completou." },
        { label: "Prometer ajudar mais pra frente", fx: { rep: -2 }, note: "A promessa ficou no ar." }
      ]
    },
    {
      id: "namorada_liga", title: "Ligação da namorada",
      desc: "Ela ligou no meio da sua rotina de treinos: um imprevisto em casa e ela precisa que você resolva agora.",
      opts: [
        { label: "Largar tudo e ir resolver", fx: { morale: +6, cond: -3 }, note: "Ela sentiu que pode contar com você. Vale mais que qualquer treino." },
        { label: "Resolver por telefone e seguir treinando", fx: { morale: +1, cond: +1 }, note: "Deu pra equilibrar, mas ela ficou com um gosto de pouco caso." },
        { label: "Prometer que resolve depois do treino", fx: { morale: -5 }, note: "A ligação terminou seca. Um clima ficou no ar." }
      ]
    },
    {
      id: "bets", title: "Convite de casa de apostas",
      desc: "Uma casa de apostas esportivas ofereceu um contrato alto pra estampar seu nome em campanha publicitária.",
      opts: [
        { label: "Assinar o contrato milionário", fx: { money: 900000, fame: +5, rep: -6 }, note: "Cachê gordo, mas parte da torcida não gostou de ver o ídolo estampando aposta." },
        { label: "Negociar uma campanha de jogo responsável", fx: { money: 400000, rep: +3, fame: +2 }, note: "Meio-termo bem recebido: dinheiro no bolso sem abrir mão da imagem." },
        { label: "Recusar o convite", fx: { rep: +4 }, note: "Ficou de fora da polêmica — e de uma bolada." }
      ]
    },
    {
      id: "presidente_evento", title: "Convite do presidente do clube",
      desc: "O presidente do clube fez questão de te chamar pessoalmente pra prestigiar um evento institucional na próxima semana.",
      opts: [
        { label: "Comparecer e discursar", fx: { rep: +5, morale: +3, cond: -3 }, note: "Discurso emocionado, aplausos de pé. O presidente saiu satisfeito." },
        { label: "Ir e ficar discreto", fx: { rep: +2 }, note: "Presença cumprida, sem holofote." },
        { label: "Recusar por causa da rotina de treinos", fx: { rep: -3, cond: +4 }, note: "O presidente entendeu, mas anotou a ausência." }
      ]
    }
  ];

  function maybeLifeEvent(g) {
    if (!U.chance(0.13)) return null;
    g.lifeSeen = g.lifeSeen || [];
    let pool = LIFE_EVENTS.filter(function (e) { return g.lifeSeen.indexOf(e.id) < 0; });
    if (!pool.length) { g.lifeSeen = []; pool = LIFE_EVENTS; }
    const ev = U.choice(pool);
    g.lifeSeen.push(ev.id);
    return ev;
  }

  function applyLifeEvent(g, ev, opt) {
    const p = g.player, fx = opt.fx || {};
    if (fx.rep) p.rep = U.clamp(p.rep + fx.rep, 0, 100);
    if (fx.fame) p.fame = U.clamp(p.fame + fx.fame, 0, 100);
    if (fx.morale) p.morale = U.clamp(p.morale + fx.morale, 5, 100);
    if (fx.cond) p.condition = U.clamp(p.condition + fx.cond, 0, 100);
    if (fx.money) p.money += fx.money;
    if (ev.id === "hospital" && fx.rep >= 6) post(g, "torcida", "Fotos do " + first(p.name) + " no hospital infantil hoje. Ídolo dentro e fora de campo. 👏");
    if (ev.id === "influencer" && fx.fame >= 6) post(g, "imprensa", p.name + " quebra a internet em vídeo com influencer: 12 milhões de views em 24h.");
    if (ev.id === "coletiva" && fx.rep < 0 && fx.fame > 0) post(g, "mesa", p.name + " provoca próximo adversário em coletiva: \"que venham\". O jogo esquentou.");
  }

  // ---------- fim de temporada ----------
  function onSeasonEnd(g, sum) {
    const p = g.player;
    sum.awards.won.forEach(function (a) {
      post(g, "imprensa", "OFICIAL: " + p.name + " leva o prêmio de " + a.name + " (" + (a.detail || sum.year) + ").", { hot: true });
    });
    sum.awards.lost.forEach(function (a) {
      if (a.by === g.rival.name) {
        post(g, "mesa", a.name + " de " + sum.year + " fica com " + g.rival.name + ". Na disputa direta com " + p.name + ", dessa vez levou o rival.", { hot: true });
        post(g, "rival", "Prêmio em casa. Dizem que rivalidade motiva... obrigado pela motivação. 🏆", { hot: true });
      }
    });
    if (sum.titles.length) {
      post(g, "clube", "CAMPEÕES! O troféu da " + sum.titles[0] + " é nosso. Obrigado, torcida!", { hot: true });
    }
    sum.notes.forEach(function (n) {
      if (n.t === "rival-transfer") post(g, "imprensa", "Mercado: " + g.rival.name + ", rival de geração de " + p.name + ", é anunciado pelo " + n.club + ".");
      if (n.t === "rival-retire") post(g, "imprensa", n.old + " anuncia aposentadoria. A imprensa já aponta o novo rival de geração de " + p.name + ": " + n.novo + ".", { hot: true });
      if (n.t === "world-transfer") post(g, "imprensa", "Mercado: " + n.player + " (" + n.ovr + " de overall) é anunciado pelo " + n.toClub + ", que teria pago cerca de " + U.fmtBRL(n.valueHint) + " ao " + n.fromClub + ".", { hot: n.ovr >= 84 });
      if (n.t === "prospect-breakout") {
        post(g, "imprensa", "Base: " + n.player + " (" + n.age + " anos, " + n.pos + ") chama atenção nas categorias de base do " + n.club + " — overall de " + n.ovr + " já impressiona para a idade.");
        const EURO_SCOUT_OVR = 78; // mesmo limiar de EURO_UNLOCK_OVR em market.js (privado lá — duplicar é o padrão já usado no projeto)
        if (n.ovr >= EURO_SCOUT_OVR) {
          post(g, "imprensa", "De olho na Europa: clubes do continente já monitoram " + n.player + " após a boa fase nas categorias de base do " + n.club + ".", { hot: n.ovr >= EURO_SCOUT_OVR + 4 });
        }
      }
      if (n.t === "nat-qualified") post(g, "selecao", "Classificada! A " + n.nat + " garante vaga no próximo torneio (" + n.pts + " pontos nas eliminatórias).", { hot: true });
      if (n.t === "nat-notqualified") post(g, "imprensa", "Fora! A " + n.nat + " não se classifica pro próximo torneio (" + n.pts + " pontos nas eliminatórias) — fica de fora dessa edição.", { hot: true });
    });
    if (sum.convNews === "convocado") post(g, "selecao", "CONVOCADO! " + p.name + " está na lista para o próximo ciclo da Seleção. 🎽", { hot: true });
    if (sum.convNews === "cortado") post(g, "imprensa", p.name + " fica fora da nova lista da Seleção. Queda de rendimento pesou.");
    if (sum.retiring) post(g, "imprensa", "Fim de uma era: " + p.name + " anuncia aposentadoria aos " + p.age + " anos.", { hot: true });
  }

  CQ.nar = {
    PROFILES: PROFILES,
    post: post, onMatch: onMatch, preMatch: preMatch, onSeasonEnd: onSeasonEnd,
    maybeInterview: maybeInterview, applyInterview: applyInterview,
    maybePressConference: maybePressConference,
    maybeLifeEvent: maybeLifeEvent, applyLifeEvent: applyLifeEvent,
    maybePoll: maybePoll, applyVote: applyVote
  };
})();
