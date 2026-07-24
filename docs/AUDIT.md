# AUDIT.md — CRAQUE (auditoria consolidada)

Auditoria do estado atual antes da **Fase de Estabilidade** (Plano de Estabilidade) e do
**Mundo Real 2026** (Adendo). Consolidação das perspectivas de arquitetura, QA/bugs,
balanceamento, game design, UX/acessibilidade e persistência/segurança.

> Nota de método: a auditoria foi feita sobre o código-fonte real do projeto
> (`js/util.js`, `js/data.js`, `js/engine.js`, `js/narrative.js`, `js/live.js`,
> `js/ui.js`, `js/main.js` + `CRAQUE.html` empacotado), verificando na prática as
> alegações dos documentos. Onde o documento previa um bug, ele foi reproduzido ou
> refutado com um teste concreto.

---

## 1. Arquitetura

**Estado atual**
- App web estática vanilla, sem build. Namespace global `window.CQ` com submódulos
  (`util`, `DATA`, `engine`, `nar`, `live`, `ui`, `main`). Carregados por `<script>`
  em ordem no `index.html`; versão de distribuição de arquivo único em `CRAQUE.html`
  (CSS + JS inline, gerado por `node` de build).
- CSS em dois arquivos: `css/style.css` (design system base) + `css/editorial.css`
  (camada "broadsheet" + temas claro/escuro).

**Pontos fortes**
- Separação de responsabilidades já razoável por arquivo (motor x narrativa x UI).
- RNG determinístico por seed já existe (`util.rngFor`/`mulberry32`) e é usado em quase
  todo o motor.

**Acoplamentos / dívidas identificadas**
- `engine.js` é grande (~1.7k linhas) e mistura: modelo, calendário, simulação, prêmios,
  mercado, técnico, traços. Candidato a submódulos (`engine/season`, `engine/match`,
  `engine/world`, `engine/awards`).
- `ui.js` também grande; telas poderiam virar módulos por tela.
- **Acoplamento frágil live↔ui** (corrigido nesta fase — ver §2).
- Alguns `Math.random()` diretos em `util` (helpers `ri/choice/chance/shuffle` usam
  `Math.random` quando não recebem `rng`). No motor a maioria já passa `rng` derivado da
  seed, mas há chamadas de gameplay sem `rng` (ex.: `benchRoll`, `resolveMatch` usam
  `U.ri`/`U.chance` sem `rng`). **Determinismo total ainda não garantido** — ver §5.

**Proposta** (Fase de Estabilidade, sem quebrar deploy estático)
```
src/styles/            style.css, editorial.css
src/js/util/           rng, format, sanitize, portrait, crest
src/js/data/           clubs, leagues, nations, legends, real-squads, hall
src/js/engine/         model, season, fixtures, match, awards, market, manager, traits
src/js/narrative/      feed, interviews, life-events, polls, rival
src/js/ui/             screens/*, live, overlays, components
src/js/save/           schema, migrate, storage, export-import
tests/
```
Build continua gerando um `CRAQUE.html` único (Vite opcional, saída estática).

---

## 2. QA / Bugs

### BUG-01 — Placar do modo ao vivo (previsto no Plano) — **VERIFICADO e CORRIGIDO**
- **Antes:** `live.chooseDecision` incrementava `live.score` **e** inseria um evento de
  gol; `ui.liveDecide` fazia `live.i++` para "pular" o evento, evitando a dupla contagem.
  Funcionava, mas por acoplamento frágil (dependia do `i++` manual da UI).
- **Correção:** `chooseDecision` passou a alterar **apenas** o resultado da partida
  (`res.gm/pg/go`); o **placar visual `live.score` é alterado só por `step()`** ao revelar
  o evento inserido. `liveDecide` agora só chama `chooseDecision` + `liveStep()`.
  Invariante: **cada gol altera o placar visual exatamente uma vez**.
- **Regressão:** `tests/regression.js › live-score-single-count`.

### BUG-02 — Importação de save sem validação/migração — **VERIFICADO e CORRIGIDO**
- **Antes:** `importSave` validava só `player && season && player.name` e **não** passava
  pelo `migrate()`. Um save antigo importado entrava sem os campos novos → risco de erro.
- **Correção:** criado `validateAndMigrate()` usado por **`load()` e `importSave()`**.
  Adicionado `schemaVersion` (=2). Save inválido é rejeitado com mensagem clara.
- **Regressão:** `tests/regression.js › import-migrates` e `› import-rejects-invalid`.

### Observações de robustez (sem bug ativo)
- 15 temporadas simuladas em sequência: **0 crashes**. Fluxos de mata-mata, pênaltis,
  seleção (com bracket de blocos disjuntos), fim de temporada e mercado estáveis.
- Contagens: gols/assistências por competição, `clubGoals`, `compGoals` e histórico
  parecem consistentes; sem dupla contagem detectada fora do BUG-01.

---

## 3. Balanceamento

**Estado atual (baseline registrado em `docs/BALANCE_BASELINE.md`)**
- Bola de Ouro recalibrada: craque geracional (pot ~93) ganha ~5 em 15 anos; bom jogador
  (pot ~80) ganha ~2, só em temporadas-monstro. Difícil, alcançável, não garantido.
- Goleadas reduzidas (fórmula de placar comprimida).
- Envelhecimento com declínio crescente por idade.

**Lacunas apontadas pelo Plano**
- **Nota de defensores/goleiros/volantes** ainda é fraca: `resolveMatch` calcula nota
  principalmente por gols/assistências/resultado. Defensores dependem de "resultado" e
  pouco mais. **Falta suporte a ações próprias da função** (desarmes, interceptações,
  duelos, passes-chave, chances criadas, gols evitados, erros).
- **Balance runner** ainda não existe (o Plano pede ≥100 carreiras por posição, relatório
  JSON+MD). Recomendado antes de novos ajustes de fórmula.

---

## 4. Game design

- Profundidade já boa: treino/foco, titularidade via **confiança do técnico**, moral, fama,
  contratos + **papel no elenco**, patrimônio + estilo de vida, traços, capitania, rival de
  geração com histórico, enquetes com efeito.
- Consequências de longo prazo existentes: ídolo (estátua), Bola de Ouro por ranking,
  legado na aposentadoria.
- Próximos ganhos (Adendo, fase posterior): mundo persistente (base, empréstimos, mercado
  de NPCs, aposentadoria global). **Preparar arquitetura agora; implementar depois.**

---

## 5. Determinismo / RNG (Plano)

- `rngFor(seed, ...)` já garante reprodutibilidade **quando usado**. Porém `resolveMatch`,
  `benchRoll`, `spendXP` e partes de `narrative` usam `U.ri/U.chance/U.choice` **sem**
  passar `rng`, caindo em `Math.random()`. Consequência: mesma seed + mesmas ações **não**
  produz necessariamente o mesmo resultado.
- **Plano de correção (Fase de Estabilidade):** derivar um `rng` por partida
  (`rngFor(seed, "match", year, idx)`) e propagá-lo em `resolveMatch` e afins; idem para
  `spendXP` e eventos de narrativa. Teste: rodar a mesma carreira 2x com a mesma seed e
  as mesmas ações e comparar hash do estado.

---

## 6. UX / Acessibilidade / Mobile

- Direção editorial preservada; temas claro/escuro com contraste corrigido.
- Responsivo (colunas → coluna única; nav inferior no mobile).
- **A fazer:** foco de teclado nos overlays, `aria-label` em botões só-ícone, ordem de
  leitura em telas densas, `prefers-reduced-motion` para animações (sorteio/toasts).

---

## 7. Persistência / Segurança

- localStorage + export/import em arquivo. **Import agora migra e valida** (§2).
- `schemaVersion` adicionado; base para **migrações encadeadas** por versão.
- Sanitização de entrada (`cleanInput`) aplicada a nome e URLs de escudo.
- **A fazer:** múltiplos espaços de carreira (slots), validação de esquema mais rígida
  (tipos), e versão de esquema também no **mundo** (para o Adendo).

---

## 8. REAL_SQUADS — superfície de dependência (Adendo)

Mapeamento completo (para migrar de strings → entidades estruturadas sem quebrar saves):
- **Definição:** `js/data.js` (`REAL_SQUADS`, formato `{p, n}` por jogador) + export em `CQ.DATA`.
- **Único consumidor:** `js/ui.js › squadOf(G)` — usa `D.REAL_SQUADS[cl.id]` se existir,
  senão gera nomes. Atribui `ov` gerado e `age` aleatório por render.
- **Conclusão:** superfície mínima. A migração para o modelo de jogador estruturado do
  Adendo pode ser feita adicionando uma camada `data/players` + `world` sem tocar no
  gameplay principal; `squadOf` passa a ler do mundo, com fallback para geração.

---

## 9. Riscos de licenciamento (registrado em `docs/LICENSING_NOTES.md`)

- **Nomes** de clubes, jogadores, competições e resultados = fatos (uso livre).
- **Escudos oficiais e fotos = NÃO** sem autorização. Hoje: brasões vetoriais próprios +
  retratos procedurais + bandeiras. Manter `generatedCrest` como fallback e só usar
  `officialLogoUrl`/`cachedLogoPath` com permissão explícita (`brandingMode`).
- API-Football: dados podem ser consultados via chave, mas **disponibilidade técnica ≠
  permissão comercial**. Chave só no build (env var), nunca no frontend.
