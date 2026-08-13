/* CRAQUE — baixa/atualiza js/vendor/life-scenes.js (ilustrações reais dos modais de
   eventos de vida, embutidas como data-URI base64). Substitui as antigas silhuetas de
   tinta desenhadas à mão (js/util.js sceneHospital/sceneContract/...) — feedback direto
   do usuário: "as imagens... pega em algum repositório".

   Fonte: unDraw (https://undraw.co), por Katerina Limpitsouni. Licença unDraw: uso livre
   pra qualquer projeto, comercial ou pessoal, sem exigir atribuição nem custo — só não
   pode redistribuir os SVGs soltos como um pacote/serviço concorrente (não é o nosso
   caso: usamos 10 ilustrações específicas, embutidas dentro do próprio jogo).
   https://undraw.co/license

   As 10 categorias reaproveitam o mesmo agrupamento que LIFE_SCENE (js/util.js) já usava
   pras cenas antigas — cada uma cobre vários eventos de LIFE_EVENTS parecidos.

   Rodar de novo é seguro — sobrescreve o arquivo.

   Uso:  node scripts/vendor-life-scenes.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "js", "vendor", "life-scenes.js");

// categoria -> { slug, title } — título só pra comentário/rastreabilidade, não usado em runtime
const SCENES = {
  hospital: { slug: "medicine_hqqg", dir: "illustrations", title: "Medicine" },
  contract: { slug: "contract_ynau", dir: "illustration", title: "Contract" },
  mic: { slug: "interview_yz52", dir: "illustrations", title: "Interview" },
  couple: { slug: "couple_vg5l", dir: "illustrations", title: "Couple" },
  team: { slug: "team-work_i1f3", dir: "illustrations", title: "Team work" },
  social: { slug: "social-media-post_tg7l", dir: "illustration", title: "Social Media Post" },
  rest: { slug: "relaxing-at-home_qta9", dir: "illustration", title: "Relaxing at home" },
  formal: { slug: "party_k6eg", dir: "illustration", title: "Party" },
  youth: { slug: "junior-soccer_0lib", dir: "illustrations", title: "Junior soccer" },
  community: { slug: "fans_icv6", dir: "illustrations", title: "Fans" }
};

const CREDIT = `/* CRAQUE — ilustrações reais dos modais de eventos de vida, embutidas como data-URI
   base64 (mesmo espírito de js/crests.js/js/vendor/stadium-model.js: busca externa só em
   tempo de setup via scripts/vendor-life-scenes.mjs, nunca em tempo de execução pro
   jogador). 10 ilustrações da unDraw (https://undraw.co) por Katerina Limpitsouni, uso
   livre sem exigir atribuição (https://undraw.co/license). Ver scripts/vendor-life-
   scenes.mjs pro mapeamento categoria -> ilustração original. */
window.CQ = window.CQ || {};
`;

const entries = [];
for (const [key, info] of Object.entries(SCENES)) {
  const url = `https://cdn.undraw.co/${info.dir}/${info.slug}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} baixando ${url} (categoria ${key})`);
  const svg = await res.text();
  if (svg.indexOf("<svg") < 0) throw new Error(`resposta não parece um SVG válido (categoria ${key})`);
  if (svg.indexOf("</script") >= 0) throw new Error(`${key}.svg contém "</script" literal — quebraria scripts/build.mjs`);
  const b64 = Buffer.from(svg, "utf8").toString("base64");
  // comentário na linha ANTES do valor, nunca depois — um "//" no fim da linha comeria
  // a vírgula que entries.join(",\n") insere logo depois, quebrando a sintaxe.
  entries.push(`  // ${info.title} (${info.slug})\n  ${key}: "data:image/svg+xml;base64,${b64}"`);
  console.log(key + ": " + (svg.length / 1024).toFixed(1) + " KB (" + info.slug + ")");
}

const js = CREDIT + `CQ.LIFE_IMGS = {\n${entries.join(",\n")}\n};\n`;
fs.writeFileSync(OUT, js, "utf8");
console.log("\nlife-scenes.js: " + (js.length / 1024).toFixed(0) + " KB total");
console.log("Lembrete: bump o ?v= de js/vendor/life-scenes.js em index.html depois de atualizar.");
