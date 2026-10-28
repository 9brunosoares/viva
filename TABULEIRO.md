# Tabuleiro contínuo e Modo teste

## Escopo e recuperação

Base: `e21c29a`, com as correções de Configurações, dificuldade, estabilidade da
vitória e revelação de Blade já integradas. Ponto local de recuperação:
`viva-pre-board-redesign-20261028`. Não houve rollback nem alteração no motor,
balanceamento, atlas, biblioteca, áudio ou progressão.

## Apresentação

`src/board-presentation.css`, importado depois dos estilos existentes, mantém a
moldura e aplica verde botânico `#163d32` ao painel. As peças comuns não têm mais
fundo, borda, sombra de caixa ou raio de cartão. Os botões continuam ocupando as
mesmas células de 7 × 8: só o conteúdo visual mudou.

`scripts/measure_tile_art.py` mede o alpha dos 61 sprites aprovados e gera
`src/tileArt.ts`. Cada entrada guarda escala uniforme e deslocamento óptico.
O centro usa 80% do centro dos limites visíveis e 20% do centro de massa do
alpha, preservando todas as extremidades. O desenho ocupa aproximadamente
85–88% da célula, ante 75–77% na versão anterior. Não se esticam eixos separados
nem se recortam as imagens originais.

O quadrado vazio de Tatuagens conserva o contorno original e o centro vazio;
somente seu brilho é elevado para contrastar com o painel escuro. Livros,
xícara, lutadora, leoa, infinito e coluna conservam seus sprites independentes.

Seleção, toque, foco e dica iluminam a silhueta do sprite com halo dourado. A
seleção tem elevação e escala pequenas; a dica pulsa por duas passagens. Não há
filtro pesado permanente em todas as peças. A expansão de desaparecimento das
peças comuns foi limitada a 1,06 para acomodar a arte maior, mantendo o tempo
original. Os poderes conservam seus símbolos, animações e VFX, com halo circular
em vez de base quadrada. Presentes preservam sua base, escala e três imagens.
Movimento reduzido mantém o destaque estático e desliga os novos movimentos.

## Preferência local

`src/testMode.ts` lê exclusivamente `viva-test-mode-v1`: apenas o valor `true`
ativa a preferência. Ausência, valores inválidos ou indisponibilidade do
armazenamento resultam em `false`. Não há associação com dificuldade ou flags
internas de QA. `Novo jogo` preserva a preferência, como as preferências de som.

`App.tsx` mantém uma única fonte de estado e entrega o valor a `SoundToggle.tsx`
e `Game.tsx`. Configurações mostra somente “Modo teste” e o mesmo switch usado
por Efeitos, antes de Novo jogo. O painel conserva sua rolagem interna.

O botão `Concluir fase` só é montado com a preferência ativa, nas partidas da
campanha. Usa o callback `onWin` existente: não há implementação paralela de
recompensas. O bloqueio síncrono impede duas conclusões por cliques rápidos;
jogadas em resolução, pausa e derrota não aceitam o atalho. Ao desligar, o
botão sai do DOM. O modo infinito conserva sua natureza sem fim e não apresenta
um botão de conclusão de fase.

O build oficial continua forçando `VITE_ENABLE_QA=false`. Nem builds QA nem o
servidor de desenvolvimento ativam a preferência automaticamente. Nenhuma
rota, endpoint ou ferramenta interna adicional entra em produção.

## Reprodução dos testes novos

```powershell
python scripts/measure_tile_art.py
pnpm exec prettier --write src/tileArt.ts
pnpm test
pnpm build
pnpm build:qa
# Servir dist/ e dist-qa/ nas portas 4173 e 4177 com prefixo /viva-test/.
# Servidor de fixtures, separado do build público:
pnpm dev --port 4175
pnpm exec tsx tests/local-test-mode.ts
pnpm exec tsx tests/board-presentation.ts
pnpm exec tsx tests/vfx-game.ts
$env:BROWSER_ENGINE='webkit'
pnpm exec tsx tests/local-test-mode.ts
pnpm exec tsx tests/board-presentation.ts
pnpm exec tsx tests/vfx-game.ts
```

Para registrar uma base antes de futuras mudanças, executar
`tests/board-presentation.ts` com `BOARD_BEFORE=true`. A execução seguinte
compara as caixas das células quando encontra a base correspondente ao motor.
Sem base, ainda verifica limites, tamanho da arte, transparência e viewport,
mas registra explicitamente que não houve comparação anterior.

## Evidências locais

Arquivos de aplicação alterados: `src/App.tsx`, `src/Game.tsx`,
`src/SoundToggle.tsx`, `src/main.tsx`, `src/audio.css`,
`src/board-presentation.css`, `src/testMode.ts` e `src/tileArt.ts`.
Ferramenta de medição: `scripts/measure_tile_art.py`. Documentação: este arquivo
e `README.md`. Testes novos: `tests/board-presentation.ts`,
`tests/local-test-mode.ts`, `tests/published-board.ts`, `tests/test-mode.test.ts`.
Fixtures/testes ajustados: `tests/campaign-app.ts`, `tests/premium6-offline.ts`,
`tests/release.ts`, `tests/vfx-game.ts` e `tests/vfx-game.tsx`.

Validação executada nesta alteração:

| Verificação | Resultado |
| --- | --- |
| Testes unitários | 55 aprovados |
| TypeScript e builds oficial/QA | Aprovados; nenhuma dependência nova |
| Comparação da apresentação | 30 estados por motor, dez fases × três viewports; limites e hitboxes preservados |
| Geometria da vitória | 72 casos, movimento normal/reduzido, vitória simples/cascata/poder; delta máximo zero em X/Y/largura/altura |
| VFX | 21 cenários por motor, cada um com e sem movimento; resultado idêntico ao motor puro |
| Modo teste no build oficial | Chromium e WebKit: padrão desligado, desmontagem, recarga, cliques duplos, dez recompensas únicas, Blade, família e infinito |
| Campanha por jogadas reais | Dez fases Fácil, Kung Fu Médio e Tatuagens Difícil: 278 jogadas, nenhum reinício |
| Presentes | Dois cenários de dano; três imagens, persistência e abertura corretas |
| Apresentações e dificuldade | 11 cenários por motor, incluindo carregamento lento, retry, visibilidade e movimento reduzido |
| Configurações | Dois motores; confirmação/cancelamento de Novo jogo, persistência e ausência de API de áudio |
| Campanha/navegação | Dois motores; 13 layouts por motor, sinopses e livros, QA com opt-in e infinito |
| Offline | WebKit com servidor desligado: jogada, livro/sinopse, novo tabuleiro, Modo teste e recompensa, presentes/fontes e cerimônias |
| Atualização da PWA | Três versões e múltiplas janelas; atualização adiada durante jogo/leitura, progresso preservado e nova versão offline |
| Release | Manifesto standalone/retrato, ícones HTTP 200, Configurações acessível e atalho ausente por padrão |

Capturas e medições ficam em `test-results/board-redesign/`, ignorado pelo Git:

- `before-<motor>-<fase>.png` / `after-<motor>-<fase>.png`: seis temas, 390 × 844.
- `comparison-1-4.jpg`, `comparison-5-10.jpg`: antes acima, depois abaixo.
- `before-<motor>.json` / `after-<motor>.json`: dez fases × três tamanhos.
- `test-mode-<motor>.json`: preferência, campanha, recompensas e apresentações.
- `settings-<motor>-<largura>.png`: controles em três tamanhos.
- `selected-<motor>.png`, `hint-<motor>.png`: feedback real sem caixas.

Não são assets da aplicação e não entram no cache público. Nenhuma dependência
foi adicionada. Testes em Chromium/Edge e WebKit no Windows não equivalem a
teste em iPhone físico, instalação pelo ícone, medição de bateria ou garantia
de 60 FPS. A limitação independente de agendamento da ambientação da biblioteca
no WebKit permanece fora do escopo desta alteração.
