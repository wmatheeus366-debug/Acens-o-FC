# IMMERSION_IDEAS.md — CRAQUE, Modo Carreira

> Documento de direção de arte / UX focado em **imersão**.
> Escopo: só análise e design. Nada aqui foi implementado — é um mapa de intenções
> que respeita a identidade "boletim/jornal esportivo" (papel creme, tinta, vermelhão
> `--verm`, verde-bandeira `--green`, Fraunces + Barlow), roda offline e continua vanilla.
>
> Referências de código citam funções/telas reais de `js/ui.js`, `js/live.js`,
> `js/util.js`, `js/narrative.js` e as folhas `css/style.css` / `css/editorial.css`.

---

## 0. Leitura geral — onde está a alma hoje

O jogo já tem uma **voz** rara: a metáfora de jornal é levada a sério e é consistente.
O masthead com "Ano `IX` · Nº 9 · Edição BR" (`mastheadHTML`), a primeira página em duas
colunas (`.frontpage` → `homeHTML`), a manchete gerada do próximo jogo (`leadHeadline` /
`leadDeck`), o ticker de resultados, o box-score da rodada, o dossiê do atleta no rail,
as tabelas agate, a cerimônia de sorteio com bolinhas caindo da urna (`showDrawCeremony`
+ `@keyframes drawpop`), os brasões vetoriais próprios (`crestSVG`) e retratos procedurais
(`portraitSVG`) — tudo isso é personalidade de verdade, não um dashboard genérico. **Isso
não pode ser descaracterizado; deve ser amplificado.**

Onde falta **alma / momento / atmosfera**, em uma frase: o jogo *conta* muito bem, mas
raramente *encena*. Os grandes picos emocionais do futebol — o gol, o apito final que dá
o título, a taça levantada, a despedida — são resolvidos com uma linha de texto, um
`toast()` ou um banner estático. A tela também **troca sem respiro**: `render()` faz
`app.innerHTML = ...` inteiro, o scroll salta pro topo e não há transição — a "página viva"
pisca como um reload. E não há **nenhum som** em lugar nenhum, o que num jogo de futebol é
a metade que falta da experiência.

A tese deste documento: **transformar os 4–5 momentos-pico em cenas encenadas** (com
tempo, tipografia grande, movimento contido e som opcional sintetizado) e **dar continuidade
física** ao resto (transições, contadores, selos), sempre dentro da linguagem de impressão —
tinta que seca, papel que vira, "EXTRA! EXTRA!", fita de teleimpressora — nunca com estética
neon de UI gamer.

---

## 1. Crítica honesta, tela por tela

### Capa / `coverHTML`
**Funciona:** a marca gigante `CRAQUE.` em Fraunces itálico, o filete duplo, o subtítulo
espaçado. É bonita e séria.
**Falta alma:** é uma capa *muda e parada*. Não há sensação de "primeira edição saindo da
gráfica". O logo poderia respirar, o filete poderia se desenhar, e um som grave/curto de
"prensa" ao entrar selaria o tom. Hoje entra e sai como qualquer landing.

### Criação / `createStep0..3`
**Funciona:** fluxo limpo em 4 passos com stepper (`.steps`), escolha de lendas ("Os Craques")
e clube com brasão. Objetivo e sem fricção.
**Falta alma:** o **retrato do jogador nunca aparece durante a criação**. Você monta um atleta
sem rosto e só o vê depois. O `portraitSVG(name+seed)` é o maior ativo de identificação do
jogo e está escondido no cadastro. Também não há "prévia do craque" reagindo às escolhas
(posição, número na camisa, lenda inspiradora). O momento de nascimento do personagem é frio.

### Início / primeira página / `homeHTML`
**Funciona:** é o melhor da casa. Manchete contextual, deck com posição na tabela e forma,
matchup com brasões, ticker, box-score com a sua atuação descrita por posição (`atuacaoBits`),
faixa da diretoria, e o rail com dossiê + classificação + redes. Densidade jornalística real.
**Falta alma:**
- O **momento pré-jogo** é uma manchete e dois brasões. Não há *ritual de dia de jogo* —
  nada de "faltam X para a bola rolar", clima/estádio, escalação provável, tom da torcida.
  O botão "Jogar a partida" dispara direto o resultado.
- A **nota da última partida** (`notaPill(lr.nota)`) e o placar aparecem já prontos no
  box-score. Sem revelação, sem peso. Um 9,2 e um 4,1 chegam com a mesma temperatura.
- Não há **contadores animados**: patrimônio, fama, condição são números estáticos.
- Ao voltar de uma partida simulada, a home re-renderiza inteira e o olho se perde — não
  há "o que mudou desde ontem".

### Modo ao vivo / `renderLiveOverlay`, `liveStep`, `makeDecision`, `renderShootout`
**Funciona:** é o sistema mais imersivo que já existe. Cronologia minuto a minuto, o
"Continuar ›" que cria tensão, decisões interativas com probabilidade exposta
(`makeDecision`), eventos de atmosfera em jogo decisivo (sinalizadores, VAR, invasão,
mosaico — o `flavorPool` em `live.js`), e os pênaltis revelados lance a lance com bolinhas
(`.shoot-dots`) e comentário. Muito bom.
**Falta alma:**
- **O gol não tem clímax.** `mm-ev.goal` é uma linha verde com texto "GOOOOL!". O momento
  supremo do futebol é uma `<div>` a mais no feed. Deveria *parar tudo*.
- **O relógio não anda.** `.live-clock` mostra o placar, não o minuto correndo; o tempo
  "pula" de evento em evento. Falta a sensação de cronômetro.
- **Sem trilha sonora de estádio.** Nenhum murmúrio, apito, rede balançando. Silêncio total.
- O **apito final que decide um título** revela o `showTitleCelebration` só *depois* de
  fechar o overlay — o clímax e a celebração ficam desconectados por um clique.

### Celebração de título / `showTitleCelebration` + `.trophy-banner`
**Funciona:** existe, é dourada, tem o filete diagonal e um bônus. Reconhece o feito.
**Falta alma:** é **um banner estático com um SVG de taça genérico**. Todo título — do
estadual à Libertadores — recebe a mesma imagem. Não há build-up, não há confete/fita, não
há distinção de porte (embora `trophyIcon` já saiba diferenciar `WC`/`UCL`/`LIB` de mid/small).
O maior pico de dopamina do modo carreira é resolvido em um cartão que não se move.

### Carreira / `careerHTML` (abas Atributos, Marcos, Evolução, Temporadas, Conquistas, Duelo)
**Funciona:** o `.player-card` no topo é lindo — barra tricolor no topo (`::after`), textura
hachurada, plate de overall. A aba Marcos com barras de progresso pro próximo marco, a
Evolução com `chartSVG` (linha de overall + linha tracejada de potencial), o Duelo com o rival
de geração e o retrospecto V-E-D em `scoreline`. É rico.
**Falta alma:**
- **Conquistas / sala de troféus (`trophHTML`) é uma lista.** Títulos e prêmios viram linhas
  de texto com um ícone de taça de 1em. Não há *vitrine*, não há "estante", não há orgulho
  visual. É o oposto de uma sala de troféus.
- **A Evolução (`chartSVG`) só mostra overall.** A carreira não tem uma **linha do tempo
  narrativa** (estreia, 1º gol, 1º título, transferência, virou ídolo, Bola de Ouro,
  aposentadoria). Os marcos existem nos dados mas não viram história visual.
- O `.player-card` é ótimo mas **não é colecionável**: sem raridade por tier de overall, sem
  verso, sem exportar/guardar. Ele muda a cada render e ninguém pode "ficar" com ele.

### Torneios / `compsHTML` (Panorama, Calendário, Liga, Artilharia, mata-matas, Seleção, Campeões)
**Funciona:** completíssimo e muito "caderno de esportes": panorama por competição,
calendário com tags e resultados, tabelas com zonas coloridas (`z-lib`/`z-sula`/`z-reb`),
artilharia com você destacado, brackets (`.bracket`/`tieHTML`), e — ótimo toque — os
**artilheiros históricos reais** com você inserido na lista (`hallScorersHTML`).
**Falta alma:** é a área mais "planilha". Tudo correto, pouco encenado. O **chaveamento** é
funcional mas frio; um bracket é um lugar natural pra drama (o caminho até a final). E
entrar na lista histórica (`hallScorersHTML`) — passar uma lenda real — deveria ser um
**momento anunciado**, não uma linha que muda de posição em silêncio.

### Redes / `feedHTML`, `postHTML`, `pollHTML`
**Funciona:** o feed com avatares (retrato/brasão/bandeira), tags Imprensa/Torcida/Rival,
posts "hot" com gradiente vermelho (`.post.hot`) e as enquetes votáveis com barras. Dá vida
social ao mundo.
**Falta alma:** posts **aparecem todos de uma vez**, sem cadência de "chegando agora". Não há
distinção visual entre *manchete de jornal* e *post de torcedor* — tudo tem o mesmo desenho de
card. E os posts nascem já com likes/reposts formatados (`fmtK`), sem a sensação de repercussão
crescendo. O feed conta a reação, mas não a *deixa acontecer*.

### Clube / `clubHTML` (Visão geral, Elenco, Estilo de vida, Contrato, Save)
**Funciona:** o medidor de confiança do técnico (`managerConf` + barra), o centro de
treinamento com foco de treino, a estátua de ídolo mencionada, estilo de vida com bens que
geram renda, e o campo honesto de "escudo personalizado" (respeitando não usar logos oficiais).
**Falta alma:** é a tela mais "config". O **técnico** tem retrato e confiança mas nenhuma
*fala* — nunca te olha nos olhos. Virar **ídolo do clube** (estátua, nome eternizado) é um
feito enorme entregue como `notice ok` verde. O vestiário é um número, não um lugar.

### Fim de temporada e mercado / `showSummary`, `ballonBlock`, `showMarket`
**Funciona:** o balanço é denso e satisfatório — títulos, prêmios, ranking mundial (Bola de
Ouro em `ballonBlock`), acesso/rebaixamento, virou ídolo/capitão, novos traços, valor de
mercado, rival da geração, envelhecimento. E o mercado com propostas reais e renovação.
**Falta alma:** é **um único overlay comprido que se lê de cima a baixo**. Um balanço de
temporada pede *ritmo de premiação* — um item de cada vez, o mais importante por último.
Ganhar a **Bola de Ouro** (ser nº 1 do mundo) aparece como uma `badge badge-gold` no meio de
uma lista. Deveria ser a manchete do ano.

### Aposentadoria / `retroHTML` + `careerLegacy`
**Funciona:** o veredito da carreira por tier ("LENDA IMORTAL" … "CARREIRA PROFISSIONAL"),
números totais, sala de troféus e histórico. Digno.
**Falta alma:** é a **capa de despedida mais importante da vida do personagem** e está montada
com os mesmos cards do dia a dia. Não é uma *edição histórica* de verdade — deveria ser a
peça mais memorável e exportável do jogo inteiro.

### Transições, som e microinterações (transversal)
- **Transições:** inexistentes entre telas (`render()` troca o DOM inteiro). Existem apenas
  `fadein`/`pop` em overlays, `evin` no feed ao vivo, `blink`, `drawpop`, `toastin`. O corpo
  da página nunca transiciona.
- **Som:** zero. Nenhum uso de Web Audio. Maior oportunidade de imersão por esforço médio.
- **Microinterações:** os botões têm a ótima sombra de "carimbo" (`translate` + `box-shadow`).
  Fora isso, números não sobem, barras não preenchem, notas não "carimbam". `prefers-reduced-motion`
  já é respeitado (bom cidadão) — qualquer coisa nova precisa herdar esse respeito.

---

## 2. Catálogo priorizado de melhorias de imersão

Notação: **Impacto** (Alto/Médio/Baixo) × **Esforço** (Alto/Médio/Baixo). Tudo viável em
vanilla JS, offline, sem assets externos. Ordenado aproximadamente por retorno.

---

### A. Momentos encenados (gol, título, prêmio, marco)

#### A1 — "STOP PRESS": splash de gol em tela cheia · **Impacto Alto · Esforço Médio**
**O que é:** quando *você* marca no modo ao vivo (evento com `big:true` / `fx.myGoal`), a
cronologia pausa e um overlay curto (~1,6s) toma a tela: fundo tinta, a palavra **GOL** em
Fraunces black gigante com efeito de "carimbo batido" (leve rotação + escala), a linha
"EDIÇÃO EXTRA · 73' — Fulano" em Barlow Condensed, o placar atualizado e o brasão. Some sozinho
(ou com clique) e devolve ao feed.
**Por que aumenta imersão:** hoje o gol é uma `<div>` verde. Este é *o* momento do futebol;
merece parar o mundo. Em linguagem de jornal, "EXTRA! EXTRA!" é exatamente o gesto certo —
não é confete gamer, é manchete de última hora.
**Implementação:** novo `goalSplash(ev, live)` em `ui.js`, chamado dentro de `liveStep()`
quando o evento revelado for gol seu; reusa `overlay()` (ou um `.splash` dedicado com
`position:fixed`). Classe `.goal-splash` em `editorial.css` com `@keyframes stamp`
(rotate(-4deg)+scale). Diferenciar gol seu (verde/tinta) de gol sofrido (um "..." menor,
sóbrio). Herdar `prefers-reduced-motion` (mostra estático, sem stamp). Casa com o som A/D1.

#### A2 — Cerimônia de título com fita de teleimpressora · **Impacto Alto · Esforço Médio**
**O que é:** evoluir `showTitleCelebration`. Sequência de 2–3 tempos: (1) "É CAMPEÃO" se
desenhando, (2) a **taça correta por porte** (o `trophyIcon`/tier já sabe distinguir
WC/UCL/LIB de mid/small) subindo com brilho, (3) chuva de **fita de teleimpressora** — tiras
de papel nas cores do clube (`club.c1`/`c2`) e ouro caindo. Mantém o `.trophy-banner`
dourado como base.
**Por que aumenta imersão:** o pico de dopamina da carreira hoje não se move. Ticker-tape
(desfile de papel picado) é *literalmente* a celebração de título mais icônica — e é papel,
casa perfeitamente com a identidade. Distinguir a taça faz a Libertadores *pesar* mais que o
estadual.
**Implementação:** `<canvas>` sobre o overlay para as fitas (partículas retangulares, sem
imagem), ou 20–30 `<i>` com `@keyframes fall` e `transform` aleatório (mais barato, funciona
offline). Cores lidas de `oppObj`/`myClub`. Reaproveitar `careerLegacy`/`trophyIcon` para o
tier. Encadear com `finishLive` para que o apito → taça seja contínuo (resolver o desencontro
citado na crítica).

#### A3 — Balanço de temporada como cerimônia de premiação · **Impacto Alto · Esforço Médio**
**O que é:** transformar o `showSummary` de "um overlay comprido" em **envelopes abertos um a
um** ("E o prêmio de artilheiro vai para…"), do menor pro maior, terminando na **Bola de
Ouro** se você for nº 1 do mundo (`ballonBlock`). Cada passo é um clique "Próximo envelope ›".
**Por que aumenta imersão:** premiação é ritmo e suspense; ler tudo de uma vez mata os dois.
Ser eleito o melhor do mundo tem de ser a última carta virada, não uma badge no meio da lista.
**Implementação:** refatorar `showSummary` para uma máquina de passos (array de "cenas":
títulos → prêmios → ranking mundial → mercado/aging), guardando `CQ.state.summaryStep`. Sem
dados novos — só reordenar o que `endSeason` já produz. A Bola de Ouro ganha tela própria com
o filete dourado e som de A/D2.

#### A4 — Selo de nota "carimbado" no box-score · **Impacto Médio · Esforço Baixo**
**O que é:** a `notaPill` da última partida (na home e no box-score) entra com uma animação
de carimbo (escala 1.3→1, leve rotação, um "thump"). Notas ≥8 recebem um selo "CRAQUE DA
PARTIDA"; ≤4 um carimbo "APAGADO" em vermelho.
**Por que aumenta imersão:** dá peso emocional à sua avaliação — a diferença entre um 9 e um
4 passa a ser *sentida*. Carimbo é vocabulário de redação/arquivo, on-brand.
**Implementação:** classe `.nota-stamp` com `@keyframes stamp` em `editorial.css`; aplicar em
`homeHTML` quando `S.lastRes` for recém-criado (flag "novo resultado"). "Craque da partida"
reusa `res.motm`/nota. Custo mínimo, alto charme.

---

### B. Atmosfera de dia de jogo

#### B1 — Ritual pré-jogo: "faltam X para a bola rolar" · **Impacto Alto · Esforço Médio**
**O que é:** antes de "Jogar a partida", a manchete de `homeHTML` ganha uma **faixa de dia de
jogo**: clima/horário fictício determinístico (sol/chuva/noite via `rngFor`), estádio
(mando), "escalação provável" (usa `squadOf`), tom da torcida (deriva de moral/forma), e um
mini "túnel" — os dois brasões se aproximando. O CTA vira "Entrar em campo".
**Por que aumenta imersão:** hoje o jogo começa do nada. O futebol é *antecipação*. Este é o
respiro que falta entre a página e o apito — e reaproveita dados existentes.
**Implementação:** `matchdayBanner(G, fx)` em `ui.js`, inserido no `lead` de `homeHTML`.
Clima/hora determinísticos por `rngFor(seed,"weather",year,idx)`. Escalação de `squadOf`.
CSS `.matchday` com um gradiente sutil de "gramado sob refletor" usando só `--green`/`--ink`
(sem foto). Casa com som B/D3 (murmúrio crescente).

#### B2 — Relógio de partida que anda + barra de momentum · **Impacto Médio · Esforço Médio**
**O que é:** no modo ao vivo, `.live-clock` passa a mostrar o **minuto correndo** entre um
evento e o próximo (interpolação simples), e uma fina **barra de pressão** (posse/momentum)
oscila para o time que está por cima, colorida `--green`/`--verm`.
**Por que aumenta imersão:** a cronologia fica *viva* em vez de saltar. A barra dá leitura
instantânea de "quem está melhor" sem texto.
**Implementação:** em `liveStep`, animar o número do minuto do evento anterior até o atual com
`requestAnimationFrame` (respeitando reduced-motion → salta direto). Momentum derivado de
`res`/eventos já calculados (nenhuma mudança no motor). Barra reusa `.bar`. Determinismo do
motor intacto — é só apresentação.

#### B3 — Feed que "chega agora" com cadência · **Impacto Médio · Esforço Baixo**
**O que é:** ao abrir Redes ou o rail de home após um jogo, os posts entram escalonados
(stagger de ~80ms, reusando o gesto de `evin`/`drawpop`), os mais "hot" primeiro, com um
pulso no contador de likes.
**Por que aumenta imersão:** repercussão que *acontece* na sua frente > lista pronta. Reforça
a sensação de mundo reagindo a você em tempo real.
**Implementação:** `postHTML` já existe; adicionar `style="animation-delay"` incremental no
container em `feedHTML` e no rail de `homeHTML`. Classe `.post--incoming`. Zero mudança de
dados. Herdar reduced-motion.

---

### C. Colecionáveis e keepsakes (a marca registrada possível)

#### C1 — Cartão do craque colecionável (figurinha de álbum) · **Impacto Alto · Esforço Médio**
**O que é:** promover o `.player-card` a uma **figurinha** de verdade, no capricho do álbum
antigo: moldura por **raridade de overall** (bronze <70, prata 70–79, ouro 80–89, "lendário"
90+ com filete tricolor já existente), retrato `portraitSVG` grande, nº da camisa, posição,
brasão, e no verso os números da temporada. Botão **"Salvar figurinha"** que exporta PNG.
**Por que aumenta imersão:** dá ao jogador um objeto *seu*, guardável e compartilhável — o
tipo de coisa que faz alguém printar e postar. É colecionável de futebol na estética certa
(figurinha/sticker, não card gamer holográfico).
**Implementação:** o cartão já é HTML/SVG. Export via `<canvas>` + `drawImage` de um blob SVG
serializado (ou `html-to-canvas` caseiro desenhando os elementos) → `canvas.toDataURL()` →
link de download. Tudo offline. Molduras por tier em `editorial.css` (variações de `--gold`/
prata/bronze com as variáveis existentes). Verso com flip via `transform: rotateY` + clique.

#### C2 — Capa de jornal gerada (manchete histórica exportável) · **Impacto Alto · Esforço Alto**
**O que é:** em conquistas marcantes (título grande, Bola de Ouro, virar ídolo, recorde
histórico em `hallScorersHTML`, aposentadoria), o jogo **compõe uma capa de jornal completa**
— masthead "CRAQUE", manchete gigante gerada, deck, foto = `portraitSVG` em bico-de-pena,
box-score/estatística e um "olho" lateral — e oferece **"Guardar capa"** (PNG) + arquivo em
uma **banca de capas** acessível na Carreira.
**Por que aumenta imersão:** é a materialização máxima da premissa "o boletim da sua carreira".
Cada capa é um troféu narrativo único. O acervo de capas vira a autobiografia visual do
personagem — algo que nenhum "career mode" de planilha entrega.
**Implementação:** um gerador `frontPageComposer(event)` que monta um `.frontpage-artifact`
(layout de impressão fixo, ~1080×1350 pra caber em stories). Reusa `leadHeadline`-style,
`portraitSVG`, `crestSVG`. Export por `<canvas>` (mesmo pipeline de C1). Persistir metadados
das capas no save (título, ano, tipo) e re-renderizar sob demanda — barato, determinístico.
Esforço alto pela composição tipográfica caprichada, mas é o **carro-chefe** de imersão.

#### C3 — Sala de troféus visual (estante, não lista) · **Impacto Alto · Esforço Médio**
**O que é:** substituir a lista de `trophHTML` por uma **estante/vitrine**: prateleiras de
madeira-tinta com as taças vetoriais (`trophyIcon`, já com tiers) dispostas por porte,
plaquinhas gravadas (ano + clube), e um brilho sutil ao passar o mouse. Prêmios individuais
viram uma "parede de placas". A Bola de Ouro tem lugar de honra no centro.
**Por que aumenta imersão:** "sala de troféus" tem de *parecer* uma sala. Ver as taças
crescerem em número e porte ao longo da carreira é orgulho tangível.
**Implementação:** `trophyRoomHTML(p)` em `ui.js` substitui/ complementa `trophHTML`. Grid de
prateleiras em CSS (linhas com `border-bottom` grosso tinta + sombra). Escalar `trophyIcon`
para 40–64px, colorir por tier. Sem dados novos — lê `p.titles`/`p.awards`. Entrada com
stagger reusando `drawpop`.

#### C4 — Linha do tempo da carreira (o filme do jogador) · **Impacto Médio · Esforço Médio**
**O que é:** nova aba/seção na Carreira: uma **timeline vertical editorial** com os marcos
reais — estreia, 1º gol, 1º título, cada transferência (do `p.career`), virou ídolo/capitão,
cada Bola de Ouro (`p.ballon`), recordes, aposentadoria — cada um como uma "entrada de diário"
datada com brasão e uma frase gerada.
**Por que aumenta imersão:** o `chartSVG` mostra *o quê* (overall). A timeline mostra *a
história*. Dá sentido narrativo à sequência de temporadas, que hoje é uma tabela (`histHTML`).
**Implementação:** `careerTimelineHTML(G)` derivando eventos de `p.career`, `p.titles`,
`p.awards`, `p.ballon`, `p.idolClubs`. CSS `.timeline` com filete vertical `--rule` e nós
`--verm`. Reaproveita `crestSVG`/`portraitSVG`. Só apresentação de dados existentes.

---

### D. Som opcional sintetizado (Web Audio, sem nenhum asset)

> Um único módulo novo `js/audio.js` (`CQ.audio`), **desligado por padrão**, com um botão no
> `theme-fab`/masthead ("Som: on/off", persistido como o tema em `localStorage`). Tudo gerado
> por `OscillatorNode`/`AudioBufferSourceNode` com ruído — **zero arquivos**, roda offline,
> respeita mudo do sistema. Cada efeito é uma função curta.

#### D1 — Apito, rede e "gol" · **Impacto Alto · Esforço Médio**
**O que é:** apito do árbitro (dois osciladores quadrados ~2–3kHz com vibrato) no início/fim e
em faltas; um "swish" curto de rede (ruído filtrado passa-alta) quando a bola entra; um
*swell* grave + brilho no seu gol, sincronizado com o splash A1.
**Por que:** som de futebol é indispensável; apito e rede são assinatura instantânea.
**Implementação:** `CQ.audio.whistle()`, `.net()`, `.goal()` disparados de `live.js`/`liveStep`.
`AudioContext` criado no primeiro gesto do usuário (política de autoplay). ~60 linhas.

#### D2 — Torcida sintetizada (murmúrio → explosão) · **Impacto Alto · Esforço Alto**
**O que é:** um leito de **ruído rosa filtrado** como murmúrio de estádio, cuja amplitude e
corte de filtro sobem em momentos quentes (seu gol, pênalti, título) e caem no silêncio do gol
sofrido — um "ooooh" e um "goool" *emergentes*, sem sample.
**Por que:** a torcida é a emoção do estádio. Modular ruído dá 80% da sensação com 0 assets.
**Implementação:** `AudioBufferSourceNode` com buffer de ruído em loop + `BiquadFilter` +
`GainNode` automatizados por `setTargetAtTime`. Ligado ao modo ao vivo e às cerimônias.
Esforço alto pelo ajuste fino do timbre, mas altíssimo retorno atmosférico.

#### D3 — Ambiência de UI de impressão · **Impacto Baixo · Esforço Baixo**
**O que é:** microtoques discretos — "clique de máquina de escrever" ao trocar de aba, um
"whoosh de papel" curto na transição de tela (E1), um grave de "prensa" na capa. Volume baixo,
fáceis de silenciar.
**Por que:** costura o tema tátil de redação/gráfica.
**Implementação:** `CQ.audio.tick()`/`.paper()` chamados de `go()`/`render()`. Muito barato.

---

### E. Microinterações e transições

#### E1 — Transição de página "virar a folha" · **Impacto Médio · Esforço Médio**
**O que é:** `render()`/`go()` passam a fazer um crossfade+slide curtíssimo (120–160ms) do
`<main>` — tinta que assenta, não reload. Opcional: leve efeito de "página virando" nas trocas
de aba principal.
**Por que:** hoje a "página viva" pisca. Uma transição contida vende a continuidade do boletim
sem virar animação chamativa.
**Implementação:** envolver a troca de conteúdo em `go()` com uma classe `.page--leaving`/
`.page--entering` (`opacity`/`translateY`) e trocar o DOM no `transitionend` (ou timeout curto).
Preservar posição de scroll quando fizer sentido. **Respeitar `prefers-reduced-motion`** (já
há o bloco global — herdar).

#### E2 — Contadores que sobem (patrimônio, fama, gols, marcos) · **Impacto Médio · Esforço Baixo**
**O que é:** números-chave (`.tnum` em tiles do dossiê, patrimônio no `metaCard`, progresso de
marcos em `marcosHTML`) fazem *count-up* quando entram na tela ou quando mudam após um jogo.
**Por que:** ver o número *crescer* dá recompensa; número parado é dado. Marcos ganham a
sensação de "chegando lá".
**Implementação:** util `animateCount(el, from, to, ms)` com `requestAnimationFrame`; aplicar
seletivamente em `homeHTML`/`marcosHTML`. Guardar valores anteriores no `CQ.state` pra saber o
delta. Barato. Reduced-motion → seta direto.

#### E3 — Barras que preenchem e marco que "estala" · **Impacto Baixo · Esforço Baixo**
**O que é:** `.bar > i` anima de 0 até o valor ao aparecer (condição, moral, overall vs
potencial, progresso de treino em `clubHTML`). Ao bater um marco (`afterMatchFlow` já detecta
`res.milestones`), a barra correspondente dá um flash dourado.
**Por que:** reforça leitura de progressão e transforma "bater marco" (hoje um `toast`) em algo
visto no corpo da página.
**Implementação:** `@keyframes fillbar` + transição de `width`; classe `.bar--hit` com flash
`--gold`. Sem dados novos.

#### E4 — Prévia do craque na criação · **Impacto Médio · Esforço Baixo**
**O que é:** trazer o `portraitSVG` (e um mini `.player-card`) para o lado do formulário em
`createStep0..3`, atualizando ao vivo com nome/posição/número/lenda escolhida.
**Por que:** o nascimento do personagem é o primeiro laço emocional; hoje é cego. Ver o rosto
surgir enquanto se escolhe cria apego imediato.
**Implementação:** re-render já acontece a cada `dset`; basta adicionar um painel com
`portraitSVG(d.name+seedProvisório)` e um resumo. O `seed` final muda no `newGame`, então usar
uma seed de prévia estável por sessão (ou aceitar que o rosto se fixa ao concluir — decisão de
design a validar). Baixíssimo custo.

#### E5 — Reação do técnico com fala · **Impacto Baixo · Esforço Baixo**
**O que é:** no card "Técnico & vestiário" (`clubHTML`), o treinador ganha uma **fala curta
gerada** conforme a confiança (`managerConf`) e sua última atuação — "Preciso de mais de você"
/ "Você é meu homem de confiança". Balão de fala em estilo de citação editorial.
**Por que:** dá rosto e voz ao vestiário, que hoje é um medidor. Aproxima o técnico do jogador.
**Implementação:** pequeno gerador em `narrative.js` (`managerLine(conf, lastRes)`), render em
`clubHTML`. Reusa `portraitSVG("mgr"+nome)` já presente.

---

## 3. Nota de coerência com a identidade (guarda-corpo)

Para nenhuma dessas ideias virar "SaaS/gamer genérico":
- **Vocabulário sempre de imprensa/broadcast:** "EXTRA", "STOP PRESS", "envelope", "capa",
  "banca", "carimbo", "fita de teleimpressora" — não "level up", "combo", "XP flutuante".
- **Paleta travada nas variáveis** (`--verm`, `--green`, `--gold`, `--ink`, `--paper`): nada de
  neon, glow ciano, gradiente arco-íris. Brilho, quando houver, é dourado tinta.
- **Tipografia é a estrela:** momentos grandes = Fraunces black gigante, não ícones 3D.
- **Movimento contido e curto** (120–1600ms), sempre atrás de `prefers-reduced-motion`.
- **Som off por padrão**, sintetizado, sem asset — mantém o deploy estático e offline.
- **Sem logos/fotos oficiais:** tudo segue em `crestSVG`/`portraitSVG` procedurais.

---

## 4. Top 5 recomendado

Escolhidos por **máxima imersão específica de futebol × respeito à identidade × viabilidade
vanilla-offline**, cobrindo os momentos-pico e um keepsake marcante:

1. **A1 — Splash de gol "STOP PRESS" (Alto × Médio).**
   O buraco emocional mais gritante do jogo. O gol é *o* momento e hoje é uma linha de texto.
   Transforma o modo ao vivo — já o mais imersivo — em algo memorável, com o gesto mais
   on-brand possível (manchete de última hora). Melhor relação impacto/esforço do catálogo.

2. **A2 — Cerimônia de título com fita de teleimpressora (Alto × Médio).**
   O maior pico de recompensa da carreira precisa se *mover* e *pesar diferente* por porte de
   taça. Ticker-tape é papel picado: a celebração de título mais icônica do mundo, e
   literalmente dentro da metáfora de papel. Corrige de quebra o desencontro apito→taça.

3. **C2 — Capa de jornal gerada e exportável (Alto × Alto).**
   O carro-chefe da premissa "o boletim da sua carreira". Cada conquista vira uma capa única,
   guardável e compartilhável — a autobiografia visual do personagem. É o recurso que dá ao
   CRAQUE uma assinatura que nenhum career mode de planilha tem. Esforço maior, mas define o
   produto. (Se o esforço apertar, **C1 — cartão colecionável** entrega 70% do encanto por
   metade do custo e usa o mesmo pipeline de export.)

4. **D1+D2 — Som de futebol sintetizado: apito, rede e torcida (Alto × Médio-Alto).**
   A metade que falta da experiência. Apito e rede (D1) são baratos e transformadores;
   a torcida modulada (D2) leva a atmosfera do estádio a outro nível — tudo por Web Audio,
   sem um único arquivo, mantendo o deploy estático e offline. Ligado ao A1/A2 para
   sincronizar imagem e som nos clímax.

5. **B1 — Ritual de dia de jogo na primeira página (Alto × Médio).**
   Cria a *antecipação* que hoje não existe entre a página e o apito, reaproveitando dados que
   já temos (`squadOf`, forma, moral) e vivendo dentro da própria home editorial. É o respiro
   que faz cada partida começar como um acontecimento, não como um clique.

**Sequência sugerida de execução:** A1 → D1 (imediatamente sinérgicos) → A2 → B1 → A3/E-series
como polimento → C1 → C2 como a grande investida de identidade. As microinterações (E2/E3/E4)
podem entrar em paralelo, pois são baratas e independentes.
