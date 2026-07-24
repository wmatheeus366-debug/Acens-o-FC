# CRAQUE — Modo Carreira do Atleta

Simulador de carreira de jogador de futebol brasileiro, do amadorismo aos 16 anos até a aposentadoria. Roda 100% no navegador, sem backend, sem build.

## Como jogar

Abra o arquivo **`index.html`** em qualquer navegador moderno (Chrome, Edge, Firefox). Só isso — funciona até com duplo clique no arquivo.

O progresso é salvo automaticamente no navegador (localStorage). Em **Clube → Save & dados** você pode exportar um backup em arquivo `.json` e importar depois.

## O que tem no jogo

- **Criação de atleta**: nome, idade (16–18), pé, camisa, 14 nacionalidades, 7 posições com arquétipos, e "Os Craques" — até 3 lendas reais (Pelé, Garrincha, Zico...) que moldam seus atributos. Overall inicial sempre entre 60–70, potencial sorteado.
- **Calendário completo**: Estaduais (grupo + mata-mata), Brasileirão Série A/B com acesso e rebaixamento reais, Copa do Brasil, Libertadores/Sul-Americana, seis ligas europeias com copas nacionais e Champions/Europa League.
- **Ciclo de seleções**: eliminatórias, Copa América/Eurocopa/Copa Ouro/Copa da Ásia nos anos certos, e Copa do Mundo a cada 4 anos.
- **Partida a partida**: jogar, poupar ou simular em lote. Jogos decisivos rodam **ao vivo**, minuto a minuto, com decisões interativas (pênalti, contra-ataque, saída do goleiro) e disputa de pênaltis onde você escolhe a sua cobrança.
- **Sistemas**: condição física, moral, fama com decaimento, reputação, lesões, suspensão por cartões, banco de reservas de verdade, cobrador oficial, loop próprio de goleiro (defesas, clean sheets, Luva de Ouro), envelhecimento e aposentadoria.
- **Temporada**: metas da diretoria com consequências, prêmios individuais (Artilheiro, Craque, Revelação, Bola de Ouro...), mercado da bola com propostas e renovação, economia (salário, luvas, bônus).
- **Narrativa**: feed de redes sociais com perfis fictícios, entrevistas pós-jogo com personalidade, eventos de vida com escolhas, e um **rival de geração** que evolui, disputa prêmios com você, se transfere e se aposenta.
- **Histórico de campeões** por competição, começando com os campeões reais recentes e registrando cada temporada sua.

## Direitos de imagem

Nomes de clubes, formatos de competição e nomes de lendas são fatos históricos. O jogo **não** reproduz logotipos oficiais nem fotos de jogadores: os escudos são brasões vetoriais próprios desenhados a partir dos padrões de camisa de cada clube, e os rostos são retratos procedurais. Em **Clube → Visão geral** você pode apontar uma URL/arquivo local de escudo próprio, com fallback para o brasão desenhado. Bandeiras de países vêm de flagcdn.com (domínio público).

## Estrutura

```
index.html        — página única
css/style.css     — design system "boletim esportivo" (papel, tinta, vermelhão)
js/util.js        — RNG determinístico, sanitização, retratos e escudos SVG
js/data.js        — clubes, ligas, seleções, lendas, posições
js/engine.js      — temporadas, competições, simulação, prêmios, mercado
js/narrative.js   — feed, entrevistas, eventos de vida, rival
js/live.js        — partidas ao vivo, decisões e pênaltis
js/ui.js          — telas e overlays
js/main.js        — estado global e persistência
```
