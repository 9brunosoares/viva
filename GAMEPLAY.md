# Viva! — Upgrade 4/5: controle e ritmo do Match-3

## Problemas encontrados e correções

- O gesto anterior só comparava deslocamentos no fim, escolhia um eixo em diagonais quase iguais e não guardava o identificador do ponteiro. A nova entrada acompanha o dedo primário, recusa diagonais ambíguas e trata pointercancel, perda de captura, saída do tabuleiro, blur, visibilidade e redimensionamento.
- A supressão global de clique podia sobreviver a um arraste interrompido e consumir o toque seguinte. Agora os gestos terminam em pointerup; cliques de teclado e tecnologia assistiva têm um caminho separado.
- A seleção visual começava somente depois de levantar o dedo. Uma camada de pressão agora reage no início do toque, sem confirmar uma jogada antes da liberação.
- A tentativa inválida movia somente 38% de uma célula. Ela agora vai até a célula vizinha e retorna, em 330 ms, preservando integralmente o tabuleiro, os contadores e as jogadas.
- Algumas esperas podiam continuar após desmontar a partida. Todas as etapas assíncronas, inclusive vitória, pertencem a um escopo cancelável. Nenhum novo som, salvamento ou recompensa é disparado por uma sequência cancelada.
- Quedas curtas esperavam o orçamento máximo mesmo depois de terminar. A espera agora usa a mesma duração, distância e escalonamento da animação real. Um caso determinístico com passo de 44 px passa de 350 para 256 ms. A criação de poderes conserva ao menos 336 ms para terminar sua animação de 320 ms.
- Tabuleiros sem movimentos eram recuperados após jogadas, mas uma sessão antiga já travada não tinha recuperação inicial. A recuperação também ocorre ao abrir esse estado, com saída/entrada suaves e sem alterar movimentos ou objetivos.
- A dica escolhia a primeira jogada e permanecia destacada. Agora prioriza objetivos pendentes e poderes sem consumir sorteios nem criar IDs. É temporária e limpa uma seleção anterior quando solicitada explicitamente.

## Entrada por toque

`boardInput.ts` classifica o gesto. O limiar varia entre 10 e 18 pixels CSS conforme a célula; o maior deslocamento precisa superar o outro eixo por um fator de 1,35. Um gesto curto de 13 px funciona no viewport de 390 px utilizado nos testes. Diagonais, bordas e saídas não escolhem peças fora do tabuleiro.

`useBoardInput.ts` mantém apenas o ponteiro ativo e o feedback de pressão. Não altera estado React a cada pointermove. Arrastar para fora e voltar à origem cancela em vez de virar um toque. A orientação retrato já existente continua sendo usada para interpretar as coordenadas da tela rotacionada. Não há dependência de hover ou mouse.

## Sequência de jogada e persistência

`Game.tsx` conserva o motor e a sequência aprovados, com estados explícitos: idle, swapping, resolving, falling, recovering, completing e transitioning. A seleção é independente. Uma trava síncrona impede uma segunda jogada antes do commit React.

`TurnSequence.ts` somente administra as esperas dessa sequência existente. Cancelar resolve as esperas como inválidas e limpa seus timers. Cada continuação verifica o resultado antes de alterar o jogo. Reinício invalida a geração anterior; desmontagem cancela as etapas pendentes. Não foi introduzido outro motor, sistema de áudio ou sistema de partículas.

O snapshot é gravado pelo efeito de estado estável, removendo a chamada explícita duplicada ao fim da jogada. Durante cascatas, a posição anterior continua sendo a retomada segura. As chaves e formatos de conquistas/sessões não foram alterados.

As regras dos poderes, a gravidade e o sorteio permanecem iguais. A única alteração em `engine.ts` é rejeitar adjacência com índices fora dos limites ou não inteiros antes de acessar uma peça. Isso evita acessos inválidos sem alterar nenhuma troca legal.

## Clareza e assistência

Os objetivos mantêm ícones e contadores, com marca de conclusão e semântica de progressbar para leitores de tela. Números e nomes continuam comunicando progresso sem depender somente de cor ou áudio.

Após nove segundos disponível, sem seleção ou dedo pressionado, um par recebe destaque de 1,6 s. A dica não repete continuamente, não seleciona peças e não joga sozinha. Tocar cancela o destaque; a dica manual usa a mesma avaliação. Segundo plano interrompe os timers de assistência. Movimento reduzido conserva o contorno sem movimento.

Os sons restaurados no Upgrade 3/5 continuam iguais. Ondas e criação usam os mesmos disparos sincronizados ao commit visual. Os tempos dos feixes/poderes e a contemplação de vitória de 2,2–2,6 s foram preservados. Biblioteca, narrativas, recompensas e dificuldade não foram redesenhadas.

## Dificuldades e simulação

`tests/balance.ts` executou 32 sementes em cada uma das dez fases e três dificuldades: 960 partidas com bot guloso orientado aos objetivos. Mede movimentos disponíveis, criação/ativação de poderes, ondas, recuperações e distribuição observada nos tabuleiros estáveis.

| Dificuldade | Vitórias do bot | Movimentos usados por tentativa, em média | Recuperações automáticas |
| --- | --- | --- | --- |
| Fácil | 320/320 | 21,17 | 4 |
| Médio | 319/320 | 28,33 | 4 |
| Difícil | 303/320 | 34,35 | 6 |

Todas as posições oferecidas ao bot tinham ao menos uma jogada. Foram observadas até oito ondas em uma jogada. As 14 recuperações terminaram em estados jogáveis. Não houve alteração de metas ou limites.

Esses resultados descrevem um bot forte com sementes específicas; não estimam taxas humanas, não medem tempo de reflexão e não provam balanceamento definitivo. A distribuição de peças observadas também sofre influência das decisões do bot. O relatório completo e as sementes ficam em `test-results/balance-report.json` e no script.

## Arquivos desta etapa

Produção: `src/Game.tsx`, `src/boardInput.ts`, `src/useBoardInput.ts`, `src/TurnSequence.ts`, `src/hint.ts`, `src/engine.ts`, `src/vfx.ts`, `src/useTileMotion.ts` e `src/gameplay-vfx.css`.

Testes: `tests/game-feel.test.ts`, `tests/game-feel.ts`, `tests/game-feel-app.ts`, `tests/balance.ts` e os cenários existentes `tests/vfx-game.ts`, `tests/vfx-game.tsx`, `tests/vfx-scenarios.ts`. Documentação em README, VALIDACAO e neste arquivo. Nenhuma dependência adicionada.

Os controles de desmontagem e os cenários artificiais existem somente nas entradas de teste do Vite, fora do build publicado. Nenhum botão de pular/concluir fase foi introduzido.

## Conferência local

Abra http://127.0.0.1:4173/viva-test/?v=feel4. Experimente dois toques e um deslize curto; faça uma diagonal e cancele levantando o dedo; peça uma dica e toque para apagá-la. Ao gastar a última jogada sem completar os objetivos, Recomeçar fase deve preservar sua coleção. A dificuldade escolhida e a última posição estável continuam após recarregar offline.

As verificações são de navegador e emulação mobile. Não foram feitos testes em iPhone físico ou uma nova avaliação auditiva. Não há garantia de 60 FPS em todos os aparelhos. Não foram iniciados o Upgrade 5/5 nem a auditoria final da sexta etapa.
