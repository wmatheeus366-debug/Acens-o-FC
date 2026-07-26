# ARCHITECTURE.md — CRAQUE

Aplicação web **estática vanilla** (sem framework), namespace global `window.CQ`.
Desenvolvimento com arquivos separados; distribuição num arquivo único `CRAQUE.html`.

## Mapa de módulos (ordem de carga)

| Arquivo | Namespace | Responsabilidade | Depende de |
|---|---|---|---|
| `js/util.js` | `CQ.util` | RNG por seed, formatação, sanitização, retratos/escudos/bandeiras SVG, ícones | — |
| `js/data.js` | `CQ.DATA` | Clubes, ligas, seleções, lendas, posições, elencos reais, recordes | util |
| `js/world.js` | `CQ.world` | Mundo persistente: identidade estável de NPCs nos 187 clubes, envelhecimento/aposentadoria ano a ano | util, DATA |
| `js/engine.js` | `CQ.engine` | Modelo, calendário, simulação, prêmios, mercado, técnico, traços, aposentadoria | util, DATA, world, (nar) |
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
CQ.tests.run()             # tests/regression.js — 27 checagens

# balanceamento (Node, motor real num shim vm):
node scripts/balance-runner.mjs 100   # gera docs/BALANCE_BASELINE.md + .json
node scripts/world-check.mjs 20       # diagnóstico do mundo persistente (idade/reposição/tamanho)
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

## Mundo Real 2026 — status

- ✅ **Fatia 1 (feita): identidade persistente de NPCs.** `js/world.js` (`CQ.world`) dá aos
  187 elencos (`REAL_SQUADS`) uma identidade estável (`g.world.clubs[clubId].roster`) que
  envelhece de verdade uma vez por temporada (`advanceWorld`, chamado de `endSeason`) e se
  aposenta/repõe por promessa gerada quando idade/decadência justificar (mesmos limiares do
  próprio jogador). `squadOf`/`topAttackerName` leem daí, com fallback pro gerador antigo
  (save em migração, ou clube sem dado no mundo). Migração de save antigo é invisível: o
  mundo é semeado com a mesma chave de RNG que `squadOf` sempre usou, reproduzindo byte a
  byte o que a tela já mostrava um instante antes.
- **Próximo:** mercado de transferências entre NPCs (clubes comprando/vendendo jogadores
  entre si, usando `makeOffers`/`calcSalary` como referência), telas de mundo (tabelas/
  resultados de ligas que o jogador não disputa), olheiro de base / geração de promessas
  com mais destaque.
- **Escudos/fotos:** já resolvido por fora desta fase — `CQ.DATA.CREST_MAP` (escudo real
  via API-Football, `media.api-sports.io`, uso pessoal) com fallback pro brasão vetorial
  (`crestSVG`) quando não mapeado ou se a imagem falhar. Ver `README.md` § Direitos de
  imagem pro contexto da decisão de usar escudo real.
- **Sync de dados:** o script real é `scripts/sync-squads.mjs` (API-Football, chave só em
  `.env`/build, nunca no frontend) — sincroniza nome/posição pros 187 elencos e os IDs de
  escudo. Não existe (nem é necessário) um snapshot JSON versionado separado — os dados já
  vivem direto em `js/data.js` (`REAL_SQUADS`, `CREST_MAP`), reexecutar o script quando
  quiser atualizar.
