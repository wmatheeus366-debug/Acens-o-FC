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

## Imersão — parte 4 (repaginação das telas principais)
Resposta ao "a interface do jogo todo é esse branco, meio antigo". Mais drama e profundidade
**sem** virar dashboard genérico — a identidade de jornal foi mantida.
- **Confronto da rodada virou hero escuro** (`.lead-matchup`): faixa de acento vermelhão→dourado
  no topo, fundo em tinta (`--hero-bg`, por tema), escudos com sombra projetada, nomes em creme
  e marca d'água "VS". O jogo da rodada finalmente é o centro visual da home.
- **Profundidade global:** fundo da página escurecido no tema claro (`--paper` #efe8d6 → #e5dcc4)
  e `--newsprint` clareado (#f6f0e0 → #f7f2e4), com sombra de card mais firme
  (3px .16 → 4px .20). Os cards agora "descolam" da página em vez de se fundirem nela.
- **Feed (Redes) reconstruído:** deixou de ser uma coluna de 680px flutuando no vazio. Agora tem
  cabeçalho editorial ("A Rede") e layout `.cols` de duas colunas com uma **lateral viva**:
  - *Termômetro* — fama, reputação e moral em barras + aviso de enquetes abertas;
  - *O Rival* — retrato, clube, overall e o duelo de gols da temporada com veredito narrativo.
  - Estado vazio redesenhado (`.feed-empty`) com ícone e chamada, no lugar do texto solto.
- Regressão: **23/23**. Colapso responsivo verificado a 375px (coluna única, sem overflow
  horizontal); hero legível no mobile.

## Sincronização de elencos reais (API-Football, plano Free)
Resposta ao problema de fundo por trás de "jogadores nos times errados": só 20 dos 187 clubes
tinham elenco real, o resto caía em nomes gerados. Em vez de curar à mão, criado
`scripts/sync-squads.mjs`, que puxa o elenco **atual** de cada clube via API-Football
(`/players/squads`, endpoint sem a restrição de temporada do plano grátis) e grava o resultado
como texto estático em `js/data.js` (`REAL_SQUADS`) — **o jogo em si nunca faz chamada de rede
a essa API**; a chave só existe em tempo de sync/build, lida de um `.env` local (fora do git,
`.gitignore` criado).
- **23 clubes brasileiros sincronizados** (7 da Série A que faltavam + os 16 da Série B
  inteiros): rbb, mir, vit, cap, cfc, cha, rem, spt, for, cea, juv, goi, ava, cri, ame, crb,
  pay, vil, pon, gua, ope, amz, ath. Os 13 clubes de Série A já curados à mão (fla, pal, cor,
  sao, flu, bot, gre, int, cru, cam, vas, san, bah) foram preservados sem alteração.
  **Total: 43 clubes com elenco real** (de 20 antes).
- IDs de time confirmados manualmente contra a API (nome + cidade da sede) antes de gastar
  cota — evitou trocas como Vitória-BA vs. Vitória-ES.
- A API só devolve posição larga (Goleiro/Zagueiro-Lateral/Volante-Meia/Ponta-Atacante);
  distribuição fina (GOL/ZAG/LAT/VOL/MEI/PON/ATA) é determinística por ordem de camisa,
  aproximando a mistura real de um elenco.
- Script é **idempotente e cacheável**: respostas ok ficam em `scripts/.cache/squads/`
  (gitignored) — reexecuções não gastam cota; erros de rate limit não são cacheados,
  permitindo retry seguro. Plano Free: 100 req/dia, ~10 req/min — script respeita isso com
  um intervalo entre chamadas.
- Validado: elenco (Clube → Elenco) e artilharia agora mostram consistentemente **o mesmo
  jogador no mesmo clube** para todos os 43 clubes (ex.: Wendel/Ceará, João Ricardo/Fortaleza,
  Lucas Arcanjo/Vitória). Regressão: **23/23**.

## Correção — Bola de Ouro sempre em 13º
Reportado pelo jogador: aparecia quase sempre em 13º na Bola de Ouro, mesmo em temporadas
fracas — "não era pra aparecer se eu não fui um dos melhores". Diagnóstico com uma simulação
de 25 carreiras de ATA (motor real, via shim de `balance-runner`) confirmou: **62,5% das
temporadas** o jogador caía em exatamente 13º (último lugar), porque `ballonRanking` sempre
inseria o jogador numa lista fixa de 12 craques mundiais fixos (`worldStars`, overall 84–95) +
o próprio jogador = 13 posições — e ele quase nunca superava o *pior* desses 12, então caía
sempre em último, temporada após temporada, independente de ter feito uma boa ou má temporada.
- **Correção** (`js/engine.js` · `computeAwards`): o jogador só entra na lista/recebe rank
  se `pScore >= menor pontuação dos 12 craques fixos` nesta temporada — critério não
  arbitrário, é literalmente "você teria entrado na lista ou não". Se não bater nem o pior
  dos 12, a temporada fica marcada como **sem indicação** (`rank: null`), em vez de forçar
  um "13º" sem sentido.
- Recalibrado com o mesmo diagnóstico: **antes** 62,5% das temporadas em 13º; **depois** só
  0,4% (casos legítimos de "fui mesmo o pior dos indicados") e ~61% corretamente sem
  indicação, concentradas fora do pico de carreira. A taxa de vitória (nº 1) **não mudou** —
  a fórmula de pontuação e o critério de vitória são os mesmos, só a exibição de posições
  sem sentido foi removida.
- UI atualizada em 3 pontos (`js/ui.js`): resumo de temporada (`ballonBlock` — mostra "Você
  não recebeu indicação ao prêmio este ano" no lugar do pódio/veredito), aba Carreira →
  Marcos (histórico mostra "sem indicação" em vez de posição, e "melhor:" ignora temporadas
  não indicadas), texto explicativo atualizado.
- Regressão: **23/23**. Validado end-to-end no navegador (temporada fraca → "sem indicação"
  sem vazar `null` no texto; temporada boa → posição real 1–13).

## Sincronização de elencos reais — parte 2 (Brasil 100% + início da Europa)
- **Todos os 63 clubes brasileiros do jogo agora têm elenco real** (Série A 20/20, Série B
  16/16, estaduais 27/27) — cobertura completa, de 20 clubes no início da sessão para 63.
  Alguns clubes menores (Boavista-RJ, Caldense) vieram com elenco mais magro (6–16 jogadores)
  porque a própria API tem menos dados cadastrados para esses times — ainda assim, 100%
  nomes reais, sem geração procedural.
- **Início da Europa:** 42 clubes sincronizados nesta sessão — **Espanha 16/16** e
  **Inglaterra 16/16 completas**, **Itália 10/17**. Somado aos 7 clubes já curados à mão
  (Real Madrid, Barcelona, Man City, Liverpool, PSG, Bayern, Inter de Milão), total de
  **49/108 clubes europeus** com elenco real.
  IDs de time resolvidos via `/teams?country=X` (uma chamada por país, sem custo extra de
  correspondência de nomes) e confirmados manualmente nos poucos casos ambíguos
  (ex.: "Athletic Bilbao" aparece na API como "Athletic Club").
- **Pendente para a próxima rodada** (mesmo mecanismo, reexecutar
  `node scripts/sync-squads.mjs`): 7 clubes da Itália + Alemanha 17 + França 17 +
  Portugal 18 = **59 clubes**. O script é idempotente — já tem os IDs de todos mapeados,
  cache local evita regastar cota em clubes já sincronizados, e um limite de chamadas
  ao vivo por execução (`node scripts/sync-squads.mjs <N>`) evita estourar o limite diário
  do plano Free (100/dia) no meio da sincronização.
- **Total atual: 112 clubes com elenco real** (era 20 no início da sessão).
- Regressão: **23/23**.

## Correção — Artilharia sempre visível, mesmo fora da briga
Mesmo pedido do jogador aplicado à artilharia: só aparecer na lista quando estiver perto do
gol/assistência de quem vem logo à frente — igual à regra da Bola de Ouro.
- **Descoberta durante a implementação:** comparar os números AO VIVO (proporcionais ao
  quanto já rolou de temporada, como já eram exibidos na tela) não funciona como critério de
  proximidade — no início de qualquer temporada todo mundo, inclusive os craques, tem poucos
  gols, então uma diferença de 1-2 gols parece "perto" mesmo sem sentido algum (confirmado
  com um zagueiro de 0 gols aparecendo na lista 4 rodadas dentro da Liga).
- **Correção** (`js/ui.js` · `scorersHTML`): o critério passou a ser a **projeção de ritmo
  para a temporada inteira** (extrapolação do seu gols/jogo atual × rodadas da liga),
  comparada às metas reais dos 12 artilheiros NPC + rival. Só aparece se a diferença for
  ≤ 2 gols/assistências do colocado imediatamente acima. Com menos de 5 jogos de liga
  disputados, a amostra é considerada cedo demais e a linha fica oculta por padrão.
- Validado por posição com simulação real (12+ carreiras cada): **ATA aparece ~95%** das
  vezes (atacante genuinamente costuma estar na briga), **GOL só ~6%** (goleiro quase nunca
  concorre a artilheiro), **VOL/LAT ~49-58%** (depende da temporada real) — diferenciação por
  posição que não existia antes (antes, todos apareciam ~80-97% do tempo independentemente
  da posição, por causa do viés do número ao vivo).
- Quando oculto, mostra nota explicativa com a projeção e a distância real
  ("No seu ritmo atual, você projeta ficar a N gols de Fulano — ainda fora da briga direta").
- Regressão: **23/23**.
- **Nota de ferramental:** durante a validação, o preview do navegador chegou a servir uma
  versão em cache do JS (sintoma: código no disco já corrigido, mas comportamento antigo em
  tela). Contornado recarregando os módulos via `fetch` + `eval` direto no console antes de
  validar — não é um problema do jogo, é uma peculiaridade do ambiente de preview.

## Escudos reais dos clubes (decisão explícita — uso pessoal/entre amigos)
O jogador pediu escudos oficiais reais em vez dos vetoriais procedurais. Flaguei o risco
antes de implementar: escudo de clube é **marca registrada** (diferente de nomes/estatísticas,
que são fatos de uso livre) — foi exatamente por isso que a especificação original do CRAQUE
pedia brasões vetoriais próprios. O jogador confirmou que o jogo é **só para uso pessoal,
entre amigos, nunca publicado/distribuído publicamente** — decisão explícita e informada dele,
registrada aqui para contexto futuro. Ver `README.md` § Direitos de imagem.
- **`CQ.DATA.CREST_MAP`** (`js/data.js`): mapa clubId → ID do time na API-Football, reaproveitado
  do trabalho de sincronização de elencos (151 clubes) + 20 adicionais dos clubes já
  curados à mão (13 brasileiros + 7 europeus grandes: Real Madrid, Barcelona, Man City,
  Liverpool, PSG, Bayern, Inter). **171 clubes com escudo real** de 187 no jogo — faltam só
  os 16 sul-americanos (Libertadores/Sula), pendentes da próxima sincronização.
  IDs confirmados manualmente (nome + cidade da sede) antes de usar.
- **`crestSVG` (`js/util.js`)** ganhou uma camada nova: se o clube tem ID mapeado, renderiza
  `<img>` apontando para `media.api-sports.io` (CDN pública, **não precisa da chave de API**
  — mesmo padrão já usado pelas bandeiras via flagcdn.com). Sem mapeamento, ou se a imagem
  falhar ao carregar (`onerror`), cai automaticamente no brasão vetorial procedural original
  — sem quebrar nada, sem depender de internet para clubes não mapeados.
  Prioridade: logo customizado do jogador (já existia) > escudo real mapeado > vetorial.
- Regressão: **23/23**. Validado visualmente (Flamengo, Volta Redonda, Boavista, Botafogo
  com escudo oficial correto na tela; River Plate — ainda sem ID — caindo no vetorial).

## Próximos passos (fase seguinte — Mundo Real 2026)
1. Terminar a sincronização de elencos europeus (Alemanha, França, Portugal, resto da
   Itália — 59 clubes, mecanismo já pronto em `scripts/sync-squads.mjs`).
1b. Mapear os 16 clubes sul-americanos (River Plate, Boca Juniors, etc.) — elenco real +
    `CREST_MAP` — precisa de `/teams?country=X` para Argentina/Uruguai/Chile/Paraguai/
    Equador/Colômbia/Bolívia (novas chamadas, aguardar reset de cota).
2. **Arquitetura do mundo** (`CQ.world`): snapshot versionado + modelo de jogador estruturado;
   `squadOf` lendo do mundo com fallback para geração.
3. Envelhecimento/aposentadoria global, base e mercado de NPCs; telas editoriais do mundo.
4. **Ajuste opcional:** Bola de Ouro ocasional para defensores/goleiros de elite (hoje ~0).
