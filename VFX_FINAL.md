# Revisão dos VFX e Configurações — 27/10/2026

Base: `22574a9`; recuperação: `viva-pre-vfx-finale-20261027`. Revisão incremental, sem mudar regras, dificuldade, livros, biblioteca ou áudio aprovado. Publicação da versão oficial autorizada nesta rodada; QA continua separado.

## Diagnóstico confirmado

A implementação anterior carregava a textura e animava os quadros, mas uma máscara circular apagava pétalas/folhas fora do núcleo. Cortes conservadores também encerravam algumas sequências antes dos picos. As frentes tinham somente 1,8 célula e o material dos atlas concorria com rastros procedurais pequenos. Isso explica a diferença entre as cartelas originais e o impacto visto no jogo.

Os próprios atlas não são grades regulares: há números ausentes/repetidos, efeitos que se tocam e exemplos compostos com rótulos internos. Nesta revisão, a ordem segue o desenho real, e não os números impressos. Esses exemplos estáticos não foram tratados como falsos quadros consecutivos.

## Recortes e apresentação

`scripts/prepare_vfx.py` é o novo preparo reproduzível, integrado ao importador da campanha. Preserva os três PNG originais. Usa coordenadas explícitas, separação pelas regiões escuras entre efeitos, bordas suaves e ancoragem estável no núcleo. Não aplica máscara circular genérica. Pétala e folha são isoladas por componente de cor conectado, mantendo o desenho original.

Há **74 recortes: 71 quadros temporais e três partículas**, em `public/assets/vfx/sequences.webp`. Coordenadas, âncoras e funções estão em `sequences.json` e `source-assets/campaign-evolution/vfx-cuts.json`.

| Sequência | Quadros | Apresentação |
| --- | ---: | --- |
| Três peças | 8 | Brilho, flor e dispersão de pétalas |
| Quatro / origem de linha | 7 | Concentração e pico luminoso floral |
| Criação de área | 8 | Bomba, expansão e dissipação |
| Criação de cor | 7 | Disco crescendo e abrindo energia multicolorida |
| Explosão de área | 9 | Anel, expansão, pico, flor e partículas |
| Ativação de cor | 8 | Espiral, vórtice grande e resolução |
| Frente horizontal | 8 | Arte proporcional acompanhando o deslocamento |
| Frente vertical | 8 | Sequência própria, sem deformar o eixo |
| Cruz / combinação de poderes | 8 | Flor em cruz sobre as ativações reais |
| Pétala, folha e brilho | 3 isolados | Partículas do próprio material fornecido |

`AtlasEffects.ts` combina as sequências com preparação, rastros geométricos, frentes e impactos florais nas células atingidas. As frentes passaram de 1,8 para 2,8 células; a cor pode ocupar grande parte do tabuleiro. O tamanho cresce proporcionalmente e há dissolução curta entre os quadros. A expansão e a dissipação permanecem visíveis. Combinações usam camadas das sequências reais.

Os impactos seguem `powerTimeline.ts`, o mesmo relógio espacial usado no desaparecimento das peças. O Canvas não escreve no tabuleiro, RNG, contadores ou salvamento. Não foram aumentados os tempos de espera das jogadas; alguns brilhos terminam durante o início da queda. Não há imagem radial esticada para ocupar uma linha.

Limites: 18 clipes, seis feixes e o pool existente de 180 partículas. Uma textura compartilhada de aproximadamente 873 kB, 1536 × 1920, cerca de 11,25 MiB decodificados. Movimento reduzido, limpeza ao sair e segundo plano preservados. Nenhuma dependência nova em execução.

## Configurações e Novo jogo

O botão passou a ter engrenagem e nome **Configurações**. Conserva volume e silêncio e oferece **Novo jogo**, inclusive se a API de áudio estiver indisponível.

A confirmação “Começar um novo jogo?” informa que progresso, livros e fases serão apagados. A ação inicialmente focada é **Continuar jogando**. Escape/cancelar mantêm a campanha. Só **Sim, começar do zero** executa o reinício.

`restart.ts` cria uma nova campanha aleatória e limpa somente a partida, histórias e dificuldade da jornada: `viva-progress-v1`, `viva-session-v1`, `viva-stories-v1` e `viva-difficulty-v1`. Preferência de som e dados não relacionados permanecem. Falhas de armazenamento não são tratadas como sucesso; há tentativa de restauração dos registros anteriores.

O aplicativo remonta a jornada sem recarregar a página. Isso cancela animações, callbacks, menus e cenas antigos, retorna à abertura, usa Fácil e esconde os marcos até serem conquistados novamente. A atualização da PWA aguarda também o fechamento de Configurações. Publicar a versão não reinicia o progresso de ninguém.

## Evidências e testes

- `test-results/vfx-before-final.webm`: versão anterior preservada.
- `test-results/vfx-native-chromium.webm`: dez cenários reais após a correção.
- `test-results/native-vfx/{row,column,area,color,combined}-motion.gif` e `*-sequence.jpg`: imagens extraídas do vídeo contínuo.
- `test-results/vfx-recut-contact.jpg`: todos os novos recortes em ordem.
- `test-results/settings-{chromium,webkit}-confirmation.png`: confirmação em tela móvel.
- Relatórios: `settings-*-report.json`, `vfx-native-*-report.json`, `vfx-*-report.json`, `campaign-app-chromium-report.json`, `webkit-no-server-report.json` e `campaign-assets-report.json`.

Testes unitários cobrem reinício seletivo, nova ordem válida, falha de escrita e restauração após falha na limpeza. Testes de navegador cobrem cancelar/confirmar, persistência, preferências, início realmente novo, ausência de revelações, reset offline e cancelamento de uma jogada em andamento. A parte do cancelamento usa relógio controlado para não depender da velocidade do computador.

A inspeção de Canvas exige escala uniforme, progressão de quadros, quadros tardios realmente pintados e deslocamento das frentes. No WebKit, o relógio controlado verifica as trajetórias; o vídeo Chromium permanece em tempo real. O gravador de 25 FPS pode perder RAFs e não é um benchmark do iPhone. As verificações finais e a publicação são resumidas no chat e em `VALIDACAO.md`.

## Limitações

Alguns brilhos dos atlas se sobrepõem sem espaço preto suficiente; as separações nesses pontos são uma curadoria, não uma recuperação perfeita de camadas inexistentes. Os quadros com rótulos internos não foram forçados na animação. Não houve teste em iPhone físico, garantia de 60 FPS ou nova audição crítica. A identidade sonora aprovada permanece byte a byte igual e não há trilha contínua.

Arquivos principais: `App.tsx`, `SoundToggle.tsx`, `audio.css`, `restart.ts`, `AtlasEffects.ts`, `useGameVfx.ts`, `vfxAtlas.ts`, textura/metadados VFX, scripts de preparo/exportação e testes. O build normal continua sem “Concluir fase”; `dist-qa` conserva o botão solicitado para testes locais.
