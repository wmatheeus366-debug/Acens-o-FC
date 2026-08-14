/* CRAQUE — baixa/atualiza js/vendor/life-scenes.js (fotos reais dos modais de eventos de
   vida + de 6 telas de carreira que ganharam foto-herói nesta entrega), embutidas como
   data-URI base64. Substitui as 10 ilustrações vetoriais da unDraw (usadas até aqui) por
   fotografias do StockCake — pedido direto do usuário: "pega de uma biblioteca de
   ilustrações de cenas... pega do stockcake", cobrindo tanto os eventos que já existiam
   quanto os ~29 novos (namoro/escândalo/carreira) desta entrega.

   Fonte: StockCake (https://stockcake.com) — banco de imagens geradas por IA, licença
   CC0-like confirmada no próprio site ("Uso gratuito · Uso comercial", sem exigir
   atribuição). Cada URL abaixo foi escolhida manualmente (StockCake não tem API pública
   de busca) comparando a descrição da imagem com a direção visual de cada categoria —
   ver a tabela CATEGORY_TITLE pra saber qual pedido cada uma cobre. Algumas são a
   substituição mais próxima disponível quando a busca não trouxe o cenário exato (ex.:
   "affair"/"nightfight" caíram em resultados estilizados, não fotos literais da cena) —
   documentado caso a caso no comentário de cada entrada.

   Runtime não muda: continua `CQ.LIFE_IMGS` (mesmo nome, mesmo consumidor em
   js/util.js lifeSceneImg/lifeSceneSVG) — só o gerador e o conteúdo do arquivo mudam.

   Rodar de novo é seguro — sobrescreve o arquivo.

   Uso:  node scripts/vendor-scene-photos.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "js", "vendor", "life-scenes.js");

// chave -> { url, title } — título só pra comentário/rastreabilidade, não usado em runtime.
// As 10 primeiras substituem as categorias unDraw antigas (mesmas chaves, LIFE_SCENE em
// js/util.js não precisa mudar pra elas); as demais são novas, usadas pelos eventos
// novos de js/narrative.js LIFE_EVENTS ou pelas 6 telas com foto-herói nova (js/ui.js).
const SCENES = {
  hospital: { url: "https://images.stockcake.com/public/0/1/8/018679f9-8f89-42a6-ac9b-bc97c1d71e1c_large/doctor-greets-child-stockcake.jpg", title: "Doctor greets child" },
  contract: { url: "https://images.stockcake.com/public/8/c/d/8cdcf9e1-c2e5-41ef-8adf-aa6f28bcd7c9_large/executive-signing-contract-stockcake.jpg", title: "Executive signing contract" },
  mic: { url: "https://images.stockcake.com/public/d/f/f/dfff5493-3585-4f31-9f47-e061909eeb90_large/eager-press-corps-stockcake.jpg", title: "Eager press corps" },
  couple: { url: "https://images.stockcake.com/public/3/2/3/323fab70-2956-4135-8c25-23d53dcaf28a_large/rainy-night-romance-stockcake.jpg", title: "Rainy night romance" },
  team: { url: "https://images.stockcake.com/public/b/2/1/b21666ae-e744-4df1-aefa-11435329f976_large/team-unity-huddle-stockcake.jpg", title: "Team unity huddle" },
  social: { url: "https://images.stockcake.com/public/f/7/4/f744f84a-f443-4e94-8c2e-75e8baf66172_large/stressed-businessman-texting-stockcake.jpg", title: "Stressed businessman texting" },
  rest: { url: "https://images.stockcake.com/public/c/2/6/c26e8c5e-6fad-480b-b3d1-d68a7081edfb_large/injured-player-sideline-stockcake.jpg", title: "Injured player sideline" },
  formal: { url: "https://images.stockcake.com/public/5/3/4/53429028-18cc-46e6-95d9-bbbcb7b56fdc_large/elegant-dinner-meeting-stockcake.jpg", title: "Elegant dinner meeting" },
  youth: { url: "https://images.stockcake.com/public/0/a/8/0a8177d7-ec91-4626-9b0b-afa285bc3ad6_large/soccer-coaching-session-stockcake.jpg", title: "Soccer coaching session" },
  community: { url: "https://images.stockcake.com/public/5/9/7/597d7e0b-9105-475d-be42-92acecfc9bce_large/golden-hour-training-stockcake.jpg", title: "Golden hour training" },

  proposal: { url: "https://images.stockcake.com/public/5/8/2/5822a480-f7b6-4810-aac1-800acad772a7_large/beach-proposal-moment-stockcake.jpg", title: "Beach proposal moment" },
  wedding: { url: "https://images.stockcake.com/public/0/4/4/044652b4-6b11-49a3-8a58-a909e79f673b_large/rustic-wedding-elegance-stockcake.jpg", title: "Rustic wedding elegance" },
  breakup: { url: "https://images.stockcake.com/public/c/e/3/ce3d78be-0bde-4661-9e7b-41f564d436f6_large/relationship-distance-growing-stockcake.jpg", title: "Relationship distance growing" },
  newborn: { url: "https://images.stockcake.com/public/8/a/8/8a8452c1-7f30-444d-98b8-20da86368eb2_large/golden-hour-bonding-stockcake.jpg", title: "Golden hour bonding" },
  // substituição aproximada — busca por "sneaking out of hotel" não achou cena literal
  affair: { url: "https://images.stockcake.com/public/8/5/b/85bb7f0c-ac13-434b-804e-ccf134b6bbe5_large/journey-begins-now-stockcake.jpg", title: "Journey begins now (aproximação)" },
  rumor: { url: "https://images.stockcake.com/public/7/1/1/71148171-a3a6-4011-91f4-4e544c8275bd_large/paparazzi-alley-ambush-stockcake.jpg", title: "Paparazzi alley ambush" },
  vip: { url: "https://images.stockcake.com/public/0/c/e/0ce14189-10b0-4283-aa81-85b20fc6728b_large/purple-velvet-luxury-stockcake.jpg", title: "Purple velvet luxury" },
  celebfriend: { url: "https://images.stockcake.com/public/a/f/2/af258906-99cc-448d-973e-634f34050c2e_large/friendship-through-shadows-stockcake.jpg", title: "Friendship through shadows" },
  musicvideo: { url: "https://images.stockcake.com/public/f/7/4/f74a8b82-d382-40ac-8f2f-b49d4f3fe622_large/live-studio-session-stockcake.jpg", title: "Live studio session" },
  adcampaign: { url: "https://images.stockcake.com/public/3/d/1/3d15c32c-8c6b-4f22-923e-f01bb73e67bf_large/minimalist-studio-setup-stockcake.jpg", title: "Minimalist studio setup" },
  bettingad: { url: "https://images.stockcake.com/public/9/e/a/9ea0ebbe-3bf1-4dca-9d8a-d0159fdd3a40_large/illuminated-bet-sign-stockcake.jpg", title: "Illuminated BET sign" },
  tigrinho: { url: "https://images.stockcake.com/public/1/d/9/1d920c29-e52a-48eb-80b8-86ee103d11e0_large/mobile-casino-app-stockcake.jpg", title: "Mobile casino app" },
  bettingloss: { url: "https://images.stockcake.com/public/b/e/8/be8dafdc-c639-48aa-994b-98f19de52c2e_large/worried-smartphone-user-stockcake.jpg", title: "Worried smartphone user" },
  // ilustração estilizada (pop art), não foto — melhor resultado achado pra confronto físico
  fight: { url: "https://images.stockcake.com/public/c/c/f/ccf677d5-ee08-4b11-9cbd-b49e6fd00d3c_large/rivals-face-off-stockcake.jpg", title: "Rivals face off (ilustração)" },
  // ilustração estilo anime — idem, sem foto literal de briga em balada disponível
  nightfight: { url: "https://images.stockcake.com/public/5/7/a/57a0138d-2bd2-4c57-800f-f9618dc0c1c9_large/bar-fight-brewing-stockcake.jpg", title: "Bar fight brewing (ilustração)" },
  crowdtrouble: { url: "https://images.stockcake.com/public/6/3/8/6388f206-e40f-41db-b3ed-83b6bdcee5dd_large/alone-amid-celebration-stockcake.jpg", title: "Alone amid celebration" },
  escorted: { url: "https://images.stockcake.com/public/9/a/5/9a505c00-8887-4886-a624-dddd953e9410_large/official-procession-march-stockcake.jpg", title: "Official procession march" },
  carcrash: { url: "https://images.stockcake.com/public/9/c/d/9cd44997-f815-406a-9c6f-aba48d464d9a_large/flat-tire-emergency-stockcake.jpg", title: "Flat tire emergency" },
  police: { url: "https://images.stockcake.com/public/a/6/9/a6994e4a-f732-4ecc-9401-b00133899564_large/arrest-in-progress-stockcake.jpg", title: "Arrest in progress" },
  leak: { url: "https://images.stockcake.com/public/0/4/b/04b569b8-cb60-483a-9246-4a97e2562446_large/digital-communication-overload-stockcake.jpg", title: "Digital communication overload" },
  torncontract: { url: "https://images.stockcake.com/public/1/9/c/19c985b6-c628-4150-9eae-3fb3baa42cf1_large/tearing-contract-apart-stockcake.jpg", title: "Tearing contract apart" },
  disciplinary: { url: "https://images.stockcake.com/public/5/9/f/59f9963d-e142-4a7d-9d06-016616824ecf_large/referee-shows-red-stockcake.jpg", title: "Referee shows red" },
  comeback: { url: "https://images.stockcake.com/public/c/3/c/c3cfad13-c5b7-4907-8f58-654cf579b8f2_large/determination-before-dawn-stockcake.jpg", title: "Determination before dawn" },
  familycrisis: { url: "https://images.stockcake.com/public/d/c/1/dc184620-6793-440e-a9e0-9b172df5e5e8_large/solitude-at-night-stockcake.jpg", title: "Solitude at night" },

  // usadas fora do modal de LIFE_EVENTS — fotos-herói de 6 telas de carreira (js/ui.js)
  goat: { url: "https://images.stockcake.com/public/4/1/0/410f97ae-844c-4163-854d-22f7431871d8_large/victory-celebration-moment-stockcake.jpg", title: "Victory celebration moment (Bola de Ouro)" },
  retirement: { url: "https://images.stockcake.com/public/3/a/d/3ad56095-87a4-4d4c-a8d9-aca654c8815a_large/sunset-soccer-silhouette-stockcake.jpg", title: "Sunset soccer silhouette (aposentadoria)" },
  transfer: { url: "https://images.stockcake.com/public/7/5/1/7516c817-ccc2-464f-9ff8-5e7009a0e61d_large/sunset-traveler-s-silhouette-stockcake.jpg", title: "Sunset traveler's silhouette (mercado)" },
  award: { url: "https://images.stockcake.com/public/d/0/8/d0822437-a32e-4835-b361-09f35f2a2db5_large/trophy-under-spotlight-stockcake.jpg", title: "Trophy under spotlight (premiação)" },
  party: { url: "https://images.stockcake.com/public/f/7/b/f7bead3d-cc03-4d03-818f-4c17774d9490_large/hands-raised-high-stockcake.jpg", title: "Hands raised high (festa/título)" },
  training: { url: "https://images.stockcake.com/public/f/5/a/f5a2d6a4-a304-4e8e-ab09-f7a2c2525820_large/solitary-night-runner-stockcake.jpg", title: "Solitary night runner (centro de treinamento)" }
};

const CREDIT = `/* CRAQUE — fotos reais dos modais de eventos de vida + de 6 telas de carreira (Bola de
   Ouro, aposentadoria, mercado, premiação, título, centro de treinamento), embutidas
   como data-URI base64 (mesmo espírito de js/crests.js: busca externa só em tempo de
   setup via scripts/vendor-scene-photos.mjs, nunca em tempo de execução pro jogador).
   Fonte: StockCake (https://stockcake.com), banco de imagens de IA — uso gratuito e
   comercial livre, sem exigir atribuição (confirmado na própria página de busca do
   site). Substitui o conjunto anterior de ilustrações vetoriais da unDraw. Ver
   scripts/vendor-scene-photos.mjs pro mapeamento categoria -> URL original e notas de
   quais são substituições aproximadas (a busca do site não tem API, a curadoria foi
   manual). */
window.CQ = window.CQ || {};
`;

// recorte quadrado (encaixa o slot .modal2-scene) + compressão — cada foto de origem do
// StockCake vem grande (banco de imagens em alta resolução); 480x480 é mais que o
// suficiente pro tamanho exibido (128px de altura), qualidade 70 mantém o arquivo leve.
const SIZE = 480, QUALITY = 70;

const entries = [];
let totalSrcKB = 0;
for (const [key, info] of Object.entries(SCENES)) {
  const res = await fetch(info.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CRAQUE-vendor-script/1.0)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} baixando ${info.url} (categoria ${key})`);
  const buf = Buffer.from(await res.arrayBuffer());
  totalSrcKB += buf.length / 1024;
  const out = await sharp(buf)
    .resize(SIZE, SIZE, { fit: "cover" })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();
  const b64 = out.toString("base64");
  entries.push(`  // ${info.title}\n  ${key}: "data:image/jpeg;base64,${b64}"`);
  console.log(key + ": " + (buf.length / 1024).toFixed(0) + " KB origem -> " + (out.length / 1024).toFixed(1) + " KB embutido");
}

const js = CREDIT + `CQ.LIFE_IMGS = {\n${entries.join(",\n")}\n};\n`;
fs.writeFileSync(OUT, js, "utf8");
console.log("\nlife-scenes.js: " + (js.length / 1024).toFixed(0) + " KB total (" + Object.keys(SCENES).length + " fotos, " + totalSrcKB.toFixed(0) + " KB de origem antes da compressão)");
console.log("Lembrete: bump o ?v= de js/vendor/life-scenes.js em index.html depois de atualizar.");
