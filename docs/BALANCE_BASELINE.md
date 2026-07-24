# BALANCE_BASELINE.md

Gerado por `scripts/balance-runner.mjs` — **100 carreiras por posição** (amostragem estocástica, motor real).
Data: 2026-07-21T19:15:14.531Z · tempo: 47.4s

> Cada carreira: nova promessa (16–18 anos) num clube da Série A, jogada até a aposentadoria,
> renovando ou aceitando a melhor proposta. Valores = média sobre as 100 carreiras.

## Médias por posição

| Métrica | GOL | ZAG | LAT | VOL | MEI | PON | ATA |
|---|---|---|---|---|---|---|---|
| Temporadas | 20.84 | 20.68 | 20.39 | 20.98 | 20.69 | 20.61 | 20.49 |
| Jogos (carreira) | 775.51 | 720.61 | 725.62 | 726.67 | 732.29 | 713.85 | 735.78 |
| Gols | 0 | 60.52 | 105.75 | 104.69 | 389.12 | 547.58 | 694.21 |
| Assistências | 0 | 43.42 | 192.74 | 170.91 | 383.67 | 313.7 | 196.01 |
| Jogos sem sofrer | 437.33 | 0 | 0 | 0 | 0 | 0 | 0 |
| Nota média | 7.29 | 7.41 | 7.39 | 7.45 | 7.54 | 7.43 | 7.41 |
| Overall máximo | 80.29 | 79.63 | 79.22 | 81.16 | 80.45 | 80.24 | 80.04 |
| Títulos | 22.77 | 15.42 | 17.11 | 15.4 | 17.39 | 16.27 | 18.21 |
| Prêmios individ. | 31.91 | 17.85 | 19.16 | 19.99 | 23.75 | 22.62 | 24.77 |
| Bolas de Ouro | 0.01 | 0 | 0 | 0 | 0.05 | 0.31 | 0.43 |
| Jogos seleção | 32.64 | 32.72 | 27.54 | 34.5 | 33.19 | 28.78 | 26.43 |
| Idade aposent. | 37.78 | 37.63 | 37.41 | 38.06 | 37.76 | 37.69 | 37.56 |
| Valor mercado (pico) | 16448000 | 16733000 | 16131000 | 18424000 | 18226000 | 18016000 | 18085000 |

## Distribuição da NOTA MÉDIA (p10 / mediana / p90)

| Posição | mín | p10 | mediana | p90 | máx |
|---|---|---|---|---|---|
| GOL | 7.126211849192102 | 7.193107416879797 | 7.293114406779662 | 7.39008353221957 | 7.522131147540984 |
| ZAG | 7.016267123287672 | 7.213788819875775 | 7.384095127610208 | 7.650902394106813 | 7.854897610921504 |
| LAT | 6.92640425531915 | 7.287222898903774 | 7.393493506493505 | 7.523147896879239 | 7.603659420289855 |
| VOL | 7.027846889952155 | 7.250024691358023 | 7.4604866180048655 | 7.679469964664309 | 7.799355877616748 |
| MEI | 6.7092156862745105 | 7.240048387096774 | 7.582345078979343 | 7.795811170212767 | 8.021156186612577 |
| PON | 6.202407079646017 | 6.982258064516129 | 7.444094292803972 | 7.8933736396614265 | 8.43976163450624 |
| ATA | 6.180728476821192 | 6.99126488095238 | 7.4073806275579805 | 7.8705693950177915 | 8.082061855670105 |

## Distribuição do OVERALL MÁXIMO (p10 / mediana / p90)

| Posição | mín | p10 | mediana | p90 | máx |
|---|---|---|---|---|---|
| GOL | 67 | 72 | 80 | 88 | 93 |
| ZAG | 67 | 71 | 80 | 87 | 95 |
| LAT | 67 | 72 | 79 | 87 | 93 |
| VOL | 66 | 72 | 82 | 89 | 95 |
| MEI | 67 | 71 | 81 | 90 | 95 |
| PON | 67 | 72 | 80 | 89 | 95 |
| ATA | 66 | 72 | 79 | 90 | 95 |

## Leitura

- Comparar **nota média** e **overall máximo** entre posições revela favorecidos/prejudicados.
- **Bolas de Ouro** deve ser raro (majoritariamente 0; alguns picos para talentos geracionais).
- **Idade de aposentadoria** deve girar em ~34–38 conforme a posição.
- Qualquer ajuste de fórmula a partir daqui deve ser documentado no CHANGELOG e re-medido.
