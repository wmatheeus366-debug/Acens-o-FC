# ARCHITECTURE.md — CRAQUE

Aplicação web **estática vanilla** (sem framework), namespace global `window.CQ`.
Desenvolvimento com arquivos separados; distribuição num arquivo único `CRAQUE.html`.

## Mapa de módulos (ordem de carga)

| Arquivo | Namespace | Responsabilidade | Depende de |
|---|---|---|---|
| `js/util.js` | `CQ.util` | RNG por seed, formatação, sanitização, retratos/escudos/bandeiras SVG, ícones | — |
| `js/data.js` | `CQ.DATA` | Clubes, ligas, seleções, lendas, posições, elencos reais, recordes | util |
| `js/comp-logos.js` | `CQ.COMP_LOGOS` | Logos reais de competição (25 de 28 códigos — ver `COMP_LOGO_MAP` em `js/data.js`), embutidos como data-URI base64 — refetch via `scripts/embed-comp-logos.mjs` | — |
| `js/birthdates.js` | `CQ.BIRTHDATES` | Data de nascimento REAL de jogadores de `REAL_SQUADS` (gerado, cresce aos poucos — `scripts/sync-ages.mjs`) | — |
| `js/world.js` | `CQ.world` | Mundo persistente: identidade estável de NPCs nos 191 clubes, envelhecimento/aposentadoria ano a ano | util, DATA, (BIRTHDATES) |
| `js/pitch.js` | `CQ.pitch` | Formação (11 posições), desenho do campo 2D (`buildPitchSVG`), escolha de cor de sprite por clube (`pickTeamSprites`/`rankedSpriteColors`) e tradução evento→pose visual (`poseFor`/`poseForKick`) — renderizador **e** consumido pela UI (voltou a ser o modo Ao Vivo padrão, ver nota abaixo) | util, DATA, PLAYER_SPRITES |
| `js/vendor/player-sprites.js` | `CQ.PLAYER_SPRITES` | 4 cores de sprite de jogador (Kenney Sports Pack, CC0) + 1 bola, embutidos como data-URI base64 — refetch via `scripts/vendor-player-sprites.mjs` | — |
| `js/vendor/life-scenes.js` | `CQ.LIFE_IMGS` | 10 ilustrações reais (unDraw) dos modais de eventos de vida, embutidas como data-URI base64 — refetch via `scripts/vendor-life-scenes.mjs` | — |
| `js/vendor/stadium-photo.js` | `CQ.STADIUM_PHOTO` | Foto real de estádio (Wikimedia Commons, CC BY-SA 3.0), embutida como data-URI base64 — pano de fundo do cabeçalho do modo Ao Vivo, refetch via `scripts/vendor-stadium-photo.mjs` | — |
| `js/engine.js` | `CQ.engine` | Modelo, calendário, simulação, prêmios, mercado, técnico, traços, aposentadoria | util, DATA, world, (nar) |
| `js/market.js` | `CQ.market` | Mercado autônomo entre NPCs: clubes comprando/vendendo jogadores entre si a cada temporada | util, DATA, world, engine |
| `js/narrative.js` | `CQ.nar` | Feed, entrevistas, eventos de vida, enquetes, rival | util, DATA, engine |
| `js/vendor/footballsim.js` | `window.CQ_FOOTBALLSIM_SRC` | Bundle IIFE do motor real de simulação **eozgit/footballsim** (MIT), guardado como STRING (não executado no carregamento) — só roda dentro do Worker do modo Ao Vivo. Refetch via `scripts/vendor-footballsim.mjs` | — |
| `js/vendor/football2d.js` | `CQ.CQ_FOOTBALL2D` | Bundle IIFE de `drawField`/dimensões da **cyntler/football2d** (MIT) — só o desenho do campo, sem jogador (a lib não desenha nenhum). Refetch via `scripts/vendor-football2d.mjs` | — |
| `js/live-sim.js` | `CQ.liveSim` | Adaptador: monta `Team`/`Player` do footballsim a partir do elenco persistido (`buildTeams`), roda a simulação real num Web Worker (`runAsync`, nunca rejeita — `null` em qualquer falha), traduz o resultado pro mesmo formato de `resolveMatch` (`translate`) | util, DATA, pitch, vendor/footballsim |
| `js/live.js` | `CQ.live` | Partidas ao vivo: cronologia, decisões, pênaltis lance a lance — tenta `CQ.liveSim` primeiro (só quando o jogador assiste ao vivo), fallback estatístico idêntico ao de sempre quando indisponível | util, engine, liveSim |
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
CQ.tests.run()             # tests/regression.js — ~215 checagens

# idade real dos elencos (resumível — roda até bater na cota diária, ~100 req/dia):
node scripts/sync-ages.mjs [teto de chamadas ao vivo, padrão 90]

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
- **Escudos:** os 191 escudos reais vivem **embutidos** em `js/crests.js`
  (`CQ.CRESTS[clubId]` → `data:image/webp;base64,...`, 64px, gerado por
  `scripts/embed-crests.mjs`). Sem rede: nenhum bloqueador de anúncio alcança e funciona
  offline. `crestSVG` (`js/util.js`) tem 3 níveis de reserva, nessa ordem: embutido →
  imagem do CDN (`CQ.DATA.CREST_MAP` + `media.api-sports.io`) → brasão vetorial
  procedural. Mais uma varredura pós-render (`sweepCrests`, `js/ui.js`) que troca pelo
  vetorial qualquer escudo que não tenha aparecido de fato — pega o que `onerror`/`onload`
  não alcançam (filtro cosmético de bloqueador, requisição pendurada). Ver `README.md`
  § Direitos de imagem pro contexto da decisão de usar escudo real.
- **Sync de dados:** o script real é `scripts/sync-squads.mjs` (API-Football, chave só em
  `.env`/build, nunca no frontend) — sincroniza nome/posição e os IDs de escudo. Cobertura
  atual: **191/191 clubes** com elenco/escudo real sincronizado (os 4 clubes da Série B
  adicionados depois — Náutico, Figueirense, Paraná Clube, Sampaio Corrêa — sincronizados
  à parte). Não existe (nem é necessário) um snapshot JSON versionado separado — os dados
  já vivem direto em `js/data.js` (`REAL_SQUADS`, `CREST_MAP`), reexecutar o script quando
  quiser atualizar (ex.: refletir a janela de transferências de 2026). Depois de mexer em
  `CREST_MAP`, rode também `node scripts/embed-crests.mjs` pra regerar `js/crests.js`
  (precisa de `npm install --no-save sharp`; o cache em `scripts/.cache/crests/` faz
  rerodadas custarem só os escudos novos).

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
- ✅ **Conserto do chaveamento morto de Libertadores/Champions/Europa League/Sul-Americana
  (feito).** `C.koOpps`/`C.koTeams`/`bracketOpp` (nunca escrevia dado nenhum, tela vazia)
  substituídos pelo mesmo `cupComp`/`buildStageTies`/`simTie`/`advanceCup` da Fatia 1 —
  campo fixo de 16 clubes montado assim que o jogador se classifica do grupo, `C.bracket`
  guarda o histórico completo de toda rodada (não só o caminho do jogador). `contiHTML`
  (`js/ui.js`) troca a renderização quebrada por `cupHTML(C.bracket)`, reaproveitado sem
  mudança nenhuma.
- ✅ **Fatia 2 (feita): eliminatórias com risco real.** `g.player.natTeam.qualified`
  (`js/engine.js`) é avaliado em `endSeason` a partir de `S.sel.record` (3 pts vitória/1
  empate, 8 jogos, `QUALIFY_THRESHOLD=12`) — antes esse dado era escrito e nunca lido em
  lugar nenhum. Não classificado pula o torneio inteiro daquele ciclo
  (`S.sel={kind:"notqualified",name}`, sem nenhum jogo de seleção na fila). Notícia no feed
  (`js/narrative.js`) nos dois sentidos (classificou/não classificou).
- ✅ **Fatia 3 (feita): Copa América/Eurocopa/Copa Ouro/Copa da Ásia com formato real.**
  `buildWCGroups`/`pickWCAdvancers`/`finishAllWCGroups` da Fatia 1 generalizados pra
  `buildTourGroups`/`pickTourAdvancers`/`finishAllTourGroups`, parametrizados por
  `TOUR_CONF` (tamanho de grupo/melhores terceiros/estágios do mata-mata, por competição —
  exportado em `CQ.engine.TOUR_CONF`). `CONFED_POOL` (`js/data.js`) cresceu pro tamanho
  real de cada torneio: UEFA 12→24, CONCACAF 8→16, AFC 8→24 (CONMEBOL fica em 10, já são
  todos os membros reais — a Copa América "empresta" 6 seleções da CONCACAF pra fechar 16,
  mesma solução do torneio real). Formatos batem com a realidade: Copa América 16/4
  grupos/sem terceiros; Eurocopa 24/6 grupos/4 melhores terceiros (formato real de 2024);
  Copa Ouro 16/4 grupos; Copa da Ásia 24/6 grupos/4 melhores terceiros (formato real de
  2023). `selWCHTML` generalizado pra `selTourHTML` (sem texto/números fixos de Copa do
  Mundo). **Bug real encontrado e corrigido no processo:** o banner "CAMPEÃO!" aparecia
  toda vez que `T.champion` existia, mesmo quando quem venceu foi outra seleção — corrigido
  pra só comemorar quando `T.champion === nat.name`.
- ✅ **Fatia 4 (feita): chaveamento real do Supermundial + tela nova.** Mesmo conserto do
  Conti: `S.super.bracket` via `cupComp`/`advanceCup` em vez de `bracketOpp`/`koTeams`.
  Nova aba "Supermundial" em `compsHTML` (`js/ui.js`, fica direto em `g.season`, mesmo
  padrão de `S.sel`) + `superHTML` novo reaproveitando `cupHTML` sem CSS novo. Mesmo bug do
  banner de campeão corrigido aqui também.
- ✅ **Mata-mata continental de ida e volta (feito).** `cupComp` (`js/engine.js`) ganhou um
  parâmetro `twoLeg`: cada estágio passa a carregar `legs` (1 ou 2), e a FINAL é sempre 1.
  Sem o parâmetro tudo nasce com 1 — as demais copas seguem intactas e saves antigos não
  precisam de migração. O tie ganhou `legs: [[golsA,golsB],[golsA,golsB]]` e `sa`/`sb`
  passaram a ser o **agregado**, então `advanceCup`/`cupHTML`/lógica de campeão continuam
  lendo os mesmos campos. `decideTie` centraliza o desempate (agregado → pênaltis) pros
  caminhos simulado (`simTie`) e jogado (`fillTie`). Novo `CQ.engine.tieDrawn(fx,res)`
  soma o agregado e é usado **tanto pelo motor quanto por `js/live.js`**, pra pênaltis
  nunca divergirem entre simulação e modo ao vivo. `fx.decides === false` marca a ida
  (empate não vai a pênaltis, confronto não é decidido); `fx.knock` segue significando
  "é jogo de mata-mata". O calendário passou de 4 pra 7 slots continentais.
- ✅ **Modo ao vivo por escolha (feito).** `startLive` (`js/ui.js`) centraliza a entrada no
  modo ao vivo (com o aviso de primeira vez) e serve tanto ao caminho automático das
  finais quanto ao botão "Ao vivo" novo, que aparece em qualquer partida `fx.knock` não
  decisiva. `buildLive` (`js/live.js`) já era agnóstica ao tipo de partida — não precisou
  de nenhuma mudança além da regra de pênaltis por agregado.
- ✅ **Fatia 5 (feita): Conference League (UECL).** Extensão mecânica da cascata de
  qualificação europeia em `buildEuroSeason` (`js/engine.js`): `qual<=4→UCL`, `qual<=6→UEL`,
  `qual<=8→UECL` (mesma regra real da UEFA — quem passa perto da Europa League mas não
  entra nela). Reaproveita 100% o motor do Conti já consertado (`cupComp`/`advanceCup`/
  `contiHTML`) — só precisou de threshold de força mais baixo (`str>=70`) e dos dicionários
  de rótulo/cor/troféu em `js/ui.js`.

## Achados dos agentes de revisão (funcional/código/UX) — correções aplicadas
Além dos itens pequenos já corrigidos (ver CHANGELOG), os itens de UX maiores também
foram endereçados: fade nas bordas do `.subtabs` (`css/style.css`) indicando rolagem
horizontal; aviso único (`p.seenLiveIntro`, `js/engine.js`/`js/save.js`) explicando o modo
"ao vivo" na primeira partida decisiva; remoção da "Forma recente" redundante do Dossiê da
Home (o Ticker já cobre isso, com mais detalhe); dicas de consequência (idade/pé) no passo
0 da criação de personagem. Único item que segue como próxima fatia: eliminatórias com
risco real.

## Disciplina por competição, lesão, eventos aleatórios e coletiva de imprensa (feito)
Ver BUG-07 no CHANGELOG para o bug original (suspensão vazando entre competições).
- **`p.disc`** (`js/engine.js`) substitui os antigos `p.susp`/`p.yellows` globais por um
  mapa por grupo de competição, via nova `discGroup(fx)` — `LIGA`/`EST`/`CDB`/`MUN`/
  `SUPER` isolados, `LIB`/`SUL`/`UCL`/`UEL`/`UECL` unificados sob `CONTI` (só uma
  competição continental por temporada). `resolveMatch`, `applyMatch` e os avisos de
  suspensão em `js/ui.js` (Home + escalação provável) leem/escrevem no grupo do fixture
  atual, nunca num contador global. Migração aditiva em `save.js`.
- **Lesão**: `pInj` em `applyMatch` (`js/engine.js`) reduzido em ~40% (base e penalidades
  por condição). Aviso passou a ser imediato: `afterMatchInterview` (`js/ui.js`) dispara
  um toast na hora, além do já existente post no feed.
- **Eventos aleatórios em qualquer partida**: `MATCH_NOTES` (`js/narrative.js`), sorteado
  dentro de `onMatch` — o hook que já roda exatamente 1x por partida (simulada ou ao
  vivo). `flavorPool` (`js/live.js`) ganhou mais textos e passou a valer em qualquer
  mata-mata (`fixture.knock`), não só decisivo. 3 novos `LIFE_EVENTS`.
- **Coletiva de imprensa**: `maybePressConference` (`js/narrative.js`) — 3 perguntas
  (vida/temporada/carreira) sem repetir até esgotar o pool, dispara em jogo decisivo e
  substitui a entrevista de 1 pergunta desse jogo. Tela nova em `js/ui.js`
  (`showPressConference`/`pressStepRender`/`pickPress`) segue o mesmo padrão de "um passo
  por vez" do balanço de temporada, reaproveitando `applyInterview` já existente para
  aplicar o efeito de cada resposta.

## Campo 2D animado no modo Ao Vivo (feito, voltou a ser o padrão — ver nota)
Visualização estilizada, não um replay físico — reage aos mesmos eventos abstratos que
`js/live.js` já gera, sincronizada 1:1 com o clique-a-clique existente (sem timer, sem
física nova). Novo `js/pitch.js` (`CQ.pitch`), lógica pura sem tocar DOM: `FORMATION`
(11 posições, mesma contagem de `probableLineup`), `buildPitchSVG` (22 marcadores +
bola) e `poseFor`/`poseForKick` (evento → posição/destaque/ícone). Uniformes usam as
mesmas cores/padrão (`c1`/`c2`/`pat`) que o brasão vetorial já usava — `patternFillFor`
foi extraído de `crestSVGProcedural` (`js/util.js`) pra virar a base tanto do brasão
quanto da nova `jerseySVG`.

> **Atualização (revertida):** `buildPitchSVG` foi substituído pelo campo 3D
> (`js/pitch3d.js`, three.js) por uma sessão. Usuário testou e achou "bem engessado e
> ruim" (câmera parada, estádio vazio) e pediu pra voltar pro 2D — `js/pitch3d.js` e os
> 4 arquivos vendorizados de three.js/GLTFLoader/modelo do estádio foram **removidos do
> repositório** (não só desconectados), `js/ui.js` voltou a chamar `buildPitchSVG`
> diretamente. `FORMATION`/`poseFor`/`poseForKick` nunca mudaram — só o renderizador foi
> e voltou. Bundle: `2137 KB → 1242 KB` só com a remoção do 3D (ver seção "Imagens reais"
> abaixo pro que veio depois, subindo de novo pra `~1640 KB`).

> **Atualização 2 (marcador virou sprite):** o `jerseySVG`/`patternFillFor` original
> tinha um bug real — o tile do `<pattern>` de listra/sash é maior que o próprio
> marcador do campo, então o padrão colapsava pra cor sólida, e clubes com `c1` verde
> (ex. Guarani) ficavam ilegíveis em cima do gramado. `buildPitchSVG` passou a usar
> `CQ.PLAYER_SPRITES` (Kenney, CC0) em vez do círculo colorido — ver
> "Marcadores do campo 2D viram sprite real" mais abaixo pro detalhe completo.
> `jerseySVG`/`patternFillFor` continuam intactos e servindo o brasão do clube (onde o
> tile de 40 unidades sempre coube certo) — viram só o fallback do marcador do campo se
> `CQ.PLAYER_SPRITES` não carregar.

## Lista grande de imersão/UX — Fatia 1 (feito) + roteiro futuro

Investigação (3 agentes Explore) sobre uma lista grande de pedidos confirmou que o bug
de idade/overall dos elencos reais é **estrutural**: `REAL_SQUADS` (`js/data.js`) nunca
teve idade real em nenhum momento (só `{posição, nome}` por jogador), então a fórmula
antiga (`U.ri(18,35,rng)` uniforme) dava a mesma chance a um garoto de 18 e a um
veterano badalado de 35. `CQ.world.rollAge`/`rollOvr` (`js/world.js`, exportados,
reaproveitados por `squadOf` em `js/ui.js` — elimina a duplicação da fórmula) mitigam
isso com uma distribuição pesada pro auge da carreira; idade real de verdade exigiria
coletar data de nascimento de ~2420 jogadores, fica pro roteiro futuro (item 1 abaixo).

Demais itens desta fatia: pênaltis sem spoiler (`dots()`, `js/ui.js`); botão "Ao vivo"
absorvido pelo botão principal de jogar em qualquer mata-mata (`actionPlay`, `js/ui.js`);
criação de personagem só lista clubes com força ≤79 (`startClubPool`, `js/ui.js`) —
clubes grandes continuam alcançáveis via o sistema de ofertas já existente; badge
Titular/Banco/Fora da lista na Home usando `benchRoll` (exportado de `CQ.engine`) com
uma "espiada" segura de RNG (mesma seed+chaves da resolução real, sem compartilhar
posição); `recordChampions` generalizado pras 5 competições continentais (LIB/SUL/UCL/
UEL/UECL, antes só LIB/UCL entravam no histórico) + MUN/SUPER registrados nos anos em
que de fato aconteceram na carreira (bug real corrigido: `S.mundial.champion` nunca era
preenchido numa derrota); banner de título com ordinal (BICAMPEÃO...PENTACAMPEÃO) via
`winTitle`/`g.season.lastTitle.nth` (`js/engine.js`), lido tanto por
`showTitleCelebration` quanto pelo passo de balanço de temporada (`js/ui.js`).

**Roteiro futuro (fora desta fatia, ordem sugerida):**
1. 🔄 **Idade real via API-Football (em andamento).** `scripts/sync-ages.mjs` +
   `js/birthdates.js` (`CQ.BIRTHDATES`) já shippados e funcionando — ver seção própria
   abaixo. 8/129 clubes sincronizados até agora (parou sozinho na cota diária de 100
   requisições); continuar rodando `node scripts/sync-ages.mjs` em dias seguintes até
   cobrir os 129.
2. ✅ **Campo Ao Vivo com bonecos 3D de verdade (feito, Fatia 1).** Ver seção própria
   abaixo. Padrão de uniforme/animação mais realista/torcida modelada ficam pra fatias
   futuras (não desenhadas).
3. ✅ **Sistema de empréstimo (feito).** Ver seção própria abaixo.
4. ✅ **Voltar a ex-clube depois dos 31 (feito).** Ver seção própria abaixo.
5. ✅ **Linha do tempo de marcos da carreira (feito).** Ver seção própria abaixo.
6. ✅ **Sistema de ídolo em camadas (feito).** Ver seção própria abaixo.
7. ✅ **Salvar carreira pra sempre ao aposentar ("hall da fama") — feito.** Ver seção
   própria abaixo.
8. ✅ **Redes sociais reagindo de verdade a resultado/decisão — feito.** Ver seção
   própria abaixo.
9. ✅ **Layout: painéis laterais nos modais grandes — feito.** Ver seção própria abaixo.
10. ✅ **Avatar editorial/silhueta — feito.** Ver seção própria abaixo.
11. ✅ **Calendário por mês + filtro por competição — feito.** Ver seção própria abaixo.
12. ✅ **Estados vazios mais interessantes — feito (passe modesto).** Copy mais
    característica em 2 pontos (prêmios individuais, aba Base) — não uma varredura
    exaustiva de toda tela sem conteúdo do jogo.
13. ✅ **Comparação com jogadores da mesma idade — feito.** Ver seção própria abaixo.
14. ✅ **Potencial + pontos de evolução pra distribuir em atributos — feito.** Ver
    seção própria abaixo. Última pendência real do roteiro.

## Idade real dos elencos via API-Football (item 1, em andamento)

`REAL_SQUADS` (`js/data.js`) nunca teve idade — só `{posição, nome}` — então o `rollAge`
da fatia anterior mitigava, mas não resolvia. `D.CREST_MAP` já tinha o ID de time da
API-Football pros 191 clubes (mesmo ID que os escudos embutidos usam), o que eliminou a
etapa de descobrir IDs.

- **`scripts/sync-ages.mjs`** (novo, resumível, mesmo padrão de `sync-squads.mjs`): lê
  `.env`/`API_FOOTBALL_KEY`, itera `REAL_SQUADS` (20 curados à mão primeiro), busca
  `/players?team=X&season=2024` por clube, casa nome curado ↔ nome completo da API de
  forma tolerante a acento/abreviação mas **conservadora** (só aceita correspondência
  inequívoca — 1 candidato só; ambiguidade vira log "revisar depois", nunca palpite),
  cacheia por clube em `scripts/.cache/ages/` (gitignored), gera/faz merge em
  `js/birthdates.js`. Teto de segurança configurável por execução (padrão 90 chamadas
  ao vivo) — plano Free tem 100/dia.
- **2 armadilhas reais da API, descobertas rodando de verdade e já corrigidas no
  script**: plano Free nunca aceita pedir a página 4 de `/players` (erro
  `"Free plans are limited to a maximum value of 3"`) — script agora nunca pede além da
  3ª e nunca descarta as páginas já coletadas quando isso acontece; e o limite por
  minuto (não só o diário) precisa de pausa também **entre clubes diferentes**, não só
  entre páginas do mesmo clube.
- **`js/birthdates.js`** (`CQ.BIRTHDATES = { clubId: { "Nome": "AAAA-MM-DD" } }`) —
  aditivo, cresce a cada execução, nunca obrigatório. `initClubRoster` (`js/world.js`) e
  `squadOf` (`js/ui.js`, fallback) usam a idade real quando disponível, senão caem no
  `rollAge` de sempre — `rollAge` é sempre chamado independente disso (consome RNG do
  mesmo jeito), então preencher o mapa aos poucos nunca reembaralha o overall de outros
  jogadores do mesmo elenco.
- **Status**: 8/129 clubes sincronizados (Flamengo, Palmeiras, Corinthians, São Paulo,
  Fluminense, Barcelona, PSG, Inter de Milão), 84 jogadores com idade real — parou
  sozinho ao bater na cota diária (confirmado pela própria API). Rodar
  `node scripts/sync-ages.mjs` em dias seguintes continua de onde parou, sem perder
  progresso.

## Sistema de empréstimo (item 3, feito)

Gatilho novo dentro de `endSeason` (`js/engine.js`), mutuamente exclusivo dos 3 gatilhos
de mercado já existentes (contrato acabou/dispensado/pediu pra sair): jogador com menos
de 30 anos, não é a estrela do time, e passou boa parte da temporada fora
(`benchedRatio = 1 - p.stats.j/S.played >= 0.45`, limiar calibrado por simulação —
mesmo um jogador claramente fraco pro clube raramente passa de ~55% por causa de como
`benchRoll` já dá chance de entrar do banco).

`makeLoanOffer`/`acceptLoanOffer` (`js/engine.js`) são variantes de `makeOffers`/
`acceptOffer` — 1 destino só (o clube negocia, não é vitrine), sempre com papel de
titular. Novo `p.loan = {fromClubId, fromClubName, toClubId, returnYear}` guarda o
clube de origem (nada guardava isso antes — `acceptOffer` normal sobrescreve `p.clubId`
sem deixar rastro). `nextSeason` confere o ano de retorno e devolve o jogador sozinho,
sem pergunta — `g.pendingReturnFromLoan` avisa a UI pra trocar o toast padrão por um de
retorno. `p.career[].onLoan` (aditivo) deixa a linha do tempo (`js/ui.js`) diferenciar
"Empréstimo"/"Fim do empréstimo" de "Transferência" definitiva. Tela nova
(`showLoanOffer`, `js/ui.js`) no mesmo estilo do mercado normal, com escolha binária
sem penalidade por recusar.

## Voltar a ex-clube depois dos 31 (item 4, feito)

Mais simples que o empréstimo: mecanicamente é só uma transferência normal, então
**reaproveita `acceptOffer` sem função nova pra aceitar**, e não precisa de nenhum
campo novo no save (nenhuma "origem" pra lembrar, é só ida). Gatilho dentro de
`endSeason` (`js/engine.js`), mutuamente exclusivo dos outros de mercado/empréstimo:
31+ anos, pelo menos 1 ex-clube no histórico, 30% de chance por temporada elegível.
`formerClubs(g)` extrai a lista de clubes distintos de `p.career` excluindo o atual
(não existe "clube de origem" separado no jogo). `makeHomecomingOffers` — diferente do
empréstimo (1 proposta só) — mostra todos os ex-clubes elegíveis de uma vez, já que a
pergunta é "pra qual". Tela nova (`showHomecoming`, `js/ui.js`) no mesmo estilo visual
do mercado/empréstimo.

## Linha do tempo de marcos da carreira (item 5, feito)

`timelineHTML` (`js/ui.js`) já existia e já era rica (estreia, transferências/
empréstimos, títulos, prêmios, Bola de Ouro, ídolo, capitania) — faltavam os marcos de
abertura pedidos. "Criação do jogador"/"Assinatura com o {clube}"/"Apresentação à
torcida" são sintetizados na hora a partir de `p.career[0]` (ou clube/ano atual se
calouro) — **sem estado novo persistido**, aparecem sempre. "Primeiro clássico
disputado" precisou de 1 campo aditivo, `p.firstClassic = {year, oppName, clubName}`,
setado uma única vez dentro de `applyMatch` ao lado do bloco que já atualiza
`g.clubRivalry` pro mesmo jogo. `timelineHTML` foi exportado em `CQ.ui` pra ficar
testável diretamente (os testes leem a string HTML real gerada pela função).

## Campo 3D de verdade no modo Ao Vivo (item 2 do roteiro, Fatia 1 — REVERTIDO)

> **Revertido numa sessão seguinte**: usuário testou em produção e achou "bem engessado
> e ruim" (nenhum jogador visível no ângulo padrão, câmera estática por padrão, estádio
> vazio "parece amador"), pediu explicitamente pra voltar ao campo 2D. `js/pitch3d.js`,
> `js/vendor/three.min.js`, `js/vendor/OrbitControls.js`, `js/vendor/GLTFLoader.js` e
> `js/vendor/stadium-model.js` foram **excluídos do repositório** (não arquivados) —
> nada nesta seção (nem na seção seguinte, sobre o modelo do estádio) descreve código
> que ainda existe; fica só como histórico de decisão pra não repetir a mesma tentativa
> sem uma mudança de design que resolva o problema relatado (câmera/ângulo/densidade de
> estádio). Ver "Campo 2D animado" acima pro estado atual.

Substitui `buildPitchSVG` como renderizador do modo Ao Vivo. Pedido explícito do
usuário mesmo depois de avisado do tamanho do trabalho e de que introduz a primeira
dependência externa/binário vendorizado do projeto (three.js), quebrando a filosofia
de "zero dependência/arquivo único" mantida até aqui — confirmado deliberadamente,
não um descuido de escopo.

**Biblioteca**: three.js r140 (`js/vendor/three.min.js`) + `OrbitControls` r140
(`js/vendor/OrbitControls.js`), vendorizados via `scripts/vendor-three.mjs` (mesmo
padrão de `embed-crests.mjs`/`sync-ages.mjs` — busca externa só em tempo de setup).
r140 é deliberado: é a última versão que ainda publica um build UMD clássico e um
`OrbitControls` não-módulo, os dois compatíveis com `scripts/build.mjs` (que só
concatena texto de `<script>`, sem bundler/`import`/`export`) sem nenhuma mudança no
próprio build. Bundle final: `1.24 MB → 1.85 MB`.

**Divisão de responsabilidade** (a mesma que já existia entre `js/pitch.js` e a UI, só
trocando quem desenha): `CQ.pitch.FORMATION`/`poseFor`/`poseForKick` continuam sendo a
**única fonte da verdade** de "o que aconteceu e pra onde as coisas devem ir" — não
mudaram 1 linha. `js/pitch3d.js` (`CQ.pitch3d`) é só o renderizador novo: `mount(container,
fx, res, player)` monta `THREE.Scene`/`PerspectiveCamera`/`WebGLRenderer`/
`OrbitControls` (22 marcadores cilindro+esfera nas cores reais do uniforme, anel
dourado no marcador do jogador, gramado texturizado num `<canvas>` 2D comum);
`applyPose(pose)` consome o mesmo formato de pose que a versão 2D já usava, só que
anima via tween (posição/escala) em vez de `classList`/`transform` de SVG; `unmount()`
para o loop de `requestAnimationFrame` e descarta geometria/material/contexto WebGL —
necessário porque, ao contrário de nó SVG (garbage-collected sozinho), contexto WebGL é
recurso escasso e limitado do navegador.

`js/ui.js`: `renderLiveOverlay` insere um `<div id="lv-pitch3d">` vazio e monta a cena
logo depois do `overlay(...)` (precisa existir no DOM antes do `WebGLRenderer` anexar o
canvas); `applyPitchPose` virou 1 linha delegando pra `CQ.pitch3d.applyPose`;
`finishLive()` (único ponto de todo o código que fecha uma partida ao vivo ativa) ganhou
`CQ.pitch3d.unmount()`. CSS novo: `.live-pitch3d` com `aspect-ratio` fixo (canvas WebGL
não escala sozinho tipo SVG com `viewBox`) + `ResizeObserver` interno ao módulo.

**Verificação**: harness Node não tem contexto WebGL — só `toWorld` (conversão %→espaço
3D) é puramente matemático e testável ali (`testPitch3dToWorld`). Resto validado
manualmente no Browser pane: cena renderiza com os 22 marcadores certos; `OrbitControls`
confirmado (arrastar gira, scroll dá zoom); tween da bola confirmado por introspecção
direta da cena three.js (posição bate exatamente com `toWorld`); pulso de destaque e
badge de emoji confirmados (posição/opacidade corretas na cena); 8 ciclos de
`unmount()`+`mount()` seguidos e um `finishLive()` real sem erro nem aviso de contexto
WebGL no console.

**Simplificações documentadas** (não são bugs, escopo desta fatia): jogadores são
cilindro+esfera, não modelo rigged; camisa em cor sólida, sem padrão de listras; sem
sombra/física de bola; sem fallback pro campo 2D se `WebGLRenderer` falhar ao inicializar
(mostra aviso simples em vez de manter os dois sistemas em paralelo). A arquibancada
inicialmente era 100% procedural (4 paredes + textura de torcida em canvas) — ver seção
seguinte pra como isso foi substituído por um modelo real.

### Estádio: de procedural pra modelo 3D real (feedback do usuário — "muito amador")

> **Também revertido** — junto com o campo 3D inteiro (nota no topo da seção acima).
> `js/vendor/GLTFLoader.js`/`stadium-model.js`/`scripts/vendor-stadium.mjs` não existem
> mais no repositório. Fica só como histórico da tentativa/pesquisa de licenciamento.

A primeira versão da arquibancada era geometria simples de propósito (4 `BoxGeometry`
com textura de pontinhos coloridos simulando torcida). O usuário testou, comparou com um
print do Football Manager e pediu explicitamente um modelo de verdade "de algum
repositório" em vez de mais geometria feita à mão.

**Fonte**: [poly.pizza](https://poly.pizza/m/6TZCkGh76m5) (espelho público, sem login,
do extinto Google Poly) — modelo "Football stadium" por Poly by Google, **licença CC-BY
3.0**. Pesquisa descartou Sketchfab: a maior parte dos modelos free lá usa a licença
"Standard" da própria Sketchfab (não redistribuível) e exige conta logada pra baixar —
nenhum agente deste projeto pode logar/criar conta em nome do usuário.

**Vendorização** (mesmo princípio de `js/crests.js`/`js/birthdates.js` — busca externa
só em tempo de setup, nunca em runtime):
- `scripts/vendor-stadium.mjs` baixa o `.glb`, valida a assinatura binária (`"glTF"` nos
  4 primeiros bytes) e grava `js/vendor/stadium-model.js` (`CQ.STADIUM_GLB_B64`, base64).
- `scripts/vendor-three.mjs` ganhou `js/vendor/GLTFLoader.js` (three.js r140, mesmo
  build clássico não-módulo de `three.min.js`/`OrbitControls.js`).

**Carregamento** (`js/pitch3d.js`, `loadStadiumModel`): decodifica o base64 pra
`ArrayBuffer` (`atob` + `Uint8Array`, cacheado após a 1ª partida) e chama
`new THREE.GLTFLoader().parse(buf, "", onLoad, onError)` — nunca `.load(url)`, já que
não existe URL nenhuma em runtime, garantindo zero chamada de rede pro jogador. O parse
é assíncrono; o mesmo contador `mountGen` que já protegia o ciclo de vida do
`WebGLRenderer` (incrementado em `unmount()` e no início de cada `buildStadium()`)
descarta o callback se a partida ao vivo já tiver sido fechada antes do modelo terminar
de decodificar. Posição calibrada por `THREE.Box3().setFromObject()` via introspecção da
cena (sem screenshot disponível nesta sessão). Placas de publicidade e refletores
procedurais foram mantidos e reposicionados ao redor do modelo real.

**Atribuição obrigatória** (CC-BY exige crédito visível, não só em docs): linha nova no
rodapé da capa (`coverHTML`, `js/ui.js`) linkando pra `creativecommons.org/licenses/by/3.0`.

Bundle: `2137 KB` (modelo 3D embutido + `GLTFLoader.js`). Validado: 217/217 testes.

## Sistema de ídolo em camadas (item 6 do roteiro, feito)

Pedido original: "ídolo → ídolo da geração → ídolo do momento → maior de todos, com
decisões que reforçam a permanência no clube". Investigação prévia mostrou que 2 das 4
camadas **já existiam**, sem ligação entre si: **ídolo do clube** (`p.idolClubs`,
gols+títulos por clube) e **maior de todos** (`careerLegacy`/tier "LENDA IMORTAL" em
`js/ui.js`, já era o veredito de aposentadoria mais alto). A fatia adicionou as 2 que
faltavam e amarrou tudo junto — sem inventar sistema de ranking novo, reaproveitando o
que `ballonRanking`/`ballonScore` (`g.rival` + `g.worldStars`) já calculavam.

- **Ídolo da geração** (`p.genIdolYear`, novo campo, permanente): dispara na 2ª vez que
  `p.ballon` acumula `rank === 1` (Bola de Ouro, "o melhor do mundo" — já descrito no
  código como "muito difícil", medido contra `g.rival`+`g.worldStars`). Computado dentro
  de `endSeason` (`js/engine.js`), ao lado do bloco de ídolo de clube já existente.
- **Ídolo do momento** (`p.momentIdol`, booleano transiente, recalculado toda
  temporada): `true` quando o jogador termina a temporada no top-3 do ranking da Bola de
  Ouro (`awards.ballonRank <= 3`) ou com fama excepcional (`p.fame >= 90`) — pode ir e
  vir, ao contrário das 3 outras camadas (permanentes).
- **Maior de todos**: nenhuma tela nova — `careerLegacy` (`js/ui.js`) já era o veredito
  final de aposentadoria; `p.genIdolYear` agora entra como condição extra pra tier
  "LENDA IMORTAL" (junto de `bolas>=3`/`wc+bolas`/`score>=900` que já existiam).
- **Decisão que reforça a permanência**: `acceptRenew` (`js/engine.js`) ganhou um
  parâmetro de retorno `{loyal}` — `true` quando o jogador já é ídolo do clube atual e
  escolhe renovar em vez de ouvir outras propostas na janela. `pickRenew` (`js/ui.js`)
  usa isso pra uma notícia de imprensa diferente ("recusa as propostas... lealdade que a
  torcida do ídolo não esquece") + pequeno bônus de fama (+4). Reaproveita o fluxo de
  mercado já existente (`showMarket`) — nenhuma tela nova, nenhuma decisão nova de UI.

UI: notícia de celebração (`buildSummarySteps`) quando vira ídolo da geração, com
confete/som de troféu (mesmo tratamento de título); badges na aba "Visão geral" do
Clube (`clubHTML`); badge na tela de aposentadoria (`retroHTML`).

Migração: `p.genIdolYear`/`p.momentIdol` aditivos em `save.js migrate()`, sem bump de
`SCHEMA_VERSION` (mesmo padrão de `p.loan`/`p.firstClassic`). Testado: gatilho de ídolo
da geração (fabricando 2 Bolas de Ouro na carreira — atingir isso organicamente exigiria
simulação longa demais pra um teste determinístico), ídolo do momento por fama alta,
bônus de lealdade em `acceptRenew`, e migração de save antigo. 182/182 passando.

## Hall da Fama (item 7 do roteiro, feito)

Bug real corrigido: `resetToCover()` (botão "Começar nova carreira" na tela de
aposentadoria) nunca limpava `localStorage`, mas a carreira aposentada era
silenciosamente apagada assim que a próxima carreira salvasse por cima da mesma chave
(`craque-save-v1`, um save só) — não existia rastro nenhum de carreiras encerradas.

`js/save.js` ganha uma chave própria, **separada** do save ativo:
`craque-hall-v1` — array de cartões-resumo leves (não o objeto `g` inteiro, que carrega
`g.world`/`g.world.leagues`, centenas de KB, e inflaria a cota de localStorage depois de
poucas carreiras). `induct(g)` monta o cartão (nome, posição, clubes, gols/assist./
títulos/prêmios, Bolas de Ouro, veredito de `careerLegacy` — exportado em `CQ.ui` pra
este fim —, camadas de ídolo) e empurra pro array, com teto de 60 carreiras (`HALL_CAP`,
descarta as mais antigas). Chamado uma única vez, em `summaryNext()` (`js/ui.js`), no
exato momento em que `sum.retiring` vira `G.retired = true`.

Nova tela `hallHTML()`/`CQ.ui.go('hall')` — funciona **com ou sem carreira ativa**
(checada em `render()` antes do fallback de "sem carreira → tela de capa"), acessível
pela tela de capa e pela própria tela de aposentadoria (pra conferir a indução que
acabou de acontecer). Sem migração de save necessária — chave nova e independente do
esquema de `g`.

Validado: 188/188 testes (indução adiciona cartão com os números certos, teto de 60
respeitado mantendo as mais recentes, tela renderiza com e sem hall vazio).

## Redes sociais reagindo de verdade a decisões (item 8 do roteiro, feito)

Investigação prévia mostrou que "resultado de partida" já estava bem coberto —
`onMatch` (`js/narrative.js`) já reage a hat-tricks, gols decisivos, defesaças,
atuações ruins, clássicos, duelo com o rival de geração, marcos de carreira etc. desde
sessões anteriores. O gap real estava em **decisões**: `applyLifeEvent` só tinha
reação social hard-coded pra 3 dos 17 eventos de vida (`hospital`/`influencer`/
`coletiva`) — as outras 14 escolhas eram completamente invisíveis pro feed.

Refatorado pra um campo genérico `social` (opcional) direto na opção do evento, no
mesmo padrão de `label`/`fx`/`note` que já existia — `{k: perfil, text: "...", hot?}`,
com `{name}`/`{club}` interpolados (`fillNames`, novo helper). `applyLifeEvent` virou
1 linha (`if (opt.social) post(...)`) no lugar dos 3 `if (ev.id === ...)` fixos.
Resultado: **30 das 48 opções** de eventos de vida agora geram um post real — deliberado
não ser 100% (a opção mais "morna"/neutra de cada evento costuma ficar de fora, mesmo
espírito de "só o que vira notícia de verdade" que `onMatch` já seguia pros resultados).

Validado: 191/191 testes (2 novos — cobertura ≥50% das opções, e um evento específico
confirmando post/não-post conforme a opção escolhida). Também corrigiu um bug de
isolamento nos testes do Hall da Fama (`testInductAddsToHall`/`testHallCapEnforced`
não setavam `CQ.state.game` antes de chamar `induct()`, que internamente lê
`CQ.ui.careerLegacy(p)` → `g()` — nunca afetava produção, já que `summaryNext()`
sempre chama `induct(G)` com `G === CQ.state.game` por construção, mas quebrava em
página recém-carregada sem `CQ.state.game` prévio).

## Itens 9-13 do roteiro (painel lateral, avatar, calendário, estados vazios, comparação)

Cinco itens de UX menores, cada um com escopo confirmado com o usuário quando havia
ambiguidade genuína (item 9), implementados em sequência na mesma sessão.

- **Item 9 — painel lateral nos modais grandes**: `overlay(html, wide)` (`js/ui.js`)
  ganha um 3º modo, `"panel"` — largo (1060px) + `<aside class="ov-side">` fixo com
  resumo do jogador (overall/fama/moral/condição/patrimônio), aplicado nos 3 modais de
  decisão grande (`showMarket`/`showLoanOffer`/`showHomecoming`). `sidePanelHTML()`
  volta `""` sem carreira ativa (nunca quebra um overlay). CSS empilha em coluna única
  abaixo de 760px (sem espaço sobrando pra painel em mobile).
- **Item 10 — avatar editorial/silhueta**: `portraitSVG` (`js/util.js`) reescrita do
  zero — era um retrato cartunesco colorido (pele/cabelo/barba/camisa individuais,
  ~80 linhas de paths), virou uma silhueta monotom em tinta (`#1b1812`) sobre fundo
  gradiente de papel, mesma paleta editorial do resto do jogo. Mesma assinatura
  (`portraitSVG(seedStr, size)`), zero call site precisou mudar (10+ usos em
  cartão de jogador, capa, feed, técnico, rival). Consts `SKINS`/`HAIRC`/`JERSEY`
  removidas (só serviam ao estilo antigo).
- **Item 11 — calendário por mês + filtro**: `calendarHTML` (`js/ui.js`) agrupa os
  jogos em cabeçalhos de mês (`MONTHS_PT`, fev-dez — o jogo não modela data real, só
  ordem cronológica; o mês é uma divisão proporcional puramente de apresentação,
  calculada sobre a lista COMPLETA antes do filtro, pra nunca mudar conforme o que
  está filtrado) + `<select>` de competição (só aparece com 2+ competições na
  temporada) via `CQ.state.calFilter`.
- **Item 12 — estados vazios mais interessantes**: passe modesto, não uma varredura
  exaustiva — copy mais característica em "Nenhum prêmio individual ainda" (agora com
  gancho: "boas atuações chamam atenção da crítica") e na aba Base do Clube.
- **Item 13 — comparação com jogadores da mesma idade**: nova aba "Mesma idade" em
  Carreira, `peersHTML` (`js/ui.js`) — varre `g.world.clubs` (identidade persistente
  dos 191 elencos, já com `age`/`ovr` por NPC, zero sorteio novo) por jogadores da
  MESMA idade do jogador, ordena por overall, mostra top 10 + a posição do jogador
  (com percentil). Puramente informativo (não é um duelo com efeito de jogo, ao
  contrário da aba "Duelo" já existente contra o rival de geração).

Validado: 200/200 testes (9 novos). Verificação visual manual no Browser pane via
`get_page_text`/inspeção de `sidePanelHTML()`/`portraitSVG()` diretas (screenshot
indisponível nesta sessão) — calendário agrupado por mês com filtro funcionando,
painel lateral com os dados certos, aba "Mesma idade" mostrando ranking real (ex.:
211º de 264 jogadores de 24 anos, top 20%).

## Potencial + pontos de evolução (item 14 do roteiro, feito — última pendência do roteiro grande)

Mudança de mecânica central, investigada a fundo antes de codar (proposta apresentada e
aprovada pelo usuário). Achado que reduziu o escopo real: **potencial (`p.pot`) já
existia e já era mostrado** ao jogador (Home, aba Atributos, gráfico de Evolução) — só
faltava a metade "pontos de evolução pra distribuir": hoje todo XP virava atributo
**sozinho e ao acaso** (sorteio ponderado por posição+`trainingFocus`), sem o jogador
escolher nada.

- `spendXP(g)` (`js/engine.js`) para de escolher atributo — só converte XP fracionário
  em `p.evoPoints` (inteiro, pendente, nunca expira).
- `investPoint(g, attrKey)`: o jogador investe 1 ponto manualmente num atributo à
  escolha, na aba Atributos de Carreira. Mesmas 3 travas de sempre (potencial, teto de
  95, atributo válido) — devolve o ponto se a escolha não render nada (não "some" numa
  quina de arredondamento).
- `autoDistribute(g)`: atalho que reaproveita o sorteio ponderado antigo (posição +
  `trainingFocus`) pra quem não quer microgerenciar — spenda tudo de uma vez.
- **Rede de segurança** (achado durante a implementação, não estava na proposta
  original): pontos nunca investidos na mão até o fim da temporada são aplicados
  automaticamente em `endSeason` (mesmo `autoDistribute`) — sem isso, um jogador que
  nunca abre a aba Atributos ficaria com a carreira estagnada pra sempre, pior que o
  sistema antigo que ele substituiu. Também evitou quebrar as várias simulações longas
  já existentes em `tests/regression.js` (15-20 temporadas simuladas via
  `applyMatch`/`resolveMatch` em loop, sem nunca chamar `investPoint` manualmente).
- `trainingFocus` não foi removido — continua relevante como o peso usado por
  `autoDistribute` (redefinido de "único jeito de crescer" pra "como o atalho
  automático decide por você").
- UI: botão "+1" por atributo na aba Atributos (só aparece quando investível — mesmas 3
  travas refletidas ali pra nunca mostrar um botão que ia falhar), botão "Distribuir
  automaticamente", contador de pontos pendentes com link direto da Home.
- **Balanceamento**: como `overallOf` já é a média ponderada pelos pesos da posição,
  nenhum limite artificial por temporada foi necessário — investir fora do peso da
  posição já é auto-desincentivado (rende menos overall por ponto), sem precisar
  inventar uma trava nova.

Migração aditiva (`p.evoPoints`), sem bump de `SCHEMA_VERSION`. Validado: 215/215
testes (7 novos, incluindo a rede de segurança rodando uma temporada simulada
inteira sem nenhum investimento manual). Verificação visual manual completa no Browser
pane: clicar "+1" em Finalização (62→63, pontos 4→3, overall mantido — esperado num
atributo secundário isolado) e depois "Distribuir automaticamente" nos 3 restantes
(overall 67→68, banner de pontos pendentes desaparece).

Com este item, **o roteiro grande de imersão/UX está 100% completo** — só o item 1
(idade real via API-Football) segue em andamento, limitado pela cota diária da API
(42/129 clubes até agora), resumível a qualquer momento sem trabalho de design.

## Imagens reais (repositório) no lugar de ilustração feita à mão + reversão do 3D

Usuário mandou 2 prints direto do jogo — o modal de "Ligação da namorada" (silhueta de
tinta genérica, 2 bonecos + coração) e o campo 3D em produção (estádio vazio, ângulo
parado) — com o feedback: "olha o estadio ta muito feio... isso ta muito amador",
seguido de "as imagens preciso que vc pegue em algum repositorio" e "sobre o estadio ta
bem engessado e ruim, vamos com um 2D pega em algum site ou repositorio". Três frentes:

**1) Campo 3D → 2D, revertido de vez** (não só desconectado — apagado do repo):
`js/pitch3d.js` e os 4 arquivos vendorizados (`three.min.js`/`OrbitControls.js`/
`GLTFLoader.js`/`stadium-model.js`) foram excluídos. `js/ui.js` (`renderLiveOverlay`/
`applyPitchPose`/`finishLive`) voltou ao código do commit `fce5a97` (campo 2D SVG já
pronto e testado, só desconectado — `js/pitch.js` nunca mudou 1 linha nos dois lados da
troca). CSS `.pv-*` restaurado, `.live-pitch3d` removido. Bundle: `2137 KB → 1242 KB`
só com essa remoção. Ver notas de reversão nas seções "Campo 3D de verdade"/"Estádio:
de procedural pra modelo 3D real" acima.

**2) Ilustrações reais nos modais de eventos de vida** — as ~10 silhuetas de tinta
desenhadas à mão (`sceneHospital`/`sceneContract`/etc., `js/util.js`) foram substituídas
por ilustrações reais da [unDraw](https://undraw.co) (Katerina Limpitsouni, uso livre
sem exigir atribuição — https://undraw.co/license), uma por categoria (hospital,
contrato, entrevista, casal, time, redes sociais, descanso, evento formal, base,
comunidade/torcida). Vendorizadas via `scripts/vendor-life-scenes.mjs` em
`js/vendor/life-scenes.js` (`CQ.LIFE_IMGS`, base64, ~267 KB) — mesmo princípio de
`embed-crests.mjs`: busca externa só em tempo de setup. `lifeSceneSVG(eventId)`
(`js/util.js`) agora devolve um `<img>` em vez de montar SVG na mão; `LIFE_SCENE`
continua mapeando os 17 ids de evento pras ~10 categorias. CSS novo
(`.modal2-scene img`) aplica um filtro `sepia()`/`saturate()`/`hue-rotate()` pra tingir
as cores originais da unDraw (roxo/rosa) pro tom kraft do resto do jogo, em vez de
destoar cru. **Endpoint usado pra achar as URLs diretas**: `undraw.co` roda em Next.js
— a busca client-side chama `/_next/data/{buildId}/search/{termo}.json`, que devolve
JSON com `media: "https://cdn.undraw.co/.../slug.svg"` direto, sem precisar simular
clique em botão de download nem login (mesma técnica de "achar a URL real por trás da
UI" já usada com poly.pizza numa sessão anterior).

**3) Atmosfera real de estádio** — uma foto real (não mais geometria nem SVG
procedural) como pano de fundo discreto atrás do cabeçalho do modo Ao Vivo. Fonte:
["Football stadium Za Lužánkami Brno Panorama 2010"](https://commons.wikimedia.org/wiki/File:Football_stadium_Za_Lu%C5%BE%C3%A1nkami_Brno_Panorama_2010.jpg)
por Petr Šmerkl ("Sveter"), CC BY-SA 3.0, via Wikimedia Commons — escolhida por ser
genérica (não um estádio de marca reconhecível) e por licença clara com atribuição
simples. Baixada via `Special:FilePath/...?width=1280` (miniatura gerada pela própria
Wikimedia — o original tem ~24 MB, a miniatura larga/baixa do panorama fica em ~100 KB).
Vendorizada via `scripts/vendor-stadium-photo.mjs` em `js/vendor/stadium-photo.js`
(`CQ.STADIUM_PHOTO`). `renderLiveOverlay` (`js/ui.js`) aplica como
`background-image` do `.live-head` por trás de um gradiente escuro (mantém o placar
legível). Atribuição obrigatória (CC BY-SA) no rodapé da capa — `.cover-foot.small`
(novo modificador, `css/style.css`) empilha a 2ª linha do rodapé sem sobrepor a 1ª
(as duas eram `position:absolute` no mesmo `bottom`, bug latente desde a sessão anterior
que só foi percebido agora que o screenshot do Browser pane voltou a funcionar).

**4) Reforço de "a partida precisa parecer estar rolando"** — cartão/vermelho ganharam
o mesmo splash em tela cheia que gol já tinha (`goalSplash`/`cardSplash`, `js/ui.js`,
disparado em `liveStep`), no lugar de só uma linha no feed de texto + pulso discreto no
campo.

Bundle final desta sessão: `1640 KB` (3D removido, +267 KB de ilustrações + 131 KB de
foto real). Validado: suíte completa passando (contagem varia por temporada simulada
estocástica, sempre 100% dos casos executados — ver "Determinismo"/"Testes" acima),
verificação visual manual completa no Browser pane (screenshot voltou a funcionar nesta
sessão): campo 2D com 22 marcadores + bola reagindo a decisão, modal de evento de vida
com ilustração real tingida, foto de estádio visível atrás do cabeçalho do Ao Vivo,
splash de cartão vermelho, rodapé da capa com as duas linhas de atribuição empilhadas
sem sobrepor.

## Marcadores do campo 2D viram sprite real (bug de padrão + time verde ilegível)

Usuário jogou de verdade logo depois do reverte pra 2D acima e reportou "cara o campo
voltou ao antigo?? ta terrivel" com print mostrando o Vasco quase invisível e o Guarani
como bolha preta lisa. Diagnóstico (não só gosto — 2 bugs reais):

1. `patternFillFor` (`js/util.js`) desenha listra/hoop/sash com tile de `40×40`/`10×10`
   unidades — cabe certo no brasão (badge de 40 unidades), mas é maior que o próprio
   marcador do campo (círculo de raio 3) — o padrão colapsava pra cor sólida.
2. `pat:"plain"` só usa `c1` — e clubes com `c1` verde (Guarani, entre outros) ficam
   sempre ilegíveis num gramado verde, não importa o ajuste de desenho.

Em vez de um 3º ajuste "confia em mim" no SVG, a correção usa sprite real: **Kenney
"Sports Pack"** (CC0 1.0, uso livre sem atribuição) — `scripts/vendor-player-sprites.mjs`
recorta 4 cores de "cabeça vista de cima" (azul/vermelho/branco/dourado, a 5ª cor do
pacote — verde — é **deliberadamente excluída**, é o motivo do bug 2) + 1 bola, embute
em `js/vendor/player-sprites.js` (`CQ.PLAYER_SPRITES`, ~7 KB). `js/pitch.js` ganhou
`rankedSpriteColors`/`pickTeamSprites`: distância euclidiana de `club.c1` até as 4 cores
disponíveis, com desempate garantindo que os 2 times nunca ficam iguais.
`buildPitchSVG` usa o sprite quando `CQ.PLAYER_SPRITES` existe, com fallback pro círculo
`jerseySVG` de antes se não (nunca quebra a tela) — `jerseySVG`/`patternFillFor`
continuam servindo o brasão do clube normalmente em todo o resto do jogo.

Testado com a partida exata do relato (Vasco × Guarani): Vasco vira vermelho, Guarani
vira azul — nenhum verde, bem distintos. Validado: novo `testPitchSpriteColors` (nenhum
clube testado escolhe verde; os 2 times nunca empatam de cor) + verificação visual
manual reproduzindo a mesma partida.

## Motor de partida real: FootballSim (lógica) + Football2D (visual) no Ao Vivo (feito)

Pedido do usuário: usar dois repositórios de terceiros no modo Ao Vivo —
**eozgit/footballsim** pra lógica/inteligência da partida (fork MIT de
GallagherAiden/footballSimulationEngine) e **cyntler/football2d** pro visual do campo
(MIT). Escopo confirmado com o usuário: **só a tela de partida ao vivo** — temporada,
carreira, mercado, lesão, disciplina e narrativa continuam 100% no motor estatístico de
sempre (`resolveMatch`, `js/engine.js`); as ~180 partidas/rodada dos outros clubes e as
partidas do próprio jogador não assistidas ao vivo nunca passam por aqui.

**football2d não desenha jogador nenhum** (confirmado lendo o código-fonte, não só o
README — `startMatch` recebe os times e nunca os usa) — só o campo (`drawField`, com
proporção métrica real). O usuário confirmou usar os dois mesmo assim: football2d
desenha o gramado, e os sprites Kenney que o jogo já tinha (`CQ.PLAYER_SPRITES`)
continuam desenhando os 22 jogadores/bola por cima, agora em posições reais.

### Vendorização (nenhuma das duas libs publica bundle pronto pro navegador)

Mesmo princípio já usado pra three.js/GLTFLoader/Kenney/unDraw/Wikimedia: buscar só em
tempo de build, nunca em tempo de execução. Novo `esbuild` (dependência de
desenvolvimento) compila cada repo (clonado via `git clone --depth 1` em
`scripts/.cache/`, gitignored) num IIFE de arquivo único, via um entry-point sintético
que reexporta só o necessário:

- **`scripts/vendor-footballsim.mjs`** → `js/vendor/footballsim.js`: reexporta
  `initiateGame`/`playIteration`/`startSecondHalf` (API pública) + `setMatchSeed`
  (interna, não exportada pelo pacote — o entry-point sintético a expõe). Guardado como
  **string** (`window.CQ_FOOTBALLSIM_SRC`), deliberadamente **não executado** no
  carregamento da página — só é `eval`'d dentro do Worker do modo Ao Vivo (ver abaixo).
- **`scripts/vendor-football2d.mjs`** → `js/vendor/football2d.js`: reexporta só
  `drawField`/`getGameDimensions`/constantes de campo — nada do loop/`startMatch`
  próprio da lib (não desenha nada útil). Executa direto (`window.CQ_FOOTBALL2D`) —
  barato e síncrono, sem necessidade de Worker.

### Web Worker: por quê

`playIteration()` (1 chamada = 1 tick de simulação) mede **~1.9ms/iteração** — uma
partida completa (2700 iterações × 2 tempos = 5400) leva ~10s rodando sem parar, tempo
suficiente pra travar a aba se rodasse na thread principal. Mesma solução que o próprio
demo oficial do footballsim usa. Como o build final é **um único arquivo HTML** (sem
`js/live-sim.js` como URL separada pra passar a `new Worker(url)`), o Worker é montado a
partir de um **Blob**: o texto do bundle (`CQ_FOOTBALLSIM_SRC`) concatenado com um
pequeno `self.onmessage` que chama `simulateLoop` — uma função pura em `js/live-sim.js`
escrita para depender só dos próprios parâmetros (sem variável de fora), justamente pra
poder ser serializada via `.toString()` e embutida verbatim no Worker.

`CQ.liveSim.runAsync(g, fixture)` **nunca rejeita** — resolve `null` em qualquer falha
(vendor ausente, `Worker` indisponível, exceção, timeout) e `js/live.js` cai de volta
pro caminho estatístico de sempre, byte a byte idêntico a antes (`buildLive` aceita
`simResult` como parâmetro opcional; ausente → comportamento antigo inalterado).

**Timeout do Worker**: `TIME_BUDGET_MS` em `js/live-sim.js` está calibrado em **20s**
(medição real de ~10-12s + margem pra aparelho mais lento) — um valor menor faria o
recurso cair silenciosamente pro fallback estatístico em produção mesmo funcionando
tecnicamente, sem nenhum aviso visível pro jogador.

### O que é autoridade, o que é visual

- **`nota` (fórmula de rating do jogador) não muda uma vírgula** — extraída pra uma
  função pura `computeNota(pos, ctx, rng)` (`js/engine.js`), chamada tanto pelo caminho
  estatístico de sempre (alimentada por `U.poisson`) quanto pelo caminho novo
  (alimentada pelas estatísticas REAIS que o footballsim registrou: `tackles`,
  passes concluídos, cartões do próprio jogador). Só a fonte dos números de entrada
  muda; pesos e ordem de consumo de RNG são idênticos.
- **Placar e eventos (gol/cartão) passam a vir da simulação real** quando o jogador
  assiste ao vivo — antes vinham de `U.poisson`/`U.chance`.
- **Sem assistência nativa** no footballsim (campo `assists` não existe no tipo
  `Stats`) — `pa` continua de uma aproximação própria, documentada como tal.
- **Determinismo**: `setMatchSeed` (Mulberry32, já embutido no footballsim) é chamado
  com um seed derivado de `g.seed + fixture.oppId + g.year + rodada` — mesmo padrão de
  `U.rngFor` já usado no resto do jogo.

### Sistema de coordenadas (3 convenções reconciliadas)

footballsim usa campo retrato (`pitchWidth=680` como eixo curto/lateral,
`pitchHeight=1050` como eixo longo/gol-a-gol); football2d e o SVG antigo do CRAQUE são
paisagem (gols à esquerda/direita). Resolvido só na camada de UI (`fsPt` em
`js/ui.js`): troca os eixos na conversão (`CQ.pitch.fsToPct([pos[1], pos[0]], ...)`) —
`CQ.pitch.fsToPct` em si continua genérica.

### Renderização

`js/ui.js` escolhe o renderizador canvas (`mountPitchCanvas`/`drawCanvasFrame`/
`canvasPlayFrames`) só quando `live.res.simFrames` existe e não está vazio; senão usa o
SVG antigo (`buildPitchSVG`/`poseFor`) — os dois nunca se misturam parcialmente. Cada
evento revelado (`pitchReact`) anima a janela real de frames ao redor do minuto daquele
evento (`iter-45` a `iter+12`) em vez de pular pra uma pose estática. Eventos são
detectados por **diff** de `stats.goals`/`stats.cards.*` a cada `playIteration` (o
footballsim não expõe log de eventos pronto); gol contra é detectado quando o
`lastTouch.playerName` não pertence ao elenco do time que marcou (o footballsim credita
o time mas não o jogador nesse caso) — tratado com narrativa própria ("Complicou pro
próprio lado...") em vez de "undefined marca...".

### Limitação conhecida, documentada sem esconder

`scripts/live-sim-check.mjs` (8 partidas de diagnóstico) mostrou um viés de placar
(time "mine" vencendo a maioria, "opp" quase nunca marcando) — amostra pequena demais
pra afirmar causa raiz (o próprio jogo já é raro em gols, ~0.88/partida), mas
documentado aqui como área de calibração futura em vez de escondido. `initiateGame`
sempre trata "mine" como `team1`/`kickOffTeam` (posse inicial), o que pode ter algum
efeito — a investigar com uma amostra maior.

Validado: suíte completa (`CQ.tests.run()`, 218/218 no bundle final) + 3 testes novos
(`testLiveSimTranslateShape`, `testLiveSimDeterminism`,
`testLiveSimBuildTeamsFallsBackCleanly`) + verificação end-to-end real no Browser pane
(partida completa da criação da carreira até "Encerrar partida", incluindo uma decisão
de pênalti, canvas montado/desmontado sem erro, `p.stats` atualizado) + `node
scripts/build.mjs` (bundle final 1863 KB).

## Logos reais de competição (feito)

Pedido do usuário: logo real (PNG/SVG) de cada competição, pra diferenciar visualmente
uma da outra — mesmo espírito/uso pessoal já documentado pros escudos de clube
(`CREST_MAP`/`js/crests.js`).

Mesmo princípio de vendorização já estabelecido no projeto (buscar só em tempo de
build, embutir como data-URI, nunca depender de rede/CDN em tempo de jogo): novo
`COMP_LOGO_MAP` em `js/data.js` mapeia cada código interno de competição (o mesmo já
usado em `fx.compKey`/`COMP_ABBR`/`trophyIcon`) pro ID de liga da API-Football — mesma
base pública (`media.api-sports.io`) já usada pelos escudos de clube. Novo
`scripts/embed-comp-logos.mjs` (mesmo esqueleto de `embed-crests.mjs`) baixa, redimensiona
(56px, webp) e embute tudo em `js/comp-logos.js` (`CQ.COMP_LOGOS`, ~70 KB).

**Fallback obrigatório, mesmo padrão de `crestSVG`**: nova `compIcon(key)` (`js/ui.js`)
devolve `<img class="comp-logo">` com o logo real quando `CQ.COMP_LOGOS[key]` existe;
senão cai em `trophyIcon(key)`, o ícone vetorial próprio que já existia — nunca quebra a
tela, nunca depende de `js/comp-logos.js` estar presente.

**25 de 28 códigos têm logo real; 3 ficam de fora de propósito** (documentado
honestamente, não escondido):
- **`WC` (Copa do Mundo)**: o ID confirmado certo na API (`league=1`, verificado por
  busca direta no endpoint `/leagues?search=`) só tem um escudo genérico cinza
  cadastrado — não o troféu real, provável restrição de marca da FIFA (o Mundial de
  Clubes, `MUN`/id 15, tem o troféu de verdade; a Copa do Mundo em si, não). O ícone
  vetorial próprio (globo com fitas, dourado) é visualmente melhor que o placeholder
  real — decisão consciente de não usar o "logo real" nesse caso específico.
- **`EST` (Estaduais)**: 13 campeonatos diferentes (Carioca, Paulista, Mineiro...)
  atrás de um único código — não existe "o" logo do Estadual, cada um teria o seu
  próprio (fora do escopo desta entrega).
- **`SUPER` (Supermundial)**: torneio fictício deste jogo (expansão além do Mundial de
  Clubes real) — não existe no mundo real, então não tem logo real possível.

Todos os outros 25 (verificados um a um por inspeção visual, não só "a chamada não deu
erro 404"): as 8 ligas nacionais + 7 copas domésticas (Brasil usa `CDB`; as outras 6
ganham um `logoKey` próprio — `"COPA_" + código da liga — setado em `buildEuroSeason`,
já que o código interno genérico `"COPA"` sozinho não diz de qual país é a copa daquele
ano), as 5 competições continentais de clube (Libertadores, Sul-Americana, Champions,
Europa League, Conference League) e as 5 seleções restantes (Copa América, Eurocopa,
Copa Ouro, Copa da Ásia, Mundial de Clubes).

**Onde aparece**: sala de troféus (`trophHTML`, banner de título e vitrine de troféus —
o lugar mais visível), cabeçalho de tabela de liga/estadual (`leagueTableHTML`),
cabeçalho de chaveamento (`cupHTML`), grupo/chaveamento de seleção (`selTourHTML`),
Supermundial (`superHTML`), histórico de campeões (`champsHTML`, logo do filtro
selecionado) e a etiqueta de competição do calendário/panorama (`compTag`, versão
miniatura de 13px). Chip branco arredondado atrás de cada logo (`.comp-logo`) garante
contraste tanto no cabeçalho claro quanto na faixa escura do `.section-banner` — sem
isso, logo de texto escuro (ex. Ligue 1) sumiria num fundo escuro.

Validado: suíte completa 238/238 (3 testes novos: `testCompLogoMapIntegrity`,
`testCompLogosMatchMap`, `testTrophyRoomRendersCompLogos` — este último renderiza a
sala de troféus com um título de logo real e um fictício na mesma tela, confirmando os
dois ramos do fallback lado a lado) + verificação visual manual de 20 dos 25 logos
reais (comparação direta com a marca oficial de cada competição) + `node
scripts/build.mjs` (bundle final 1936 KB).
