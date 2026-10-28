# Viva! — simplificação pós-Upgrade 6

Atualização incremental sobre `4fe5c99`, na branch local `codex/simplify-upgrade-6`. Restauração: tag `viva-pre-simplification-20261028`. Sem rollback, dependências novas ou publicação.

## Alterações

- Oito lembranças removidas da biblioteca, suas âncoras, sombras, renderização e visibilidade. Nenhum objeto substituto foi acrescentado. As ilustrações, estante, apoio/oclusão dos dez livros e ambientação não mudaram.
- Recompensa e `RewardFlight` passam a cuidar somente do livro. A capa mantém o voo de 730 ms com a mesma trajetória/easing; não há etapa de lembrança nem estado duplicado de voo. Capa/título/autor continuam na conquista; sinopse integral somente pela seleção na biblioteca.
- Camada de pétalas removida da campanha, motor, objetivos, sessões, renderização e estilos. Removida também a infraestrutura inativa de ingredientes descendentes/lembranças do tabuleiro. As partículas florais dos VFX aprovados continuam existindo: são efeitos visuais, não obstáculos.
- `TailPeek.tsx`, timers, listeners, renderização e animações da cauda removidos. Blade aparece somente na revelação após a fase 5 e continua com as três interações da biblioteca.
- Obstáculos agora possuem apenas configuração `{ gifts }` e progresso `{ opened }`. Não há vetores de pétalas, contadores de ingredientes ou mecanismo de migração dessas funcionalidades.
- Sessão salva usa `version: 2`; sessões experimentais antigas são ignoradas. A escolha de perfis antigos por edição foi retirada do aplicativo. Não houve limpeza indiscriminada do localStorage. Novas partidas, dificuldade, ordem sorteada, livros, etapas de recompensa/revelação e infinito continuam persistentes.

## Presentes preservados

Dois danos em ondas distintas: fechado → sem laço → aberto/removido. Um único dano por onda mesmo com poderes sobrepostos; combinações ortogonais adjacentes e poderes mantêm suas regras. Presentes não combinam nem podem ser trocados como peças comuns. Gravidade preserva identidade/vida, e embaralhamento preserva os presentes existentes e recupera jogadas válidas. Dicas continuam considerando presentes.

Distribuição Fácil/Médio/Difícil: Kung Fu `1/2/2`, Roma `1/2/2`, Tatuagens `0/2/2`; nenhuma outra fase ou infinito recebe presentes. Jogadas, metas de coleta e requisitos de poderes/sequências não foram aumentados nem reduzidos para compensar a simplificação.

## Arquivos e assets

Código: `src/App.tsx`, `Game.tsx`, `LibraryScene.tsx`, `RewardFlight.tsx`, `engine.ts`, `obstacles.ts`, `session.ts`, `libraryLayout.ts`, `premium6.css`; excluído `TailPeek.tsx`.

Publicação: `public/assets/manifest.json`, `public/assets/premium6/audit.json`, `scripts/prepare_premium6.py`, `scripts/service-worker.mjs`. O gerador não volta a exportar lembranças/pétalas/cauda nem mantém o recorte exclusivo das lembranças. Fontes, cenários, capas, lombadas, VFX, poses de Blade e retrato permanecem byte a byte iguais ao ponto de restauração.

Retirados do build público: `premium6/{diploma,drawing,caipirinha,belt,candle,album,speaker,tattoo-frame,petals,tail}.webp`, total de **208.346 bytes**. Permanecem somente os três sprites de presente nesse diretório. Originais históricos preservados em `source-assets/premium6/`. O service worker deixa de pré-armazenar esses recursos e também os elimina do cache anterior durante a ativação, conservando a política de adoção segura e os chunks anteriores necessários.

Testes atualizados: `tests/premium6.test.ts`, `session.test.ts`, `pwa.test.ts`, `premium6-app.ts`, `premium6-motion.ts`, `premium6-offline.ts`, `premium6-balance.ts`, `premium6-journey.ts`, `premium6_assets.py`, `campaign-app.ts`, `settings-app.ts`, `pwa-update.ts`; novo `gifts-app.ts`; excluído o teste positivo exclusivo `premium6-tail.ts`.

## Balanceamento reproduzível

100 sementes por fase/dificuldade, total **3.000 partidas**, com o simulador existente e sua política gulosa. Sementes `seed * 9127 + phase * 701`, gerador LCG. O ciclo agora resolve somente peças/presentes, com recuperação que preserva presentes. `validation/post-upgrade6/balance.json` contém todos os resultados, incluindo poderes, cascatas, distribuição de peças e movimentos válidos.

| Fase | Vitórias F/M/D | Jogadas restantes médias F/M/D | Embaralhamentos F/M/D |
|---|---|---|---|
| 1 · Química | 100% / 100% / 100% | 23 / 26.7 / 23.6 | 0 / 0 / 0 |
| 2 · Ensino Infantil | 100% / 100% / 100% | 24 / 25.4 / 20.9 | 0 / 0 / 0 |
| 3 · Praia | 100% / 100% / 99% | 25.8 / 26.7 / 21.1 | 0 / 0 / 0 |
| 4 · Kung Fu | 99% / 99% / 91% | 22.3 / 17.9 / 10.7 | 0 / 3 / 4 |
| 5 · Meu Pet | 100% / 100% / 100% | 29.3 / 31.1 / 26.1 | 0 / 0 / 0 |
| 6 · Espiritismo | 99% / 100% / 93% | 25.1 / 21.6 / 13.1 | 1 / 2 / 1 |
| 7 · Roma | 100% / 98% / 97% | 23.9 / 20.5 / 12.6 | 3 / 3 / 6 |
| 8 · Pagode | 100% / 100% / 100% | 33.5 / 34.8 / 29.9 | 0 / 0 / 0 |
| 9 · Tatuagens | 100% / 99% / 86% | 25.3 / 21 / 9.9 | 26 / 34 / 36 |
| 10 · Família | 99% / 99% / 93% | 24.2 / 21 / 11.9 | 1 / 1 / 1 |

Fácil: **997/1.000** vitórias; todas as fases em **99–100%**. Médio: **995/1.000**; Difícil: **959/1.000**. Presentes gerados/abertos: Fácil `200/200`, Médio `600/597`, Difícil `600/599`; derrotas podem ocorrer antes de abrir todos. Foram registrados 31/43/48 embaralhamentos. Nenhum tabuleiro permaneceu sem movimento; o simulador interromperia com erro nesse caso. As derrotas registradas ocorreram ao esgotar jogadas sem cumprir todos os objetivos. Não há garantia de taxa de vitória humana: o bot tem uma estratégia específica e não modela percepção, aprendizado ou tempo de reflexão.

## Validações

| Verificação executada | Resultado |
|---|---|
| `tsx --test tests/*.test.ts` | **52/52** passaram; combinações, poderes, gravidade, presentes, dicas, persistência e ausência dos recursos descartados |
| `tsc --noEmit`, `scripts/build-release.mjs`, `scripts/build-qa.mjs` | Sucesso; builds oficial e tester locais |
| `premium6-app.ts`, Chromium + WebKit | **35 verificações em cada motor**, incluindo 0/1/4/5/6/9/10 livros, ausência das três funcionalidades, capítulos, sinopses, marcos/reload, cinco fases de gameplay, três viewports e safe areas |
| `premium6-motion.ts` | **9 verificações**, vídeo: vitória sem mutar save, voo, recarga durante recompensa, revelações, dedicatória exata e movimento reduzido; ausência da cauda após o antigo intervalo de inatividade |
| `premium6-journey.ts` | Dez fases no Fácil, Kung Fu no Médio e Tatuagens no Difícil: **278 jogadas válidas, zero reinícios**, sem botão de conclusão; ordem dos livros persistida |
| `gifts-app.ts` | Fechado → sem laço e sem laço → aberto efetivamente renderizados; vida/contador após dano e reload corretos, com/sem movimento reduzido |
| `vfx-game.ts`, Chromium + WebKit | **21 cenários por motor**, comparados ao motor com/sem movimento: 3/4/5, todos os poderes, dez combinações de poderes, cascatas, troca inválida, gestos, tamanhos mobile e contemplação |
| `game-feel-app.ts` | Gestos, dificuldade, uma jogada por troca, pausa/retomada, reload offline e ausência de revelações antecipadas |
| `settings-app.ts` | Confirmação/cancelamento, novo jogo, interrupção de poder, persistência, reset offline e funcionamento sem API de áudio |
| `campaign-app.ts`, Chromium | **13 layouts**, livro/sinopse, derrota/reinício, persistência, revisitação, dez fases no tester, Blade/retrato e infinito; botão de testes ausente do build oficial |
| `premium6-offline.ts`, WebKit | **Servidor desligado**: reload, partida, conquista e leitura de livro; três sprites de presente e seis fontes disponíveis offline; nenhum sprite descartado no cache |
| `pwa-update.ts`, Chromium + WebKit | Três versões, múltiplas janelas, atualização adiada durante partida/leitura, saves e chunks preservados, sprites descartados eliminados do cache anterior e nova versão offline |
| `premium6_assets.py`, `campaign_assets.py` | Originais íntegros, três presentes com alpha/padding, fontes locais, recortes/atlas, oclusão e arquivos protegidos preservados |
| Inspeção de `dist/`, pré-cache e manifest | Dez sprites ausentes; somente três sprites de presente em `premium6/`; 185 arquivos essenciais + rota inicial no cache; manifest `standalone`; caminhos locais relativos |

Os testes funcionais listados não registraram erros críticos de console. Os contextos de navegador foram isolados; nenhuma sessão pessoal aberta foi usada para testes. Não houve audição crítica nova: o áudio foi preservado sem alterações e seus testes existentes passaram.

## Validação visual e evidências

Foram abertas e inspecionadas as capturas da biblioteca com 0, 4, 5 e 10 livros (incluindo Blade/retrato), Praia, Kung Fu, Meu Pet, Tatuagens, recompensa, dedicatória e o estado sem laço do presente. Não há objetos colecionáveis extras, camada de pétalas ou cauda. A estante e suas áreas de toque permanecem funcionais; as telas verificadas não ganharam espaços vazios nem controles cortados. Os cenários com Roma e livros intermediários também estão nas capturas automatizadas.

Artefatos locais em `test-results/premium6/`: `chromium-library-{0,4,5,10}-390.png`, `webkit-library-10-390.png`, `{chromium,webkit}-game-{3,4,5,7,9}.png`, `gift-hp{1,2}.png`, `book-reward.png`, `ending-dedication.png`, `premium6-motion.webm`. O vídeo foi gravado; a avaliação visual desta entrega usou capturas e observações automatizadas de execução, sem alegar revisão quadro a quadro do vídeo.

Resultados estruturados duráveis em `validation/post-upgrade6/`: balanceamento, interfaces, jornada, movimento, presentes, offline, atualizações, VFX e desempenho. Os arquivos originais detalhados e as capturas permanecem em `test-results/` (fora do Git e do build público).

## Desempenho e limites

A biblioteca final possui **75 elementos internos**, contra 84 na versão anterior com as oito lembranças e seu contêiner. A medição indicativa não encontrou mutações DOM por quadro. A lógica não contém mais camadas de pétalas nem timers/listeners de `TailPeek`. Nenhuma nova animação foi adicionada.

| Ambiente desktop 390 × 844 | Pausado p50/p95 | Ativo p50/p95 | Teste relativo |
|---|---|---|---|
| Chromium | 16,7 / 17 ms | 16,7 / 17 ms | Passou |
| WebKit | 15 / 30 ms | 191 / 256 ms | **Falhou**, com 179 quadros acima de 50 ms na amostra ativa |

A limitação pré-existente de agendamento/renderização do WebKit desktop com a ambientação ativa permanece uma questão independente. Não foi tentada uma correção de iluminação/composição nesta rodada. Os valores não são um benchmark controlado entre versões e não permitem afirmar melhora ou piora no iPhone. Não houve teste em iPhone físico, instalação pela tela inicial ou avaliação de bateria/temperatura; 60 FPS no dispositivo real não estão comprovados. Portanto, a suíte funcional passou, mas o teste indicativo de performance WebKit **não** ficou verde.

## Estado final

Build oficial e tester concluídos. Cache da versão oficial: `viva-1e9d03968ea7`; arquivos principais `index-3ANP-3v6.js` e `index-agY2xEIS.css`. Não houve alteração nos arquivos de áudio, Blade, encerramento, textos de livros ou balanceamento-base. A versão está preparada localmente para GitHub Pages, **sem push ou deploy**.

Prévia oficial local: `http://127.0.0.1:4173/viva-test/`. Tester local: `http://127.0.0.1:4177/viva-test/`.

Reprodução do balanceamento (PowerShell):

```powershell
$env:BALANCE_SAMPLES='100'
$env:BALANCE_REPORT='post-upgrade6-balance.json'
pnpm exec tsx tests/premium6-balance.ts
```

