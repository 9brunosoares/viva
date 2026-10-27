# Evolução da campanha — 27/10/2026

Este documento registra a entrega `22574a9`. A revisão posterior dos recortes, intensidade dos VFX e opção Novo jogo está em [VFX_FINAL.md](VFX_FINAL.md).

Implementação incremental em `codex/campaign-evolution`. Ponto de recuperação anterior: tag `viva-pre-campaign-evolution-20261027`, commit `04824ac`. Não houve publicação nem alteração do progresso do navegador da jogadora.

## Jogar e navegar rapidamente

- Versão local com **Concluir fase**: http://127.0.0.1:4177/viva-test/?v=campaign
- Versão local de distribuição: http://127.0.0.1:4173/viva-test/?v=campaign
- O botão existe em desenvolvimento e em `dist-qa`, gerado por `pnpm build:qa`. Funciona somente durante uma fase da campanha, em estado estável; usa o fluxo normal de recompensa, livros e revelações. Um toque duplo não concede dois livros. O infinito não recebe esse atalho.
- `pnpm build` força QA desativado e gera `dist`. Essa separação permite testar rapidamente sem levar o atalho à versão destinada à jogadora. Os dois endereços locais têm armazenamento separado por porta.
- Os servidores locais precisam continuar abertos. Nenhum desses links publica o jogo ou fica acessível remotamente ao iPhone por si só.

## A. Tatuagens

Os oito anexos reais foram inspecionados e copiados integralmente para `source-assets/campaign-evolution/`. `originals.json` registra nomes originais, dimensões, bytes e SHA-256. Não há URLs temporárias nem dependências remotas.

| Original | Uso | Dimensão |
| --- | --- | --- |
| Foto 1 | Atlas de tatuagens | 1280 × 1024 |
| Foto 2 | Cenário do estúdio | 719 × 1280 |
| Foto 3 | Decoração | 1280 × 1024 |
| VFX 01 | Combinações/criação | 2017 × 780 |
| VFX 02 | Poderes | 1942 × 809 |
| VFX 03 | Criação/partículas | 2048 × 768 |
| Fotos 7 e 8 | Referência da estante antes da correção | 590 × 1280 |

`scripts/prepare_campaign_assets.py` gera o cenário WebP proporcional e vinte sprites individuais de 160 × 160. `public/assets/tattoos/sprites.json` documenta regiões, caixas úteis e identificadores. O recorte usa o exterior claro conectado às bordas; não apaga brancos internos. Somente o quadrado recebe uma semente interna adicional para deixar seu centro transparente. O teste de integridade verifica margens transparentes, preservação de áreas claras e centro vazio.

Sete tipos ativos, sem misturar os vinte desenhos no mesmo tabuleiro: **lutadora, livros, café, leoa/filhote, infinito mãe, coluna grega e quadrado de contorno**. Livros e xícara são arquivos independentes. As metas iniciais são vinte lutadoras, vinte leoas e vinte infinitos. Há 58 jogadas no Fácil; dificuldade continua aplicando os ajustes próprios.

Um recorte de cartelas decorativas aparece discretamente na introdução, sem duplicar os móveis do cenário nem ocupar o tabuleiro. A narrativa é exatamente a solicitada. Título, mapa, objetivos acessíveis, revisitação, preloads e manifesto de assets usam Tatuagens. Os antigos sprites/cenário de Cinema saíram dos recursos de execução; seus originais continuam recuperáveis pelo Git.

O índice lógico continua sendo **9**. A ordem aleatória dos livros, conquistas, histórias já lidas e revelações continuam com as mesmas chaves.

## B. VFX nativos e feixes

Os atlas têm fundos pretos, rótulos, painéis irregulares e alguns quadros ambíguos. Os recortes são explícitos e individualizados, sem presumir uma grade de origem. Foram extraídos 58 quadros; **47** compõem sete sequências de execução:

| Sequência | Quadros usados |
| --- | ---: |
| Combinação de três | 8 |
| Criação por quatro | 6 |
| Cor/máximo | 5 |
| Área | 6 |
| Frente horizontal | 8 |
| Frente vertical | 8 |
| Criação de área por L/T | 6 |

Onze quadros com sobreposição/continuidade ambígua foram excluídos da reprodução. Não são inventados intermediários. `public/assets/vfx/sequences.json` documenta coordenadas, fontes, durações e tratamento; `src/vfxAtlas.ts` seleciona as sequências aprovadas.

`AtlasEffects.ts` integra uma textura WebP de 1536 × 1536 ao Canvas existente, com durações variáveis e dissolução curta entre quadros. A referência de tamanho é comum a cada sequência: um brilho inicial pequeno não é ampliado artificialmente até o tamanho do pico. Texturas luminosas recebem alpha recuperado do fundo preto; corpos opacos usam tratamento separado. Margens de propriedade suaves evitam vazamento dos painéis vizinhos. Os destinos dos sprites têm escala uniforme.

Os feixes são compostos por preparação, geometria de gradiente, núcleo luminoso, frente com sprite proporcional, partículas e dissipação. Saem da origem em ambas as direções e percorrem as células reais. Não há imagem única esticada para preencher a linha. `powerTimeline.ts` fornece os mesmos atrasos espaciais para as partículas e o desaparecimento das peças. Área e cor mantêm expansão proporcional; combinações encadeadas usam os eventos reais do motor.

Limites: doze clipes, seis feixes e o pool existente de 180 partículas; uma textura compartilhada, decodificada antecipadamente. Nada altera RNG, resultado, objetivos ou movimentos. Desmontagem, segundo plano e movimento reduzido mantêm o gerenciamento já existente. O antigo componente de atlas deformado não é renderizado pelo gameplay.

**Áudio:** `src/audio.ts` está byte a byte igual à versão anterior. Sons de jogadas e melodias finitas de Blade/família foram preservados; não há trilha contínua. A assinatura de livro agora acompanha a apresentação da capa, sem repetir ao guardar.

## C. Recompensas e estantes

Conquista: capa, título, autor, animação, som e continuação. **Sem sinopse**. A introdução curta da primeira recompensa e as duas revelações continuam no fluxo aprovado.

Na biblioteca, selecionar um livro conquistado abre a apresentação existente; “Ler sinopse” mostra o texto integral no verso com rolagem interna. Títulos, autores, textos, capas e algoritmo de distribuição não foram alterados.

`libraryLayout.ts` usa planos de apoio específicos para cada uma das quatro ilustrações, medidos no espaço de 496 × 756. Não é um deslocamento global. Os livros ocupam nichos diferentes em posições determinísticas; o estágio intermediário aproveita também uma pilha ilustrada já existente como apoio.

`spineMetrics.ts` remove a margem transparente do cálculo de contato sem editar as lombadas. A largura é derivada da proporção real da arte, e a origem fica nos pés do livro. Perspectiva lateral discreta e quatro overlays lossless de bordas de madeira dão oclusão. Os overlays copiam pixels da própria estante; não redesenham o móvel. `scripts/prepare_shelf_depth.py` permite reproduzir esses dados.

Áreas clicáveis acompanham o livro real. O teste verifica inclusive `elementFromPoint` no centro de cada lombada e a associação do título/sinopse, além de capturas com 0, 1, 4, 5, 6, 9 e 10 livros em telas móveis. A arte original da biblioteca, Blade, retrato, capas e lombadas permanece inalterada.

## D. Progressão implementada

Dimensão expressa como **colunas × linhas**. Todas as células continuam quadradas. Metas e jogadas abaixo são do Fácil; Médio aumenta coletas em 35% e soma cinco jogadas, Difícil aumenta em 65% e soma três. As metas especiais recebem os incrementos de dificuldade já existentes.

| Fase | Grade | Tipos | Poderes criáveis | Coletas / metas especiais | Jogadas | Característica |
| --- | --- | ---: | --- | --- | ---: | --- |
| 1 Química | 7 × 8 | 4 | Linha/coluna | Tubo rosa 16; frasco verde 16 | 28 | Frequência alta de combinações, descoberta simples |
| 2 Ensino Infantil | 7 × 8 | 5 | Linha/coluna | Lápis, estrela e paleta 15 cada; ativar 1 poder | 34 | Três coletas e primeira meta de poder |
| 3 Praia | 7 × 8 | 5 | Linha/coluna | Concha e bebida 20 cada; 1 poder; 2 cascatas | 38 | Linhas e cascatas |
| 4 Kung Fu | 7 × 8 | 6 | Linha/coluna + área | Faixa e yin-yang 21 cada; 3 poderes | 44 | Planejamento e introdução da área |
| 5 Meu Pet | 7 × 8 | 5 | Linha/coluna + área | Patinha, bola e osso 16 cada | 40 | Respiro acessível antes da revelação |
| 6 Espiritismo | 7 × 8 | 6 | Todos | Livro aberto e flor branca 20 cada | 48 | Distribuição ponderada, foco em duas coletas |
| 7 Roma | 7 × 8 | 6 | Todos | Massa, coluna e janela 22 cada; 2 poderes | 48 | Três frentes de coleta e repertório completo |
| 8 Pagode | 7 × 8 | 5 | Todos | Pandeiro e cavaquinho 20 cada; 5 cascatas | 44 | Menos tipos, ritmo de combos |
| 9 Tatuagens | 7 × 8 | 7 | Todos | Lutadora, leoa e infinito mãe 20 cada | 58 | Sete desenhos pessoais e margem maior |
| 10 Família | 7 × 8 | 6 | Todos | Coração, mãos e flor 24 cada; 3 poderes; 3 cascatas | 50 | Síntese dos aprendizados, final justo |

“Todos” significa linha, coluna, área e cor. Poderes já existentes num salvamento antigo continuam ativáveis; a progressão controla a criação de novos poderes nas novas partidas. Cinco peças geram um poder direcional nas fases iniciais, área surge na etapa intermediária e cor na posterior.

**Decisão de segurança:** não foram implementadas grades irregulares nem novas dimensões. O motor, gravidade, gestos, animações e snapshots existentes usam 56 posições e eixos fixos em vários lugares. A variedade real vem de tipos ativos, frequência, repertório de poderes e metas distintas, sem reescrever esse núcleo. A forma retangular não é uma novidade desta entrega.

### Compatibilidade de partidas

Novas sessões recebem `campaignVersion: 2`. Uma sessão antiga sem esse campo conserva metas, tipos padrão, dificuldade, movimentos restantes e tabuleiro antigos até terminar/reiniciar. Não é exigido repetir fases concluídas. A fase 9 antiga apenas recebe a nova temática. Não há limpeza de localStorage nem migração destrutiva. O infinito conserva todos os poderes e seis tipos, ou sete no tema Tatuagens.

## E. Validação e limites

- TypeScript e **42 testes unitários** aprovados. Incluem 240 tabuleiros determinísticos com múltiplas jogadas, seleção de tipos, tiers, sete peças, legado, encontros de poderes, cancelamento e geometria.
- **1.920 partidas simuladas**: 32 sementes × dez fases × três dificuldades × duas estratégias (objetivos e poderes). Em cada estratégia: Fácil 319/320, Médio 320/320 e Difícil 306/320 vitórias. São bots com visão do tabuleiro, não estimativas da taxa humana.
- A primeira amostra identificou um salto em Espiritismo. A configuração foi recalibrada de 44 jogadas/coletas de 24 para 48/coletas de 20, mantendo pesos suaves. O Difícil continua com derrotas nas amostras, principalmente Kung Fu, Espiritismo e Tatuagens.
- Campanha real concluída no Chromium sem atalho: **190 jogadas, zero reinícios**, dez livros únicos, revelações, infinito e offline, sem erros de página/HTTP.
- `campaign-app.ts`: Chromium e WebKit, treze layouts móveis por motor; salvamento legado de Cinema, nova sessão com sete tipos, derrota/recomeço, progressão, associação dos livros e navegação QA pelas dez fases.
- `vfx-game.ts`: 21 cenários por motor; trocas inválidas, todos os poderes/pares, interseções, cascatas, movimento reduzido, cancelamento, quatro tamanhos, rotação e densidade limitada.
- `vfx-native.ts`: dez cenários, inspeção de chamadas reais de Canvas, quadros diferentes, escala uniforme e trajetórias. Chromium gravado em tempo real. No WebKit/Windows, relógio determinístico do Playwright verifica a sequência e as posições porque a captura local entrega poucos frames; esse resultado **não mede fluidez em Safari físico**.
- `library-life.ts`: quinze composições, dez sinopses, poses/menu de Blade, marcos, áudio original, movimento reduzido, offline e progresso.
- `game-feel-app.ts`: dificuldade persistente, uma jogada cobrada, pausa/retomada e recuperação offline.
- `game-feel.ts`, Chromium: onze grupos de verificações, incluindo toque/deslize de 13 px, diagonais, cancelamentos, segundo ponteiro, teclado, dicas, recuperação sem jogadas, derrota, infinito e desmontagem durante troca/limpeza/queda/vitória sem sons, saves ou recompensas tardias.
- `campaign_assets.py`: oito originais com SHA-256, vinte recortes, sete ativos, bordas seguras dos 58 quadros, brancos protegidos, centro vazio, proporção do cenário, oclusão idêntica à madeira original e 26 arquivos aprovados inalterados.
- `reward-finish.ts`: vinte verificações por motor, dez livros em duas dimensões, recompensa sem sinopse e os dez textos integrais na biblioteca, com contraste de leitura medido.
- `offline-server.ts`: WebKit recarregou a biblioteca, sinopse, retrato, infinito e Tatuagens com o servidor HTTP realmente desligado. Os sprites, cenário, máscaras e atlas foram decodificados do cache; o novo atlas efetivamente pintou durante uma jogada offline. O teste encontrou e corrigiu a base relativa da variável CSS do fundo externo da biblioteca: agora ela é resolvida contra `document.baseURI`, evitando `assets/assets/` em builds com base `./`.

Build final: cache de distribuição `d19ede18e3e1`, QA `6905009e185f`, **171 arquivos** por versão. JS de distribuição 310,06 kB (100,23 kB gzip), CSS 67,70 kB (14,99 gzip). A textura de VFX tem cerca de 597 kB transferidos e 9 MiB decodificados. Os atlas originais e arquivos de diagnóstico não entram no cache distribuído.

### Evidências locais

- `test-results/campaign-{chromium,webkit}-tattoo-{intro,board}.png`.
- `test-results/campaign-{chromium,webkit}-library-{0,1,4,5,6,9,10}-393.png` e variantes de 320/430 px.
- `test-results/vfx-native-chromium.webm`: gravação contínua dos dez cenários.
- `test-results/native-vfx/{row,column,area,combined}-motion.gif` e `*-sequence.jpg`: quadros extraídos da gravação, sem reconstruir animações. Alinhamento de relógio aproximado; o vídeo original é a evidência temporal completa.
- `test-results/campaign-balance-{objectives,powers}.json`, relatórios `campaign-*`, `vfx-*`, `reward-finish-*`, `game-feel-app-report.json`, `library-alive-chromium-report.json` e `webkit-no-server-report.json`.

### Arquivos e ferramentas

React/TypeScript, Canvas 2D, CSS/WAAPI, Web Audio já existente; Python, Pillow e numpy apenas no preparo local; Playwright/Edge/WebKit e FFmpeg/Pillow para validação. **Nenhuma nova dependência de execução**, serviço ou API paga. numpy foi declarado em `requirements-assets.txt` para tornar o preparo reproduzível.

Código: `src/{config,stories,engine,difficulty,session,hint,libraryLayout,spineMetrics,powerTimeline,vfxAtlas,AtlasEffects,useGameVfx}.ts`, `App.tsx`, `Game.tsx`, `StageIntro.tsx`, `app-finish.css`, `library-life.css`. Assets: novos diretórios `tattoos`, `scenes`, `vfx`, quatro máscaras de estante, metadados e manifesto; antigos recursos de Cinema removidos. Scripts: preparo de assets/campanha/oclusão e exportação de evidências. Testes: campanha, integridade, simulação, recompensas, VFX, biblioteca, retomada e offline.

Não houve teste em iPhone físico, audição crítica nova, medição de bateria/temperatura ou garantia de 60 FPS. A leitura de “mãe” em uma peça pequena depende do tamanho/densidade da tela; os pixels originais foram preservados. As máscaras de luz dos VFX foram ajustadas aos atlas disponíveis, que não são spritesheets de produção perfeitamente regulares. A biblioteca e os recortes foram inspecionados visualmente; testes de código sozinhos não foram tratados como prova de integração artística. Não foi executada a auditoria final reservada à sexta etapa.
