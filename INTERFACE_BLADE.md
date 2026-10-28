# Viva! — interface, vitória e chegada de Blade

Base: `3843269`. Restauração criada antes das alterações: `viva-pre-interface-blade-20261028`. Implementação incremental; sem dependências novas, alterações de atlas, balanceamento ou motor Match-3.

## Causas confirmadas e correções

### Tabuleiro

Na versão anterior, a entrada de vitória aplicava `display: none` a `.game-message[hidden]` e `.game-tools[hidden]`. O gameplay usa flexbox vertical com `justify-content: center`. A retirada dos dois elementos e seus gaps reduzia o conteúdo em 92 px e recentralizava o restante, deslocando o tabuleiro **46 px para baixo** no cenário medido a 390 × 844: Y `211,125 → 257,125`; X/largura/altura permaneciam iguais.

A correção mantém as duas regiões no fluxo, com `visibility: hidden`, `pointer-events: none` e o atributo `hidden`. Os controles continuam invisíveis e inacessíveis durante a vitória, mas sua retirada não reposiciona o tabuleiro. Não foi usado translateY de compensação nem reduzido o tempo de contemplação.

A inspeção também confirmou que o mínimo automático do item flex podia superar a proporção declarada do quadro: no exemplo 390 px, largura 364 e altura 460,75, apesar de `aspect-ratio: 7/8`. `min-height: 0` no contêiner permite respeitar a proporção (364 × 416) e evita esse excesso de altura. Peças, moldura e VFX continuam usando as dimensões reais do tabuleiro.

O teste `tests/victory-geometry.ts` mede o contêiner estável `.board-wrap`, não as peças animadas. Registra A antes da jogada, B após a resolução, C no início da comemoração e D durante ela; captura por requestAnimationFrame e commits DOM. No movimento reduzido, React pode juntar resolução e entrada no mesmo commit, caso em que B e C têm a mesma medição. A animação intencional da saída da tela não entra na comparação.

### Blade

O sprite da cerimônia já estava carregado (`naturalWidth: 400`), mas `.celebration-art` recebia `display: none` e `visibility: hidden`. A alternativa no cenário tampouco aparecia: `.blade-current` tinha opacidade 0 e sua animação de entrada estava pausada pelo estado ambiental `focused/paused`. Isso foi inspecionado no navegador e registrado em `validation/interface-blade/baseline.json`.

A cerimônia agora usa diretamente o sprite aprovado `blade-4.webp`, com área própria acima da sombra ambiental, `object-fit: contain` e tamanho adaptado ao telefone. O Blade do cenário não é duplicado durante essa revelação. Na biblioteca, o componente original e suas poses/interações permanecem inalterados.

A apresentação espera o carregamento e `decode()` da imagem, incluindo cache já disponível. Enquanto aguarda, informa “Um instante…” e não apresenta o cachorro como pronto. Não há atraso fixo para iniciar. Em caso de falha, a própria ação principal permite tentar novamente; callbacks e listeners são cancelados na desmontagem. A entrada de texto e imagem começa após prontidão; o modo reduzido mostra diretamente a imagem. Ocultar/retomar a página pausa/retoma a animação sem tornar o sprite permanentemente invisível.

A mensagem principal agora é exatamente **“O Blade chegou!”**. O retorno mantém Blade desbloqueado, dormindo no tapete, com seu menu oculto e as três frases aprovadas.

## Interface e áudio

- Os dois botões “Ouvir”, o handler exclusivo `listen`, o import de disponibilidade usado por eles e seus estilos foram removidos. Não há substituto na apresentação normal.
- `ceremonyMusic` e o áudio aprovado foram preservados. Blade inicia seu tema quando a imagem está pronta; a família mantém sua sequência. As restrições de interação do navegador continuam sendo respeitadas. Conteúdo e continuação não dependem de áudio disponível.
- A dificuldade usa o mesmo estado em `App` e a mesma chave persistida. O controle foi reaproveitado como segmento de três opções em Configurações, antes do áudio. A seleção altera a preferência para próximas partidas, sem reiniciar nem modificar a sessão atual.
- O rodapé da biblioteca mantém somente a ação principal, agora ocupando a largura disponível com margens e safe areas. Cenário, livros, Blade e retrato não foram reposicionados.
- Configurações mantém efeitos, volume, silêncio e confirmação de Novo jogo. O painel possui limite de altura e rolagem interna para telas menores, inclusive quando a API de áudio não existe.
- Família mantém retrato, câmera, iluminação, tema, dedicatória literal e “Voltar ao meu cantinho”.

## Arquivos

Implementação: `src/App.tsx`, `Celebration.tsx`, `SoundToggle.tsx`, `DifficultySelector.tsx`, `style.css`, `app-finish.css`, `audio.css`, `premium6.css`.

Regressão: novos `tests/interface-ceremonies.ts` e `victory-geometry.ts`; adaptados `game-feel-app.ts`, `settings-app.ts`, `mobile-finish.ts`, `library-atmosphere.ts`, `premium6-motion.ts`, `premium6-offline.ts`, `premium6-journey.ts`.

`audio.ts`, `engine.ts`, `config.ts`, `difficulty.ts`, `narrative.ts`, `BladeCompanion.tsx` e todos os assets permaneceram sem alteração. Não foram reintroduzidos lembranças, pétalas ou rabinho no gameplay.

## Validação

### Verificações específicas já concluídas

- **72 casos geométricos:** 36 em Chromium e 36 em WebKit. Combinações de 375 × 667, 390 × 844 e 430 × 932; movimento normal/reduzido; vitória simples, por cascata e por poder; 1 ou 20 jogadas antes da última troca (0 ou 19 restantes). Variação máxima observada de X/Y/largura/altura: **0 px**, com tolerância de 0,5 px. A semente da cascata reproduzível é 21 e produz ao menos três ondas; o RNG do teste é fixado imediatamente antes de jogar, após inicializar React.
- **11 cenários de cerimônia/configurações em cada motor:** seletor persistido, sessão atual inalterada, botão principal largo, dimensões reais/naturalWidth do sprite, visibilidade e opacidade dos ancestrais, posição na viewport e teste de encobrimento no centro da imagem. Inclusos imagem retida por mais de 1,2 s, erro de rede/retentativa, ocultação/retomada, modo reduzido, desbloqueio na biblioteca e família sem “Ouvir”.
- **52 testes unitários** passaram; TypeScript e builds oficial/tester concluídos.

Exemplo medido em 390 × 844 (Chromium, vitória simples):

| Momento | X | Y | Largura | Altura |
|---|---:|---:|---:|---:|
| Antes da última jogada | 13 | 233,5 | 364 | 416 |
| Após resolução | 13 | 233,5 | 364 | 416 |
| Entrada da comemoração | 13 | 233,5 | 364 | 416 |
| Durante a comemoração | 13 | 233,5 | 364 | 416 |

A medição final usa o quadro como unidade; as peças, partículas e a saída intencional da tela continuam podendo animar. Os dados de cada caso estão em `validation/interface-blade/geometry-{chromium,webkit}.json`.

### Regressão concluída no build final

| Execução | Resultado |
|---|---|
| `premium6-journey.ts` | Campanha completa por jogadas válidas, sem atalhos: 205 trocas no Fácil, mais 30 em Kung Fu Médio e 43 em Tatuagens Difícil; **zero reinícios**. Blade visível após a vitória real da fase 5, título correto, livro/ordem preservados e ambos os temas musicais efetivamente iniciados (instrumentação de `OscillatorNode.start`), sem “Ouvir”. |
| `premium6-offline.ts`, WebKit | Servidor desligado: recarga, jogada, livro e sinopse; cerimônias de Blade e família, sprite pronto, continuação e desbloqueio. Três presentes e seis fontes acessíveis no cache; nenhum recurso descartado reintroduzido. |
| `premium6-motion.ts` | 9 verificações de vitória, voo do livro, interrupção/reload durante recompensa e encerramento, Blade visível e movimento reduzido. |
| `settings-app.ts` | Configurações/Novo jogo, confirmação, cancelamento, persistência, reset durante poder, retomada e operação sem API de áudio. |
| `game-feel-app.ts` | Dificuldade persistida antes da partida, toque, uma jogada por troca, pausa/retomada e sessão offline preservada. |
| `mobile-finish.ts` | 15 layouts, capítulos e leitura com rolagem interna, foco, safe areas 59/34 px, progresso e movimento reduzido. |
| `premium6-app.ts` | 35 verificações de biblioteca/coleção, livros, sinopses, Blade/retrato, recompensa, gameplay e worker ativo; nenhum erro crítico. |

Os relatórios desta execução estão em `validation/interface-blade/`. O áudio foi preservado byte a byte; houve verificação técnica da reprodução, sem nova audição crítica subjetiva. O build oficial força QA desligado. Os builds finais locais são `dist/` e `dist-qa/`; cache oficial `viva-f721ad123fa4` (185 arquivos essenciais mais a rota inicial). O build no GitHub recompõe caminhos para `/viva/` e pode gerar hashes diferentes.

### Evidências visuais

Capturas inspecionadas: `test-results/interface-blade/chromium-blade-375-motion.png`, `chromium-settings-375.png`, `chromium-family.png` e `chromium-library-complete.png`. Foram inspecionadas também as capturas `blade-after-real-win.png`, `webkit-blade-390-motion.png` e o par `chromium-before-victory-390-motion.png` / `chromium-victory-390-motion.png`. Também foram capturados os demais tamanhos e os dois modos de movimento, antes/durante a vitória. Blade aparece grande e nítido no centro da cerimônia, com a imagem aprovada, sem uma segunda cópia no cenário.

Artefatos completos em `test-results/interface-blade/` (fora do build). Vídeos de execução foram gravados durante os testes Chromium; a inspeção declarada é de capturas e propriedades em execução, sem alegar revisão crítica quadro a quadro ou audição subjetiva.

### Limitações

Testes executados em navegadores desktop com emulação de viewport/toque. Não houve teste em iPhone físico nem comprovação de FPS, temperatura ou bateria. A limitação de agendamento do WebKit desktop já registrada para a ambientação da biblioteca não foi reavaliada nem alterada nesta rodada. O áudio segue sujeito à autorização do navegador; se indisponível, a cerimônia visual continua utilizável.

A regressão funcional foi concluída e a publicação foi autorizada ao final da solicitação. Não houve antecipação de Blade, novas mecânicas, assets ou serviços externos.

