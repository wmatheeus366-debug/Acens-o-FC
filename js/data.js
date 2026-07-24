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

  // ---- Série B (16) ----
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
  riv("rma", "bar"); riv("rma", "atm"); riv("mci", "mun"); riv("liv", "mun"); riv("liv", "eve"); riv("ars", "tot");
  riv("intm", "mln"); riv("juve", "tor"); riv("rom", "laz"); riv("bay", "bvb"); riv("psg", "mars"); riv("ben", "porto"); riv("scp", "ben");
  riv("riv", "boc"); riv("pen", "nac");

  const LEAGUES = {
    BRA: { id: "BRA", name: "Brasileirão Série A", short: "Série A", country: "BR", cupName: "Copa do Brasil", rounds: 38 },
    BRB: { id: "BRB", name: "Brasileirão Série B", short: "Série B", country: "BR", cupName: "Copa do Brasil", rounds: 30 },
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
    CDB: { 2015: "Palmeiras", 2016: "Grêmio", 2017: "Cruzeiro", 2018: "Cruzeiro", 2019: "Athletico-PR", 2020: "Palmeiras", 2021: "Atlético-MG", 2022: "Flamengo", 2023: "São Paulo", 2024: "Flamengo" },
    LIB: { 2015: "River Plate", 2016: "Atlético Nacional", 2017: "Grêmio", 2018: "River Plate", 2019: "Flamengo", 2020: "Palmeiras", 2021: "Palmeiras", 2022: "Flamengo", 2023: "Fluminense", 2024: "Botafogo", 2025: "Flamengo" },
    UCL: { 2015: "Barcelona", 2016: "Real Madrid", 2017: "Real Madrid", 2018: "Real Madrid", 2019: "Liverpool", 2020: "Bayern de Munique", 2021: "Chelsea", 2022: "Real Madrid", 2023: "Manchester City", 2024: "Real Madrid", 2025: "Paris Saint-Germain" },
    WC: { 2006: "Itália", 2010: "Espanha", 2014: "Alemanha", 2018: "França", 2022: "Argentina" },
    CA: { 2015: "Chile", 2016: "Chile", 2019: "Brasil", 2021: "Argentina", 2024: "Argentina" },
    EU: { 2008: "Espanha", 2012: "Espanha", 2016: "Portugal", 2021: "Itália", 2024: "Espanha" }
  };
  const COMP_NAMES = {
    BRA: "Brasileirão Série A", BRB: "Brasileirão Série B", CDB: "Copa do Brasil", LIB: "Libertadores",
    SUL: "Sul-Americana", UCL: "Champions League", UEL: "Europa League", WC: "Copa do Mundo",
    CA: "Copa América", EU: "Eurocopa", GC: "Copa Ouro", AC: "Copa da Ásia", EST: "Estadual",
    LIGA: "Liga nacional", COPA: "Copa nacional", SEL: "Seleção"
  };

  // Maiores artilheiros HISTÓRICOS (dados factuais — gols acumulados na competição).
  // Usado para você perseguir e ultrapassar recordes reais.
  const HALL_SCORERS = {
    WC: { title: "Artilheiros da Copa do Mundo (história)", list: [
      { name: "Miroslav Klose", n: 16 }, { name: "Ronaldo", n: 15 }, { name: "Gerd Müller", n: 14 },
      { name: "Just Fontaine", n: 13 }, { name: "Lionel Messi", n: 13 }, { name: "Pelé", n: 12 },
      { name: "Kylian Mbappé", n: 12 }, { name: "Jürgen Klinsmann", n: 11 }, { name: "Sándor Kocsis", n: 11 },
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

  CQ.DATA = {
    NATIONS, CONFED_POOL, WORLD_POOL, NAT_STR,
    CLUBS, LEAGUES, EURO_LEAGUES, ESTADUAIS,
    POSITIONS, ATTR_NAMES, LEGENDS, CHAMPS_SEED, COMP_NAMES, HALL_SCORERS, REAL_SQUADS,
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
