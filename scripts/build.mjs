// CRAQUE — build do arquivo único CRAQUE.html
// Lê css/*.css e js/*.js (na ordem declarada no index.html) e gera um HTML
// autossuficiente (CSS + JS inline). Saída estática, sem dependências de arquivo.
//
// Uso:  node scripts/build.mjs
//
// Fontes (Google Fonts) e bandeiras (flagcdn) continuam vindo da web com fallback.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

// ordem dos scripts extraída do index.html (fonte única da verdade)
const index = read("index.html");
const jsFiles = [...index.matchAll(/<script src="(js\/[^"?]+)(?:\?[^"]*)?"><\/script>/g)].map((m) => m[1]);
const cssFiles = [...index.matchAll(/<link rel="stylesheet" href="(css\/[^"?]+)(?:\?[^"]*)?">/g)].map((m) => m[1]);
if (!jsFiles.length || !cssFiles.length) {
  console.error("Não consegui extrair a lista de scripts/estilos do index.html");
  process.exit(1);
}

const css = cssFiles.map((f) => "/* ===== " + f + " ===== */\n" + read(f)).join("\n");
const js = jsFiles.map((f) => "/* ===== " + f + " ===== */\n" + read(f)).join("\n");

// guarda: nenhuma string JS pode conter </script> (quebraria o parser HTML)
if (js.indexOf("</script") >= 0) {
  console.error("ERRO: encontrado '</script' no JS — quebraria o bundle inline.");
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CRAQUE — Modo Carreira</title>
<meta name="description" content="Simulador de carreira de jogador de futebol brasileiro. Da base à Seleção, partida a partida.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 fill=%27%23f4efe2%27/%3E%3Ctext x=%2716%27 y=%2724%27 text-anchor=%27middle%27 font-family=%27Georgia%27 font-style=%27italic%27 font-weight=%27900%27 font-size=%2724%27 fill=%27%23bf3711%27%3EC%3C/text%3E%3C/svg%3E">
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#bf3711">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,900;1,600;1,900&family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<script>
// Registro do service worker (Workbox, gerado por scripts/build-sw.mjs) — habilita
// instalar/jogar offline. Só funciona quando servido por http(s) (ex.: GitHub Pages);
// em file:// ou se sw.js não estiver ao lado deste HTML, o navegador nem tenta ou a
// Promise rejeita — sempre silencioso, nunca deve travar o jogo.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () { });
  });
}
</script>
<script>
${js}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(root, "CRAQUE.html"), html, "utf8");
console.log(
  "CRAQUE.html gerado: " + (html.length / 1024).toFixed(0) + " KB" +
  " · " + cssFiles.length + " css + " + jsFiles.length + " js" +
  " · self-contained (0 links de css externos)"
);
