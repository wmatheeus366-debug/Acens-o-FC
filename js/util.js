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

  // ---------- retrato procedural (estilo ilustração) ----------
  const SKINS = [
    { s: "#f4c9a0", d: "#e0ac7d" }, { s: "#e8b38a", d: "#cf9468" }, { s: "#d29b6e", d: "#b57e50" },
    { s: "#b07a4e", d: "#96633a" }, { s: "#8a5a34", d: "#6f4626" }, { s: "#5e3a1f", d: "#4a2c15" }, { s: "#c99a72", d: "#ac7d55" }
  ];
  const HAIRC = ["#20160f", "#0d0d0d", "#3a2415", "#5a3a1e", "#7a5230", "#2a2a2a", "#8a6b3a", "#b0632a"];
  const BGP = [["#e8e2cf", "#d8d0b6"], ["#dbe6dc", "#c6d8c8"], ["#e7dcd0", "#d6c6b4"], ["#dfe0ea", "#cccee0"], ["#ecddd0", "#dcc6b3"]];
  const JERSEY = ["#b8330f", "#17563a", "#274a78", "#1b1812", "#8a2408", "#5a2d82", "#0d6b8a"];

  function portraitSVG(seedStr, size) {
    const r = rngFor("face2", seedStr);
    const sk = choice(SKINS, r);
    const hair = choice(HAIRC, r);
    const style = ri(0, 6, r);       // estilo de cabelo
    const beard = ri(0, 4, r);       // barba
    const bg = choice(BGP, r);
    const jersey = choice(JERSEY, r);
    const eyeY = 47 + ri(-2, 2, r);
    const uid = "p" + hashStr(seedStr);
    // cabelo: camada de trás + frente
    let hairBack = "", hairFront = "";
    if (style === 0) { // curto
      hairFront = `<path d="M27 42 Q26 18 50 16 Q74 18 73 42 Q70 30 62 29 Q56 33 50 30 Q44 33 38 29 Q30 30 27 42Z" fill="${hair}"/>`;
    } else if (style === 1) { // topete
      hairFront = `<path d="M28 40 Q26 14 50 14 Q74 14 72 40 Q70 26 60 25 Q54 20 50 26 Q40 24 28 40Z" fill="${hair}"/><path d="M44 16 Q50 8 58 15 Q52 14 48 20Z" fill="${hair}"/>`;
    } else if (style === 2) { // black power / afro
      hairBack = `<circle cx="50" cy="30" r="26" fill="${hair}"/>`;
      hairFront = `<path d="M25 44 Q24 26 50 25 Q76 26 75 44 Q72 34 50 33 Q28 34 25 44Z" fill="${hair}"/>`;
    } else if (style === 3) { // longo (até a nuca)
      hairBack = `<path d="M24 34 Q24 12 50 12 Q76 12 76 34 L76 60 Q72 52 70 42 Q60 34 50 36 Q40 34 30 42 Q28 52 24 60Z" fill="${hair}"/>`;
      hairFront = `<path d="M27 40 Q26 18 50 17 Q74 18 73 40 Q68 30 50 30 Q32 30 27 40Z" fill="${hair}"/>`;
    } else if (style === 4) { // coque / moicano
      hairBack = `<ellipse cx="50" cy="15" rx="9" ry="7" fill="${hair}"/>`;
      hairFront = `<path d="M30 40 Q30 22 50 22 Q70 22 70 40 Q66 32 50 32 Q34 32 30 40Z" fill="${hair}"/>`;
    } else if (style === 5) { // raspado com risco
      hairFront = `<path d="M29 40 Q28 24 50 23 Q72 24 71 40 Q66 33 50 33 Q34 33 29 40Z" fill="${hair}" opacity=".92"/><path d="M40 26 L42 40" stroke="${bg[0]}" stroke-width="1.4"/>`;
    } else { // careca/recuado
      hairFront = `<path d="M32 36 Q34 26 50 26 Q66 26 68 36 Q62 31 50 31 Q38 31 32 36Z" fill="${hair}" opacity=".55"/>`;
    }
    // barba
    let beardPath = "";
    if (beard === 1) beardPath = `<path d="M31 56 Q33 74 50 76 Q67 74 69 56 Q66 68 50 69 Q34 68 31 56Z" fill="${hair}" opacity=".9"/>`;
    else if (beard === 2) beardPath = `<path d="M30 52 Q31 76 50 78 Q69 76 70 52 L70 62 Q66 72 50 73 Q34 72 30 62Z" fill="${hair}"/><path d="M42 60 h16" stroke="${sk.d}" stroke-width="3" stroke-linecap="round"/>`;
    else if (beard === 3) beardPath = `<path d="M38 62 Q44 68 50 68 Q56 68 62 62" stroke="${hair}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>`;
    else if (beard === 4) beardPath = `<rect x="42" y="61" width="16" height="4" rx="2" fill="${hair}" opacity=".9"/>`;

    return `<svg viewBox="0 0 100 100" width="${size || 96}" height="${size || 96}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="retrato">
      <defs>
        <linearGradient id="${uid}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
        <clipPath id="${uid}c"><rect width="100" height="100"/></clipPath>
      </defs>
      <g clip-path="url(#${uid}c)">
        <rect width="100" height="100" fill="url(#${uid}bg)"/>
        <ellipse cx="50" cy="98" rx="40" ry="26" fill="#00000010"/>
        ${hairBack}
        <!-- ombros / camisa -->
        <path d="M18 100 Q20 78 38 73 L62 73 Q80 78 82 100Z" fill="${jersey}"/>
        <path d="M42 72 Q50 82 58 72 L58 78 Q50 86 42 78Z" fill="#ffffff" opacity=".9"/>
        <!-- pescoço -->
        <path d="M42 66 L42 76 Q50 82 58 76 L58 66Z" fill="${sk.d}"/>
        <!-- orelhas -->
        <ellipse cx="26" cy="48" rx="4" ry="6" fill="${sk.s}"/><ellipse cx="74" cy="48" rx="4" ry="6" fill="${sk.s}"/>
        <!-- cabeça -->
        <path d="M28 44 Q28 68 50 70 Q72 68 72 44 Q72 22 50 22 Q28 22 28 44Z" fill="${sk.s}"/>
        <!-- sombra lateral do rosto -->
        <path d="M50 22 Q72 22 72 44 Q72 68 50 70 Q60 60 60 44 Q60 28 50 22Z" fill="${sk.d}" opacity=".28"/>
        <!-- sobrancelhas -->
        <path d="M36 ${eyeY - 6} q5 -3 10 -0.5" stroke="${hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M54 ${eyeY - 6.5} q5 -2.5 10 0.5" stroke="${hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <!-- olhos -->
        <ellipse cx="41" cy="${eyeY}" rx="4" ry="3" fill="#fff"/><ellipse cx="59" cy="${eyeY}" rx="4" ry="3" fill="#fff"/>
        <circle cx="41.6" cy="${eyeY}" r="2" fill="#241a12"/><circle cx="59.6" cy="${eyeY}" r="2" fill="#241a12"/>
        <circle cx="42.4" cy="${eyeY - 0.8}" r="0.7" fill="#fff"/><circle cx="60.4" cy="${eyeY - 0.8}" r="0.7" fill="#fff"/>
        <!-- nariz -->
        <path d="M50 ${eyeY + 2} q2 7 -2 9 q2 1 4 0" stroke="${sk.d}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <!-- boca -->
        <path d="M43 64 q7 5 14 0" stroke="#8a4a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        ${beardPath}
        ${hairFront}
      </g>
    </svg>`;
  }

  // ---------- escudos vetoriais ----------
  // pat: plain | stripes | hoops | sash | diag | half
  function crestSVG(club, cls) {
    const custom = CQ.state && CQ.state.game && CQ.state.game.customLogos && CQ.state.game.customLogos[club.id];
    if (custom) return `<span class="crest ${cls || ""}"><img src="${esc(custom)}" alt=""></span>`;
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
  // brasão vetorial procedural (sem depender de imagem externa) — usado quando o clube
  // não tem escudo real mapeado, ou como fallback se a imagem real falhar ao carregar.
  function crestSVGProcedural(club, cls) {
    const c1 = club.c1 || "#888", c2 = club.c2 || "#fff";
    const uid = "cr" + hashStr(club.id);
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
    const ini = esc((club.short || club.name || "?").slice(0, 3).toUpperCase());
    const txtFill = "#fffdf6";
    return `<span class="crest ${cls || ""}"><svg viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(club.name)}">
      <defs>${fillDef}</defs>
      <path d="M20 43 Q4 36 3 20 L3 4 Q12 1 20 1 Q28 1 37 4 L37 20 Q36 36 20 43Z" ${body} stroke="#1b1812" stroke-width="1.6"/>
      <path d="M3 4 Q12 1 20 1 Q28 1 37 4 L37 12 L3 12 Z" fill="#1b1812" opacity=".88"/>
      <text x="20" y="10" text-anchor="middle" font-family="'Barlow Condensed','Arial Narrow',sans-serif" font-weight="700" font-size="8.4" fill="${txtFill}" letter-spacing=".6">${ini}</text>
    </svg></span>`;
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
    nameGen, portraitSVG, crestSVG, crestSVGFallback, flagImg, natAvatar, I
  };
})();
