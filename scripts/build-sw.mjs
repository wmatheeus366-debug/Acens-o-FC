/* CRAQUE — gera o service worker (Workbox) que habilita instalar/jogar offline.
   ÚNICO ponto do projeto que quebra a regra de "tudo cabe num CRAQUE.html só" — service
   worker é uma exigência técnica do navegador (precisa ser um arquivo de verdade,
   buscável por URL própria, não dá pra inline num <script> comum) — decisão já
   confirmada com o usuário antes de começar esta fatia.

   `inlineWorkboxRuntime: true` embute o runtime do Workbox dentro do próprio sw.js
   gerado — sem isso, o padrão do workbox-build é um `importScripts` de um CDN do
   Google em tempo de execução, o que quebraria a filosofia "zero rede em tempo de
   jogo" que o projeto inteiro segue (vendorização, nunca CDN ao vivo).

   Precache: só CRAQUE.html (o build final já é 100% autocontido — nenhum outro
   arquivo local é necessário pra jogar). Runtime cache: a folha de estilo + os
   arquivos de fonte do Google Fonts (única dependência de rede que o próprio
   index.html/CRAQUE.html ainda tem) — CacheFirst, pra funcionar offline depois da
   1ª visita.

   Uso:  node scripts/build-sw.mjs   (rodar DEPOIS de scripts/build.mjs — precisa do
   CRAQUE.html já gerado pra calcular o hash de precache)
   Saída: sw.js (raiz do projeto, ao lado de CRAQUE.html) */
import { generateSW } from "workbox-build";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  if (!fs.existsSync(path.join(ROOT, "CRAQUE.html"))) {
    throw new Error("CRAQUE.html não existe — rode node scripts/build.mjs primeiro");
  }
  const { count, size, warnings } = await generateSW({
    globDirectory: ROOT,
    globPatterns: ["CRAQUE.html", "manifest.json", "icons/*.png"],
    swDest: path.join(ROOT, "sw.js"),
    inlineWorkboxRuntime: true,
    mode: "production",
    sourcemap: false,
    skipWaiting: true,
    clientsClaim: true,
    // CRAQUE.html já passa dos 2MB padrão do Workbox (build embute áudio/imagens/libs
    // vendorizadas em base64) — sem isso o arquivo principal fica de fora do precache
    // SEM avisar de forma óbvia (só um warning na saída do build), e o offline não
    // funcionaria de verdade. 16MB dá folga generosa pro crescimento natural do bundle.
    maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "craque-google-fonts-stylesheets" }
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
        handler: "CacheFirst",
        options: {
          cacheName: "craque-google-fonts-webfonts",
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 }
        }
      }
    ]
  });
  warnings.forEach(function (w) { console.warn("aviso:", w); });
  console.log(`sw.js gerado: ${count} arquivo(s) precacheados, ${(size / 1024).toFixed(0)} KB`);
}

main().catch(function (e) { console.error(e); process.exit(1); });
