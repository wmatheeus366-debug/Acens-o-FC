/* CRAQUE — utilitários: RNG determinístico, sanitização, formatação,
   gerador de nomes, retrato procedural e escudos vetoriais. */
window.CQ = window.CQ || {};

(function () {
  "use strict";

  // ---------- RNG ----------
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    s = String(s);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // rng determinístico a partir de várias partes (seed do save + chaves)
  function rngFor() {
    const key = Array.prototype.join.call(arguments, "|");
    return mulberry32(hashStr(key));
  }

  const rnd = Math.random;
  function ri(a, b, r) { r = r || rnd; return a + Math.floor(r() * (b - a + 1)); }
  function rf(a, b, r) { r = r || rnd; return a + r() * (b - a); }
  function choice(arr, r) { r = r || rnd; return arr[Math.floor(r() * arr.length)]; }
  function chance(p, r) { r = r || rnd; return r() < p; }
  function shuffle(arr, r) {
    r = r || rnd;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function poisson(lambda, r) {
    r = r || rnd;
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L && k < 12);
    return k - 1;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- texto ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // sanitiza entrada do usuário (nome do jogador etc.)
  function cleanInput(s, max) {
    return String(s == null ? "" : s).replace(/<[^>]*>/g, "").replace(/[<>{}\\]/g, "").trim().slice(0, max || 28);
  }
  function fmtBRL(v) {
    const abs = Math.abs(v);
    let out;
    if (abs >= 1e9) out = (v / 1e9).toFixed(1).replace(".", ",") + " bi";
    else if (abs >= 1e6) out = (v / 1e6).toFixed(1).replace(".", ",") + " mi";
    else if (abs >= 1e3) out = (v / 1e3).toFixed(0) + " mil";
    else out = String(Math.round(v));
    return "R$ " + out;
  }
  function fmtNota(n) { return (Math.round(n * 10) / 10).toFixed(1).replace(".", ","); }
  function plural(n, s, p) { return n === 1 ? s : p; }
  // "BICAMPEÃO"/"PENTACAMPEÃO"/etc — usado no banner de título quando o jogador repete
  // a mesma competição pelo mesmo clube/seleção (n >= 2; n===1 não tem ordinal, é só o
  // primeiro título).
  const TITULO_ORDINAL = { 2: "BICAMPEÃO", 3: "TRICAMPEÃO", 4: "TETRACAMPEÃO", 5: "PENTACAMPEÃO", 6: "HEXACAMPEÃO", 7: "HEPTACAMPEÃO", 8: "OCTACAMPEÃO" };
  function tituloOrdinal(n) { return TITULO_ORDINAL[n] || (n > 8 ? n + "x CAMPEÃO" : ""); }

  // ---------- nomes ----------
  const FIRST_BR = ["Gabriel", "Lucas", "Matheus", "Pedro", "João", "Kaio", "Vinícius", "Rafael", "Thiago", "Bruno", "Diego", "Caio", "Ítalo", "Wesley", "Yuri", "Everton", "Rodrigo", "Felipe", "Douglas", "Renan", "Igor", "Alex", "Wallace", "Robson", "Maurício", "Jean", "Vitor", "Davi", "Endrick", "Talles", "Ryan", "Luan", "Marcos", "Emerson", "Fabrício", "Nathan", "Samuel", "Erick", "Hulk", "Dener"];
  const LAST_BR = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Almeida", "Ferreira", "Rodrigues", "Gomes", "Martins", "Araújo", "Ribeiro", "Barbosa", "Rocha", "Dias", "Nascimento", "Moura", "Cardoso", "Teixeira", "Farias", "Vieira", "Freitas", "Ramos", "Cunha", "Sales", "Mendes", "Pinto", "Camargo", "Xavier"];
  const NICK_SUF = ["inho", "ão", "eca", "ito"];
  const FIRST_HISP = ["Juan", "Matías", "Santiago", "Nicolás", "Facundo", "Lautaro", "Enzo", "Julián", "Thiago", "Franco", "Agustín", "Iker", "Pablo", "Diego", "Álvaro", "Sergio", "Marco", "Luca", "Andrés", "Rodrigo"];
  const LAST_HISP = ["Fernández", "González", "Rodríguez", "López", "Martínez", "Gómez", "Díaz", "Álvarez", "Romero", "Suárez", "Torres", "Vargas", "Castro", "Rojas", "Molina", "Ortiz", "Silva", "Núñez", "Herrera", "Acosta"];
  const FIRST_EUR = ["Liam", "Noah", "Leon", "Louis", "Hugo", "Théo", "Jude", "Harry", "Marco", "Luca", "Jan", "Nico", "Finn", "Tom", "Max", "Paul", "Arthur", "Mason", "Kai", "Florian"];
  const LAST_EUR = ["Müller", "Schmidt", "Dubois", "Martin", "Rossi", "Ricci", "Smith", "Taylor", "Jansen", "Visser", "Weber", "Laurent", "Moreau", "Bianchi", "Wilson", "Brown", "Keller", "Wagner", "Lemaire", "Costa"];

  function nameGen(r, natId) {
    r = r || rnd;
    let first, last;
    if (!natId || natId === "BR" || natId === "PT") { first = choice(FIRST_BR, r); last = choice(LAST_BR, r); }
    else if (["AR", "UY", "CO", "MX", "ES"].indexOf(natId) >= 0) { first = choice(FIRST_HISP, r); last = choice(LAST_HISP, r); }
    else { first = choice(FIRST_EUR, r); last = choice(LAST_EUR, r); }
    // às vezes um "apelido de craque" brasileiro
    if ((!natId || natId === "BR") && chance(0.22, r)) {
      return first + choice(NICK_SUF, r).replace("inho", first.slice(-1) === "o" ? "" : "inho") || first;
    }
    return first + " " + last;
  }

  // ---------- avatar editorial (silhueta, item 10 do roteiro) ----------
  // Antes era um retrato cartunesco colorido (pele/cabelo/barba/camisa individuais).
  // Trocado por uma silhueta monotom em tinta sobre papel — o mesmo idioma visual do
  // resto do jogo (boletim/editorial de jornal esportivo, não avatar de desenho
  // animado). Mesma assinatura/uso em todo lugar (só a implementação mudou por
  // dentro) — nenhum call site precisou mexer.
  const BGP = [["#e8e2cf", "#d8d0b6"], ["#dbe6dc", "#c6d8c8"], ["#e7dcd0", "#d6c6b4"], ["#dfe0ea", "#cccee0"], ["#ecddd0", "#dcc6b3"]];
  const INK = "#1b1812";

  function portraitSVG(seedStr, size) {
    const r = rngFor("face3", seedStr); // chave nova — não reaproveita rolagens do estilo cartunesco antigo
    const bg = choice(BGP, r);
    const hairStyle = ri(0, 4, r); // silhueta do cabelo — ainda monotom, só muda o contorno
    const tilt = ri(-3, 3, r);     // leve inclinação da cabeça, dá vida sem sair do estilo
    const uid = "p" + hashStr(seedStr);

    let hairPath = "";
    if (hairStyle === 1) hairPath = `<path d="M27 40 Q26 15 50 14 Q74 15 73 40 Q68 26 50 25 Q32 26 27 40Z" fill="${INK}"/>`; // curto
    else if (hairStyle === 2) hairPath = `<path d="M25 42 Q24 22 50 21 Q76 22 75 42 Q72 28 50 27 Q28 28 25 42Z" fill="${INK}"/>`; // volumoso
    else if (hairStyle === 3) hairPath = `<path d="M28 38 Q27 12 50 12 Q73 12 72 38 Q70 22 60 20 Q54 16 50 22 Q40 18 28 38Z" fill="${INK}"/>`; // topete
    else if (hairStyle === 4) hairPath = `<path d="M24 36 Q24 14 50 13 Q76 14 76 36 L76 55 Q70 45 68 36 Q58 30 50 32 Q42 30 32 36 Q30 45 24 55Z" fill="${INK}"/>`; // longo
    // hairStyle === 0: careca/raspado — sem contorno extra, só a cabeça lisa

    return `<svg viewBox="0 0 100 100" width="${size || 96}" height="${size || 96}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="retrato">
      <defs>
        <linearGradient id="${uid}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
        <clipPath id="${uid}c"><rect width="100" height="100"/></clipPath>
      </defs>
      <g clip-path="url(#${uid}c)">
        <rect width="100" height="100" fill="url(#${uid}bg)"/>
        <g transform="rotate(${tilt} 50 55)">
          <path d="M14 100 Q17 74 40 68 L60 68 Q83 74 86 100Z" fill="${INK}"/>
          <circle cx="50" cy="42" r="24" fill="${INK}"/>
          ${hairPath}
        </g>
        <rect x="1" y="1" width="98" height="98" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".14"/>
      </g>
    </svg>`;
  }

  // ---------- cena editorial (ilustração pequena nos modais de eventos de vida) ----------
  // Ilustrações REAIS (não mais silhuetas desenhadas à mão) — vendorizadas via
  // scripts/vendor-life-scenes.mjs em js/vendor/life-scenes.js (CQ.LIFE_IMGS), 10
  // ilustrações da unDraw (undraw.co, uso livre sem atribuição). Cada evento de vida
  // (js/narrative.js LIFE_EVENTS) mapeia pra uma destas ~10 categorias reutilizáveis —
  // não é 1 ilustração única por evento (17 seria fora de escopo), é um pequeno
  // vocabulário que se repete entre eventos parecidos (visita a hospital e visita a
  // torcedor internado usam a mesma categoria, por exemplo). O filtro sépia/cinza em
  // .modal2-scene img (css/editorial.css) tinge a ilustração colorida pro tom de papel
  // kraft do resto do jogo, em vez de deixar as cores originais (roxo etc.) destoando.
  const LIFE_SCENE = {
    hospital: "hospital", torcedor: "hospital",
    empresario: "contract", tenis: "contract", bets: "contract",
    coletiva: "mic", arbitro: "mic",
    aniversario: "couple", namorada_liga: "couple",
    colega: "team",
    influencer: "social", documentario: "social",
    incomodo: "rest",
    jantar: "formal", presidente_evento: "formal",
    base: "youth",
    vaquinha: "community",
    // namoro (progressão) — novaNamorada/relAssumido reaproveitam "couple" (mesma
    // categoria de aniversario/namorada_liga, já é uma cena de casal)
    novaNamorada: "couple", relAssumido: "couple",
    pedidoCasamento: "proposal", casamento: "wedding", separacao: "breakup",
    nascimentoFilho: "newborn", traicaoDescoberta: "affair", rumorTraicao: "rumor",
    // carreira/mídia (gated por fama)
    encontroFamoso: "vip", amizadeCelebridade: "celebfriend", videoclipe: "musicvideo",
    campanhaPublicitaria: "adcampaign", propagandaApostas: "bettingad",
    // vício/aposta
    tigrinho: "tigrinho", perdaApostas: "bettingloss",
    // conduta/incidente
    brigaTreino: "fight", brigaBalada: "nightfight", confusaoTorcedor: "crowdtrouble", expulsaoEvento: "escorted",
    acidenteCarro: "carcrash", problemaPolicia: "police",
    // vazamento — "leak" cobre os dois (mesma direção visual: celular com algo borrado)
    vazamentoConversa: "leak", videoComprometedor: "leak",
    // consequência — "social" e "mic" já existem e encaixam bem, sem categoria nova
    criseRedesSociais: "social", cancelamentoPatrocinio: "torncontract", multaClube: "disciplinary",
    pedidoDesculpas: "mic",
    // redenção/doméstico
    voltaPorCima: "comeback", problemaFamiliar: "familycrisis"
  };
  function lifeSceneImg(key) {
    const src = CQ.LIFE_IMGS && CQ.LIFE_IMGS[key];
    return src ? `<img src="${src}" alt="" loading="lazy">` : "";
  }
  function lifeSceneSVG(eventId) {
    const key = LIFE_SCENE[eventId] || "team"; // sem mapeamento conhecido -> cena neutra
    return lifeSceneImg(key);
  }

  // ---------- escudos vetoriais ----------
  // pat: plain | stripes | hoops | sash | diag | half
  function crestSVG(club, cls) {
    const custom = CQ.state && CQ.state.game && CQ.state.game.customLogos && CQ.state.game.customLogos[club.id];
    if (custom) return `<span class="crest ${cls || ""}"><img src="${esc(custom)}" alt=""></span>`;
    // escudo real EMBUTIDO (js/crests.js, gerado por scripts/embed-crests.mjs): não passa
    // pela rede, então nenhum bloqueador de anúncio alcança e funciona offline. É o
    // caminho normal — os dois abaixo são só rede de segurança se crests.js faltar.
    // os data-* mantêm a varredura de reserva (sweepCrests) valendo também aqui: uma
    // imagem embutida não tem como falhar de rede, mas um filtro cosmético mais agressivo
    // (que esconda qualquer <img> dentro de .crest) ainda a apagaria — aí cai no vetorial.
    const embedded = CQ.CRESTS && CQ.CRESTS[club.id];
    if (embedded) return `<span class="crest ${cls || ""}"><img src="${embedded}" alt="" data-crest-club="${esc(club.id)}" data-crest-cls="${esc(cls || "")}"></span>`;
    const realId = CQ.DATA && CQ.DATA.CREST_MAP && CQ.DATA.CREST_MAP[club.id];
    if (realId) {
      // alguns bloqueadores de anúncio não disparam erro de rede (só escondem via CSS,
      // ou trocam por um pixel em branco "carregado com sucesso") — por isso o onload
      // também confere se a imagem realmente veio com conteúdo, não só o onerror.
      // Os data-* são pra varredura de reserva (sweepCrests, js/ui.js), que pega os casos
      // que NENHUM dos dois eventos alcança: filtro cosmético (a imagem carrega mas é
      // escondida por CSS injetado) e requisição que fica pendurada sem erro.
      const fb = `CQ.util.crestSVGFallback('${esc(club.id)}','${esc(cls || "")}')`;
      return `<span class="crest ${cls || ""}"><img src="https://media.api-sports.io/football/teams/${realId}.png" alt="" loading="lazy" data-crest-club="${esc(club.id)}" data-crest-cls="${esc(cls || "")}" onerror="this.parentElement.outerHTML=${fb}" onload="if(this.naturalWidth<10)this.parentElement.outerHTML=${fb}"></span>`;
    }
    return crestSVGProcedural(club, cls);
  }
  // preenchimento (cor sólida ou <pattern> listrado) de um clube por c1/c2/pat — usado
  // tanto pelo brasão vetorial (crestSVGProcedural) quanto pela camisa do campo 2D
  // animado (jerseySVG, js/pitch.js). uid precisa ser único por elemento renderizado
  // (2 <svg> na mesma página não podem compartilhar id de <pattern>).
  function patternFillFor(club, uid) {
    const c1 = club.c1 || "#888", c2 = club.c2 || "#fff";
    let fillDef = "", body = `fill="${c1}"`;
    if (club.pat === "stripes") {
      fillDef = `<pattern id="${uid}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${c2}"/><rect width="5" height="10" fill="${c1}"/></pattern>`;
      body = `fill="url(#${uid})"`;
    } else if (club.pat === "hoops") {
      fillDef = `<pattern id="${uid}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${c2}"/><rect width="10" height="5" fill="${c1}"/></pattern>`;
      body = `fill="url(#${uid})"`;
    } else if (club.pat === "diag" || club.pat === "sash") {
      fillDef = `<pattern id="${uid}" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="40" height="40" fill="${c1}"/><rect y="14" width="40" height="12" fill="${c2}"/></pattern>`;
      body = `fill="url(#${uid})"`;
    } else if (club.pat === "half") {
      fillDef = `<pattern id="${uid}" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="40" fill="${c1}"/><rect x="20" width="20" height="40" fill="${c2}"/></pattern>`;
      body = `fill="url(#${uid})"`;
    }
    return { fillDef: fillDef, body: body, c1: c1, c2: c2 };
  }
  // brasão vetorial procedural (sem depender de imagem externa) — usado quando o clube
  // não tem escudo real mapeado, ou como fallback se a imagem real falhar ao carregar.
  function crestSVGProcedural(club, cls) {
    const uid = "cr" + hashStr(club.id);
    const pf = patternFillFor(club, uid);
    const ini = esc((club.short || club.name || "?").slice(0, 3).toUpperCase());
    const txtFill = "#fffdf6";
    return `<span class="crest ${cls || ""}"><svg viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(club.name)}">
      <defs>${pf.fillDef}</defs>
      <path d="M20 43 Q4 36 3 20 L3 4 Q12 1 20 1 Q28 1 37 4 L37 20 Q36 36 20 43Z" ${pf.body} stroke="#1b1812" stroke-width="1.6"/>
      <path d="M3 4 Q12 1 20 1 Q28 1 37 4 L37 12 L3 12 Z" fill="#1b1812" opacity=".88"/>
      <text x="20" y="10" text-anchor="middle" font-family="'Barlow Condensed','Arial Narrow',sans-serif" font-weight="700" font-size="8.4" fill="${txtFill}" letter-spacing=".6">${ini}</text>
    </svg></span>`;
  }
  // "camisa" simplificada de um clube pro campo 2D animado (js/pitch.js) — um círculo
  // preenchido com o mesmo padrão do brasão (listras/faixas/metade), sem escudo/sigla.
  // uid precisa ser único (ex: inclui o índice do marcador no campo, não só o clube,
  // já que os 2 times podem repetir clube em confrontos hipotéticos de teste). r é o
  // raio do círculo, na unidade do viewBox de quem chama (pitch.js decide a escala).
  function jerseySVG(club, uid, r) {
    const pf = patternFillFor(club, uid);
    return `<defs>${pf.fillDef}</defs><circle r="${r || 3}" ${pf.body} stroke="#1b1812" stroke-width=".5"/>`;
  }
  // usado só pelo onerror do <img> do escudo real — busca o clube pelo id e vai
  // direto pro vetor procedural, sem tentar a imagem real de novo (evita loop).
  function crestSVGFallback(clubId, cls) {
    const club = CQ.DATA && CQ.DATA.CLUBS && CQ.DATA.CLUBS[clubId];
    if (!club) return `<span class="crest ${cls || ""}"></span>`;
    return crestSVGProcedural(club, cls);
  }

  function flagImg(nat, cls) {
    return `<img class="flag ${cls || ""}" src="https://flagcdn.com/w40/${nat.flag}.png" alt="${esc(nat.name)}" onerror="this.style.display='none'">`;
  }
  // avatar de bandeira para seleção (funciona offline com fallback)
  function natAvatar(nat) {
    return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" fill="#ece4d0"/><image href="https://flagcdn.com/w80/${nat.flag}.png" x="4" y="10" width="32" height="20" preserveAspectRatio="xMidYMid slice"/></svg>`;
  }

  // ---------- ícones (SVG stroke, sem emoji) ----------
  const I = {
    ball: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7l4.4 3.2-1.7 5.2H9.3L7.6 10.2 12 7zM12 3v4M7.6 10.2 4 9M16.4 10.2 20 9M9.3 15.4 7 19M14.7 15.4 17 19"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-8 9 8M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4h8v5a4 4 0 01-8 0V4z"/><path d="M8 5H4v2a4 4 0 004 4M16 5h4v2a4 4 0 01-4 4M12 13v4M8 21h8M10 17h4"/></svg>',
    feed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16M4 10h16M4 15h10M4 20h7"/></svg>',
    club: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22C6 19 4 15 4 10V5l8-3 8 3v5c0 5-2 9-8 12z"/></svg>',
    goal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8.5l3.3 2.4-1.3 3.9h-4L8.7 10.9 12 8.5z" fill="currentColor" stroke="none"/></svg>',
    card: '<svg viewBox="0 0 24 24"><rect x="7" y="4" width="10" height="16" rx="1.5" fill="currentColor"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4v12M7 16l-3-3M7 16l3-3M17 20V8M17 8l3 3M17 8l-3 3"/></svg>',
    whistle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10h9l8-4v5a7 7 0 11-14 3z"/><circle cx="10" cy="14" r="1.6" fill="currentColor" stroke="none"/></svg>',
    injury: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8L12 2z"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h13l3 3v13H4V4z"/><path d="M8 4v5h8V4M8 20v-7h8v7"/></svg>',
    glove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 21v-4L4 12l2-1.5 2.5 3V5a1.5 1.5 0 013 0v5V4a1.5 1.5 0 013 0v6V5.5a1.5 1.5 0 013 0V17l-1 4H7z"/></svg>',
    coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.2c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1 1.7-2.5 2-2.5.9-2.5 2.1 1.1 2 2.5 2 2.5-.8 2.5-2"/></svg>',
    vs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4l6 16M10 4L4 20M14 15.5c0 1.4 1.2 2.5 2.8 2.5s2.9-.9 2.9-2.3c0-3-5.5-2.6-5.5-5.4 0-1.4 1.2-2.3 2.7-2.3 1.5 0 2.7 1 2.7 2.4"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    press: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v3M12 6a4 4 0 014 4v8H8v-8a4 4 0 014-4zM8 21h8M10 10h4"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.6-9-9c-1.2-2.8.6-6 3.8-6 2 0 3.5 1.2 5.2 3.3C13.7 6.2 15.2 5 17.2 5c3.2 0 5 3.2 3.8 6-2 4.4-9 9-9 9z"/></svg>',
    repost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9a4 4 0 014-4h9M17 2l3 3-3 3M20 15a4 4 0 01-4 4H7M7 22l-3-3 3-3"/></svg>'
  };

  CQ.util = {
    hashStr, mulberry32, rngFor, ri, rf, choice, chance, shuffle, poisson, clamp,
    esc, cleanInput, fmtBRL, fmtNota, plural,
    nameGen, portraitSVG, lifeSceneSVG, lifeSceneImg, crestSVG, crestSVGFallback, flagImg, natAvatar, I,
    patternFillFor, jerseySVG, tituloOrdinal
  };
})();
