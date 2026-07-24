# RATING_MODEL.md — notas por posição e determinismo

## Determinismo (RNG por seed)
Toda a resolução de partida agora usa um RNG derivado da seed da carreira:

- **`resolveMatch`** → `rng = rngFor(seed, "match", year, season.idx)`
  Cobre: `benchRoll`, placar (Poisson), gols/assistências do jogador, defesas do goleiro,
  estatísticas defensivas/criativas, cartões.
- **`applyMatch`** (pós-partida) → `rng = rngFor(seed, "post", year, season.idx)`
  Cobre: lesão e disputa de pênaltis automática.
- **`spendXP`** → `rng = rngFor(seed, "xp", year, season.idx)`
  Cobre: distribuição de pontos de evolução.

**Invariante:** mesma seed + mesmas ações do jogador ⇒ mesmo resultado. (Textos de
narrativa/feed permanecem cosméticos e podem variar; não afetam o estado de gameplay.)

Limitação conhecida: as decisões interativas do modo ao vivo ainda usam `U.chance(opt.p)`
sem `rng` dedicado (é uma escolha do jogador em tempo real). Determinismo pleno do modo ao
vivo é um passo futuro.

## Estatísticas próprias da posição (por partida)
Calculadas de forma determinística a partir dos atributos, minutos e pressão do jogo
(`press = clamp((forçaAdv − forçaMinha)/6 + 1.2, 0.4, 2.6)`), `mf = minutos/90`:

| Estatística        | Fórmula (λ do Poisson)                                   |
|--------------------|----------------------------------------------------------|
| Desarmes           | `dvol·(0.7+def/120)·press·mf·2.1`                         |
| Interceptações     | `dvol·(0.6+posn/130)·press·mf·1.7`                        |
| Duelos ganhos      | `(0.5+dvol)·(0.5+fis/130)·mf·1.8`                         |
| Cortes (ZAG)       | `(0.6+def/120)·press·mf·2.3`                              |
| Passes decisivos   | `cvol·(0.5+pas/120)·mf·1.9`                               |
| Defesaça (GOL)     | chances adversárias convertidas em defesa por reflexo    |
| Falha no gol       | `chance(clamp((72−def|ref)/420 + condLow, 0, 0.13)·mf)`  |

`dvol` (volume defensivo) e `cvol` (volume criativo) por posição:
```
dvol = GOL 0 · ZAG 1.0 · LAT 0.8 · VOL 1.05 · MEI 0.5 · PON 0.35 · ATA 0.3
cvol = GOL 0 · ZAG 0.15 · LAT 0.55 · VOL 0.55 · MEI 1.0 · PON 0.9 · ATA 0.7
```

## Nota por posição
Base 6.0–6.2. `resB = +0.35 V / +0.05 E / −0.4 D`. `cs` = jogo sem sofrer gol.
Penalidades: vermelho −1.6, amarelo −0.2, falha no gol −1.3.

- **ATA/PON:** `6.0 + gols·1.05 + assist·0.7 + passesDec·0.16 + resB + (ov−advForça)/45`
- **MEI:** `6.05 + gols·0.9 + assist·0.8 + passesDec·0.22 + desarmes·0.06 + resB`
- **VOL:** `6.2 + desarmes·0.14 + intercept·0.14 + duelos·0.05 + passesDec·0.12 + gols·0.7 + assist·0.6 + resB`
- **LAT:** `6.15 + desarmes·0.11 + intercept·0.1 + passesDec·0.15 + assist·0.7 + gols·0.6 + (cs?0.25) + resB`
- **ZAG:** `6.2 + desarmes·0.12 + intercept·0.14 + cortes·0.08 + duelos·0.05 + (cs?0.9:−go·0.28) + gols·0.8 + resB`
- **GOL:** `6.1 + defesas·0.15 + defesaças·0.3 + (cs?0.9:−go·0.4) + resultado`

Todas somam `+ ruído U(−0.4,0.5)` e são fixadas em `clamp(3, 10)`.

**Objetivo atendido:** cada posição consegue nota alta pelas ações da sua função. Ex.:
um ZAG com 5 desarmes, 4 interceptações, 5 cortes, jogo sem sofrer gol e vitória chega a
~9.2 sem depender de gol/assistência.

## O que NÃO mudou (de propósito)
- Balanceamento macro (Bola de Ouro, envelhecimento, goleadas) — registrado em
  `docs/BALANCE_BASELINE.md` (a gerar com o balance runner).
- Nenhum sistema removido; saves compatíveis (as novas estatísticas ficam só no resultado
  da partida, não no save).
