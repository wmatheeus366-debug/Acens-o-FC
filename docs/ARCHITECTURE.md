# ARCHITECTURE.md — CRAQUE

Aplicação web **estática vanilla** (sem framework), namespace global `window.CQ`.
Desenvolvimento com arquivos separados; distribuição num arquivo único `CRAQUE.html`.

## Mapa de módulos (ordem de carga)

| Arquivo | Namespace | Responsabilidade | Depende de |
|---|---|---|---|
| `js/util.js` | `CQ.util` | RNG por seed, formatação, sanitização, retratos/escudos/bandeiras SVG, ícones | — |
| `js/data.js` | `CQ.DATA` | Clubes, ligas, seleções, lendas, posições, elencos reais, recordes | util |
| `js/engine.js` | `CQ.engine` | Modelo, calendário, simulação, prêmios, mercado, técnico, traços, aposentadoria | util, DATA, (nar) |
| `js/narrative.js` | `CQ.nar` | Feed, entrevistas, eventos de vida, enquetes, rival | util, DATA, engine |
| `js/live.js` | `CQ.live` | Partidas ao vivo: cronologia, decisões, pênaltis lance a lance | util, engine |
| `js/ui.js` | `CQ.ui` | Todas as telas, overlays, render | util, DATA, engine, nar, live, save |
| `js/save.js` | `CQ.save` | Persistência: esquema, migração, validação, localStorage, export/import | util, engine, ui |
| `js/main.js` | `CQ.main`, `CQ.state` | Bootstrap, estado global, tema (claro/escuro) | save, ui |

`CQ.main` reexporta `CQ.save` (compatibilidade com todas as chamadas `CQ.main.*`).

> Correspondência com o layout `src/` do Adendo: `js/util`→`src/js/util`,
> `js/data`→`src/js/data`, `js/engine`→`src/js/engine`, `js/narrative`→`src/js/narrative`,
> `js/ui`→`src/js/ui`, `js/save`→`src/js/save`, `css/`→`src/styles`, `tests/`→`tests/`.
> A **estrutura lógica já corresponde ao spec**; a relocação física de pastas foi
> deliberadamente adiada por ser churn sem ganho funcional e com risco de quebrar caminhos
> (`?v=`, referências no build). Pode ser feita depois num passo isolado.

## Build

```
node scripts/build.mjs      # gera CRAQUE.html (CSS+JS inline, autossuficiente)
```
O build lê a **ordem dos scripts/estilos do próprio `index.html`** (fonte única da verdade),
concatena, valida que nenhuma string JS contém `</script>` e grava `CRAQUE.html`.
`CRAQUE.original.html` é o backup imutável da versão de referência.

Fontes (Google Fonts) e bandeiras (flagcdn) vêm da web com fallback; todo o resto
(escudos, retratos, lógica) está embutido.

## Testes

```
# no navegador (index.html ou CRAQUE.html aberto), console:
CQ.tests.run()             # tests/regression.js — 22 checagens

# balanceamento (Node, motor real num shim vm):
node scripts/balance-runner.mjs 100   # gera docs/BALANCE_BASELINE.md + .json
```

## Estado e persistência
- Estado de sessão: `CQ.state` (game, screen, abas ativas, overlays).
- Save único em `localStorage["craque-save-v1"]`, `schemaVersion` versionado.
- `CQ.save.validateAndMigrate` é o **único ponto de entrada** de saves (load e import),
  garantindo mesma validação + migração idempotente. Migrações futuras: encadear por
  `schemaVersion` dentro de `migrate()`.

## Determinismo
- RNG derivado da seed (`CQ.util.rngFor`) em `resolveMatch` (`"match"`), `applyMatch`
  (`"post"`) e `spendXP` (`"xp"`). Mesmo estado + mesmas ações ⇒ mesmo resultado.
- Pendente: decisões interativas do modo ao vivo.

## Pontos de extensão para o Mundo Real 2026 (fase seguinte)
- **Dados:** `js/data.js` (`REAL_SQUADS`) tem consumidor único (`ui.js › squadOf`).
  Introduzir `CQ.world` (snapshot + modelo de jogador estruturado) e fazer `squadOf` ler
  dele, com fallback para geração — sem tocar no gameplay principal.
- **Provider/sync:** `scripts/sync-football-data.mjs` (Node, chave por env var no build)
  → `src/data/snapshots/world-YYYY-MM-DD.json`. Nunca no frontend.
- **Escudos/fotos:** manter `generatedCrest` como fallback; `officialLogoUrl`/
  `cachedLogoPath`/`brandingMode` só com permissão explícita.
