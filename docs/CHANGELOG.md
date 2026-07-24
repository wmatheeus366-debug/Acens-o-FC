# CHANGELOG — CRAQUE

## Fase de Estabilidade — parte 1 (auditoria + backup + bugs críticos)

### Preservação
- **Backup intacto** do arquivo único: `CRAQUE.original.html` (cópia do `CRAQUE.html`).

### Bugs corrigidos (com teste de regressão)
- **BUG-01 · Placar do modo ao vivo:** `chooseDecision` deixou de alterar `live.score`
  diretamente. Agora **apenas `step()` altera o placar visual**, ao revelar o evento
  inserido. Removido o `live.i++` manual da UI. Invariante: cada gol conta 1x.
  Teste: `tests/regression.js › live-score-single-count`.
- **BUG-02 · Importação de save:** `importSave` agora passa pela **mesma
  validação e migração** do `load()` via `validateAndMigrate()`. Adicionado
  `schemaVersion` (=2). Saves inválidos são rejeitados com mensagem clara.
  Testes: `› import-migrates`, `› import-rejects-invalid`.

### Artefatos
- `docs/AUDIT.md` — auditoria consolidada (arquitetura, QA, balanceamento, game design,
  determinismo, UX, persistência, superfície de `REAL_SQUADS`, licenciamento).
- `tests/regression.js` — regressão executável no navegador (`CQ.tests.run()`), 13 checagens.
- Este `CHANGELOG.md`.

### Não alterado (de propósito)
- Nenhum sistema removido; identidade visual intacta; compatibilidade de saves preservada
  (saves antigos migram; smoke em todas as posições OK).

---

## Fase de Estabilidade — parte 2 (determinismo + notas por posição)

### Determinismo (RNG por seed) — ver `docs/RATING_MODEL.md`
- `resolveMatch` usa `rngFor(seed, "match", ano, idx)`; `applyMatch` (lesão/pênaltis auto)
  usa `rngFor(seed, "post", ...)`; `spendXP` usa `rngFor(seed, "xp", ...)`.
- **Invariante testado:** mesmo estado inicial + mesmas ações ⇒ mesmo resultado; seed
  diferente ⇒ resultado diferente. Testes `› determinismo`.

### Notas por posição
- `resolveMatch` agora gera estatísticas próprias da função (desarmes, interceptações,
  duelos, cortes, passes decisivos, defesaças, falhas) e calcula a nota por **fórmula
  específica de cada posição**. Defensores/goleiros/volantes atingem nota alta pela sua
  função, sem depender de gol/assistência. Fórmulas documentadas em `RATING_MODEL.md`.
- Box-score/atuação na home mostra as estatísticas da posição.
- Testes `› nota: <pos> alcança nota alta pela função` (todas as 7 posições).
- **Baseline observado** (titular ~88 num clube grande, média de nota/temporada):
  GOL ~7.6 · ZAG ~6.7 · LAT ~6.8 · VOL ~6.8 · MEI ~6.5 · PON ~7.6 · ATA ~6.4
  (picos 8–10). Ajuste fino fica para o balance runner.

### Testes
- `tests/regression.js` agora com **22 checagens** (todas passando): placar ao vivo,
  migração/rejeição de save, determinismo, notas por posição, smoke em todas as posições.

### Bundle
- `CRAQUE.html` regravado (autossuficiente: CSS inline, 0 dependências externas de arquivo;
  fontes/bandeiras ainda vêm da web com fallback). `CRAQUE.original.html` preservado.

---

## Fase de Estabilidade — parte 3 (balance runner + arco de carreira)

### Balance runner
- Novo `scripts/balance-runner.mjs` (Node, roda o motor real num shim `vm`, sem tocar no
  jogo). Simula **100 carreiras por posição** e gera `docs/balance-baseline.json` +
  `docs/BALANCE_BASELINE.md` (médias e distribuição p10/p50/p90 de jogos, gols, assist.,
  nota, overall máximo, títulos, prêmios, Bolas de Ouro, seleção, aposentadoria, valor).

### Problemas medidos (baseline ANTES) e correções (mudanças de fórmula — NÃO silenciosas)
1. **Carreiras irreais:** ~28 temporadas, aposentadoria média **45**, overall máximo
   mediana **95** em todas as posições. Causa: `potUp` inflava o teto e o XP na velhice
   superava o declínio.
   - **XP por idade:** antes `≤24:1.5 / ≤29:1.0 / ≤33:0.55 / resto:0.25` →
     agora `≤23:1.5 / ≤27:1.1 / ≤30:0.7 / ≤32:0.35 / ≤34:0.12 / resto:0.03`.
   - **potUp:** antes `avg≥7.2 & age≤29 & j≥15 → +2/+3 (até 99)` →
     agora `avg≥7.8 & age≤22 & j≥20 & potUps<4 → +1 (até 95)` (campo novo `potUps`).
   - **Aposentadoria:** antes `(age≥34 & ov<64) || age≥45` →
     agora `age≥40 || (age≥37 & ov<80) || (age≥35 & ov<74) || (age≥33 & ov<66)`.
   - **Resultado (DEPOIS):** temporadas **~20.7**, aposentadoria **~37.8**, overall máximo
     mediana **~80**, Bolas de Ouro por carreira ATA **4.22 → 0.48** (raras).
2. **Viés posicional na nota:** LAT era o mais prejudicado (média **7.14**, o menor em toda
   a distribuição).
   - **Nota do LAT:** base `6.15→6.28`, desarmes `0.11→0.12`, intercept `0.10→0.12`,
     passes dec. `0.15→0.17`, clean sheet `0.25→0.35`.
   - **Resultado:** LAT **7.14 → 7.39**; faixa entre posições caiu de **0.72 → 0.25**
     (GOL 7.29 · ZAG 7.41 · LAT 7.39 · VOL 7.45 · MEI 7.54 · PON 7.43 · ATA 7.41).

> Snapshot atual completo em `docs/BALANCE_BASELINE.md` (regenerar com
> `node scripts/balance-runner.mjs 100`).

---

## Fase de Estabilidade — parte 4 (modularização + build reproduzível)
- **Módulo de persistência** extraído para `js/save.js` (`CQ.save`): esquema, migração,
  validação, localStorage, export/import. `main.js` ficou só com estado + tema + bootstrap;
  `CQ.main` reexporta `CQ.save` (todas as chamadas `CQ.main.*` continuam funcionando).
- **Build reproduzível** `scripts/build.mjs`: lê a ordem de scripts/estilos do próprio
  `index.html`, concatena, valida `</script>` e gera o `CRAQUE.html` autossuficiente.
  (Antes o bundle era regravado à mão.)
- **`docs/ARCHITECTURE.md`**: mapa de módulos, dependências, build, testes, determinismo e
  pontos de extensão para o Mundo Real. Correspondência com o layout `src/` do Adendo
  documentada (relocação física adiada por ser churn sem ganho).
- Regressão: **22/22** após a modularização (nada quebrou).

---

## Fase de Estabilidade — parte 5 (determinismo ao vivo + acessibilidade)
- **Determinismo do modo ao vivo:** `buildLive` cria `live.rng = rngFor(seed,"live",ano,idx)`;
  `chooseDecision` e a disputa de pênaltis (`runShootout` + morte súbita) usam esse RNG.
  Mesma seed + mesmas escolhas ⇒ mesmo resultado. Teste `› live: mesma seed+escolha`.
- **Acessibilidade:**
  - Overlays com `role="dialog"` + `aria-modal="true"` e **foco automático** no primeiro
    controle ao abrir.
  - **Foco visível** por teclado (`:focus-visible` com contorno vermelhão/dourado).
  - **`prefers-reduced-motion`**: desativa animações (sorteio, toasts, blink ao vivo,
    pop de overlays) para quem pede menos movimento.
- Regressão: **23/23** (harness reforçado para isolar estado do modo ao vivo entre testes).

**Fase de Estabilidade concluída.** Entregáveis: `AUDIT.md`, `ARCHITECTURE.md`,
`BALANCE_BASELINE.md`, `RATING_MODEL.md`, `CHANGELOG.md`, estrutura modular
(`js/*` + `js/save.js`), `scripts/build.mjs`, `scripts/balance-runner.mjs`,
`tests/regression.js` (23 checagens), build estático, `CRAQUE.original.html` preservado.

---

## Imersão — parte 1 + reforço de determinismo
- **Capa de Jornal (momento marcante):** overlay de primeira página em tela cheia quando
  acontece algo especial — **estreia**, **hat-trick** ou **marco de gols (50/100/200/300…)**.
  Masthead "EDIÇÃO EXTRA", manchete gerada, retrato procedural na moldura, lide com
  capitular e ficha da partida. `buildFrontPage`/`showFrontPage`/`closeCapa` em `ui.js`,
  CSS `.capa*` em `editorial.css`. Respeita `prefers-reduced-motion`.
- **Determinismo — bug corrigido (achado pelo teste):** `applyMatch` usava `Math.random`
  em `U.ri(13,19)` (condição física) e `U.ri(1,2)` (suspensão); `applyAging` usava
  `U.chance/U.choice` sem rng. Agora usam RNG derivado da seed (`"post"` e `"aging"`).
  Teste de determinismo agora **estável em 6/6 execuções**.
- Regressão: **23/23**.
- Documento de imersão independente (agente): `docs/IMMERSION_IDEAS.md`.

## Imersão — parte 2 (grande leva) + interface
- **Splash de GOL** em tela cheia no modo ao vivo: "GOL" em Fraunces gigante (240px)
  carimbado a cada gol, com som. Gol adversário aparece menor/apagado.
- **Cerimônia de título com papel picado** nas cores do clube + a **taça certa por porte**
  (`trophyIcon`) + fanfarra. `dropConfetti()` (respeita movimento reduzido).
- **Som sintetizado** (`js/audio.js`, `CQ.audio`): apito, rede, gol (rede+torcida), fanfarra
  de taça, clique — via Web Audio, **zero assets**, **off por padrão**, botão flutuante,
  persistido. Iniciado só após gesto do usuário.
- **Sala de troféus visual** (Carreira → Conquistas): vitrine com as taças SVG, grandes em
  destaque dourado.
- **Pódio da Bola de Ouro** no balanço de temporada (1-2-3 com retratos), + confete/fanfarra
  ao ganhar título ou a Bola de Ouro.
- **Transição de página** suave (`main.page` fade) — fim do "flash" de reload.
- Botões flutuantes de **Som** e **Tema** empilhados no canto.
- Regressão: **23/23**; determinismo estável.

## Imersão — parte 3 (consistência de dados + modais + calendário)
Correções a partir do feedback do jogador (6 pontos), sem quebrar saves nem a identidade editorial:
- **Jogadores reais nos clubes certos:** `engine.js` passou a usar `REAL_WORLD_STARS`
  (pares nome↔clube fixos: Mbappé/Real Madrid, Haaland/Man City…) para as estrelas do mundo,
  e `buildScorers` agora tira o artilheiro de cada clube de `REAL_SQUADS` via `topAttackerName`.
  Assim a artilharia e o elenco mostram o **mesmo jogador no mesmo clube** (fim do "Rayan no
  Atlético na artilharia e no Vasco no elenco").
- **Histórico de campeões ampliado:** `CHAMPS_SEED` com campeões reais 2006–2025
  (BRA 12 anos, Copa do Brasil 10, Libertadores 11, UCL 11, Copa 5, Copa América 5, Euro 5)
  — antes só apareciam ~3 anos.
- **Artilheiros de todos os tempos reformulados:** `HALL_SCORERS` com ~15 lendas reais por
  competição; com 0 gols o jogador aparece numa **linha de rodapé** ("você", 0) em vez de
  ser espremido em 8º. Texto convida a "escalar a lista dos 15 maiores". Ao marcar, entra
  ranqueado na posição correta.
- **Cada competição com cor + nome no calendário:** `COMP_COLOR`/`COMP_ABBR` + classes
  `.cal-tag.c-*` (estadual, liga, Série B, copa, Libertadores, Sula, UCL, UEL, seleção).
  `CONTI` é resolvido para a competição real (Libertadores/Sula) via `peekSchedule`.
- **Modais redesenhados** (entrevista e evento de vida): estrutura `.modal2` com **hero escuro
  dramático** (cream sobre tinta, acento vermelhão), kicker de contexto, título grande e
  botões `.opt2` com **chips de efeito coloridos** (`fxChips`: verde/vermelho/dourado).
  Fim dos pop-ups "brancos sem empolgação".
- Regressão: **23/23**; determinismo estável. Bundle regravado (`node scripts/build.mjs`).

## Próximos passos (fase seguinte — Mundo Real 2026)
1. **Arquitetura do mundo** (`CQ.world`): snapshot versionado + modelo de jogador estruturado;
   `squadOf` lendo do mundo com fallback para geração. Pode iniciar com os elencos curados.
2. **Provider/sync** `scripts/sync-football-data.mjs` (chave por env var no build).
3. Envelhecimento/aposentadoria global, base e mercado de NPCs; telas editoriais do mundo.
4. **Ajuste opcional:** Bola de Ouro ocasional para defensores/goleiros de elite (hoje ~0).
