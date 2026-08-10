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

## Correção — escudos reais somem para quem usa bloqueador de anúncio
Reportado: um amigo que recebeu o link (`wmatheeus366-debug.github.io/Acens-o-FC`) via
bloqueador de anúncio via não via os escudos aparecerem — nem a imagem real, nem o brasão
vetorial de reserva (espaço em branco).
- **Causa:** o fallback só reagia ao evento `onerror` da `<img>`. Muitos bloqueadores não
  bloqueiam a requisição de rede (o que dispararia erro) — em vez disso, escondem via CSS
  ou trocam a resposta por um pixel transparente "carregado com sucesso". Nesses casos
  `onerror` nunca dispara, e a imagem "carrega" vazia.
- **Correção** (`js/util.js` · `crestSVG`): adicionado um segundo gatilho no `onload` que
  confere se a imagem realmente veio com conteúdo (`naturalWidth < 10` → trata como falha e
  cai no brasão vetorial, igual ao `onerror`). Testado isolando um `<img>` com a `src` trocada
  por um pixel 1×1 (mesmo comportamento de bloqueador real): antes ficava em branco, agora
  cai corretamente no vetor procedural.
- Regressão: **23/23**.

## Seleção: mais eliminatórias + boa campanha protege a convocação
Reportado: uma boa temporada pela seleção não impedia o corte na temporada seguinte, e
faltavam jogos de eliminatórias.
- **Mais eliminatórias** (`js/engine.js` · `buildNationalCycle`): de **2 janelas de 2 jogos
  (4/ano)** para **4 janelas de 2 jogos (8/ano)**. Pool de adversários agora repete de forma
  segura quando a confederação tem poucas seleções disponíveis (CONCACAF/AFC, só 7-8
  nações) — testado isoladamente, sem `undefined` nem travar.
- **Convocação passa a considerar o desempenho PELA seleção** (`endSeason`): antes, o corte
  olhava só overall/nota do CLUBE — uma campanha ótima nas eliminatórias não segurava a vaga
  se o clube tivesse ano fraco. Agora, quem já estava convocado e teve uma temporada forte
  pela seleção (≥2 jogos, ≥2 gols+assistências somando eliminatórias/torneio) mantém a vaga
  com um critério de overall mais largo — **sem depender de lesão**, porque uma contusão
  sofrida nas últimas rodadas (dura 3-8 jogos) não tem relação com o quanto a campanha foi
  boa e não deveria zerar a temporada inteira.
- Validado por simulação (473 amostras de temporadas já convocadas): **antes** parte dos
  destaques pela seleção eram cortados por causa só do timing de uma lesão; **depois**,
  **0 dos 399 casos** com boa campanha pela seleção foram cortados. O critério normal
  (baseado no clube) continua igual para quem não se destacou pela seleção.
- Regressão: **23/23**.

## Nova competição — Mundial de Clubes + Supermundial
Pedido: ganhar a Libertadores (ou Champions) deveria abrir o Mundial de Clubes, e também
queria o "Supermundial" — confirmado com o jogador que são duas coisas diferentes, no
espírito das duas competições reais que a FIFA passou a ter: a Copa Intercontinental
(pequena, anual) e o novo Mundial de Clubes 2025+ (grande, a cada 4 anos).
- **Mundial de Clubes** (`js/engine.js` · `buildMundialCycle`): sempre que o clube atual do
  jogador vence Libertadores ou Champions numa temporada, a temporada seguinte inclui um
  **confronto único** (estilo Intercontinental pré-2000) contra o campeão simulado do outro
  lado do mundo (LIB→adversário é o campeão da UCL daquele ano, e vice-versa). Pênaltis em
  caso de empate. Só conta se o título foi ganho **neste mesmo clube** — não segue o jogador
  se ele transferir depois de ser campeão (o convite é do clube).
- **Supermundial** (torneio grande e raro): a cada 4 anos (2029, 2033, ...), se o clube tiver
  vencido Libertadores/Champions em algum dos últimos 4 anos, disputa um torneio de verdade —
  grupo de 4 (3 adversários) + mata-mata completo (oitavas/quartas/semi/final), com clubes de
  todas as confederações (Américas + Europa). Chaveamento por blocos disjuntos, igual às
  outras competições continentais/seleção (sem ressuscitar eliminado).
- **Prêmios:** título dá fama, dinheiro (Supermundial paga mais que qualquer coisa do jogo —
  R$ 4M — maior que a própria Copa do Mundo) e pontua alto na Bola de Ouro (Supermundial 50,
  Mundial 26 — acima até de Libertadores/Champions isolados).
- Aparecem no calendário com cor dourada própria (`c-mun`) e entram automaticamente na sala
  de troféus / lista de títulos (ícone grande, junto com Copa do Mundo/Champions/Libertadores).
- Validado por simulação: Mundial de Clubes testado nos dois desfechos (vitória → título,
  fama e bônus aplicados; derrota → sem título, sem crash); Supermundial testado com grupo +
  mata-mata completo até a final, título aplicado corretamente; e também o caso de cair na
  fase de grupos (elimina sem título, igual a um torneio de seleção de verdade).
- Regressão: **23/23**.

## Temporada mais rápida — modo ao vivo só nas finais
Pedido: a temporada estava lenta demais de jogar porque quase toda partida importante
(eliminatórias, mata-matas de copa inteiros, fase de grupos de torneio) virava modo ao vivo.
- **Critério de "decisivo" (o que aciona o modo ao vivo) ficou restrito às FINAIS de
  verdade** (`js/engine.js` · `resolveSlot`/`peekSlot`): antes, oitavas/quartas/semi de
  qualquer copa, TODAS as eliminatórias (8/ano), fase de grupos de torneio de seleção,
  clássicos e duelos de rival na liga, e até fase de grupos do Supermundial entravam no
  modo ao vivo. Agora só a última partida de cada competição (Final) — Estadual, Copa do
  Brasil/copa nacional, continental (Libertadores/Champions/etc.), torneio de seleção
  (Copa do Mundo/América/Euro) e Supermundial — mais o Mundial de Clubes (que já é um
  confronto único). Tudo o mais resolve na hora com um clique.
  Clássicos e duelos de rival continuam com o tempero narrativo (textos, badges), só não
  travam mais o jogo no modo ao vivo.
- Validado por simulação: temporada "normal" caiu de dezenas de partidas decisivas em
  potencial para **2** (só as finais que o clube realmente disputou); temporada "cheia"
  (seleção convocada + Mundial de Clubes aberto, overall de elite) chegou no máximo a
  **4** — Mundial de Clubes, final estadual, final de copa nacional, final continental.
- Também corrigido: `peekSlot` (pré-visualização do calendário) não tinha branch pro
  Mundial de Clubes/Supermundial — agora aparecem corretamente na agenda.
- Regressão: **23/23**.

## Linha do tempo, mais matérias/enquetes, tema escuro padrão
Quatro pedidos numa leva: a ideia nº5 da lista de imersão (linha do tempo da carreira),
mais variedade de matérias e enquetes no feed, e o layout abrir no tema escuro por padrão.
- **Linha do tempo da carreira** (nova aba "Linha do tempo" em Carreira, `timelineHTML` em
  `js/ui.js`): filete vertical com marcos reais — estreia, transferências (detectadas
  comparando o clube entre temporadas consecutivas em `p.career`), títulos, prêmios
  individuais, Bolas de Ouro conquistadas, virada de ídolo, capitania e aposentadoria.
  Sem dado novo pesado: só 2 campos mínimos adicionados (`p.captainYear`, `p.idolYears`)
  pra poder datar eventos que já existiam sem ano associado.
- **Matérias de mundo** (`maybeWorldNews` em `js/narrative.js`): antes, 100% dos posts do
  feed giravam em torno do próprio jogador. Agora, ~22% das partidas jogadas também podem
  gerar uma matéria de bastidores sobre **outros clubes** — mercado, pressão no técnico,
  base revelando joia, público recorde, arbitragem polêmica, e trivia histórica puxada de
  `CHAMPS_SEED` real ("Relembre: em X, o Y levantou a taça da Z").
- **Mais enquetes**: de 6 para 16 modelos (`POLL_TEMPLATES`), cobrindo tópicos novos —
  comparação com o rival de geração, rumor de mercado, corrida pelo título, capitania,
  Bola de Ouro, e até uma opinião geral sobre futebol mundial sem ser sobre você
  (Libertadores vs. Champions). Enquetes agora suportam `{rival}` no texto, além de
  `{name}`/`{club}`.
- **Tema escuro como padrão** (`js/main.js`): quem abre o jogo pela primeira vez agora vê o
  tema escuro de cara — o alternador continua lá pra quem preferir claro. Quem já tinha uma
  preferência salva (inclusive claro) mantém exatamente o que já tinha escolhido.
- Regressão: **23/23**. Validado com simulação real (timeline com estreia/títulos/prêmios
  renderizando certo; matérias mencionando clubes de verdade tipo Fluminense/Chapecoense;
  enquete nova "O técnico do Flamengo está fazendo um bom trabalho?" aparecendo no feed).

## Sincronização de elencos e escudos — 100% concluída (187/187 clubes)
Com a cota diária renovada, terminada a sincronização que ficou pendente: resto da Itália,
Alemanha, França e Portugal inteiros (151/151 do lote europeu), mais os 16 clubes
sul-americanos de Libertadores/Sul-Americana (River Plate, Boca Juniors, Racing,
Independiente, Estudiantes, Peñarol, Nacional-URU, Colo-Colo, U. de Chile, Cerro Porteño,
Olimpia, LDU Quito, Barcelona-EQU, Bolívar, Millonarios, Atlético Nacional).
- IDs de time confirmados manualmente (nome + cidade da sede) antes de sincronizar —
  ex.: LDU Quito não aparecia direto na busca (só a categoria de base), achado buscando
  por "Liga" no país (id 1158, "LDU de Quito").
- **Todos os 187 clubes do jogo agora têm elenco real E escudo oficial real** — cobertura
  completa, de 20 clubes com elenco/escudo no início da fase de sincronização.
- Validado: River Plate (Salas, Driussi, Beltrán no ataque), Boca Juniors (Marchesín no gol),
  escudo do River carregando de verdade (`naturalWidth: 150`, não quebrado).
- Regressão: **23/23**.

## Mundo Real 2026 — Fatia 1: identidade persistente de NPCs (`CQ.world`)
Primeira fatia da fase "Mundo Real 2026" (planejada desde o início do projeto). Antes,
`squadOf` recalculava idade/overall de cada jogador do REAL_SQUADS **do zero a cada
chamada** via RNG determinística — determinístico, mas sem memória real: o mesmo jogador
aparecia com idades diferentes em anos diferentes, nunca envelhecia de fato, nunca se
aposentava, nunca era substituído por uma base.
- **Novo `js/world.js`** (`CQ.world`): cada um dos 187 clubes ganha um elenco com
  **identidade estável** (`g.world.clubs[clubId].roster`) que avança uma vez por temporada
  (`advanceWorld`, chamado de `endSeason`) — envelhece, ganha/perde overall conforme a
  mesma curva de idade do próprio jogador (`applyAging`), e se aposenta nos mesmos limiares
  (`age>=40 || (age>=37&&ovr<80) || (age>=35&&ovr<74) || (age>=33&&ovr<66)`), sendo
  substituído por uma promessa gerada (nunca reaproveita nome real).
- **Migração de save antigo é invisível**: o mundo é semeado com a **mesma chave de RNG**
  que `squadOf` sempre usou (`seed, "squad", clubId, ano`) — carregar um save em andamento
  reproduz byte a byte o que a tela de elenco já mostrava um instante antes. Validado:
  18/18 jogadores do elenco do Flamengo bateram exatamente com a fórmula antiga ao migrar.
- **`squadOf`, `topAttackerName` e `buildScorers` recableados** pra ler do mundo
  persistente, com fallback pro gerador antigo preservado (save em migração, ou clube sem
  dado no mundo). `topAttackerName` agora escolhe o de **maior overall** entre ATA/PON/MEI
  do elenco (antes pegava só o primeiro por ordem de posição).
- **Validado por simulação** (`scripts/world-check.mjs`, novo — mesmo padrão do
  `balance-runner.mjs`): 20 temporadas simuladas, `g.world` de 187 clubes serializa a
  **~270 KB** (bate com a estimativa do plano), idade avança exatamente 1/temporada pra
  quem não se aposenta, aposentadoria+reposição confirmada (por volta da 2ª década de
  carreira simulada, praticamente todo o elenco original já passou por reposição — esperado,
  não bug, dado que quase 20 anos passam).
- Regressão: de 23 pra **27 checagens** (migração de save cobre `g.world` agora; novo teste
  `testWorldAging` confere envelhecimento e reposição ao longo de temporadas simuladas).
- **Fora desta fatia** (próximos passos explícitos): mercado de transferências entre NPCs
  (clubes comprando/vendendo jogadores entre si), telas de mundo (tabelas de ligas que o
  jogador não disputa), olheiro de base / geração de promessas com mais destaque.

## Mundo Real 2026 — Fatia 2: mercado de transferências autônomo entre NPCs (`CQ.market`)
Segunda fatia da fase "Mundo Real 2026", entregando o item 1 dos próximos passos da Fatia 1:
clubes NPCs agora compram e vendem jogadores **entre si**, sem envolver o jogador — distinto
do sistema de ofertas que já existia só pro próprio jogador (`makeOffers`/`acceptOffer`,
intocado).
- **Novo `js/market.js`** (`CQ.market`): a cada virada de temporada, `advanceMarket` identifica
  jogadores do mundo persistente claramente acima do nível do clube atual (mesmo raciocínio de
  "encaixe" que `makeOffers` já usa: `gap = overall - (clubStr - 4)`), e os move pra um clube
  mais forte compatível (mesma liga, ou liga europeia se overall ≥78, 50% de chance). Limite de
  18 transferências/temporada no mundo inteiro, 1 clube por temporada (só compra ou só vende).
- **Mecânica "troca-e-repõe"**: o clube de origem repõe a saída com uma promessa gerada (mesma
  fórmula da reposição por aposentadoria, id marcado com `_t` em vez de `_r`); o clube de
  destino perde o jogador mais fraco na mesma posição (ou o mais fraco do elenco), sem sobra —
  tamanho de cada elenco nunca muda, nenhum campo novo em `{id,name,pos,age,ovr,real}`. Nenhuma
  mudança de esquema de save.
- **Notícia no feed**: reaproveita o mesmo mecanismo de `notes` que já gerava
  `rival-transfer`/`rival-retire` (array já passado por `endSeason` → `sum.notes` →
  `CQ.nar.onSeasonEnd`). Só transferências grandes o bastante viram notícia (jogador real,
  overall ≥80, ou liga do jogador envolvida), com valor de mercado estimado (`estimateValue`,
  mesma curva de `marketValue`, sem persistir nada).
- **Validado por simulação** (`scripts/world-check.mjs`, estendido): 19 temporadas simuladas,
  1–18 transferências/temporada (média 11,8), nenhum elenco muda de tamanho, ~150 jogadores
  transferidos entre clubes ao longo da simulação. Textos de notícia lidos manualmente —
  nomes indo pra clubes coerentes, valores plausíveis pro overall.
- Regressão: de 27 pra **30 checagens** (`testMarketTransfers`: tamanho de elenco constante,
  nenhum id duplicado, pelo menos 1 notícia de transferência em 15 temporadas simuladas).

## Mundo Real 2026 — Fatia 3: tabelas reais das outras ligas
Terceira fatia, entregando o item 1 dos próximos passos da Fatia 2: as 7 ligas que o
jogador não disputa numa temporada (Série B ou 6 ligas europeias, a que sobrar) agora têm
**tabela de pontos corridos de verdade** — turno e returno, jogo a jogo, V/E/D/SG/Pontos
reais — em vez do sorteio de campeão por força que já existia (`recordChampions`).
- **`refreshWorldLeagues`** (novo, em `js/engine.js`): reaproveita **sem nenhuma
  reinvenção** o mesmo motor que já roda a liga do próprio jogador — `leagueComp` +
  `finishLeague` (que já existia e, quando nenhum time é o do jogador, degenera
  exatamente em "resolve toda rodada e devolve a tabela") + `tableOf`/`leagueZones`.
  Roda uma vez por temporada (fim de temporada, igual a `recordChampions`/
  `promoteRelegate` — ninguém acompanha rodada a rodada uma liga que não é a sua).
- **Guardado em `g.world.leagues[liga]`**: um snapshot por liga, sobrescrito a cada
  temporada (sem histórico acumulado — só a tabela final do ano corrente).
- **Nova aba "Mundo"** dentro de Torneios: seletor de liga + tabela real com zona de
  acesso/rebaixamento pintada, reaproveitando `leagueTableHTML` (mesmo componente da
  tabela da própria liga do jogador, sem CSS novo).
- **Independente do sorteio de campeão existente** (`g.champs`, tela "Campeões"): os dois
  processos usam RNGs separados de propósito, então o nome do campeão histórico
  ocasionalmente pode não bater com o 1º colocado da tabela nova — cosmético, aceito
  conscientemente pra não mexer numa função já testada que também sorteia CDB/LIB/UCL.
- **Validado por simulação** (`scripts/world-check.mjs`, estendido): 20 temporadas,
  140 verificações estruturais (7 ligas × 20 anos), 0 problemas — jogos/pontos/gols
  batem em todas. ~76 KB adicionados ao save por esse snapshot.
- Regressão: de 30 pra **35 checagens** (`testWorldLeagueTables`: 7 ligas presentes já
  na criação da carreira, aritmética de jogos/pontos/gols correta, snapshot renovado a
  cada temporada; migração de save antigo cobre `g.world.leagues` também).

## Mundo Real 2026 — Fatia 4: olheiro de base (notícia + aba "Base")
Quarta e última fatia planejada da fase "Mundo Real 2026". O jogo já gerava promessas em
segundo plano (reposição por aposentadoria em `world.js`, backfill de transferência em
`market.js`) — 100% invisível até aqui. Escopo menor confirmado com o usuário (sem stat de
potencial nova, sem navegação pelos 187 clubes): só notícia + uma aba de visualização.
- **Notícia de promessa notável**: quando uma promessa recém-gerada (aposentadoria OU
  transferência) rola próxima do teto da sua faixa (`ovr >= clubStr - 9`, ~18% das
  rolagens) E é da liga do jogador, vira notícia no feed (`"Base: <nome> (<idade> anos,
  <posição>) chama atenção nas categorias de base do <clube>..."`). Reaproveita o mesmo
  pipeline `notes` → `sum.notes` → `onSeasonEnd` já usado por `world-transfer`.
- **Nova aba "Base"** na tela do Clube: jogadores ≤20 anos do próprio elenco, ordenados
  por overall, reaproveitando `squadOf` (herda o fallback de saves em migração de graça).
  Sem stat nova, sem interação — só visualização.
- `advanceWorld(g)` ganhou o parâmetro `notes` (único call site de produção, em
  `endSeason`; testes/diagnóstico só chegam lá indiretamente via `endSeason`, sem
  ajuste necessário).
- **Validado por simulação**: 20 temporadas, 83 promessas notáveis geradas (todas na
  liga do jogador, por design), textos e tabela conferidos manualmente no navegador.
- Regressão: de 35 pra **38 checagens** (`testProspectBreakout`: pelo menos 1 notícia em
  20 temporadas, shape da nota completo, dados da aba Base bem formados).

## Imersão: ritual de jogo, cerimônia de temporada, rivalidade de clubes, alerta de olheiro
Quatro melhorias de imersão escolhidas pelo usuário numa lista de sugestões, independentes
entre si (não fazem parte de "Mundo Real 2026", já concluída).
- **Ritual de dia de jogo**: nova `matchdayBanner(G, fx)` na home, entre o confronto e o
  botão de jogar — clima/torcida fictícios (determinísticos via `rngFor(seed,"matchday",
  year,season.idx)`, nunca piscam entre renders) e uma "escalação provável" derivada de
  `squadOf`, com o próprio jogador encaixado na sua posição quando disponível. 100% aditivo,
  nenhuma mudança no botão de jogar.
- **Balanço de temporada como cerimônia**: `showSummary()` deixou de ser um overlay único
  e virou uma sequência de passos ("envelopes") — título/abertura → números da temporada →
  prêmios individuais → Bola de Ouro (sempre por último, o maior reveal) → administrativo
  (fecha no mesmo botão de sempre, `summaryNext()`, inalterado). Passos sem conteúdo são
  pulados dinamicamente. Confete/som de troféu movidos pro passo certo (título e/ou Bola de
  Ouro) em vez de disparar tudo no topo. Reaproveita o mecanismo de reabrir `overlay()`
  já usado por `showTitleCelebration`/`closeTitle`.
- **Rivalidade de clubes**: o campo `rivals` já existia (46/187 clubes com clássico real
  cadastrado) mas cobria só os pares curados. Agora todo clube ganha ao menos um rival —
  brasileiro sem par real pega o mais forte do mesmo estado, europeu sem par pega o mais
  forte da mesma liga, nunca sobrescrevendo rivalidade real. Novo `g.clubRivalry[clubId]`
  (placar V-E-D por rival, distinto do `g.h2h` do rival de geração pessoal), atualizado em
  `applyMatch` quando `fx.classic`, mostrado num novo card na aba Duelo.
- **Alerta de "clube na mira"**: quando uma promessa notável (`prospect-breakout`, já
  existente) tem overall Europa-relevante (`>=78`, mesmo limiar de `EURO_UNLOCK_OVR` em
  `market.js`), um post extra de olheiros europeus de olho é adicionado — sem estado novo
  persistido, puramente narrativo.
- Regressão: de 38 pra **46 checagens** (cobertura/simetria de rivais, placar do clássico
  simulado via `applyMatch` real, rumor de olheiro europeu presente pra cada promessa
  Europa-relevante, migração de `g.clubRivalry`).

## Imersão parte 2: Bola de Ouro pra defensores, contadores animados, fala do técnico
Continuação da lista de imersão. Um item pedido (transição suave entre telas) já estava
implementado desde o commit inicial do projeto (`main.page, .cover { animation: pageIn
0.26s ease both; }`, `css/editorial.css`) — confirmado rodando no navegador, nada a fazer.
- **Bola de Ouro pra defensores/goleiros de elite**: `ballonScore` (`js/engine.js`) tinha
  dois termos gigantes e sem teto de puro ataque (gols/assistências) e só goleiro tinha
  compensação (clean sheets). Agora a média de nota (`avg`, já o "equivalente a gol" da
  posição segundo `docs/RATING_MODEL.md`) pesa mais pra GOL/ZAG/LAT/VOL, e zaga/lateral/
  volante também ganham crédito por clean sheets (antes só goleiro). Continua raro — não
  empata com atacante — mas uma temporada defensiva realmente elite agora chega perto da
  faixa de indicação em vez de ficar estruturalmente fora.
- **Contadores que sobem**: patrimônio e fama na home, e as barras de progresso da aba
  Marcos, agora contam/deslizam do valor antigo pro novo (`animateCount`/`animateBarWidth`,
  novo em `js/ui.js`, `CQ.state.lastSeen` guarda o "antes"). Sem stat/tela nova — só
  apresentação. Respeita `prefers-reduced-motion` (pula direto pro valor final).
- **Fala do técnico**: card "Técnico & vestiário" ganhou uma citação curta (`.mgr-quote`)
  que varia com a mesma faixa de confiança que a UI já mostrava (75/55/35), determinística
  por rodada (não pisca ao trocar de sub-aba dentro de Clube).
- Regressão: de 46 pra **58 checagens** (fórmula nova da Bola de Ouro favorece defensores
  vs a antiga, fala do técnico determinística e no pool certo por faixa).

## Correções de dados reais + ajuste de UI
- **Botão "Poupar"** ganhou cor própria (`.btn-gold`, `css/style.css`) — antes usava o
  estilo padrão sem cor, igual a nenhum outro botão da linha de ação.
- **Copa do Mundo 2026**: `D.CHAMPS_SEED.WC` ganhou `2026: "Espanha"` (final 1-0 sobre a
  Argentina, gol de Ferran Torres na prorrogação, Rodri Bola de Ouro do torneio).
  `D.HALL_SCORERS.WC` atualizado: Mbappé agora lidera com 22 gols na carreira em Copas
  (10 no torneio de 2026), superando o recorde histórico de Klose (16) — texto da aba
  Campeões ajustado de "até 2025"/"a partir de 2026" pra "até 2026"/"a partir de 2027".
- **Brasileirão Série B**: tinha só 16 clubes (dado desatualizado); a Série B real tem 20
  desde a reformulação de formato. Adicionados Náutico, Figueirense, Paraná Clube e
  Sampaio Corrêa — `LEAGUES.BRB.rounds` ajustado de 30 pra 38 (turno/returno de 20 times).
  De quebra, dois clássicos reais novos: Sport×Náutico e Avaí×Figueirense. Mundo agora tem
  **191 clubes** (era 187).
- **Elenco real dos 4 novos clubes da Série B**: sincronizado via `scripts/sync-squads.mjs`
  (Náutico id=755, Figueirense id=137, Paraná Clube id=122, Sampaio Corrêa id=155) — 20,
  20, 20 e 19 jogadores reais respectivamente. Escudo real também ativo via `CREST_MAP`
  (mesmos IDs, CDN pública, sem sync separado).
- Regressão: contagem de clubes do mundo ajustada de 187 pra 191 (`testWorldAging`).
- **Mais dois fatos reais atualizados** (mesma categoria, achados numa checagem posterior):
  `D.CHAMPS_SEED.CDB` ganhou `2025: "Corinthians"` (campeão da Copa do Brasil 2025, bateu
  o Vasco no returno) e `D.CHAMPS_SEED.UCL` ganhou `2026: "Paris Saint-Germain"` (bicampeão
  europeu, bateu o Arsenal nos pênaltis na final de 2025-26).

## Resync de elencos com a janela de transferências de 2026 (em andamento)
Cache local (`scripts/.cache/squads/`) limpo pros 167 clubes já sincronizados antes (mantidos
só os 4 novos da Série B, sincronizados no mesmo dia) — força o script a buscar dado fresco
da API em vez de reaproveitar squads de meses atrás. Rodado em 3 lotes até a cota diária da
API-Football estourar de vez ("request limit for the day").
- **109/171 clubes do `CLUB_TEAM_MAP` já resincronizados** com o elenco real de 2026.
- Os clubes ainda não alcançados nesta rodada ficam temporariamente com elenco gerado
  (fallback procedural de `js/world.js`, sem quebrar nada — mesmo comportamento de um clube
  sem `REAL_SQUADS`) até a cota renovar e o script rodar de novo. Reexecutar
  `node scripts/sync-squads.mjs [N]` pula automaticamente quem já foi sincronizado hoje
  (via cache local) e continua exatamente de onde parou.
- Validado: 58/58 testes, `node scripts/world-check.mjs` sem problemas estruturais.

## Artes de troféu reconhecíveis por competição
`trophyIcon(key)` (`js/ui.js`) deixou de ser um ícone genérico de taça em 2 tamanhos e
ganhou desenho vetorial próprio (SVG, 100% procedural — mesmo espírito de `crestSVG`/
`portraitSVG`, sem imagem externa) com silhueta reconhecível por família de troféu:
- **Copa do Mundo / Mundial de Clubes / Supermundial**: fitas espiraladas erguendo um
  globo, apoiadas numa base — a "assinatura visual" mais icônica do futebol.
- **Champions/Europa League**: taça bojuda com as duas "orelhas" enormes e curvas.
- **Libertadores/Sul-Americana**: base em degraus empilhados, bem diferente das outras.
- **Demais (ligas nacionais, copas domésticas, estaduais, seleção)**: taça clássica
  refinada, ainda simples mas visivelmente melhor que o ícone genérico anterior.
- Usado nos 3 lugares que já chamavam `trophyIcon` (banner de celebração de título, lista
  de títulos na Carreira, sala de troféus) — nenhuma mudança de assinatura/API.
- Decisão de direito de imagem: formato de troféu segue a mesma lógica já usada pros
  escudos reais (uso pessoal, só entre amigos, sem distribuição) — confirmado com o usuário.
- Validado: 58/58 testes, geometria de cada SVG conferida (bounding box, sem coordenada
  fora do viewBox, sem erro de console).

## BUG-03: banner de dia de jogo mostrava elenco do clube em jogo de Seleção
`probableLineup` (`js/ui.js`, do ritual de dia de jogo) nunca checava `fx.isNatMatch` —
em jogo de Seleção, a "escalação provável" continuava puxando `squadOf(G)` (elenco do
**clube**), mostrando companheiros de time errados (ex.: jogando pelo Bayern, aparecia
"Olise" — companheiro de Bayern de verdade — como se fosse da Seleção Brasileira).
- **Corrigido**: em jogo de Seleção, usa o elenco real da Seleção (`D.NAT_SQUADS[nat]`,
  novo) quando disponível; nação sem dado real cai no gerador procedural (mesmo padrão
  de fallback já usado em clubes sem `REAL_SQUADS`).
- **Elenco real da Seleção Brasileira** adicionado (`D.NAT_SQUADS.BR`, 28 jogadores reais
  da convocação de 2026 — Alisson, Marquinhos, Casemiro, Bruno Guimarães, Vinícius Júnior,
  Neymar, Rodrygo, Raphinha, Endrick e outros). Mesmo racional de direito de imagem já
  usado (uso pessoal, nomes/fatos reais, sem distribuição).
- Outras seleções (Argentina, França etc.) continuam com gerador procedural por ora —
  só a Seleção Brasileira foi pedida.
- Validado: 58/58 testes; simulação real até um jogo de Seleção acontecer, confirmado
  que a escalação mostra jogadores reais do Brasil (e o próprio jogador encaixado na
  sua posição quando disponível).

## Elenco real das 14 seleções selecionáveis (`D.NAT_SQUADS`)
Completa o item pendente do BUG-03: as outras 13 nações que dá pra escolher na criação de
carreira (`D.NATIONS`) ganharam elenco real, junto com o Brasil — Argentina, França,
Espanha, Inglaterra, Portugal, Alemanha, Holanda, Itália, Uruguai, Colômbia, México,
Estados Unidos e Japão. Mesmo formato/padrão do Brasil (`sq(...)`, ~18-24 jogadores reais
por seleção, cobrindo goleiro/zaga/lateral/volante/meia/ponta/atacante).
- Validado: 58/58 testes; `Object.keys(NAT_SQUADS).length === 14` (nenhuma nação
  selecionável sem elenco real); confirmado visualmente jogando pela Argentina — jogadores
  reais (Emiliano Martínez, Cristian Romero, Rodrigo De Paul, Enzo Fernández etc.)
  aparecem corretamente na escalação provável, com o próprio jogador encaixado.
- Mesmo racional de direito de imagem já usado no projeto (nomes/fatos reais, uso pessoal).

## Próximos passos
1. Continuar o resync de elencos (item acima) quando a cota diária da API renovar —
   62 clubes restantes (`CLUB_TEAM_MAP` tem a lista completa em `scripts/sync-squads.mjs`).

## BUG-04: texto sumindo em tema escuro + tela de aposentadoria virando caixa gigante
- **Tema escuro**: os dois `<select>` de filtro (aba Mundo, aba Campeões) tinham fundo
  claro fixo (`background:#fffdf6`) sem cor de texto definida, em vez de usar a classe
  `.field` (que já tem suporte a tema escuro). No escuro, o texto herdava a cor clara do
  tema sobre um fundo que continuava claro — texto claro sobre fundo claro, invisível.
  Corrigido pra `background:var(--paper-2);color:var(--ink)` (acompanha o tema).
- **Tela de aposentadoria "caixa gigante"**: "Títulos coletivos" e "Prêmios individuais"
  cresciam sem limite — uma carreira longa (40+ títulos) virava uma lista imensa,
  esticando a página inteira. Agora essas duas listas têm altura máxima (420px) com
  rolagem interna — nada de dado é perdido, só para de esticar a página.
- **Mais uma família de troféu**: copas domésticas de mata-mata (Copa do Brasil e
  equivalentes) ganharam desenho próprio — corpo mais curto com tampa/domo e pomo no
  topo, bem diferente da taça aberta de liga por pontos corridos (que continua pro
  Brasileirão e ligas europeias).
- Escudos "sumindo" pra amigos: **não é bug** — é o fallback (já existente) mostrando o
  brasão vetorial quando a imagem real não carrega na rede de quem está jogando (ex.:
  bloqueador de anúncio). Funcionando como projetado; embutir as imagens reais no
  próprio arquivo eliminaria essa dependência de rede, mas deixaria o arquivo bem maior.
- Validado: 58/58 testes; confirmado visualmente contraste do `<select>` em tema escuro,
  rolagem interna com 40 títulos simulados, geometria distinta de cada nova forma de
  troféu (bounding box + contagem de elementos).

## Copa do Mundo real de 48 seleções (Fatia 1 de "torneios de seleção com caminho visível")
Reescreve a Copa do Mundo do zero: 12 grupos de 4 (48 seleções ao todo — `D.WORLD_POOL`
foi de 22 pra 48, com 26 seleções novas ganhando força/bandeira real), **todos** os 12
grupos simulados de verdade (não só o grupo do jogador — mesmo motor de liga já usado
pras outras 7 ligas do mundo, `leagueComp`/`roundsRR`/`finishLeague`/`tableOf`).
Classificação real: 2 primeiros de cada grupo + 8 melhores terceiros colocados = 32
seleções no mata-mata. Mata-mata de verdade com chaveamento visível e histórico completo
de cada rodada (dezesseis avos → oitavas → quartas → semifinal → final), reaproveitando o
motor que já existia pra Copa do Brasil (`cupComp`/`buildStageTies`/`simTie`/`advanceCup`,
agora parametrizado por `myId` pra também representar seleção em vez de só clube) —
inclusive o **caminho de todo mundo fica visível**, não só o do jogador. Nova **disputa de
3º lugar** (os 2 perdedores da semifinal), formato que não existia em nenhuma outra
competição do jogo.
- Nova aba "Seleção" (quando é ano de Copa) mostra: seletor dos 12 grupos com tabela real
  (`leagueTableHTML`, sem mudança), o chaveamento completo (`cupHTML`/`tieHTML`, sem
  mudança), e o card de disputa de 3º lugar quando existir.
- **2 bugs reais encontrados e corrigidos durante a implementação:**
  - O resto do chaveamento (quartas/semi/final de quem não é o jogador) só era resolvido
    enquanto o jogador ainda estava vivo no torneio — uma vez eliminado, os estágios
    seguintes ficavam pra sempre "a definir", e o campeão real nunca era conhecido.
    Corrigido pra sempre resolver o chaveamento inteiro (mesmo padrão já usado na Copa do
    Brasil: `if (!cup.alive) advanceCup(...)`, aplicado aqui também pra seleção).
  - Mata-mata de seleção (Copa do Mundo **e** o formato antigo de Copa América/Eurocopa/
    Copa Ouro/Copa da Ásia) nunca marcava a partida do próprio jogador como `knock:true` —
    um empate no jogo dele nunca ia pra pênaltis, o adversário avançava automaticamente.
    Corrigido nos 3 pontos (Copa do Mundo, torneios continentais antigos, disputa de 3º).
- Copa América/Eurocopa/Copa Ouro/Copa da Ásia continuam no formato anterior por ora
  (grupo só com o adversário do jogador, chaveamento por bloco) — ganham o mesmo
  tratamento (todos os grupos simulados + chaveamento visível) numa fatia própria futura,
  junto com Libertadores/Champions/Europa League/Sul-Americana (conserta o `C.koOpps`
  morto, confirmado por revisão de código independente) e o Supermundial.
- Validado: 66/66 testes (novo `testWorldCup48` cobre geometria — 12 grupos únicos de 4,
  turno único, 32 avançam, bracket sempre potência de 2, 3º lugar só após as 2 semis);
  simulação de 40+ carreiras aleatórias sem exceção, cobrindo eliminação nos grupos,
  avanço ao mata-mata, disputa de 3º e conquista do título; conferido visualmente que o
  campeão real (`T.champion`) bate com quem realmente venceu a final simulada.

## Achados dos agentes de revisão (funcional + código + UX) — correções pequenas
Rodei 3 agentes em paralelo pra olhar o jogo inteiro (simulação funcional de 835
temporadas, revisão de código de todo `js/ui.js`, avaliação de UX). Corrigidos os achados
pequenos e de baixo risco:
- **Bug real (funcional):** `g.world.leagues` perdia a liga que você acabou de deixar por
  uma temporada inteira após acesso/rebaixamento — `refreshWorldLeagues` rodava **antes**
  de `promoteRelegate` em `endSeason` (`js/engine.js`), então a liga recém-abandonada só
  aparecia no "Mundo" um ano depois. Corrigido invertendo a ordem; junto, a liga que virou
  seu destino agora também é limpa do snapshot (senão ficava com dado velho, congelado, de
  quando ainda não era sua).
- **3 telas sem limite de altura** (Temporadas, Linha do tempo, Histórico de campeões) —
  mesma classe de bug já corrigida na tela de aposentadoria; carreira longa/temporadas
  acumuladas ganham rolagem interna em vez de esticar a página.
- **Dupla escapagem de HTML** na "capa de jornal" de hat-trick/estreia — invisível com os
  dados de hoje, mas corrigido (o nome do clube/seleção só é escapado uma vez agora).
- **Guarda faltando** num acesso a `D.LEAGUES[...]` na aba Torneios (Copa nacional) que
  podia derrubar a tela inteira se algum dia um clube caísse fora do conjunto esperado de
  ligas.
- **Cor de ícone fixa** (cartão amarelo do modo ao vivo) trocada por `var(--gold)`, agora
  acompanha o tema claro/escuro.
- **`badge-gold` reservado pra conquista de verdade** — o status "Em jogo" do mata-mata
  continental (que não é uma conquista, só "ainda não decidido") virou `badge-soft`
  (neutro), pra não confundir com título/prêmio.
- Achados maiores de UX (sub-abas sem indício de rolagem, redundância Ticker/Dossiê na
  Home, sem explicação na 1ª partida "ao vivo", criação de personagem sem preview de
  consequência) e o chaveamento morto de Libertadores/Champions/Europa/Sul-Americana
  ficam de fora desta entrega — não são pequenos, decisão de escopo pendente.
- Validado: 66/66 testes; reproduzido o cenário exato do bug de rebaixamento (Remo, Série
  A → Série B) confirmando a liga antiga aparecendo e a nova sem dado velho; conferido
  visualmente rolagem interna nas 3 telas com uma carreira de 21 temporadas até a
  aposentadoria.

## Conserta o chaveamento morto de Libertadores/Champions/Europa/Sul-Americana + UX
Fatia 4 do roteiro de torneios (a que faltava): `C.koOpps` nunca era escrito em lugar
nenhum — a tela de mata-mata dessas 4 competições sempre aparecia vazia, e jogos futuros
no Calendário ficavam "a definir" pra sempre. Trocado pelo mesmo motor da Copa do Mundo
(`cupComp`/`buildStageTies`/`simTie`/`advanceCup`) — campo fixo de 16 clubes montado assim
que o jogador se classifica do grupo, chaveamento completo guardado (não só o caminho do
jogador), reaproveitando `cupHTML` em vez do `contiHTML` quebrado. Mesmo cuidado da Copa
do Mundo: o resto do chaveamento continua avançando mesmo depois do jogador ser eliminado,
e o campeão real é sincronizado mesmo quando o jogador perde a final.

Junto, os 4 pontos de UX que tinham ficado de fora da rodada anterior:
- **Sub-abas de Torneios**: fade nas bordas (`.subtabs`, `css/style.css`) indicando que dá
  pra rolar pro lado — a barra de rolagem nativa já era escondida de propósito, sem
  nenhum outro indício visual.
- **1ª partida "ao vivo"**: aviso único (na primeira vez que uma partida decisiva
  acontece) explicando que essa partida é acompanhada minuto a minuto — saves antigos são
  tratados como "já sabem", só carreiras novas veem o aviso.
- **Home**: removida a "Forma recente" do Dossiê (últimos 5 jogos em pills soltos) —
  redundante com o Ticker (últimos 12, com placar) que já está na mesma tela.
- **Criação de personagem**: dicas curtas sob idade inicial ("mais novo = mais
  temporadas de crescimento antes do declínio") e pé preferido ("só estética, sem efeito
  nos atributos") — decisões que antes eram tomadas às cegas.
- Validado: 66/66 testes; 24 carreiras simuladas cobrindo Libertadores e Champions/Europa
  (16 times, 4 estágios, campeão sempre resolvido, zero exceção); fluxo do aviso de "ao
  vivo" testado ponta a ponta (aparece uma vez, marca visto, transiciona pro modo ao vivo
  de verdade).
