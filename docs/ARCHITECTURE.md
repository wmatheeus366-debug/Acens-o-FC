# ARCHITECTURE.md — CRAQUE

Aplicação web **estática vanilla** (sem framework), namespace global `window.CQ`.
Desenvolvimento com arquivos separados; distribuição num arquivo único `CRAQUE.html`.

## Mapa de módulos (ordem de carga)

| Arquivo | Namespace | Responsabilidade | Depende de |
|---|---|---|---|
| `js/util.js` | `CQ.util` | RNG por seed, formatação, sanitização, retratos/escudos/bandeiras SVG, ícones | — |
| `js/data.js` | `CQ.DATA` | Clubes, ligas, seleções, lendas, posições, elencos reais, recordes | util |
| `js/world.js` | `CQ.world` | Mundo persistente: identidade estável de NPCs nos 191 clubes, envelhecimento/aposentadoria ano a ano | util, DATA |
| `js/engine.js` | `CQ.engine` | Modelo, calendário, simulação, prêmios, mercado, técnico, traços, aposentadoria | util, DATA, world, (nar) |
| `js/market.js` | `CQ.market` | Mercado autônomo entre NPCs: clubes comprando/vendendo jogadores entre si a cada temporada | util, DATA, world, engine |
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
CQ.tests.run()             # tests/regression.js — 66 checagens

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
  191 elencos (`REAL_SQUADS`) uma identidade estável (`g.world.clubs[clubId].roster`) que
  envelhece de verdade uma vez por temporada (`advanceWorld`, chamado de `endSeason`) e se
  aposenta/repõe por promessa gerada quando idade/decadência justificar (mesmos limiares do
  próprio jogador). `squadOf`/`topAttackerName` leem daí, com fallback pro gerador antigo
  (save em migração, ou clube sem dado no mundo). Migração de save antigo é invisível: o
  mundo é semeado com a mesma chave de RNG que `squadOf` sempre usou, reproduzindo byte a
  byte o que a tela já mostrava um instante antes.
- ✅ **Fatia 2 (feita): mercado autônomo entre NPCs.** `js/market.js` (`CQ.market`) move
  jogadores entre clubes NPCs a cada temporada (`advanceMarket`, chamado de `endSeason` logo
  após `advanceWorld`), reaproveitando o raciocínio de "encaixe" de `makeOffers`. Mecânica
  "troca-e-repõe": origem ganha promessa gerada (id `_t`), destino perde o mais fraco na
  mesma posição — tamanho de elenco nunca muda, sem novo campo por NPC, sem mudança de
  esquema de save. Notícia no feed reaproveita o array `notes` já usado por
  `rival-transfer`/`rival-retire`, só para transferências grandes o bastante.
- ✅ **Fatia 3 (feita): tabelas reais das outras ligas.** `refreshWorldLeagues`
  (`js/engine.js`) reaproveita `leagueComp`/`finishLeague`/`tableOf`/`leagueZones` (o
  mesmo motor da liga do próprio jogador) pra simular, uma vez por temporada, uma tabela
  de pontos corridos real pras 7 ligas que o jogador não disputa (`D.LEAGUES` menos a
  própria). Guardado em `g.world.leagues[liga]`, sobrescrito a cada `endSeason` (sem
  histórico). Nova aba "Mundo" em Torneios (`js/ui.js`) reaproveita `leagueTableHTML`
  sem CSS novo. Independente do sorteio de campeão de `recordChampions` (`g.champs`) —
  os dois processos usam RNGs separados por design.
- ✅ **Fatia 4 (feita): olheiro de base.** Promessas notáveis (recém-geradas por
  aposentadoria em `world.js` ou transferência em `market.js`, rolagem próxima do teto
  da faixa e relevante pra liga do jogador) viram notícia no feed via o mesmo pipeline
  `notes`/`onSeasonEnd`. Nova aba "Base" na tela do Clube (`js/ui.js`) mostra os
  jogadores ≤20 anos do próprio elenco, reaproveitando `squadOf`. Sem stat de potencial
  nova nos NPCs, sem navegação por outros clubes — escopo confirmado com o usuário.
- **Fase "Mundo Real 2026" concluída** (Fatias 1-4). Próximas extensões ficam por conta
  de necessidades futuras, sem item pendente documentado nesta fase.

## Imersão — ritual de jogo, cerimônia de temporada, rivalidade, olheiro
Quatro melhorias independentes da fase acima (ver CHANGELOG para detalhe completo):
`matchdayBanner` (banner de dia de jogo na home, `js/ui.js`), cerimônia de balanço de
temporada em passos (`buildSummarySteps`/`summaryStepRender`/`summaryNextStep`,
`js/ui.js`), cobertura total de `D.CLUBS[id].rivals` + placar `g.clubRivalry` do
clássico de clube (`js/data.js`, `js/engine.js`, `js/ui.js`), e alerta de olheiro
europeu na notícia de promessa notável (`js/narrative.js`).

## Imersão parte 2 — Bola de Ouro, contadores animados, fala do técnico
`ballonScore` (`js/engine.js`) revisado pra dar chance real (ainda rara) a defensores/
goleiros de elite. `animateCount`/`animateBarWidth`/`runEntranceAnimations` (novos em
`js/ui.js`, com `CQ.state.lastSeen` guardando o "antes") animam patrimônio/fama/marcos.
`managerLine` (`js/ui.js`) dá uma fala curta e determinística ao técnico, por faixa de
confiança. Transição suave entre telas já existia desde o commit inicial
(`css/editorial.css`, `pageIn`).
- **Escudos/fotos:** já resolvido por fora desta fase — `CQ.DATA.CREST_MAP` (escudo real
  via API-Football, `media.api-sports.io`, uso pessoal) com fallback pro brasão vetorial
  (`crestSVG`) quando não mapeado ou se a imagem falhar. Ver `README.md` § Direitos de
  imagem pro contexto da decisão de usar escudo real.
- **Sync de dados:** o script real é `scripts/sync-squads.mjs` (API-Football, chave só em
  `.env`/build, nunca no frontend) — sincroniza nome/posição e os IDs de escudo. Cobertura
  atual: **191/191 clubes** com elenco/escudo real sincronizado (os 4 clubes da Série B
  adicionados depois — Náutico, Figueirense, Paraná Clube, Sampaio Corrêa — sincronizados
  à parte). Não existe (nem é necessário) um snapshot JSON versionado separado — os dados
  já vivem direto em `js/data.js` (`REAL_SQUADS`, `CREST_MAP`), reexecutar o script quando
  quiser atualizar (ex.: refletir a janela de transferências de 2026).

## Torneios de seleção com caminho visível — roteiro em fatias

- ✅ **Fatia 1 (feita): Copa do Mundo real de 48 seleções.** `D.WORLD_POOL` (`js/data.js`)
  foi de 22 pra 48 seleções. `buildWCGroups`/`pickWCAdvancers`/`finishAllWCGroups`/
  `resolveWC3rd` (`js/engine.js`) montam e resolvem os 12 grupos (todos simulados de
  verdade — mesmo motor de `refreshWorldLeagues`) e o mata-mata de 32 com disputa de 3º
  lugar, reaproveitando `cupComp`/`buildStageTies`/`simTie`/`advanceCup` (motor da Copa do
  Brasil, agora com `myId` parametrizável em vez de fixo em `g.player.clubId`). `S.sel`
  ganha `isFullSim:true` só na Copa do Mundo — Copa América/Eurocopa/Copa Ouro/Copa da
  Ásia continuam no formato anterior (`resolveSlot`/`buildNationalCycle` em `js/engine.js`
  bifurcam por `T.isFullSim`). Nova aba "Seleção" com seletor de grupo + chaveamento
  visível reaproveita `leagueTableHTML`/`cupHTML`/`tieHTML` de `js/ui.js` sem CSS novo.
- **Próximas fatias (escopo definido, plano detalhado fica pra quando chegar a vez):**
  eliminatórias com risco real de não classificar (hoje só decorativas); Copa América/
  Eurocopa/Copa Ouro/Copa da Ásia com todos os grupos simulados (mesmo motor da Fatia 1);
  conserto do chaveamento morto de Libertadores/Champions/Europa League/Sul-Americana
  (`C.koOpps` nunca é escrito, confirmado por revisão de código); tela de chaveamento do
  Supermundial (já tem estado, não tem tela); Conference League (competição nova, não
  existe em nenhum lugar do código hoje — precisa de planejamento próprio).
