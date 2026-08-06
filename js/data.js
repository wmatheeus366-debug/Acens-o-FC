/* CRAQUE — dados do mundo: clubes, ligas, seleções, lendas, posições.
   Nomes de clubes e formatos de competição são fatos; escudos são
   brasões vetoriais próprios baseados nos padrões de camisa. */
window.CQ = window.CQ || {};

(function () {
  "use strict";

  // ---------------- Seleções ----------------
  const NATIONS = {};
  [
    ["BR", "Brasil", "br", "CONMEBOL", 90],
    ["AR", "Argentina", "ar", "CONMEBOL", 89],
    ["FR", "França", "fr", "UEFA", 89],
    ["ES", "Espanha", "es", "UEFA", 88],
    ["EN", "Inglaterra", "gb-eng", "UEFA", 87],
    ["PT", "Portugal", "pt", "UEFA", 86],
    ["DE", "Alemanha", "de", "UEFA", 85],
    ["NL", "Holanda", "nl", "UEFA", 85],
    ["IT", "Itália", "it", "UEFA", 84],
    ["UY", "Uruguai", "uy", "CONMEBOL", 82],
    ["CO", "Colômbia", "co", "CONMEBOL", 81],
    ["MX", "México", "mx", "CONCACAF", 79],
    ["US", "Estados Unidos", "us", "CONCACAF", 77],
    ["JP", "Japão", "jp", "AFC", 77]
  ].forEach(function (n) {
    NATIONS[n[0]] = { id: n[0], name: n[1], flag: n[2], confed: n[3], str: n[4] };
  });

  // rivais de eliminatórias/torneios por confederação (nomes de seleções)
  const CONFED_POOL = {
    CONMEBOL: ["Brasil", "Argentina", "Uruguai", "Colômbia", "Equador", "Paraguai", "Chile", "Peru", "Bolívia", "Venezuela"],
    UEFA: ["França", "Espanha", "Inglaterra", "Portugal", "Alemanha", "Holanda", "Itália", "Bélgica", "Croácia", "Dinamarca", "Suíça", "Áustria"],
    CONCACAF: ["México", "Estados Unidos", "Canadá", "Panamá", "Costa Rica", "Honduras", "Jamaica", "El Salvador"],
    AFC: ["Japão", "Coreia do Sul", "Irã", "Austrália", "Arábia Saudita", "Catar", "Iraque", "Uzbequistão"]
  };
  const WORLD_POOL = ["Brasil", "Argentina", "França", "Espanha", "Inglaterra", "Portugal", "Alemanha", "Holanda", "Itália", "Uruguai", "Colômbia", "México", "Estados Unidos", "Japão", "Croácia", "Bélgica", "Marrocos", "Senegal", "Coreia do Sul", "Suíça", "Dinamarca", "Equador"];
  const NAT_STR = { "Brasil": 90, "Argentina": 89, "França": 89, "Espanha": 88, "Inglaterra": 87, "Portugal": 86, "Alemanha": 85, "Holanda": 85, "Itália": 84, "Uruguai": 82, "Colômbia": 81, "México": 79, "Estados Unidos": 77, "Japão": 77, "Croácia": 82, "Bélgica": 82, "Marrocos": 80, "Senegal": 78, "Coreia do Sul": 76, "Suíça": 79, "Dinamarca": 79, "Equador": 78, "Paraguai": 75, "Chile": 75, "Peru": 74, "Bolívia": 70, "Venezuela": 72, "Canadá": 75, "Panamá": 71, "Costa Rica": 71, "Honduras": 68, "Jamaica": 68, "El Salvador": 65, "Irã": 76, "Austrália": 75, "Arábia Saudita": 73, "Catar": 71, "Iraque": 69, "Uzbequistão": 70, "Áustria": 78 };

  // ---------------- Clubes ----------------
  const CLUBS = {};
  function C(id, name, short, str, league, uf, c1, c2, pat) {
    CLUBS[id] = { id: id, name: name, short: short, str: str, league: league, uf: uf || null, c1: c1, c2: c2, pat: pat || "plain", rivals: [] };
  }
  function riv(a, b) {
    if (CLUBS[a] && CLUBS[b]) { CLUBS[a].rivals.push(b); CLUBS[b].rivals.push(a); }
  }

  // ---- Série A 2026 (20) ----
  C("fla", "Flamengo", "FLA", 88, "BRA", "RJ", "#a3122a", "#1b1812", "hoops");
  C("pal", "Palmeiras", "PAL", 87, "BRA", "SP", "#0a5c36", "#ffffff", "plain");
  C("cru", "Cruzeiro", "CRU", 83, "BRA", "MG", "#1a4c9c", "#ffffff", "plain");
  C("bot", "Botafogo", "BOT", 83, "BRA", "RJ", "#1b1812", "#ffffff", "stripes");
  C("flu", "Fluminense", "FLU", 81, "BRA", "RJ", "#7a1230", "#0b5b41", "stripes");
  C("bah", "Bahia", "BAH", 80, "BRA", "BA", "#1560a8", "#d0342c", "stripes");
  C("sao", "São Paulo", "SAO", 81, "BRA", "SP", "#ffffff", "#c8102e", "sash");
  C("cor", "Corinthians", "COR", 80, "BRA", "SP", "#ffffff", "#1b1812", "plain");
  C("vas", "Vasco da Gama", "VAS", 78, "BRA", "RJ", "#1b1812", "#ffffff", "sash");
  C("cam", "Atlético-MG", "CAM", 81, "BRA", "MG", "#1b1812", "#ffffff", "stripes");
  C("rbb", "RB Bragantino", "RBB", 77, "BRA", "SP", "#ffffff", "#d0342c", "half");
  C("san", "Santos", "SAN", 78, "BRA", "SP", "#ffffff", "#1b1812", "plain");
  C("mir", "Mirassol", "MIR", 76, "BRA", "SP", "#f2c500", "#0b7a3b", "half");
  C("vit", "Vitória", "VIT", 74, "BRA", "BA", "#d0342c", "#1b1812", "hoops");
  C("gre", "Grêmio", "GRE", 80, "BRA", "RS", "#0d80bf", "#1b1812", "stripes");
  C("int", "Internacional", "INT", 80, "BRA", "RS", "#d0342c", "#ffffff", "plain");
  C("cap", "Athletico-PR", "CAP", 78, "BRA", "PR", "#d0342c", "#1b1812", "stripes");
  C("cfc", "Coritiba", "CFC", 74, "BRA", "PR", "#0b6b4f", "#ffffff", "stripes");
  C("cha", "Chapecoense", "CHA", 72, "BRA", "SC", "#0b7a3b", "#ffffff", "plain");
  C("rem", "Remo", "REM", 71, "BRA", "PA", "#0a2a5e", "#ffffff", "plain");

  // ---- Série B (20) ----
  C("spt", "Sport Recife", "SPT", 74, "BRB", "PE", "#d0342c", "#1b1812", "hoops");
  C("for", "Fortaleza", "FOR", 76, "BRB", "CE", "#1560a8", "#d0342c", "hoops");
  C("cea", "Ceará", "CEA", 74, "BRB", "CE", "#1b1812", "#ffffff", "hoops");
  C("juv", "Juventude", "JUV", 71, "BRB", "RS", "#0b7a3b", "#ffffff", "hoops");
  C("goi", "Goiás", "GOI", 72, "BRB", "GO", "#0b7a3b", "#ffffff", "plain");
  C("ava", "Avaí", "AVA", 70, "BRB", "SC", "#1a4c9c", "#ffffff", "stripes");
  C("cri", "Criciúma", "CRI", 70, "BRB", "SC", "#f2c500", "#1b1812", "stripes");
  C("ame", "América-MG", "AME", 71, "BRB", "MG", "#0b7a3b", "#1b1812", "plain");
  C("crb", "CRB", "CRB", 69, "BRB", "AL", "#d0342c", "#ffffff", "hoops");
  C("pay", "Paysandu", "PAY", 69, "BRB", "PA", "#1a4c9c", "#ffffff", "hoops");
  C("vil", "Vila Nova", "VIL", 69, "BRB", "GO", "#d0342c", "#ffffff", "plain");
  C("pon", "Ponte Preta", "PON", 69, "BRB", "SP", "#1b1812", "#ffffff", "plain");
  C("gua", "Guarani", "GUA", 68, "BRB", "SP", "#0b7a3b", "#ffffff", "plain");
  C("ope", "Operário-PR", "OPE", 67, "BRB", "PR", "#1b1812", "#ffffff", "stripes");
  C("amz", "Amazonas", "AMZ", 66, "BRB", "AM", "#f2c500", "#1b1812", "plain");
  C("ath", "Athletic-MG", "ATH", 66, "BRB", "MG", "#d0342c", "#1b1812", "stripes");
  C("nau", "Náutico", "NAU", 70, "BRB", "PE", "#d0342c", "#1b1812", "stripes");
  C("fig", "Figueirense", "FIG", 68, "BRB", "SC", "#1b1812", "#ffffff", "stripes");
  C("prc", "Paraná Clube", "PAR", 68, "BRB", "PR", "#0b7a3b", "#d0342c", "stripes");
  C("spc", "Sampaio Corrêa", "SPC", 67, "BRB", "MA", "#d0342c", "#1b1812", "hoops");

  // ---- Clubes de estaduais (pequenos/regionais) ----
  C("boa", "Boavista-RJ", "BOA", 62, "EST", "RJ", "#0b7a3b", "#f2c500", "half");
  C("vre", "Volta Redonda", "VRE", 64, "EST", "RJ", "#f2c500", "#1b1812", "plain");
  C("mad", "Madureira", "MAD", 61, "EST", "RJ", "#5a2d82", "#f2c500", "stripes");
  C("nig", "Nova Iguaçu", "NIG", 62, "EST", "RJ", "#f28c00", "#1a4c9c", "half");
  C("xvp", "XV de Piracicaba", "XVP", 61, "EST", "SP", "#ffffff", "#1b1812", "stripes");
  C("nov", "Novorizontino", "NOV", 68, "EST", "SP", "#f2c500", "#1b1812", "half");
  C("bsp", "Botafogo-SP", "BSP", 64, "EST", "SP", "#d0342c", "#1b1812", "stripes");
  C("por", "Portuguesa", "POR", 63, "EST", "SP", "#d0342c", "#0b7a3b", "half");
  C("sbe", "São Bernardo", "SBE", 64, "EST", "SP", "#f2c500", "#1b1812", "plain");
  C("tom", "Tombense", "TOM", 62, "EST", "MG", "#d0342c", "#1b1812", "plain");
  C("cal", "Caldense", "CAL", 60, "EST", "MG", "#0b7a3b", "#ffffff", "stripes");
  C("pou", "Pouso Alegre", "POU", 60, "EST", "MG", "#d0342c", "#ffffff", "plain");
  C("cax", "Caxias", "CAX", 63, "EST", "RS", "#7a1230", "#1a4c9c", "half");
  C("ypi", "Ypiranga-RS", "YPI", 62, "EST", "RS", "#0b7a3b", "#f2c500", "stripes");
  C("sjo", "São José-RS", "SJO", 60, "EST", "RS", "#1a4c9c", "#ffffff", "plain");
  C("jac", "Jacuipense", "JAC", 60, "EST", "BA", "#d0342c", "#1b1812", "plain");
  C("jua", "Juazeirense", "JUA", 60, "EST", "BA", "#0b7a3b", "#f2c500", "half");
  C("ala", "Atlético de Alagoinhas", "ALA", 61, "EST", "BA", "#f28c00", "#1b1812", "plain");
  C("lon", "Londrina", "LON", 64, "EST", "PR", "#1a4c9c", "#ffffff", "plain");
  C("mar", "Maringá", "MAR", 62, "EST", "PR", "#1a4c9c", "#f2c500", "half");
  C("cas", "FC Cascavel", "CAS", 61, "EST", "PR", "#f2c500", "#0b7a3b", "plain");
  C("bru", "Brusque", "BRU", 63, "EST", "SC", "#f2c500", "#0b7a3b", "half");
  C("mcd", "Marcílio Dias", "MCD", 60, "EST", "SC", "#d0342c", "#1a4c9c", "hoops");
  C("con", "Concórdia", "CON", 59, "EST", "SC", "#1a4c9c", "#ffffff", "plain");
  C("tun", "Tuna Luso", "TUN", 59, "EST", "PA", "#1a4c9c", "#ffffff", "plain");
  C("agm", "Águia de Marabá", "AGM", 59, "EST", "PA", "#1a4c9c", "#f2c500", "half");
  C("cst", "Castanhal", "CST", 58, "EST", "PA", "#5a2d82", "#ffffff", "plain");

  // ---- América do Sul (Libertadores/Sula) ----
  C("riv", "River Plate", "RIV", 85, "SAM", null, "#ffffff", "#d0342c", "sash");
  C("boc", "Boca Juniors", "BOC", 84, "SAM", null, "#1a3e8c", "#f2c500", "hoops");
  C("rac", "Racing", "RAC", 80, "SAM", null, "#7ec8e3", "#ffffff", "stripes");
  C("ind", "Independiente", "IND", 77, "SAM", null, "#d0342c", "#ffffff", "plain");
  C("est", "Estudiantes", "EST", 77, "SAM", null, "#d0342c", "#ffffff", "hoops");
  C("pen", "Peñarol", "PEN", 78, "SAM", null, "#f2c500", "#1b1812", "stripes");
  C("nac", "Nacional-URU", "NAC", 78, "SAM", null, "#ffffff", "#1a4c9c", "plain");
  C("col", "Colo-Colo", "COL", 77, "SAM", null, "#ffffff", "#1b1812", "plain");
  C("udc", "U. de Chile", "UDC", 76, "SAM", null, "#1a3e8c", "#d0342c", "plain");
  C("cer", "Cerro Porteño", "CER", 75, "SAM", null, "#d0342c", "#1a4c9c", "half");
  C("oli", "Olimpia", "OLI", 75, "SAM", null, "#ffffff", "#1b1812", "hoops");
  C("ldu", "LDU Quito", "LDU", 76, "SAM", null, "#ffffff", "#1a4c9c", "plain");
  C("bce", "Barcelona-EQU", "BCE", 74, "SAM", null, "#f2c500", "#1b1812", "plain");
  C("bol", "Bolívar", "BOL", 74, "SAM", null, "#7ec8e3", "#1b1812", "plain");
  C("mil", "Millonarios", "MIL", 75, "SAM", null, "#1a3e8c", "#ffffff", "plain");
  C("atn", "Atlético Nacional", "ATN", 77, "SAM", null, "#0b7a3b", "#ffffff", "stripes");

  // ---- Europa ----
  function euro(league, arr) {
    arr.forEach(function (t) {
      C(t[0], t[1], t[2], t[3], league, null, t[4], t[5], t[6] || "plain");
    });
  }
  euro("ESP", [
    ["rma", "Real Madrid", "RMA", 92, "#ffffff", "#c9a227"], ["bar", "Barcelona", "BAR", 90, "#7a1230", "#1a3e8c", "stripes"],
    ["atm", "Atlético de Madrid", "ATM", 86, "#d0342c", "#ffffff", "stripes"], ["atb", "Athletic Bilbao", "ATB", 81, "#d0342c", "#ffffff", "stripes"],
    ["rso", "Real Sociedad", "RSO", 79, "#1a4c9c", "#ffffff", "stripes"], ["bet", "Betis", "BET", 79, "#0b7a3b", "#ffffff", "stripes"],
    ["vll", "Villarreal", "VLL", 80, "#f2c500", "#1a4c9c"], ["sev", "Sevilla", "SEV", 78, "#ffffff", "#d0342c"],
    ["val", "Valencia", "VAL", 77, "#ffffff", "#f28c00"], ["gir", "Girona", "GIR", 76, "#d0342c", "#ffffff", "stripes"],
    ["osa", "Osasuna", "OSA", 74, "#d0342c", "#1a3e8c"], ["cel", "Celta", "CEL", 74, "#7ec8e3", "#ffffff"],
    ["ray", "Rayo Vallecano", "RAY", 73, "#ffffff", "#d0342c", "sash"], ["mal", "Mallorca", "MAL", 73, "#d0342c", "#1b1812"],
    ["get", "Getafe", "GET", 72, "#1a4c9c", "#ffffff"], ["alv", "Alavés", "ALV", 71, "#1a4c9c", "#ffffff", "stripes"],
    ["esy", "Espanyol", "ESY", 71, "#1a4c9c", "#ffffff", "stripes"], ["lev", "Levante", "LEV", 69, "#1a3e8c", "#7a1230", "half"]
  ]);
  euro("ENG", [
    ["mci", "Manchester City", "MCI", 91, "#7ec8e3", "#ffffff"], ["ars", "Arsenal", "ARS", 90, "#d0342c", "#ffffff"],
    ["liv", "Liverpool", "LIV", 91, "#d0342c", "#ffffff"], ["che", "Chelsea", "CHE", 86, "#1a3e8c", "#ffffff"],
    ["mun", "Manchester United", "MUN", 84, "#d0342c", "#1b1812"], ["tot", "Tottenham", "TOT", 84, "#ffffff", "#1b1812"],
    ["new", "Newcastle", "NEW", 84, "#1b1812", "#ffffff", "stripes"], ["avl", "Aston Villa", "AVL", 82, "#7a1230", "#7ec8e3"],
    ["bha", "Brighton", "BHA", 79, "#1a4c9c", "#ffffff", "stripes"], ["whu", "West Ham", "WHU", 77, "#7a1230", "#7ec8e3"],
    ["cry", "Crystal Palace", "CRY", 78, "#1a4c9c", "#d0342c", "half"], ["bre", "Brentford", "BRE", 76, "#d0342c", "#ffffff", "stripes"],
    ["ful", "Fulham", "FUL", 76, "#ffffff", "#1b1812"], ["eve", "Everton", "EVE", 75, "#1a3e8c", "#ffffff"],
    ["wol", "Wolves", "WOL", 74, "#f28c00", "#1b1812"], ["nfo", "Nottingham Forest", "NFO", 78, "#d0342c", "#ffffff"],
    ["bou", "Bournemouth", "BOU", 77, "#d0342c", "#1b1812", "stripes"], ["lee", "Leeds", "LEE", 74, "#ffffff", "#f2c500"]
  ]);
  euro("ITA", [
    ["intm", "Inter de Milão", "INT", 89, "#1a3e8c", "#1b1812", "stripes"], ["mln", "Milan", "MIL", 85, "#d0342c", "#1b1812", "stripes"],
    ["juve", "Juventus", "JUV", 85, "#ffffff", "#1b1812", "stripes"], ["nap", "Napoli", "NAP", 87, "#7ec8e3", "#ffffff"],
    ["rom", "Roma", "ROM", 82, "#7a1230", "#f28c00"], ["ata", "Atalanta", "ATA", 84, "#1a3e8c", "#1b1812", "stripes"],
    ["laz", "Lazio", "LAZ", 80, "#7ec8e3", "#ffffff"], ["fio", "Fiorentina", "FIO", 79, "#5a2d82", "#ffffff"],
    ["bgn", "Bologna", "BGN", 79, "#d0342c", "#1a3e8c", "stripes"], ["tor", "Torino", "TOR", 75, "#7a1230", "#ffffff"],
    ["udi", "Udinese", "UDI", 73, "#1b1812", "#ffffff", "stripes"], ["gen", "Genoa", "GEN", 73, "#d0342c", "#1a3e8c", "half"],
    ["como", "Como", "COM", 74, "#1a3e8c", "#ffffff"], ["sas", "Sassuolo", "SAS", 72, "#0b7a3b", "#1b1812", "stripes"],
    ["cag", "Cagliari", "CAG", 71, "#d0342c", "#1a3e8c", "half"], ["ver", "Hellas Verona", "VER", 70, "#f2c500", "#1a3e8c"],
    ["lec", "Lecce", "LEC", 70, "#f2c500", "#d0342c", "stripes"], ["par", "Parma", "PAR", 72, "#f2c500", "#1a3e8c", "sash"]
  ]);
  euro("GER", [
    ["bay", "Bayern de Munique", "BAY", 91, "#d0342c", "#ffffff"], ["lev4", "Bayer Leverkusen", "B04", 86, "#d0342c", "#1b1812"],
    ["bvb", "Borussia Dortmund", "BVB", 85, "#f2c500", "#1b1812"], ["rbl", "RB Leipzig", "RBL", 83, "#ffffff", "#d0342c"],
    ["stu", "Stuttgart", "STU", 80, "#ffffff", "#d0342c", "hoops"], ["sge", "Eintracht Frankfurt", "SGE", 80, "#1b1812", "#d0342c"],
    ["fre", "Freiburg", "FRE", 77, "#d0342c", "#1b1812"], ["hof", "Hoffenheim", "HOF", 75, "#1a4c9c", "#ffffff"],
    ["wob", "Wolfsburg", "WOB", 75, "#0b7a3b", "#ffffff"], ["bmg", "M'gladbach", "BMG", 75, "#ffffff", "#1b1812"],
    ["mai", "Mainz", "MAI", 74, "#d0342c", "#ffffff"], ["aug", "Augsburg", "AUG", 73, "#d0342c", "#0b7a3b", "half"],
    ["sve", "Werder Bremen", "SVW", 74, "#0b7a3b", "#ffffff"], ["uni", "Union Berlin", "UNB", 73, "#d0342c", "#ffffff"],
    ["koe", "Colônia", "KOE", 72, "#ffffff", "#d0342c"], ["hsv", "Hamburgo", "HSV", 73, "#ffffff", "#1a4c9c"],
    ["stp", "St. Pauli", "STP", 70, "#5c3a1e", "#ffffff"], ["hei", "Heidenheim", "HEI", 69, "#d0342c", "#1a4c9c"]
  ]);
  euro("FRA", [
    ["psg", "Paris Saint-Germain", "PSG", 91, "#1a3e8c", "#d0342c", "sash"], ["mon", "Monaco", "MON", 83, "#d0342c", "#ffffff", "half"],
    ["mars", "Olympique de Marselha", "OM", 82, "#ffffff", "#7ec8e3"], ["lil", "Lille", "LIL", 80, "#d0342c", "#1a3e8c"],
    ["oly", "Lyon", "OL", 80, "#ffffff", "#d0342c", "sash"], ["nice", "Nice", "NIC", 78, "#d0342c", "#1b1812", "stripes"],
    ["len", "Lens", "LEN", 77, "#f2c500", "#d0342c", "half"], ["ren", "Rennes", "REN", 77, "#d0342c", "#1b1812", "hoops"],
    ["str", "Strasbourg", "STR", 75, "#1a4c9c", "#ffffff"], ["tou", "Toulouse", "TOU", 73, "#5a2d82", "#ffffff"],
    ["nan", "Nantes", "NAN", 72, "#f2c500", "#0b7a3b"], ["rei", "Reims", "REI", 72, "#d0342c", "#ffffff", "stripes"],
    ["mtp", "Montpellier", "MTP", 70, "#1a3e8c", "#f28c00"], ["bres", "Brest", "BRS", 74, "#d0342c", "#ffffff", "stripes"],
    ["aux", "Auxerre", "AUX", 70, "#ffffff", "#1a4c9c"], ["hav", "Le Havre", "HAV", 68, "#7ec8e3", "#1a3e8c", "half"],
    ["ang", "Angers", "ANG", 68, "#1b1812", "#ffffff", "stripes"], ["metz", "Metz", "MET", 68, "#7a1230", "#ffffff"]
  ]);
  euro("POR", [
    ["ben", "Benfica", "BEN", 85, "#d0342c", "#ffffff"], ["porto", "Porto", "POR", 84, "#1a4c9c", "#ffffff", "stripes"],
    ["scp", "Sporting", "SCP", 85, "#0b7a3b", "#ffffff", "hoops"], ["bra", "Braga", "BRA", 79, "#d0342c", "#ffffff"],
    ["vgu", "Vitória de Guimarães", "VGU", 75, "#ffffff", "#1b1812"], ["fam", "Famalicão", "FAM", 72, "#1a4c9c", "#ffffff"],
    ["boav", "Boavista", "BOV", 70, "#1b1812", "#ffffff", "half"], ["gil", "Gil Vicente", "GIL", 70, "#d0342c", "#1a3e8c"],
    ["rio", "Rio Ave", "RIO", 69, "#0b7a3b", "#ffffff", "stripes"], ["mor", "Moreirense", "MOR", 69, "#0b7a3b", "#f2c500", "hoops"],
    ["esto", "Estoril", "ETR", 69, "#f2c500", "#1a4c9c"], ["cpia", "Casa Pia", "CPI", 67, "#1b1812", "#ffffff"],
    ["aro", "Arouca", "ARO", 68, "#f2c500", "#1a4c9c", "half"], ["scl", "Santa Clara", "SCL", 68, "#d0342c", "#ffffff", "half"],
    ["farn", "Farense", "FAR", 66, "#ffffff", "#1b1812"], ["estr", "Estrela da Amadora", "EAM", 66, "#d0342c", "#0b7a3b", "half"],
    ["nacp", "Nacional", "NAC", 66, "#1b1812", "#ffffff", "stripes"], ["ton", "Tondela", "TON", 65, "#f2c500", "#0b7a3b"]
  ]);

  // rivalidades
  riv("fla", "flu"); riv("fla", "vas"); riv("fla", "bot"); riv("flu", "bot"); riv("vas", "bot"); riv("flu", "vas");
  riv("pal", "cor"); riv("pal", "sao"); riv("pal", "san"); riv("cor", "sao"); riv("cor", "san"); riv("sao", "san");
  riv("cru", "cam"); riv("gre", "int"); riv("bah", "vit"); riv("cap", "cfc"); riv("cea", "for"); riv("rem", "pay");
  riv("spt", "nau"); riv("ava", "fig");
  riv("rma", "bar"); riv("rma", "atm"); riv("mci", "mun"); riv("liv", "mun"); riv("liv", "eve"); riv("ars", "tot");
  riv("intm", "mln"); riv("juve", "tor"); riv("rom", "laz"); riv("bay", "bvb"); riv("psg", "mars"); riv("ben", "porto"); riv("scp", "ben");
  riv("riv", "boc"); riv("pen", "nac");

  // cobertura total: todo clube ganha ao menos um rival (real ou de reposição).
  // Clube sem par curado pega o mais forte do mesmo estado (uf); sem uf compatível
  // (alguns estados só têm 1 clube no jogo), cai pro mais forte da mesma liga.
  // Nunca sobrescreve rivalidade real já cadastrada.
  (function assignFallbackRivals() {
    const ids = Object.keys(CLUBS).sort(function (a, b) {
      return CLUBS[b].str - CLUBS[a].str || a.localeCompare(b);
    });
    ids.forEach(function (id) {
      const cl = CLUBS[id];
      if (cl.rivals.length > 0) return; // real, ou já ganhou rival nesta mesma passada
      let pool = Object.keys(CLUBS).filter(function (oid) {
        return oid !== id && cl.uf && CLUBS[oid].uf === cl.uf;
      });
      if (!pool.length) pool = Object.keys(CLUBS).filter(function (oid) { return oid !== id && CLUBS[oid].league === cl.league; });
      if (!pool.length) return;
      pool.sort(function (a, b) { return CLUBS[b].str - CLUBS[a].str || a.localeCompare(b); });
      riv(id, pool[0]);
    });
  })();

  const LEAGUES = {
    BRA: { id: "BRA", name: "Brasileirão Série A", short: "Série A", country: "BR", cupName: "Copa do Brasil", rounds: 38 },
    BRB: { id: "BRB", name: "Brasileirão Série B", short: "Série B", country: "BR", cupName: "Copa do Brasil", rounds: 38 },
    ESP: { id: "ESP", name: "LaLiga", short: "LaLiga", country: "ES", cupName: "Copa do Rei", rounds: 34 },
    ENG: { id: "ENG", name: "Premier League", short: "Premier", country: "EN", cupName: "Copa da Inglaterra", rounds: 34 },
    ITA: { id: "ITA", name: "Serie A italiana", short: "Serie A", country: "IT", cupName: "Copa da Itália", rounds: 34 },
    GER: { id: "GER", name: "Bundesliga", short: "Bundesliga", country: "DE", cupName: "Copa da Alemanha", rounds: 34 },
    FRA: { id: "FRA", name: "Ligue 1", short: "Ligue 1", country: "FR", cupName: "Copa da França", rounds: 34 },
    POR: { id: "POR", name: "Liga Portugal", short: "Liga PT", country: "PT", cupName: "Taça de Portugal", rounds: 34 }
  };
  const EURO_LEAGUES = ["ESP", "ENG", "ITA", "GER", "FRA", "POR"];

  const ESTADUAIS = {
    RJ: "Campeonato Carioca", SP: "Campeonato Paulista", MG: "Campeonato Mineiro",
    RS: "Campeonato Gaúcho", BA: "Campeonato Baiano", PR: "Campeonato Paranaense",
    SC: "Campeonato Catarinense", PA: "Campeonato Paraense", CE: "Campeonato Cearense",
    GO: "Campeonato Goiano", PE: "Campeonato Pernambucano", AL: "Campeonato Alagoano", AM: "Campeonato Amazonense"
  };

  // ---------------- Posições ----------------
  // atributos: pac fin pas dri def fis bp ref posn
  const POSITIONS = {
    GOL: {
      name: "Goleiro", weights: { ref: 0.34, posn: 0.22, def: 0.12, fis: 0.12, pas: 0.10, bp: 0.05, pac: 0.05 },
      archs: [
        { id: "muralha", name: "Muralha", desc: "Reflexo puro na linha", boost: { ref: 4, posn: 1 } },
        { id: "libero", name: "Goleiro-líbero", desc: "Joga com os pés, sai da área", boost: { pas: 3, posn: 2 } },
        { id: "pegapen", name: "Pegador de pênalti", desc: "Especialista na marca da cal", boost: { ref: 2, bp: 3 } }
      ]
    },
    ZAG: {
      name: "Zagueiro", weights: { def: 0.32, posn: 0.18, fis: 0.18, pac: 0.10, pas: 0.10, dri: 0.04, bp: 0.04, fin: 0.02, ref: 0.02 },
      archs: [
        { id: "xerife", name: "Xerife", desc: "Imposição física e liderança", boost: { def: 3, fis: 2 } },
        { id: "tecnico", name: "Zagueiro construtor", desc: "Saída de bola limpa", boost: { pas: 3, def: 1 } },
        { id: "veloz", name: "Zagueiro veloz", desc: "Cobre as costas da linha", boost: { pac: 4 } }
      ]
    },
    LAT: {
      name: "Lateral", weights: { pac: 0.22, def: 0.18, pas: 0.16, dri: 0.14, fis: 0.12, posn: 0.10, bp: 0.05, fin: 0.03 },
      archs: [
        { id: "apoiador", name: "Lateral ofensivo", desc: "Vive na linha de fundo", boost: { pac: 2, dri: 2, pas: 1 } },
        { id: "defensivo", name: "Lateral defensivo", desc: "Primeiro defende", boost: { def: 3, posn: 2 } },
        { id: "ala", name: "Ala construtor", desc: "Cruzamento e bola parada", boost: { bp: 3, pas: 2 } }
      ]
    },
    VOL: {
      name: "Volante", weights: { def: 0.24, pas: 0.20, posn: 0.16, fis: 0.16, dri: 0.10, pac: 0.08, bp: 0.04, fin: 0.02 },
      archs: [
        { id: "primeiro", name: "Primeiro volante", desc: "Cão de guarda da zaga", boost: { def: 4, fis: 1 } },
        { id: "construtor", name: "Volante construtor", desc: "Organiza de trás", boost: { pas: 3, posn: 2 } },
        { id: "b2b", name: "Box-to-box", desc: "Chega na área dos dois lados", boost: { fis: 3, fin: 2 } }
      ]
    },
    MEI: {
      name: "Meia", weights: { pas: 0.26, dri: 0.20, posn: 0.14, bp: 0.12, fin: 0.10, pac: 0.08, fis: 0.06, def: 0.04 },
      archs: [
        { id: "armador", name: "Armador clássico", desc: "O camisa 10 raiz", boost: { pas: 4, bp: 2 } },
        { id: "chegada", name: "Meia de chegada", desc: "Infiltra e finaliza", boost: { fin: 3, posn: 2 } },
        { id: "drible", name: "Meia driblador", desc: "Desequilibra no 1x1", boost: { dri: 4 } }
      ]
    },
    PON: {
      name: "Ponta", weights: { pac: 0.24, dri: 0.24, fin: 0.18, pas: 0.12, posn: 0.10, fis: 0.06, bp: 0.06 },
      archs: [
        { id: "driblador", name: "Ponta driblador", desc: "Um-contra-um sem dó", boost: { dri: 4, pac: 1 } },
        { id: "veloz", name: "Ponta de velocidade", desc: "Profundidade e disparada", boost: { pac: 4 } },
        { id: "goleador", name: "Ponta goleador", desc: "Corta pra dentro e fuzila", boost: { fin: 4 } }
      ]
    },
    ATA: {
      name: "Atacante", weights: { fin: 0.30, posn: 0.20, pac: 0.16, dri: 0.12, fis: 0.12, pas: 0.06, bp: 0.04 },
      archs: [
        { id: "matador", name: "Matador", desc: "Faro de gol dentro da área", boost: { fin: 4, posn: 2 } },
        { id: "completo", name: "Camisa 9 completo", desc: "Pivô, combate e gol", boost: { fis: 2, pas: 2, fin: 1 } },
        { id: "falso9", name: "Falso 9", desc: "Flutua e arma o jogo", boost: { dri: 3, pas: 3 } }
      ]
    }
  };
  const ATTR_NAMES = { pac: "Ritmo", fin: "Finalização", pas: "Passe", dri: "Drible", def: "Defesa", fis: "Físico", bp: "Bola parada", ref: "Reflexo", posn: "Posicionamento" };

  // ---------------- Lendas ("Os Craques") ----------------
  const LEGENDS = [
    { id: "pele", name: "Pelé", trait: "Faro de gol e oportunismo", boost: { fin: 5, posn: 3 } },
    { id: "garrincha", name: "Garrincha", trait: "Drible e um-contra-um", boost: { dri: 6, pac: 2 } },
    { id: "ronaldo", name: "Ronaldo Fenômeno", trait: "Explosão e finalização", boost: { pac: 4, fin: 4 } },
    { id: "r10", name: "Ronaldinho Gaúcho", trait: "Magia e improviso", boost: { dri: 4, pas: 4 } },
    { id: "zico", name: "Zico", trait: "Bola parada cirúrgica", boost: { bp: 6, pas: 2 } },
    { id: "romario", name: "Romário", trait: "Gol de área", boost: { posn: 5, fin: 3 } },
    { id: "maradona", name: "Maradona", trait: "Genialidade conduzida", boost: { dri: 5, pas: 3 } },
    { id: "messi", name: "Messi", trait: "Controle e decisão", boost: { dri: 4, fin: 3, pas: 1 } },
    { id: "cr7", name: "Cristiano Ronaldo", trait: "Potência e mentalidade", boost: { fin: 4, fis: 4 } },
    { id: "zidane", name: "Zidane", trait: "Elegância sob pressão", boost: { pas: 4, dri: 3 } },
    { id: "xavi", name: "Xavi", trait: "Leitura de jogo", boost: { pas: 5, posn: 3 } },
    { id: "pirlo", name: "Pirlo", trait: "Lançamento e faltas", boost: { bp: 4, pas: 4 } },
    { id: "cafu", name: "Cafu", trait: "Fôlego pela beirada", boost: { pac: 4, fis: 4 } },
    { id: "rcarlos", name: "Roberto Carlos", trait: "Canhão da esquerda", boost: { bp: 5, pac: 3 } },
    { id: "cannavaro", name: "Cannavaro", trait: "Antecipação defensiva", boost: { def: 6, posn: 2 } },
    { id: "beckenbauer", name: "Beckenbauer", trait: "Defesa com classe", boost: { def: 4, pas: 4 } },
    { id: "casillas", name: "Casillas", trait: "Reflexos felinos", boost: { ref: 6, posn: 2 } },
    { id: "taffarel", name: "Taffarel", trait: "Pênalti é com ele", boost: { ref: 4, bp: 4 } },
    { id: "neuer", name: "Neuer", trait: "Goleiro-líbero moderno", boost: { ref: 4, pas: 4 } }
  ];

  // ---------------- Histórico real de campeões (pré-carregado) ----------------
  const CHAMPS_SEED = {
    BRA: { 2014: "Cruzeiro", 2015: "Corinthians", 2016: "Palmeiras", 2017: "Corinthians", 2018: "Palmeiras", 2019: "Flamengo", 2020: "Flamengo", 2021: "Atlético-MG", 2022: "Palmeiras", 2023: "Palmeiras", 2024: "Botafogo", 2025: "Flamengo" },
    CDB: { 2015: "Palmeiras", 2016: "Grêmio", 2017: "Cruzeiro", 2018: "Cruzeiro", 2019: "Athletico-PR", 2020: "Palmeiras", 2021: "Atlético-MG", 2022: "Flamengo", 2023: "São Paulo", 2024: "Flamengo", 2025: "Corinthians" },
    LIB: { 2015: "River Plate", 2016: "Atlético Nacional", 2017: "Grêmio", 2018: "River Plate", 2019: "Flamengo", 2020: "Palmeiras", 2021: "Palmeiras", 2022: "Flamengo", 2023: "Fluminense", 2024: "Botafogo", 2025: "Flamengo" },
    UCL: { 2015: "Barcelona", 2016: "Real Madrid", 2017: "Real Madrid", 2018: "Real Madrid", 2019: "Liverpool", 2020: "Bayern de Munique", 2021: "Chelsea", 2022: "Real Madrid", 2023: "Manchester City", 2024: "Real Madrid", 2025: "Paris Saint-Germain", 2026: "Paris Saint-Germain" },
    WC: { 2006: "Itália", 2010: "Espanha", 2014: "Alemanha", 2018: "França", 2022: "Argentina", 2026: "Espanha" },
    CA: { 2015: "Chile", 2016: "Chile", 2019: "Brasil", 2021: "Argentina", 2024: "Argentina" },
    EU: { 2008: "Espanha", 2012: "Espanha", 2016: "Portugal", 2021: "Itália", 2024: "Espanha" }
  };
  const COMP_NAMES = {
    BRA: "Brasileirão Série A", BRB: "Brasileirão Série B", CDB: "Copa do Brasil", LIB: "Libertadores",
    SUL: "Sul-Americana", UCL: "Champions League", UEL: "Europa League", WC: "Copa do Mundo",
    CA: "Copa América", EU: "Eurocopa", GC: "Copa Ouro", AC: "Copa da Ásia", EST: "Estadual",
    LIGA: "Liga nacional", COPA: "Copa nacional", SEL: "Seleção",
    MUN: "Mundial de Clubes", SUPER: "Supermundial"
  };

  // Maiores artilheiros HISTÓRICOS (dados factuais — gols acumulados na competição).
  // Usado para você perseguir e ultrapassar recordes reais.
  const HALL_SCORERS = {
    WC: { title: "Artilheiros da Copa do Mundo (história)", list: [
      { name: "Kylian Mbappé", n: 22 }, { name: "Miroslav Klose", n: 16 }, { name: "Ronaldo", n: 15 }, { name: "Gerd Müller", n: 14 },
      { name: "Just Fontaine", n: 13 }, { name: "Lionel Messi", n: 13 }, { name: "Pelé", n: 12 },
      { name: "Jürgen Klinsmann", n: 11 }, { name: "Sándor Kocsis", n: 11 },
      { name: "Thomas Müller", n: 10 }, { name: "Gabriel Batistuta", n: 10 }, { name: "Gary Lineker", n: 10 },
      { name: "Teófilo Cubillas", n: 10 }, { name: "Grzegorz Lato", n: 10 }, { name: "Ademir", n: 9 }
    ] },
    UCL: { title: "Artilheiros da Champions League (história)", list: [
      { name: "Cristiano Ronaldo", n: 140 }, { name: "Lionel Messi", n: 129 }, { name: "Robert Lewandowski", n: 105 },
      { name: "Karim Benzema", n: 90 }, { name: "Raúl", n: 71 }, { name: "Ruud van Nistelrooy", n: 56 },
      { name: "Thomas Müller", n: 57 }, { name: "Kylian Mbappé", n: 55 }, { name: "Thierry Henry", n: 50 },
      { name: "Alfredo Di Stéfano", n: 49 }, { name: "Andriy Shevchenko", n: 48 }, { name: "Zlatan Ibrahimović", n: 48 },
      { name: "Eusébio", n: 46 }, { name: "Filippo Inzaghi", n: 46 }, { name: "Didier Drogba", n: 44 }
    ] },
    LIB: { title: "Artilheiros da Libertadores (história)", list: [
      { name: "Alberto Spencer", n: 54 }, { name: "Fernando Morena", n: 37 }, { name: "Pedro Rocha", n: 36 },
      { name: "Daniel Onega", n: 31 }, { name: "Gabigol", n: 30 }, { name: "Julio Morales", n: 30 },
      { name: "Luizão", n: 29 }, { name: "Palhinha", n: 28 }, { name: "Emelina", n: 26 },
      { name: "Marcelo Moreno", n: 26 }, { name: "José Sanfilippo", n: 26 }, { name: "Roberto Palacios", n: 25 },
      { name: "Ángel Cabrera", n: 24 }, { name: "Deyverson", n: 15 }, { name: "Hernán Barcos", n: 21 }
    ] },
    BRA: { title: "Maiores artilheiros do Brasileirão (pontos corridos)", list: [
      { name: "Fred", n: 158 }, { name: "Washington", n: 126 }, { name: "Roger", n: 116 },
      { name: "Kléber Pereira", n: 111 }, { name: "Gabigol", n: 110 }, { name: "Hulk", n: 108 },
      { name: "Léo Gamalho", n: 100 }, { name: "Elber", n: 92 }, { name: "Ricardo Oliveira", n: 91 },
      { name: "Kléber Gladiador", n: 90 }, { name: "Diego Souza", n: 89 }, { name: "Thiago Ribeiro", n: 87 },
      { name: "Borges", n: 85 }, { name: "William Pottker", n: 62 }, { name: "Yuri Alberto", n: 55 }
    ] },
    CA: { title: "Artilheiros da Copa América (história)", list: [
      { name: "Norberto Méndez", n: 17 }, { name: "Zizinho", n: 17 }, { name: "Lolo Fernández", n: 15 },
      { name: "Severino Varela", n: 15 }, { name: "Paolo Guerrero", n: 14 }, { name: "Eduardo Vargas", n: 14 },
      { name: "Lionel Messi", n: 13 }, { name: "Gabriel Batistuta", n: 13 }, { name: "José Manuel Moreno", n: 13 },
      { name: "Jair Rosa Pinto", n: 12 }, { name: "Herminio Masantonio", n: 12 }, { name: "Ademir", n: 11 },
      { name: "Roberto Porta", n: 11 }, { name: "Teodoro Fernández", n: 10 }, { name: "Luis Suárez", n: 9 }
    ] },
    EU: { title: "Artilheiros da Eurocopa (história)", list: [
      { name: "Cristiano Ronaldo", n: 14 }, { name: "Michel Platini", n: 9 }, { name: "Antoine Griezmann", n: 7 },
      { name: "Alan Shearer", n: 7 }, { name: "Álvaro Morata", n: 7 }, { name: "Patrick Kluivert", n: 6 },
      { name: "Wayne Rooney", n: 6 }, { name: "Thierry Henry", n: 6 }, { name: "Zlatan Ibrahimović", n: 6 },
      { name: "Nuno Gomes", n: 6 }, { name: "Ruud van Nistelrooy", n: 6 }, { name: "Romelu Lukaku", n: 6 },
      { name: "Savo Milošević", n: 5 }, { name: "Harry Kane", n: 5 }, { name: "Xherdan Shaqiri", n: 4 }
    ] }
  };

  // Elencos com nomes REAIS (fatos) dos clubes de maior destaque.
  // Estatísticas são geradas pelo jogo; sem fotos/escudos oficiais.
  // Lista curada — pode desatualizar com o tempo.
  function sq(str) {
    // "P:Nome, P:Nome" → [{n,p}]
    return str.split(",").map(function (t) {
      const parts = t.trim().split(":");
      return { p: parts[0].trim(), n: parts[1].trim() };
    });
  }
  const REAL_SQUADS = {
    rbb: sq("GOL:Cleiton, GOL:Tiago Volpi, ZAG:Guzmán Rodríguez, ZAG:Ryan Tavares, ZAG:Eduardo Santos, LAT:Alix, LAT:Breno, LAT:Gustavo Marques, VOL:Fabinho, MEI:Gabriel, VOL:Eric Ramires, MEI:Yuri, VOL:I. Sosa, MEI:Rodriguinho, PON:Filipinho, ATA:Eduardo Sasha, PON:Jhuan Nunes Coelho, ATA:I. Pitta, PON:Fernando, ATA:Vinicius"),
    mir: sq("GOL:Georgemy, GOL:Walter, ZAG:Lucas Oliveira, ZAG:Willian Machado, ZAG:Reinaldo, LAT:Victor Luís, LAT:Elias, LAT:João Victor, VOL:Japa, MEI:Shaylon, VOL:Denilson, MEI:Chico, VOL:Gustavo Silva, MEI:José Aldo, PON:André Luís, ATA:Negueba, PON:Fernandinho, ATA:A. Galeano, PON:Bruno Santos, ATA:Vinicius Bacchi"),
    vit: sq("GOL:Lucas Arcanjo, GOL:Gabriel Vasconcelos, ZAG:E. Brítez, ZAG:Camutanga, ZAG:Zé Marcos, LAT:Riccieli, LAT:D. Tarzia, LAT:Kauan Vitor, VOL:E. Martínez, MEI:T. Pochettino, VOL:Dudu, MEI:Edenilson, VOL:Wendell Sacramento, MEI:Gabriel Baralhas, PON:Marinho, ATA:Matheuzinho, PON:Osvaldo, ATA:K. Saverio, PON:Lucas Silva, ATA:Fabrício"),
    cap: sq("GOL:Carlos Eduardo, GOL:Mycael, ZAG:Gilberto Junior, ZAG:Léo, ZAG:Arthur Dias, LAT:Felipinho, LAT:Leo Derik, LAT:G. Benavídez, VOL:Back Guilherme, MEI:S. Mendoza, VOL:Joao Cruz, MEI:Kauan Stabelini, VOL:Lucas Marezi, MEI:B. Zapelli, PON:Renan Viana, ATA:K. Viveros, PON:Isaac, ATA:Vitinho, PON:K. Vargas, ATA:Jorge Luis Rivaldo Pinto"),
    cfc: sq("GOL:Pedro Luccas, GOL:Keiller, ZAG:Tinga, ZAG:Maicon, ZAG:Rodrigo Moledo, LAT:Felipe Jonatan, LAT:L. Leonardi Bortoluci Perez, LAT:Bruno Melo, VOL:Josué, MEI:Lucas Ronier, VOL:A. Ararat, MEI:Paulo Roberto, VOL:S. Gómez, MEI:Thiago Santos, PON:J. Lavega, ATA:B. Ocampo, PON:Keno, ATA:Fabinho, PON:Pedro Rocha, ATA:D. Alves"),
    cha: sq("GOL:Rafael Santos, GOL:Kainã, ZAG:Marcos Vinícius, ZAG:Doma, ZAG:João Paulo, LAT:I. Gnoatto, LAT:Mancha, LAT:M. Kalebe, VOL:Kaue Arno, MEI:Marcinho, VOL:Y. Bolasie, MEI:Fernando, VOL:F. Maciel, MEI:Bruno Matias, PON:M. Milani, ATA:Túlio, PON:Giovanni Augusto, ATA:Neto Pessoa, PON:Bernardo, ATA:Luizao"),
    rem: sq("GOL:Marcelo Rangel, GOL:Ygor Vinhas, ZAG:João Lucas, ZAG:Matheus Alexandre, ZAG:Matheus Felipe, LAT:Leo Andrade, LAT:Marllon, LAT:Zé Ivaldo, VOL:Jája Silva, MEI:Patrick, VOL:Patrick de Paula, MEI:L. Picco, VOL:Yago Pikachu, MEI:F. Catarozzi, PON:Gabriel Poveda, ATA:Jáderson, PON:Alef Manga, ATA:Vitor Bueno, PON:Gabriel Taliari, ATA:Eduardo Melo"),
    spt: sq("GOL:Halls, GOL:Denis, ZAG:Marcelo Ajul, ZAG:Marcelo Benevenuto, ZAG:Claudinho, LAT:Habraão, LAT:Kayky Almeida, LAT:Caio Moura, VOL:Murilo Rhikman, MEI:Biel, VOL:Yago Felipe, MEI:Zé Gabriel, VOL:Willian Oliveira, MEI:Fábio Matheus, PON:Perotti, ATA:C. de Pena, PON:Gustavo Maia, ATA:D. Hernández, PON:Clayson, ATA:Chrystian Barletta"),
    for: sq("GOL:João Ricardo, GOL:Brenno, ZAG:Lucas Gazal, ZAG:Luan, ZAG:T. Cardona, LAT:Junior Mauricio, LAT:G. Fuentes, LAT:Kaua Rocha, VOL:Pierre, MEI:Ronald, VOL:Lucas Crispim, MEI:Pedro Henrique, VOL:Rodrigo, MEI:Bruno César, PON:J. Miritello, ATA:Vitinho, PON:Nathan Fogaça, ATA:Lucas Emanoel, PON:Caio Wesley, ATA:Welliton"),
    cea: sq("GOL:Richard, GOL:Matheus Nogueira, ZAG:Rafael Venâncio, ZAG:Thalisson, ZAG:Luiz Otávio, LAT:Sávio, LAT:Sanchez, LAT:Vini Uchella, VOL:Matheus Araújo, MEI:Juan Alano, VOL:L. Mugni, MEI:Vinicius Zanocelo, VOL:Richardson, MEI:Vina, PON:R. López, ATA:Wendel, PON:N. Ferreira, ATA:Giovanni Pavani, PON:Bryan, ATA:Giulio"),
    juv: sq("GOL:Leo Agliardi, GOL:Pedro Rocha, ZAG:Raí Ramos, ZAG:Titi, ZAG:Bernardo, LAT:Clebio, LAT:Messias, LAT:Wadson, VOL:Pablo Roberto, MEI:Lucas Mineiro, VOL:Lucca, MEI:Aderlan, VOL:N. Begliardi, MEI:L. Borges, PON:L. Moura, ATA:Alan Kardec, PON:Marcos Paulo, ATA:Fábio Lima, PON:M. Castro, ATA:L. Amarilla"),
    goi: sq("GOL:Thiago Rodrigues, GOL:Ezequiel, ZAG:Rodrigo Soares, ZAG:Luiz Felipe, ZAG:Ramon Menezes, LAT:Nicolas, LAT:Lucas Ribeiro, LAT:Danilo Cunha, VOL:Filipe Machado, MEI:Juninho, VOL:Lucas Lima, MEI:H. Farias, VOL:J. Magalhaes, MEI:Jean Carlos, PON:Anselmo Ramon, ATA:Bruno Sávio, PON:E. García, ATA:Pedro Junqueira, PON:Cadu, ATA:Willie"),
    ava: sq("GOL:Igor Bohn, GOL:Joaquim, ZAG:Kaua Fernandes, ZAG:Wallison, ZAG:Allyson, LAT:Vittor Joao, LAT:Simples Gabriel, LAT:V. Melo, VOL:Del Piage, MEI:Vinicius Gugel, VOL:Luiz Henrique, MEI:Nicolas Tedesco, VOL:Jean Lucas, MEI:Daniel Penha, PON:Léo Gamalho, ATA:Samuel, PON:K. Santos, ATA:Sorriso, PON:J. Sousa Rocha Leandro, ATA:IsaÃ­as Pereira"),
    cri: sq("GOL:Alisson, GOL:Airton, ZAG:Rodrigo, ZAG:Luciano Castán, ZAG:Marcinho, LAT:Octávio Henrique, LAT:Marcelo Hermes, LAT:Erick Garcia, VOL:Eduardo, MEI:Fellipe Mateus, VOL:Guilherme Lobo, MEI:Jhonata Robert, VOL:Ronald, MEI:Eliel Felisbino Costa, PON:Nicolas, ATA:Romarinho, PON:Waguininho, ATA:Thales, PON:Bidu, ATA:João Carlos"),
    ame: sq("GOL:Gustavo, GOL:Matheus Simoes, ZAG:Emerson Santos, ZAG:L. Sosa, ZAG:Wesley, LAT:Rafael Barcelos, LAT:Fabio, LAT:Alex Silva, VOL:F. Elizari, MEI:Gabriel Domingos, VOL:Felipe Amaral, MEI:Yago Santana, VOL:Felipao, MEI:Alê, PON:Guilherme Parede, ATA:Willian, PON:Gabriel Barros, ATA:Thauan, PON:R. Piñeiro, ATA:G. Mastriani"),
    crb: sq("GOL:Vitor Caetano, GOL:Matheus, ZAG:Kevin, ZAG:Reverson, ZAG:João Pedro Salvador Kruger Pin, LAT:Ruy, LAT:Bressan, LAT:Hereda, VOL:Crystopher, MEI:Daniel, VOL:Guilherme Estrella, MEI:Caua Carvalho, VOL:Geovane, MEI:E. Mecena, PON:Douglas Baggio, ATA:João Neto, PON:Guilherme Pato, ATA:Guilherme, PON:Hiago, ATA:Thiaguinho"),
    pay: sq("GOL:Jean, GOL:Gabriel Mesquita, ZAG:Edílson, ZAG:Y. Quintana, ZAG:larley, LAT:Lucca Carvalho, LAT:Castro, LAT:JP Galvão, VOL:Henrico, MEI:Caio Mello, VOL:Marcinho, MEI:Bruno Bispo, VOL:Henrique Salomoni, MEI:R. Vieira, PON:Ítalo Carvalho, ATA:Peu, PON:Thayllon, ATA:M. Braga, PON:Thalyson, ATA:Kleiton"),
    vil: sq("GOL:Helton Leite, GOL:Dalberson, ZAG:Tiago Pagnussat, ZAG:Douglas Mendes, ZAG:Samuel Lucas, LAT:Higor, LAT:Willian Formiga, LAT:Igor Cariús, VOL:João Vieira, MEI:Willian Maranhão, VOL:Marquinhos Gabriel, MEI:S. Nunes, VOL:Dudu, MEI:Henrique Luiz, PON:André Luís, ATA:Kerlon, PON:Puskas Gustavo, ATA:Rafa Silva, PON:Ryan, ATA:Everton Galdino"),
    pon: sq("GOL:Viana Guilherme, GOL:Vinicius Ferrari, ZAG:Lucas Justen, ZAG:Lucas Cunha, ZAG:Diego Leão, LAT:Gustavo Almeida, LAT:Juan, LAT:Márcio Silva, VOL:Julio, MEI:Rodrigo Souza, VOL:Carlos Jean, MEI:André Lima, VOL:D. Mora, MEI:Diego Porfírio, PON:Nicolas Araujo, ATA:Joao Damiao, PON:Élvis, ATA:David da Hora, PON:Jonathan Cafú, ATA:Murilo"),
    gua: sq("GOL:Caíque França, GOL:Fred Conte, ZAG:Maurício Antônio, ZAG:Raphael Rodrigues, ZAG:Rafael Donato, LAT:Emerson, LAT:Dudu Marques, LAT:Rian, VOL:Willian Farias, MEI:Nathan Melo, VOL:João Paulo, MEI:Kaua, VOL:Carlos Eduardo, MEI:Isaque, PON:Lucca, ATA:Guilherme Cachoeira, PON:Dentinho, ATA:Kewen, PON:Éverton Brito, ATA:Herbert"),
    ope: sq("GOL:Elias Martello Curzel, GOL:Talles, ZAG:Mikael Doka, ZAG:Moraes, ZAG:Miranda, LAT:André, LAT:Joao Gabriel, LAT:A. Wandratsch, VOL:Índio, MEI:J. Zuluaga, VOL:Boschilia, MEI:H. de Oliveira, VOL:Vinícius Diniz, MEI:Dyego, PON:Vinícius Mingotti, ATA:Aylon, PON:Hildeberto Pereira, ATA:Kauã, PON:Dudu, ATA:Victinho"),
    amz: sq("GOL:João Lopes, GOL:Axel Lopes, ZAG:Léo Coelho, ZAG:Marcondes, ZAG:Iury, LAT:Jonas, LAT:Fabiano, LAT:Kauan Firmo, VOL:I. Panzariello, MEI:Jhonny Lucas, VOL:Rafael Tavares, MEI:Wendell, VOL:Y. Mena, MEI:Carlinhos, PON:Marcelo Cirino, ATA:Ronaldo, PON:Vinícius Leite, ATA:Alison Matheus, PON:Leonardo Guerra de Souza, ATA:Jesus Victor"),
    ath: sq("GOL:Luan Polli, GOL:Tony, ZAG:Douglas Pelé, ZAG:Jhonatan, ZAG:Lucas Belezi, LAT:Zeca, LAT:Felipe Vieira, LAT:J. Torres, VOL:Ian Luccas, MEI:G. Cabezas, VOL:Gustavinho, MEI:Eduardo Filipe, VOL:Max, MEI:Felipe Negrucci, PON:Bruninho, ATA:Yarlen, PON:Carlinhos, ATA:O. Otusanya, PON:Ronaldo Tavares, ATA:G. da Silva Sinfronio"),
    nau: sq("GOL:Muriel, GOL:G. Guruceaga, ZAG:Arnaldo, ZAG:Alberto, ZAG:Gabriel Severino de Sousa, LAT:Matheus Ribeiro, LAT:Léo Índio, LAT:Wanderson, VOL:Auremir, MEI:Wenderson, VOL:Dodozinho, MEI:Halan, VOL:Jean Carlos, MEI:Felipe Redaelli, PON:Vinícius, ATA:Paulo Sérgio, PON:Victor Andrade, ATA:Luiz Cláudio, PON:Kaua Almeida da Costa, ATA:Kevyn Santos"),
    fig: sq("GOL:Fabricio Santana, GOL:Junior, ZAG:Leonardo Santos, ZAG:Douglas, ZAG:Joao Artur, LAT:Leonan Santos, LAT:Anderson Conceição, LAT:Jhonnathan, VOL:Renan Areias, MEI:Raynan, VOL:Dudu, MEI:L. Renz, VOL:Jean Gabriel, MEI:Jorginho, PON:Martins Arthur, ATA:Mailson, PON:Joao Marcos, ATA:Guilherme Vieira, PON:T. Ferreira, ATA:Igor Bolt"),
    prc: sq("GOL:Gabriel Gasparotto, GOL:Claudio Vitor, ZAG:Diego Ivo, ZAG:Lucas Ryan, ZAG:Daniel Guedes, LAT:Félix, LAT:Luiz Gustavo, LAT:Mazetti, VOL:Geilson, MEI:Júlio Rusch, VOL:Gustavo Xuxa, MEI:Bruno Elesbão, VOL:Léo Silva, MEI:Lucas Lourenço, PON:Erik Bessa, ATA:Leandro Pereira, PON:Diego Tavares, ATA:Marlon Maranhão, PON:Victor Hugo, ATA:Liliu"),
    spc: sq("GOL:Rinaldi Renan, ZAG:Ray, ZAG:Dede, ZAG:Yan, LAT:Wesley, LAT:Gabriel Fontes, LAT:Wadson, VOL:Dias Pedro, MEI:Cassio Ibiapina, VOL:Silva Paulo, MEI:M. Verdún, VOL:Maurício, MEI:Romarinho, PON:Adriano, ATA:João Carlos, PON:Nadson, ATA:Enzzo, PON:Fonseca Kayo, ATA:Erivan"),
    boa: sq("GOL:Matheus, ZAG:Bruno Jesus, ZAG:Gabriel Caran, ZAG:Guilherme Lacerda, LAT:Andre Fausto, LAT:Felipe Santos, VOL:Riquelme, MEI:Gabriel Richvicki, VOL:Misael Nunes, MEI:Leandrinho, VOL:Felipinho, PON:Keké, ATA:Luís Henrique Farinhas Taffner, PON:Luketa, ATA:Sandrinho, PON:Keven"),
    vre: sq("GOL:Avelino, GOL:Silva Heitor, ZAG:Wellington Silva, ZAG:Lucas Adell, ZAG:Fabrício Silva Dornellas, LAT:Jean Victor, LAT:Alan, LAT:Lucas Rocha, VOL:Bruno Barra, MEI:Dener, VOL:Luciano Naninho, MEI:B. Carvalho, VOL:Wagninho, MEI:Du Fernandes, PON:Marquinhos, ATA:Ygor Catatau, PON:Fellipe Resende, ATA:Y. Zuniga, PON:Andrey, ATA:Matheus Moresche"),
    mad: sq("GOL:Neguete, GOL:Yan Rodrigues, ZAG:Cauã Coutinho, ZAG:Jean Vianna, ZAG:Daniel Felipe, LAT:Julio Cesar, LAT:Celsinho, VOL:Adriano, MEI:Lucas Santos, VOL:João Vitor Gomes Lucio da Silva, MEI:Junior Santos, VOL:Wallace, MEI:Dilsinho, PON:D. Freitas, ATA:Jacozinho, PON:Geovane Maranhão, ATA:João Carlos, PON:Vinicius Balotelli, ATA:Filipe Claudino"),
    nig: sq("GOL:Matheus Miranda, GOL:Arthur Vidal, ZAG:Davi, ZAG:Gabriel Saulo, ZAG:Wender, LAT:Kayron Guilherme, LAT:Arthur Neves, LAT:Cirilo Lucas, VOL:Jorge Pedra, MEI:Sidney, VOL:Joao Paulo, MEI:Iago Lacerda, VOL:Pedro Thomaz, MEI:Balbino Alexandre, PON:Xandinho, ATA:Lucas Cruz, PON:K. Ancantara, ATA:Weverton, PON:Bill, ATA:Léo"),
    xvp: sq("GOL:Victor Golas, ZAG:A. Robles, ZAG:Júnior Caiçara, ZAG:Joao Victor, LAT:G. Kuhn, LAT:Dija, VOL:Carlos Manuel, MEI:Dudu Vieira, VOL:Richard Almeyda, MEI:Serginho, PON:Antônio Gabriel, ATA:Erik Bessa, PON:Paulo Marcelo, ATA:David Ribeiro, PON:Henry, ATA:Leo Santos"),
    nov: sq("GOL:Lucas Pereira, GOL:João Vitor Indalecio Scapin, ZAG:Carlinhos, ZAG:Patrick, ZAG:Sander, LAT:Eduardo Brock, LAT:N. Castrillón, LAT:Gabriel Bahia, VOL:Luis Oyama, MEI:Romulo, VOL:Tavinho, MEI:Matheus Bianqui, VOL:Léo Naldi, MEI:Diego Galo, PON:Ronald Barcellos, ATA:C. Ortíz, PON:Carlão, ATA:Robson, PON:Vinícius, ATA:Diego Mathias"),
    bsp: sq("GOL:Victor Souza, GOL:Jordan, ZAG:Jonathan, ZAG:Ericson, ZAG:Vilar, LAT:Wallace, LAT:Carlão, LAT:Darlan, VOL:L. Maciel, MEI:Everton Morelli, VOL:Rafael Gava, MEI:Matheus Sales, VOL:Yuri Felipe Santos da Conceição, MEI:Wesley Pinheiro Santos, PON:Kelvin, ATA:Hygor, PON:Jefferson Nem, ATA:Guilherme Queiróz, PON:Arthur Caíke, ATA:Márcio Carlos Maranhão"),
    por: sq("GOL:Bruno, GOL:Joao Paulo, ZAG:João Vitor Cardoso de Souza, ZAG:Gustavo Henrique, ZAG:Eduardo Biazus, LAT:Gustavo Salomão, LAT:Wellington, LAT:Gustavo Sciencia, VOL:Hudson, MEI:Thiaguinho, VOL:Tontini Felipe, MEI:Mateus Müller, VOL:Denis, PON:Matheus Cadorini, ATA:Cauari, PON:Igor Torres, ATA:Jonas Toró, PON:Guilherme Henrique  de Oliveira Morais, ATA:João Diogo"),
    sbe: sq("GOL:Alex Alves, GOL:Júnior Oliveira, ZAG:Rodrigo Ferreira, ZAG:Hélder, ZAG:Matheus Salustiano, LAT:Pará, LAT:J. Pedro Vieira Ferraz, LAT:Mário Sérgio, VOL:Foguinho, MEI:Lucas Lima, VOL:Romisson, MEI:F. Rodrigues, VOL:Eduardo, MEI:Lucas Fernandes, PON:Lucas, ATA:Felipe Garcia, PON:Fabrício Daniel, ATA:Pedro Vitor, PON:Echaporã, ATA:Pedrinho"),
    tom: sq("GOL:Alan, GOL:Douglas Marques, ZAG:Donato, ZAG:Roger Carvalho, ZAG:Breno, LAT:Gustavo Xavier, LAT:K. D. Almeida da Silva, LAT:Rony, VOL:Wanderson, MEI:Matheus Chaves, VOL:Jefferson Renan, MEI:JoÃ£o VÃ­tor, VOL:David Braw, MEI:Vitinho, PON:Silvano, ATA:Luiz Felipe, PON:Cássio, ATA:Keliton, PON:Felipinho, ATA:Cesar"),
    cal: sq("ZAG:Gladstone Pereira Della Valentina, ZAG:Lucas Silva, ZAG:Rayan, VOL:Igor Lemos, MEI:Henrique, PON:Gleisinho"),
    pou: sq("GOL:Thiago Braga, GOL:Natan, ZAG:Da Silva, ZAG:Victao, ZAG:Xandão, LAT:M. Nunes Oliveira, LAT:Vanderley, LAT:Samuel, VOL:M. Caua de Aguiar Alves, MEI:Pedro Arthur, VOL:Thomas Fretes, MEI:Gabriel Adriano, VOL:André Anderson, MEI:Dudu, PON:Ricardo Bueno, ATA:Michael Paulista, PON:T. Rubim, ATA:Jhonatan Kauan, PON:Pedro Balotelli"),
    cax: sq("GOL:Busatto, GOL:Léo Lang, ZAG:Felipe Albuquerque, ZAG:Ianson, ZAG:Mancha, LAT:Roberto, LAT:Joilson, LAT:Vitor Reis, VOL:Breno Santos, MEI:Marcelo Freitas, VOL:Matheus Anjos, MEI:Ravanelli, VOL:Luis Fernando, MEI:Grigor, PON:Calyson Rosa, ATA:Diego Quirino, PON:Salatiel, ATA:João Lucas, PON:Vitor Feijão, ATA:K. C. Portela Torres"),
    ypi: sq("GOL:Edu, GOL:Gabriel Werner, ZAG:Cleiton, ZAG:Danielzinho, ZAG:Willian Gomes, LAT:Reinaldo, LAT:Nicolas Schulz, LAT:Walce, VOL:Rian, MEI:João Branco, VOL:Lucas Ramos, MEI:L. Pitol, VOL:Dionísio, MEI:Lucas Fogaça, PON:Felipe Ferreira, ATA:Renan Gorne, PON:Vini Charopem, ATA:Mago, PON:Bryam, ATA:Henrique"),
    sjo: sq("GOL:Fábio, GOL:A. Peralta, ZAG:Guimaraes Danilo, ZAG:Prado Felipe, ZAG:Melo Eduardo, LAT:Diney, LAT:R. G. Schopf de Oliveira, LAT:Michel Camargos, VOL:Anderson, MEI:Keverton, VOL:Zé Vitor, MEI:Ivo, VOL:Evaristo, MEI:Bagatini Gustavo, PON:Caua, ATA:Douglas, PON:Lino Gustavo, ATA:Lucas Grafite, PON:Nycollas, ATA:Caíque"),
    jac: sq("GOL:Marcelo, GOL:Santos Eric, ZAG:G. Seles Cruz, ZAG:Vicente, ZAG:Railon, LAT:Weverton, LAT:Daniel Costa, LAT:Claudio Daniel, VOL:David Santana, MEI:Gabriel Pereira, VOL:Vinícius Amaral, MEI:Geovani Cortes Gomes, VOL:D. Douglas, MEI:Adriano, PON:Alison Daniel, ATA:Pedro Henrique, PON:Luan Rodrigues, ATA:Flavinho, PON:Ruan Nascimento, ATA:Thiaguinho"),
    jua: sq("GOL:Pedro Campanelli, GOL:Santos Thiago, ZAG:Romario Ze, ZAG:Rosado Eduardo, ZAG:Daniel Nazaré, LAT:Leandro Cerqueira, LAT:Rafael da Rocha Soares dos Santos, LAT:Murilo, VOL:Breno Rayck, MEI:Elivelton, VOL:Thierry, MEI:Waguinho, VOL:Bruno Sena, MEI:Douglas Nathan, PON:Adriano Pardal, ATA:Diki, PON:Marlon, ATA:Bravo, PON:Alex Oliveira, ATA:Ceara"),
    ala: sq("GOL:Gabriel Bartelli, GOL:Barbosa Neto, ZAG:Van, ZAG:Artur Sousa Rodrigues, ZAG:Thawan, LAT:Hernandes Fagundes de Alencar, LAT:Guilherme Queiroz, LAT:Paulo Victor, VOL:Willian Kaefer, MEI:J. Risuenho, VOL:D. Crispim, MEI:Miller, VOL:Jadson, MEI:Marcos Vinicius, PON:Michael, ATA:Higor Farias, PON:R. Rocha, ATA:Walter, PON:Ruan Ribeiro Teles, ATA:Julian Suzuki"),
    lon: sq("GOL:Luan, GOL:Zanella, ZAG:Nino Paraíba, ZAG:Weverton, ZAG:Yago Lincoln, LAT:Wallace, LAT:Rafael Monteiro, LAT:Murilo, VOL:André Luiz, MEI:Tárik, VOL:Victor Hugo, MEI:Lucas Marques, VOL:Andre Cardoso, MEI:Fabiano, PON:Gilberto, ATA:Pablo Dyego, PON:Paulinho Moccelin, ATA:E. Rodríguez, PON:Fabricio, ATA:Caio Maia"),
    mar: sq("GOL:Romario, GOL:Neto, ZAG:Gabriel, ZAG:Gabriel Santos, ZAG:Wendel Lomar, LAT:Thiago Rosa, LAT:Keven, LAT:Ronald Carvalho, VOL:Kelvi Gomes, MEI:Adeilson Maranhão, VOL:Daniel, MEI:I. Neira, VOL:Iago Santana, MEI:Bruno Cheron, PON:Edison Negueba, ATA:Giovane Gomez, PON:Gui Pira, ATA:Ronald Camarao, PON:J. P. Rodrigues, ATA:Rai"),
    cas: sq("GOL:André Luiz, GOL:Sidnei, ZAG:Cleiton, ZAG:Libano, ZAG:Borech, LAT:Renan Cosenza, LAT:Geovane, VOL:Luizinho, MEI:Vitor Amaral, VOL:Kauhe Galdino, MEI:Luiz Henrique, VOL:Antony, MEI:Vanderlei, PON:Negueba, ATA:S. Tiba, PON:Haruna Hassan, ATA:Saci Vitor, PON:Vitor Braga, ATA:Ze Carlos"),
    bru: sq("GOL:Matheus Nogueira, GOL:Jose Vinicius, ZAG:Jeferson, ZAG:Alisson Cassiano, ZAG:Ryan Santos, LAT:João Felix, LAT:Raimar, LAT:Davi Gabriel, VOL:Bernardo, MEI:Gazão, VOL:Jonatan Lucca, MEI:João Vithor, VOL:Alex Paulino, MEI:Lucas Sá, PON:Héber, ATA:Marlyson, PON:João Pedro, ATA:Petterson, PON:Adrianinho, ATA:Álvaro"),
    mcd: sq("GOL:Matheus Cavichioli, GOL:Erivelton, ZAG:Victor Guilherme, ZAG:Claudinho, ZAG:Marcelo, LAT:Luan, LAT:Reginaldo, LAT:L. Ranghetti, VOL:E. Garrinsha, MEI:Roldan, VOL:Felipe Baiano, MEI:Guilherme Gehring, VOL:Guilherme Kante, MEI:Evandro, PON:Manoel, ATA:Cesinha, PON:Robinho, ATA:Davi, PON:Davi Schwenck, ATA:Gabriel Lyra"),
    con: sq("GOL:Oliveira, GOL:J. Augusto, ZAG:E. Puerari, ZAG:Thiago Freitas, ZAG:Leonardo, LAT:Eberson, LAT:Flavio, VOL:Matheus da Costa Silva Paulo, MEI:Trentin Enzo, VOL:Caike, MEI:Denner, PON:Matheus Maia, ATA:Eric Campos, PON:Phillipe Luiz, ATA:William, PON:Yuri Pastre"),
    tun: sq("GOL:Vinícius, GOL:Joanderson, ZAG:Marcio, ZAG:Vinicius, ZAG:Zorzan, LAT:Amaral, LAT:Paulinho, LAT:Franklin Douglas, VOL:Henrique Gustavo, MEI:Derlan, VOL:Dieguinho, MEI:Paulinho, VOL:Warian Ameixa, MEI:Tulio, PON:Jayme, ATA:Paulo Rangel, PON:Bilau, ATA:S. Clair, PON:Daniel GTA, ATA:Emerson Nike"),
    agm: sq("GOL:Xandao, ZAG:Bruno Limão, ZAG:Dede, ZAG:Wendell, LAT:Cassio, LAT:Weslley, LAT:Samuel Para, VOL:Willian Daltro, MEI:Carlos Maia, VOL:Tiago Bagabem, MEI:Felipe Pará, VOL:Kukri, MEI:Yago, PON:Dedé, ATA:PH, PON:Alexsandro  Silva Garcia, ATA:Kaique Lima, PON:Erick Bahia, ATA:Pablo Rykelme"),
    cst: sq("GOL:Tom, ZAG:Guizão, ZAG:M. Felix, ZAG:Hercules, LAT:M. Santos, LAT:K. Saucedo, VOL:Danilo Orue, MEI:J. Angulo, VOL:B. Heron, MEI:Romarinho, VOL:Luther, MEI:Marcos Paulo, PON:Taperacu Arian, ATA:P. Campos, PON:Arian Taperacu, ATA:Jhonatan, PON:D. Cohen, ATA:Jorginho"),
    atm: sq("GOL:J. Musso, GOL:Mario de Luis, ZAG:J. Giménez, ZAG:M. Ruggeri, ZAG:G. Spina, LAT:Marcos Llorente, LAT:N. Molina, LAT:Robin Le Normand, VOL:Rodrigo Mendoza, MEI:J. Cardoso, VOL:Koke, MEI:Javi Serrano, VOL:Pablo Barrios, MEI:Carlos Martín, PON:A. Sørloth, ATA:Álex Baena, PON:Rayane Belid, ATA:T. Almada, PON:J. Álvarez, ATA:G. Simeone"),
    atb: sq("GOL:Unai Simón, GOL:Mikel Santos, ZAG:Gorosabel, ZAG:Hugo Rincón, ZAG:Dani Vivian, LAT:Aitor Paredes, LAT:Yeray, LAT:Yuri, VOL:Oihan Sancet, MEI:Beñat Gerenabarrena, VOL:Ruíz de Galarreta, MEI:Mikel Jauregizar, VOL:Robert Navarro, MEI:Beñat Prados, PON:Álex Berenguer, ATA:I. Williams, PON:Nico Williams, ATA:Gorka Guruzeta, PON:Álvaro Djaló, ATA:Maroan Sannadi"),
    rso: sq("GOL:Aitor Fraga, GOL:Álex Remiro, ZAG:J. Aramburu, ZAG:Aihen Muñoz, ZAG:Luken Beitia, LAT:Zubeldia, LAT:K. Kita, LAT:Javi López, VOL:Jon Gorrotxategi, MEI:Beñat Turrientes, VOL:Y. Herrera, MEI:Pablo Marín, VOL:Lander Astiazarán, MEI:Carlos Soler, PON:Barrenetxea, ATA:Dani Díaz, PON:O. Óskarsson, ATA:Mikel Oyarzabal, PON:Gonçalo Guedes, ATA:T. Kubo"),
    bet: sq("GOL:Álvaro Vallés, GOL:Diego Conde, ZAG:Héctor Bellerín, ZAG:Pablo Busto, ZAG:Diego Llorente, LAT:Natan, LAT:Marc Bartra, LAT:C. De Roa, VOL:F. Bernal, MEI:Pablo Fornals, VOL:Álvaro Fidalgo, MEI:N. Deossa, VOL:G. Lo Celso, MEI:Marc Roca, PON:Antony, ATA:A. Ezzalzouli, PON:Iker Losada, ATA:R. Marina, PON:Rodrigo Riquelme, ATA:C. Hernández"),
    vll: sq("GOL:Rubén Gómez, GOL:Luíz Júnior, ZAG:Daniel Budesca, ZAG:Logan Costa, ZAG:A. Freeman, LAT:Willy Kambwala Ndengushi, LAT:Pau Navarro, LAT:Sergi Cardona, VOL:Santi Comesaña, MEI:T. Buchanan, VOL:P. Gueye, MEI:Alberto Moleiro, VOL:T. Fernández, MEI:C. Macia, PON:Gerard Moreno, ATA:G. Mikautadze, PON:Hugo López, ATA:Pau Cabanes, PON:N. Pépé, ATA:T. Oluwaseyi"),
    sev: sq("GOL:Fran González, GOL:Rafael Romero, ZAG:José Ángel Carmona, ZAG:Julio Díaz del Romo, ZAG:Adrià Pedrosa, LAT:I. Munoz, LAT:Kike Salas, LAT:G. Suazo, VOL:P. Mercado, MEI:Eduardo Altozano Agudo, VOL:Joan Jordán, MEI:R. Vargas, VOL:L. Agoumé, MEI:Jon Guridi, PON:Isaac, ATA:M. Sierra, PON:Peque Fernández, ATA:Alfon González, PON:I. Sow, ATA:C. Ejuke"),
    val: sq("GOL:S. Dimitrievski, GOL:Cristian Rivero, ZAG:Copete, ZAG:M. Diakhaby, ZAG:César Tárrega, LAT:José Gayà, LAT:J. de Haas, LAT:Rubo Iranzo, VOL:G. Rodríguez, MEI:Javi Guerra, VOL:André Almeida, MEI:Pepelu, VOL:A. Dieng, MEI:R. Sato, PON:U. Sadiq, ATA:A. Danjuma, PON:Hugo Duro, ATA:Luis Rioja, PON:Dani Raba, ATA:David Otorbi"),
    gir: sq("GOL:P. Gazzaniga, GOL:V. Krapyvtsov, ZAG:Arnau Martínez, ZAG:Guillem Badia, ZAG:David López, LAT:Alejandro Francés, LAT:Álex Moreno, VOL:D. van de Beek, MEI:Fran Beltrán, VOL:V. Tsygankov, MEI:A. Ounahi, VOL:Iván Martín, MEI:Iván Morante, PON:C. Stuani, ATA:Abel Ruiz, PON:Bryan Gil, ATA:V. Vanat, PON:Minsu Kim, ATA:Antonino"),
    osa: sq("GOL:Sergio Herrera, GOL:Aitor Fernández, ZAG:Jorge Herrando, ZAG:V. Rosier, ZAG:F. Boyomo, LAT:Abel Bretones, LAT:Catena, VOL:Lucas Torró, MEI:Moncayola, VOL:Iker Muñoz, MEI:Aimar Oroz, VOL:Mauro Echegoyen, MEI:Asier Osambela, PON:Iker Benito, ATA:Raúl García, PON:Kike Barja, ATA:Rubén García, PON:Moi Gómez, ATA:A. Budimir"),
    cel: sq("GOL:Coke Carrillo, GOL:Iván Villar, ZAG:C. Starfelt, ZAG:Unai Núñez, ZAG:Sergio Carreira, LAT:Álvaro Núñez, LAT:Javi Rueda, LAT:Manu Sánchez, VOL:H. Burcio, MEI:I. Moriba, VOL:Hugo González, MEI:Andrés Antañón, VOL:Manu Fernández, MEI:Aleix Febas, PON:Borja Iglesias, ATA:Ferran Jutglà, PON:Iago Aspas, ATA:A. Arcos, PON:B. Somuah, ATA:Pablo Durán"),
    ray: sq("GOL:Dani Cárdenas, GOL:A. Batalla, ZAG:A. Rațiu, ZAG:Pep Chavarría, ZAG:I. Balliu, LAT:Pelayo Fernández, LAT:F. Lejeune, LAT:J. Vertrouwd, VOL:Pedro Díaz, MEI:P. Ciss, VOL:Unai López, MEI:R. Nteka, VOL:Álvaro García, MEI:Óscar Valentín, PON:Isi Palazón, ATA:Alemão, PON:Sergio Camello, ATA:E. Eto'o, PON:Jorge de Frutos, ATA:Fran Pérez"),
    mal: sq("GOL:Arnau Tenas, GOL:L. Bergström, ZAG:Mateu Morey, ZAG:Toni Lato, ZAG:A. Souhmahoro, LAT:Raíllo, LAT:J. Mojica, LAT:Leo Sánchez, VOL:Arnau Puigmal, MEI:Álex Sala, VOL:Antonio Sánchez, MEI:Manu Morlanes, VOL:Darder, MEI:Samú Costa, PON:Jan Virgili, ATA:Abdón Prats, PON:Antoniu Roca, ATA:Fuentes, PON:Marc Domenech, ATA:J. Kalumba"),
    get: sq("GOL:J. Letáček, GOL:David Soria, ZAG:D. Dakonam, ZAG:A. Abqar, ZAG:S. Boselli, LAT:Davinchi, LAT:Andrés García, LAT:Gorka Rivera, VOL:Mario Martín, MEI:Javi Muñoz, VOL:Ramón Terrats, MEI:A. R. Alcantara, VOL:Adrián Riquelme, MEI:Mady Macalou, PON:Juanmi, ATA:Borja Mayoral, PON:M. Satriano, ATA:Álex Sancris, PON:Joselu, ATA:Ebrahima Drammeh"),
    alv: sq("GOL:Sivera, GOL:Jesús Owono, ZAG:F. Garcés, ZAG:Hugo Novoa, ZAG:Yusi, LAT:Angel Pérez, LAT:N. Tenaglia, LAT:Carlos Ballestero García, VOL:Denis Suárez, MEI:Guevara, VOL:Antonio Blanco, MEI:Mikel Rodríguez, VOL:Carles Aleñá, MEI:Pablo Ibáñez, PON:M. Díaz, ATA:Toni Martínez, PON:L. Boyé, ATA:Miguel Rodríguez, PON:A. Manas, ATA:A. Rebbach"),
    esy: sq("GOL:Ángel Fortuño, GOL:M. Dmitrović, ZAG:Rubén Sánchez, ZAG:Q. Hartman, ZAG:L. Cabrera, LAT:Miguel Rubio, LAT:Roger Hinojo, VOL:Urko González, MEI:Edu Expósito, VOL:Pol Lozano, MEI:Gabriel Moscardo, VOL:Rafel Bauzà, MEI:Álex Calatrava, PON:Roberto Fernández, ATA:Marcos Fernández, PON:Pere Milla, ATA:Jofre Carreras, PON:Kike García, ATA:T. Dolan"),
    lev: sq("GOL:Pablo Cuñat, GOL:Dani Martín, ZAG:Dela, ZAG:Unai Elgezabal, ZAG:Jorge Cabello, LAT:Xavi, LAT:J. Toljan, LAT:H. Nakoha, VOL:Jon Ander Olasagasti, MEI:E. Alcaniz, VOL:K. Arriaga, MEI:E. Bardeli, VOL:Oriol Rey, MEI:Hugo Sotelo, PON:Brugui, ATA:Iván Romero, PON:Víctor García, ATA:Etta Eyong, PON:Carlos Álvarez, ATA:K. Tunde"),
    ars: sq("GOL:David Raya, GOL:Kepa, ZAG:Jaden Dixon, ZAG:W. Saliba, ZAG:Cristhian Mosquera, LAT:B. White, LAT:P. Hincapié, LAT:B. Clarke, VOL:M. Ødegaard, MEI:E. Eze, VOL:C. Nørgaard, MEI:Fábio Vieira, VOL:E. Nwaneri, MEI:Mikel Merino, PON:B. Saka, ATA:Gabriel Jesus, PON:Gabriel Martinelli, ATA:V. Gyökeres, PON:C. Tzolis, ATA:N. Madueke"),
    che: sq("GOL:Max Merrick, GOL:Robert Sánchez, ZAG:M. Palestra, ZAG:T. Adarabioyo, ZAG:A. Anselmino, LAT:B. Badiashile, LAT:L. Colwill, LAT:R. James, VOL:E. Fernández, MEI:C. Palmer, VOL:J. Bynoe-Gittens, MEI:Dário Essugo, VOL:M. Caicedo, MEI:M. Rogers, PON:Pedro Neto, ATA:L. Delap, PON:E. Emegha, ATA:D. Welbeck, PON:João Pedro, ATA:Marc Guiu"),
    mun: sq("GOL:A. Bayındır, GOL:T. Heaton, ZAG:Diogo Dalot, ZAG:N. Mazraoui, ZAG:H. Maguire, LAT:Lisandro Martínez, LAT:G. Kukonki, LAT:A. Heaven, VOL:M. Mount, MEI:J. Devaney, VOL:Bruno Fernandes, MEI:Daniel Gore, VOL:J. Moorhouse, MEI:Y. Tielemans, PON:Matheus Cunha, ATA:J. Zirkzee, PON:A. Diallo, ATA:O. Martin, PON:B. Mbeumo, ATA:E. Wheatley"),
    tot: sq("GOL:G. Vicario, GOL:A. Kinský, ZAG:James Rowswell, ZAG:A. Robertson, ZAG:K. Danso, LAT:J. van Hecke, LAT:D. Udogie, LAT:D. Spence, VOL:X. Simons, MEI:C. Gallagher, VOL:C. Olusesi, MEI:J. Maddison, VOL:L. Bergvall, MEI:S. Tonali, PON:Richarlison, ATA:M. Tel, PON:D. Solanke, ATA:M. Solomon, PON:W. Odobert, ATA:D. Scarlett"),
    new: sq("GOL:N. Pope, GOL:E. Jaouen, ZAG:L. Hall, ZAG:S. Botman, ZAG:F. Schär, LAT:M. Thiaw, LAT:T. Livramento, VOL:Joelinton, MEI:Sean Steur, VOL:A. Bamba, MEI:J. Murphy, VOL:J. Willock, MEI:B. Touré, PON:Y. Wissa, ATA:H. Barnes, PON:V. Salia, ATA:W. Osula, PON:A. Elanga, ATA:N. Woltemade"),
    avl: sq("GOL:E. Martínez, GOL:M. Bizot, ZAG:M. Cash, ZAG:V. Lindelöf, ZAG:E. Konsa, LAT:T. Mings, LAT:L. Digne, LAT:L. Bogarde, VOL:R. Fortes, MEI:T. Carroll, VOL:R. Barkley, MEI:J.  McGinn, VOL:E. Buendía, MEI:B. Broggio, PON:O. Watkins, ATA:T. Mulley, PON:T. Abraham, ATA:S. Iling-Junior, PON:E. Guessand, ATA:L. Bailey"),
    bha: sq("GOL:B. Verbruggen, GOL:J. Steele, ZAG:Igor, ZAG:P. Struijk, ZAG:E. Cashin, LAT:Costinha, LAT:O. Boscagli, LAT:L. Vušković, VOL:H. Howell, MEI:J. Hinshelwood, VOL:C. Baleba, MEI:D. Gómez, VOL:Y. Ayari, MEI:M. Wieffer, PON:G. Rutter, ATA:Y. Minteh, PON:I. Osman, ATA:C. Kostoulas, PON:K. Mitoma, ATA:Z. Yohanna"),
    whu: sq("GOL:M. Hermansen, GOL:A. Areola, ZAG:Junior Robinson, ZAG:K. Walker-Peters, ZAG:M. Kilman, LAT:R. Battrum, LAT:K. Mavropanos, LAT:K. Casey, VOL:P. Fearon, MEI:J. Ward-Prowse, VOL:E. Diouf, MEI:K. Lamadrid, VOL:S. Magassa, MEI:T. Souček, PON:V. Castellanos, ATA:Pablo, PON:J. Bowen, ATA:M. Cornet, PON:J. Ajala"),
    cry: sq("GOL:D. Henderson, GOL:J. Whitworth, ZAG:D. Muñoz, ZAG:Óscar Mingueza, ZAG:T. Mitchell, LAT:J. Canvot, LAT:B. Sosa, LAT:G. King, VOL:J. Lerma, MEI:D. Kamada, VOL:W. Hughes, MEI:A. Wharton, VOL:R. Esse, MEI:Matheus França, PON:I. Sarr, ATA:E. Nketiah, PON:Yeremy Pino, ATA:B. Johnson, PON:J. Mateta, ATA:J. Strand Larsen"),
    bre: sq("GOL:C. Kelleher, GOL:H. Valdimarsson, ZAG:A. Hickey, ZAG:R. Henry, ZAG:S. van den Berg, LAT:E. Pinnock, LAT:K. Ajer, VOL:K. Schade, MEI:M. Jensen, VOL:M. Sangaré, MEI:J. Dasilva, VOL:Y. Yarmolyuk, MEI:K. Lewis-Potter, PON:Thiago, ATA:C. Wilson, PON:J. Anthony, ATA:D. Ouattara, PON:Kaye Iyowuna Furo, ATA:O. Shield"),
    ful: sq("GOL:B. Leno, GOL:B. Lecomte, ZAG:K. Tete, ZAG:C. Bassey, ZAG:J. Andersen, LAT:Jorge Cuenca, LAT:T. Castagne, VOL:H. Reed, MEI:T. Cairney, VOL:Oscar Bobb, MEI:S. Berge, VOL:A. Iwobi, MEI:S. Lukić, PON:Rodrigo Muniz, ATA:J. Kusi-Asare, PON:Kevin, ATA:M. Zepa"),
    eve: sq("GOL:J. Pickford, GOL:M. Travers, ZAG:N. Patterson, ZAG:J. Tarkowski, ZAG:J. O&apos;Brien, LAT:W. Tamen, LAT:V. Mykolenko, LAT:G. Finney, VOL:H. Foster, MEI:H. Hackney, VOL:D. McNeil, MEI:Malik Olayiwola, VOL:K. Dewsbury-Hall, MEI:C. Alcaraz, PON:Beto, ATA:I. Ndiaye, PON:T. Barry, ATA:B. Graham, PON:Tyrique George, ATA:T. Dibling"),
    wol: sq("GOL:L. Benjamin, GOL:José Sá, ZAG:K. Trippier, ZAG:Hugo Bueno, ZAG:S. Bueno, LAT:D. Møller Wolfe, LAT:Pedro Lima, LAT:L. Krejčí, VOL:André, MEI:Fer López, VOL:L. Rawlings, MEI:B. Traoré, VOL:Y. Mosquera, MEI:M. Munetsi, PON:R. Jiménez, ATA:A. Armstrong, PON:L. Chiwome, ATA:Hwang Hee-Chan, PON:R. Saïd, ATA:M. Mane"),
    nfo: sq("GOL:John, GOL:M. Sels, ZAG:N. Williams, ZAG:Morato, ZAG:Murillo, LAT:Tyler Bindon, LAT:Jair, LAT:O. Aina, VOL:I. Sangaré, MEI:C. Hudson-Odoi, VOL:N. Domínguez, MEI:M. Gibbs-White, VOL:Eric Emanuel da Silva Moreira, MEI:R. Yates, PON:T. Awoniyi, ATA:C. Wood, PON:D. Ndoye, ATA:Igor Jesus, PON:O. Hutchinson, ATA:A. Kalimuendo"),
    bou: sq("GOL:Đ. Petrović, GOL:W. Dennis, ZAG:A. Truffert, ZAG:António Silva, ZAG:J. Soler, LAT:A. Smith, LAT:B. Diakité, LAT:Veljko Milosavljević, VOL:L. Cook, MEI:A. Scott, VOL:R. Christie, MEI:T. Adams, VOL:M. Tavernier, MEI:A. Adli, PON:D. Brooks, ATA:Evanilson, PON:B. Doak, ATA:J. Kluivert, PON:Á. Rodríguez, ATA:E. Kroupi"),
    lee: sq("GOL:Lucas Perri, GOL:Darryl Merveil Ombang, ZAG:J. Bogle, ZAG:G. Gudmundsson, ZAG:E. Ampadu, LAT:T. Muharemović, LAT:J. Rodon, LAT:S. Bornauw, VOL:D. James, MEI:S. Longstaff, VOL:B. Aaronson, MEI:H. Wilson, VOL:A. Stach, MEI:A. Tanaka, PON:D. Calvert-Lewin, ATA:J. Piroe, PON:L. Nmecha, ATA:N. Okafor, PON:W. Gnonto"),
    mln: sq("GOL:P. Terracciano, GOL:M. Maignan, ZAG:P. Estupiñán, ZAG:K. De Winter, ZAG:F. Tomori, LAT:Z. Athekame, LAT:D. Odogu, LAT:V. Vladimirov, VOL:S. Ricci, MEI:Y. Musah, VOL:R. Loftus-Cheek, MEI:A. Rabiot, VOL:L. Modrić, MEI:Y. Fofana, PON:S. Giménez, ATA:A. Kostić, PON:Gonçalo Ramos, ATA:Rafael Leão, PON:C. Pulišić, ATA:C. Nkunku"),
    juve: sq("GOL:M. Perin, GOL:S. Scaglia, ZAG:Z. Çelik, ZAG:Bremer, ZAG:F. Gatti, LAT:N. Rizzo, LAT:L. Kelly, LAT:A. Cambiaso, VOL:M. Locatelli, MEI:T. Koopmeiners, VOL:Douglas Luiz, MEI:Vasilije Adžić, VOL:K. Thuram, MEI:F. Miretti, PON:Francisco Conceição, ATA:K. Yıldız, PON:E. Zhegrova, ATA:J. Boga, PON:A. Milik, ATA:J. Ekhator"),
    nap: sq("GOL:A. Meret, GOL:N. Contini, ZAG:Miguel Gutiérrez, ZAG:A. Buongiorno, ZAG:Rafa Marín, LAT:N. Obaretin, LAT:C. Garofalo, LAT:P. Mazzocchi, VOL:B. Gilmour, MEI:S. McTominay, VOL:K. De Bruyne, MEI:V. Prisco, VOL:J. Lindstrøm, MEI:A. Vergara, PON:R. Lukaku, ATA:R. Højlund, PON:L. Lucca, ATA:M. Politano, PON:Giovane, ATA:Alisson Santos"),
    rom: sq("GOL:G. De Marzi, GOL:R. Żelezny, ZAG:D. Rensch, ZAG:Angeliño, ZAG:E. Ndicka, LAT:Hermoso, LAT:G. Mancini, LAT:M. Seck, VOL:B. Cristante, MEI:K. Koulierakis, VOL:N. El Aynaoui, MEI:M. Koné, VOL:Mattia Mannini, MEI:N. Pisilli, PON:A. Arena, ATA:S. Castro, PON:D. Malen, ATA:M. Soulé, PON:P. Dybala, ATA:L. Cherubini"),
    ata: sq("GOL:P. Pardel, GOL:M. Carnesecchi, ZAG:O. Kossounou, ZAG:I. Hien, ZAG:M. Bakker, LAT:B. Djimsiti, LAT:S. Kolašinac, LAT:D. Zappacosta, VOL:F. Steffanoni, MEI:A. Manzoni, VOL:Mario Pasalic, MEI:G. Gaetano, VOL:L. Samardžić, MEI:Éderson, PON:K. Sulemana, ATA:G. Scamacca, PON:F. Cassa, ATA:G. Raspadori, PON:E. Touré, ATA:N. Krstović"),
    laz: sq("GOL:D. Renzetti, GOL:C. Mandas, ZAG:S. Gigot, ZAG:F. Bordon, ZAG:L. Pellegrini, LAT:Patric, LAT:D. Doekhi, LAT:Pedraza, VOL:N. Rovella, MEI:F. Dele-Bashiru, VOL:M. Zaccagni, MEI:R. Belahyane, VOL:K. Taylor, MEI:M. Lazzari, PON:G. Artistico, ATA:T. Noslin, PON:G. Isaksen, ATA:B. Dia, PON:P. Ratkov, ATA:M. Cancellieri"),
    fio: sq("GOL:David de Gea, GOL:O. Christensen, ZAG:V. Valdepenas, ZAG:Dodô, ZAG:M. Pongračić, LAT:E. Sadotti, LAT:R. Drăgușin, LAT:Álex Jiménez, VOL:A. Atta, MEI:P. Bonanno, VOL:M. Brescianini, MEI:N. Fagioli, VOL:R. Mandragora, MEI:C. Ndour, PON:G. Bertolini, ATA:M&apos;Bala Nzola, PON:A. Guðmundsson, ATA:M. Kean, PON:R. Piccoli, ATA:R. Braschi"),
    bgn: sq("GOL:U. Happonen, GOL:Ł. Skorupski, ZAG:E. Helland, ZAG:T. Heggem, ZAG:M. Ilić, LAT:N. Casale, LAT:D. Baroncioni, LAT:M. Vitík, VOL:E. Holm, MEI:T. Pobega, VOL:N. Moro, MEI:O. El Azzouzi, VOL:L. Ferguson, MEI:N. Zortea, PON:R. Orsolini, ATA:F. Castaldo, PON:A. Dovbyk, ATA:F. Bernardeschi, PON:J. Rowe, ATA:J. Odgaard"),
    tor: sq("GOL:A. Paleari, GOL:D. Mascardi, ZAG:C. Bianay Balcot, ZAG:A. Dembélé, ZAG:P. Comuzzo, LAT:M. Pedersen, LAT:Saúl Coco, LAT:M. Pellini, VOL:E. İlkhan, MEI:I. Ilić, VOL:N. Vlašić, MEI:F. Anjorin, VOL:G. Oristanio, MEI:C. Casadei, PON:Z. Aboukhlal, ATA:S. Kulenović, PON:G. Simeone, ATA:C. Adams, PON:T. Gabellini, ATA:D. Zapata"),
    udi: sq("GOL:R. Pirih, GOL:M. Okoye, ZAG:S. Goglichidze, ZAG:J. Abankwah, ZAG:H. Kamara, LAT:N. Bertola, LAT:M. Palma, LAT:T. Kristensen, VOL:S. Lovrić, MEI:Oier Zarraga, VOL:G. Chakvetadze, MEI:J. Karlström, VOL:N. Zaniolo, MEI:J. Arizala, PON:I. Gueye, ATA:K. Davis, PON:V. Bayo, ATA:A. Buksa, PON:G. Vinciati"),
    gen: sq("GOL:F. Stolz, GOL:J. Bijlow, ZAG:Kris Gecaj, ZAG:Aarón Martín, ZAG:A. Vogliacco, LAT:L. Østigård, LAT:M. Barbini, LAT:S. Sabelli, VOL:Alexsandro Amorim, MEI:H. Traorè, VOL:M. Frendrup, MEI:P. Masini, VOL:Gaël Lafont, MEI:M. Ellertsson, PON:E. Havel, ATA:Vítinha, PON:M. Romano, ATA:L. Venturino, PON:L. Colombo, ATA:S. Wiafe"),
    como: sq("GOL:J. Butez, GOL:N. Törnqvist, ZAG:M. Kempf, ZAG:Álex Valle, ZAG:Kaiki, LAT:E. Goldaniga, LAT:Jacobo Ramón Naveros, LAT:I. Van der Brempt, VOL:Luis Milla, MEI:M. Caqueret, VOL:N. Paz, MEI:L. Bősze, VOL:A. Lahdo, MEI:Jesús Rodríguez, PON:Álvaro Morata, ATA:A. Gabrielloni, PON:T. Douvikas, ATA:N. Kühn, PON:A. Fadera, ATA:Assane Diao"),
    sas: sq("GOL:S. Turati, GOL:G. Zacchi, ZAG:F. Missori, ZAG:J. Doig, ZAG:S. Walukiewicz, LAT:J. Idzes, LAT:C. Odenthal, VOL:C. Volpato, MEI:K. Leone, VOL:D. Boloca, MEI:A. Ghion, VOL:N. Matić, MEI:C. Frangella, PON:D. Berardi, ATA:R. Ciervo, PON:K. Bowie, ATA:P. Nuamah, PON:L. Moro, ATA:A. Álvarez"),
    cag: sq("GOL:E. Caprile, GOL:A. Sherri, ZAG:Riyad Idrissi, ZAG:J. Rodríguez, ZAG:Y. Mina, LAT:G. Zappa, LAT:Zé Pedro, VOL:M. Prati, MEI:M. Adopo, VOL:H. Winks, MEI:A. Deiola, VOL:A. Albarracín, MEI:M. Felici, PON:K. Mutandwa, ATA:G. Borrelli, PON:P. Mendy, ATA:Y. Trepy, PON:S. Di Paolo, ATA:S. Esposito"),
    ver: sq("GOL:N. Leali, GOL:L. Montipò, ZAG:S. Korač, ZAG:D. Oyegoke, ZAG:M. Frese, LAT:A. Edmundsson, LAT:R. Belghali, LAT:N. Calabrese, VOL:L. Bega, MEI:Charlys, VOL:S. Serdar, MEI:T. Suslov, VOL:A. Harroui, MEI:A. Bernede, PON:S. Mulattieri, ATA:A. Sarr, PON:L. Monticelli, ATA:M. Compagnon, PON:D. Mosquera, ATA:G. Kastanos"),
    lec: sq("GOL:C. Früchtl, GOL:P. Penev, ZAG:C. Ndaba, ZAG:Kialonda Gaspar, ZAG:J. Siebert, LAT:S. Fofana, LAT:M. Pérez, LAT:Tiago Gabriel, VOL:Hjalte Laerke, MEI:O. Gandelman, VOL:Olaf Gorter, MEI:L. Coulibaly, VOL:Y. Maleh, MEI:O. Ngom, PON:W. Geubbels, ATA:N. Štulić, PON:L. Banda, ATA:Paco Esteban, PON:S. Pierotti"),
    par: sq("GOL:Gabriele Casentini, GOL:G. Daffara, ZAG:A. N&apos;Diaye, ZAG:L. Valenti, ZAG:E. Valeri, LAT:E. Del Prato, LAT:D. Drobnic, LAT:A. Circati, VOL:Adrián Bernabé, MEI:P. Almqvist, VOL:M. Keita, MEI:J. Ondrejka, VOL:O. Sørensen, MEI:B. Cremaschi, PON:Mateo Pellegrino, ATA:M. Frigan, PON:N. Elphege, ATA:S. Lontani, PON:O. Diallo, ATA:Alessandro Cardinali"),
    lev4: sq("GOL:M. Flekken, GOL:S. Rapsch, ZAG:J. Quansah, ZAG:L. Badé, ZAG:R. Andrich, LAT:E. Tapsoba, LAT:T. Oermann, LAT:J. Belocian, VOL:E. Fernández, MEI:J. Mensah, VOL:M. Tillman, MEI:Arthur, VOL:M. Djedovic, MEI:N. Mbamba, PON:J. Hofmann, ATA:A. Damjanović, PON:Afonso Moreira, ATA:M. Terrier, PON:P. Schick, ATA:E. Ben Seghir"),
    bvb: sq("GOL:G. Kobel, GOL:P. Drewes, ZAG:Yan Couto, ZAG:W. Anton, ZAG:N. Schlotterbeck, LAT:R. Bensebaïni, LAT:Kouakou Joane Gadou, LAT:Elias  Benkara, VOL:J. Bellingham, MEI:F. Nmecha, VOL:M. Beier, MEI:C. Chukwuemeka, VOL:K. Karetsas, MEI:M. Sabitzer, PON:S. Guirassy, ATA:Fábio Silva, PON:M. Albert"),
    rbl: sq("GOL:P. Gulácsi, GOL:L. Zingerle, ZAG:W. Orbán, ZAG:E. Bitshiabu, ZAG:M. Estève, LAT:L. Geertruida, LAT:L. Klostermann, LAT:Joyeux Masanka Bungi, VOL:E. Banzuzi, MEI:B. Gruda, VOL:N. Seiwald, MEI:C. Baumgartner, VOL:A. Vermeeren, MEI:A. Ouédraogo, PON:A. Nusa, ATA:J. Bakayoko, PON:C. Harder, ATA:Rômulo, PON:S. Konate, ATA:Y. Diomande"),
    stu: sq("GOL:F. Bredlow, GOL:M. Funk, ZAG:A. Al Dakhil, ZAG:R. Hendriks, ZAG:Maximilian Tobias Herwerth, LAT:J. Vagnoman, LAT:M. Mittelstädt, LAT:D. Zagadou, VOL:G. Prömel, MEI:A. Stiller, VOL:L. Penna, MEI:B. El Khannouss, VOL:A. Karazor, MEI:José María Andrés Baixauli, PON:Tiago Tomás, ATA:E. Demirović, PON:C. Führich, ATA:L. Sauer, PON:J. Leweling, ATA:J. Milošević"),
    sge: sq("GOL:M. Zetterer, GOL:J. Grahl, ZAG:Elias Baum, ZAG:A. Theate, ZAG:R. Koch, LAT:T. Chandler, LAT:K. Kosugi, VOL:O. HÃ¸jlund, MEI:M. Dills, VOL:N. Aséko Nkili, MEI:R. Onyedika, VOL:E. Skhiri, MEI:H. Larsson, PON:A. Knauff, ATA:F. Chaïbi, PON:J. Burkardt, ATA:N. Futkeu, PON:Y. Ebnoutalib, ATA:A. Amaimouni"),
    fre: sq("GOL:N. Atubolu, GOL:F. Müller, ZAG:P. Lienhart, ZAG:A. Jung, ZAG:L. Kübler, LAT:Berkay Yilmaz, LAT:M. Ginter, LAT:M. Rosenfelder, VOL:Y. Engelhardt, MEI:P. Osterhage, VOL:R. Yamamoto, MEI:M. Eggestein, VOL:J. Beste, MEI:N. Höfler, PON:D. Scherhant, ATA:E. Dinkçi, PON:L. Höler, ATA:Y. Suzuki, PON:Cyriaque Kalou Irié, ATA:I. Matanović"),
    fla: sq("GOL:Rossi, GOL:Matheus Cunha, ZAG:Léo Pereira, ZAG:Léo Ortiz, ZAG:Danilo, LAT:Wesley, LAT:Ayrton Lucas, LAT:Varela, VOL:Erick Pulgar, VOL:De la Cruz, VOL:Allan, MEI:Gerson, MEI:Arrascaeta, PON:Luiz Araújo, PON:Michael, ATA:Pedro, ATA:Bruno Henrique, ATA:Juninho"),
    pal: sq("GOL:Weverton, ZAG:Gustavo Gómez, ZAG:Murilo, ZAG:Bruno Fuchs, LAT:Marcos Rocha, LAT:Piquerez, LAT:Mayke, VOL:Aníbal Moreno, VOL:Richard Ríos, VOL:Emiliano Martínez, MEI:Raphael Veiga, MEI:Maurício, PON:Estêvão, PON:Felipe Anderson, ATA:Vitor Roque, ATA:Flaco López, ATA:Rony"),
    cor: sq("GOL:Hugo Souza, ZAG:Cacá, ZAG:André Ramalho, ZAG:Gustavo Henrique, LAT:Matheuzinho, LAT:Hugo, VOL:Raniele, VOL:José Martínez, VOL:Alex Santana, MEI:Rodrigo Garro, MEI:Igor Coronado, PON:Ángel Romero, PON:Talles Magno, ATA:Yuri Alberto, ATA:Memphis Depay"),
    sao: sq("GOL:Rafael, ZAG:Arboleda, ZAG:Alan Franco, ZAG:Sabino, LAT:Rafinha, LAT:Wendell, LAT:Enzo Díaz, VOL:Alisson, VOL:Bobadilla, VOL:Marcos Antônio, MEI:Lucas Moura, MEI:Oscar, PON:Ferreira, ATA:Calleri, ATA:André Silva, ATA:Luciano"),
    flu: sq("GOL:Fábio, ZAG:Thiago Silva, ZAG:Ignácio, ZAG:Thiago Santos, LAT:Guga, LAT:Renê, VOL:Martinelli, VOL:Hércules, VOL:Bernal, MEI:Ganso, MEI:Lima, PON:Keno, PON:Arias, ATA:Germán Cano, ATA:Kauã Elias, ATA:John Kennedy"),
    bot: sq("GOL:John, ZAG:Bastos, ZAG:Barboza, ZAG:Alexander Barboza, LAT:Vitinho, LAT:Alex Telles, LAT:Cuiabano, VOL:Marlon Freitas, VOL:Gregore, VOL:Danilo Barbosa, MEI:Thiago Almada, MEI:Savarino, PON:Jeffinho, PON:Artur, ATA:Igor Jesus, ATA:Tiquinho Soares"),
    gre: sq("GOL:Marchesín, ZAG:Kannemann, ZAG:Geromel, ZAG:Jemerson, LAT:João Pedro, LAT:Reinaldo, VOL:Villasanti, VOL:Dodi, VOL:Cristaldo, MEI:Pavón, MEI:Monsalve, PON:Soteldo, ATA:Braithwaite, ATA:Arezo, ATA:André Henrique"),
    int: sq("GOL:Rochet, ZAG:Vitão, ZAG:Mercado, ZAG:Rogel, LAT:Bruno Gomes, LAT:Bernabei, VOL:Fernando, VOL:Thiago Maia, VOL:Bruno Henrique, MEI:Alan Patrick, MEI:Wanderson, PON:Borré, ATA:Enner Valencia, ATA:Rafael Borré"),
    cru: sq("GOL:Cássio, ZAG:Villalba, ZAG:João Marcelo, ZAG:Fabrício Bruno, LAT:William, LAT:Kaiki, VOL:Lucas Romero, VOL:Walace, VOL:Matheus Henrique, MEI:Matheus Pereira, PON:Kaio Jorge, PON:Wanderson, ATA:Gabigol, ATA:Dudu"),
    cam: sq("GOL:Everson, ZAG:Lyanco, ZAG:Junior Alonso, ZAG:Ruan, LAT:Saravia, LAT:Guilherme Arana, VOL:Alan Franco, VOL:Fausto Vera, VOL:Gabriel Menino, MEI:Bernard, MEI:Scarpa, PON:Rony, ATA:Hulk, ATA:Deyverson"),
    vas: sq("GOL:Léo Jardim, ZAG:João Victor, ZAG:Léo, ZAG:Lucas Freitas, LAT:Puma Rodríguez, LAT:Lucas Piton, VOL:Hugo Moura, VOL:Sforza, VOL:Mateus Carvalho, MEI:Coutinho, MEI:Payet, PON:David, ATA:Vegetti, ATA:Rayan"),
    san: sq("GOL:Gabriel Brazão, ZAG:Gil, ZAG:Zé Ivaldo, ZAG:Luan Peres, LAT:JP Chermont, LAT:Escobar, VOL:João Schmidt, VOL:Diego Pituca, MEI:Guilherme, MEI:Rollheiser, PON:Soteldo, PON:Neymar, ATA:Guilherme, ATA:Tiquinho"),
    bah: sq("GOL:Marcos Felipe, ZAG:Kanu, ZAG:Gabriel Xavier, ZAG:David Duarte, LAT:Gilberto, LAT:Iago Borduchi, VOL:Caio Alexandre, VOL:Rezende, MEI:Everton Ribeiro, MEI:Cauly, PON:Ademir, ATA:Everaldo, ATA:Lucho Rodríguez"),
    rma: sq("GOL:Courtois, ZAG:Rüdiger, ZAG:Militão, LAT:Carvajal, LAT:Mendy, VOL:Tchouaméni, VOL:Camavinga, VOL:Valverde, MEI:Bellingham, MEI:Güler, PON:Rodrygo, PON:Vinícius Júnior, ATA:Mbappé, ATA:Endrick"),
    bar: sq("GOL:Ter Stegen, ZAG:Cubarsí, ZAG:Íñigo Martínez, LAT:Koundé, LAT:Balde, VOL:De Jong, VOL:Pedri, MEI:Gavi, MEI:Fermín, MEI:Dani Olmo, PON:Raphinha, PON:Lamine Yamal, ATA:Lewandowski, ATA:Ferran Torres"),
    mci: sq("GOL:Ederson, ZAG:Rúben Dias, ZAG:Stones, ZAG:Aké, LAT:Walker, LAT:Gvardiol, VOL:Rodri, VOL:Kovačić, MEI:De Bruyne, MEI:Bernardo Silva, MEI:Foden, PON:Savinho, PON:Doku, ATA:Haaland"),
    liv: sq("GOL:Alisson, ZAG:Van Dijk, ZAG:Konaté, LAT:Alexander-Arnold, LAT:Robertson, VOL:Mac Allister, VOL:Gravenberch, MEI:Szoboszlai, PON:Salah, PON:Luis Díaz, PON:Gakpo, ATA:Núñez, ATA:Jota"),
    psg: sq("GOL:Donnarumma, ZAG:Marquinhos, ZAG:Pacho, LAT:Hakimi, LAT:Nuno Mendes, VOL:Vitinha, VOL:João Neves, VOL:Fabián Ruiz, MEI:Zaïre-Emery, PON:Dembélé, PON:Kvaratskhelia, PON:Barcola, ATA:Gonçalo Ramos"),
    bay: sq("GOL:Neuer, ZAG:Upamecano, ZAG:Kim Min-jae, ZAG:Dier, LAT:Kimmich, LAT:Davies, VOL:Goretzka, VOL:Palhinha, MEI:Musiala, MEI:Sané, PON:Coman, PON:Olise, ATA:Kane, ATA:Gnabry"),
    intm: sq("GOL:Sommer, ZAG:Bastoni, ZAG:Acerbi, ZAG:Pavard, LAT:Dumfries, LAT:Dimarco, VOL:Barella, VOL:Çalhanoğlu, VOL:Mkhitaryan, MEI:Frattesi, PON:Zieliński, ATA:Lautaro Martínez, ATA:Thuram, ATA:Taremi")
  };

  // ---------------- escudos reais (uso local/pessoal — ver docs/CHANGELOG.md) ----------------
  // ID do time na API-Football; a URL do escudo é pública (media.api-sports.io), sem chave.
  // Clube sem entrada aqui cai no brasão vetorial procedural (crestSVG) automaticamente.
  const CREST_MAP = {
    agm: 7879, ala: 9997, alv: 542, ame: 125, amz: 10862, ang: 77, aro: 240, ars: 42,
    ata: 499, atb: 531, ath: 13975, atm: 530, aug: 170, aux: 108, ava: 145, avl: 66,
    bah: 118, bar: 529, bay: 157, ben: 211, bet: 543, bgn: 500, bha: 51, bmg: 163,
    boa: 2206, boav: 222, bot: 120, bou: 35, bra: 217, bre: 55, bres: 106, bru: 1211,
    bsp: 2618, bvb: 165, cag: 490, cal: 7769, cam: 1062, cap: 134, cas: 10673, cax: 7770,
    cea: 129, cel: 538, cfc: 147, cha: 132, che: 49, como: 895, con: 12300, cor: 131,
    cpia: 4716, crb: 146, cri: 140, cru: 135, cry: 52, cst: 13124, esto: 230, estr: 15130,
    esy: 540, eve: 45, fam: 242, farn: 231, fio: 502, fla: 127, flu: 124, for: 154,
    fre: 160, ful: 36, gen: 495, get: 546, gil: 762, gir: 547, goi: 151, gre: 130,
    gua: 138, hav: 111, hei: 180, hof: 167, hsv: 175, int: 119, intm: 505, jac: 7831,
    jua: 1224, juv: 152, juve: 496, koe: 192, laz: 487, lec: 867, lee: 63, len: 116,
    lev: 539, lev4: 168, lil: 79, liv: 40, lon: 148, mad: 7780, mai: 164, mal: 798,
    mar: 7833, mars: 81, mcd: 10677, mci: 50, metz: 112, mir: 7848, mln: 489, mon: 91,
    mor: 215, mtp: 82, mun: 33, nacp: 225, nan: 83, nap: 492, new: 34, nfo: 65,
    nice: 84, nig: 7782, nov: 7834, oly: 80, ope: 1223, osa: 727, pal: 121, par: 523,
    pay: 149, pon: 139, por: 1214, porto: 212, pou: 13084, psg: 85, ray: 728, rbb: 794,
    rbl: 173, rei: 93, rem: 1198, ren: 94, rio: 226, rma: 541, rom: 497, rso: 548,
    san: 128, sao: 126, sas: 488, sbe: 7865, scl: 227, scp: 228, sev: 536, sge: 169,
    sjo: 2232, spt: 123, stp: 186, str: 95, stu: 172, sve: 162, tom: 2227, ton: 218,
    tor: 503, tot: 47, tou: 96, tun: 15611, udi: 494, uni: 182, val: 532, vas: 133,
    ver: 504, vgu: 224, vil: 142, vit: 136, vll: 533, vre: 7814, whu: 48, wob: 161,
    wol: 39, xvp: 7870, ypi: 1221, nau: 755, fig: 137, prc: 122, spc: 155,
    riv: 435, boc: 451, rac: 436, ind: 453, est: 450, pen: 2348, nac: 2356,
    col: 2315, udc: 2323, cer: 1176, oli: 1182, ldu: 1158, bce: 1152, bol: 3702,
    mil: 1125, atn: 1137
  };

  CQ.DATA = {
    NATIONS, CONFED_POOL, WORLD_POOL, NAT_STR,
    CLUBS, LEAGUES, EURO_LEAGUES, ESTADUAIS,
    POSITIONS, ATTR_NAMES, LEGENDS, CHAMPS_SEED, COMP_NAMES, HALL_SCORERS, REAL_SQUADS, CREST_MAP,
    clubsOf: function (league) {
      return Object.keys(CLUBS).filter(function (id) { return CLUBS[id].league === league; }).map(function (id) { return CLUBS[id]; });
    },
    stateField: function (uf) {
      return Object.keys(CLUBS).filter(function (id) {
        const c = CLUBS[id];
        return c.uf === uf;
      }).map(function (id) { return CLUBS[id]; });
    }
  };
})();
