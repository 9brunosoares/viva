# Upgrade 5/5 — acabamento mobile

Implementado em 27/10/2026 sobre a versão existente, sem publicação remota e sem a auditoria da etapa 6.

## Restauração e escopo

Antes das alterações, todas as modificações dos upgrades anteriores foram preservadas no commit `0c96512` — `Preserva Viva aprovado antes do upgrade mobile 5`, marcado por `viva-pre-premium-5-20261027`, na branch `codex/premium-5-mobile`. Nada foi descartado. O diff a partir desse commit delimita esta etapa.

Motor, dificuldade, metas, sorteios, capas, atlas, posições das estantes, poses de Blade, retrato, narrativas, sinopses, assinatura final e áudio aprovado permanecem iguais. Não há trilha contínua, novos sons, dependências, contas ou serviços externos.

## Telas e navegação

- Abertura: logo oficial, botão com proporção mais confortável e entrada sem atraso obrigatório. O carregamento inicial usa o próprio logo sobre verde; se o módulo falhar, oferece uma nova tentativa. Um Error Boundary também permite reabrir após falha de renderização, sem apagar dados.
- Biblioteca: cabeçalho leve sobre um degradê localizado, coleção e controles agrupados; ação principal, dificuldade e infinito com separação consistente. Bordas da composição se integram ao ambiente por máscaras suaves. As coordenadas de livros, Blade e retrato não mudam. Partículas, luz e interações ocultas existentes são preservadas.
- Fases: capítulos ilustrados em uma lista com rolagem interna, destaque da próxima descoberta e marca das concluídas. A lista entra posicionada na fase atual. Fases bloqueadas continuam sem nome, tema ou imagem antecipados.
- Dificuldade: mesmo controle e persistência, com opções de 44 px, seleção explícita, fechamento ao tocar fora/Escape e retorno do foco ao botão.
- Introduções: texto em serifada confortável, proporções e espaçamentos ajustados, cenário e narrativa originais.
- Partida: aproveita as safe areas mantendo a proporção do tabuleiro. Pausa e derrota usam o mesmo papel quente; Retomar ou Recomeçar são a ação principal correspondente. Escape retoma uma pausa.
- Livros e retrato: altura limitada à região segura, foco contido no diálogo e devolvido ao controle de origem; fundo inerte enquanto o diálogo está aberto. Só a sinopse rola. Capas, informações e assinatura não foram reescritas.
- Recompensa: capa, título, autoria e continuação permanecem visíveis em telas pequenas; sinopse rola internamente. Texto verde/terra sobre papel, com contraste de leitura de pelo menos 4,5:1 nos elementos verificados.
- Revelações e infinito: apresentações, sequência, mensagens, áudios finitos e regras existentes preservados; apenas margens seguras e proporções de controles ajustadas.

As mudanças de tela usam Web Animations API: saída de 80 ms e entrada de 140 ms, com uma única cena montada. Fechar livro/retrato usa dissolução de 130 ms. Uma preferência de movimento reduzido elimina essas transições; mudança de preferência ou entrada em segundo plano finaliza a navegação pendente sem deixar a tela inerte. Não há cópias do tabuleiro para animar transições. A tentativa de usar snapshots de View Transitions foi retirada após uma falha de processo do WebKit ao redimensionar.

## Viewport, acessibilidade e recursos

CSS usa unidades dinâmicas com fallback e variáveis de safe area derivadas de `env()`. `visualViewport` acompanha a região disponível em um RAF, sem reescrever dimensões idênticas. Durante pinch zoom a composição não é recalculada sob os dedos. O fallback vertical já existente foi preservado; o Safari pode recusar o bloqueio de orientação.

Botões têm feedback de toque, foco visível e áreas adequadas. Não foi desabilitado o zoom. Leituras continuam selecionáveis. O documento não rola nas telas imersivas; capítulos e sinopses têm suas próprias regiões de rolagem. Dialogs excluem faces ocultas do livro e controles do cenário da navegação por teclado.

Somente o logo recebe preload no HTML. A aplicação aquece a próxima biblioteca/cenário e, na introdução, as peças e poderes correspondentes. Não introduz fontes remotas nem pré-decodifica toda a coleção na abertura.

## PWA e atualização

Manifest mantém `standalone`, orientação vertical, escopo e URLs relativos, ícones aprovados e Apple Touch Icon. A cor de abertura combina com o fundo escuro, evitando clarão branco. A inscrição do service worker aguarda um frame da interface.

O novo cache é instalado integralmente antes de ser adotado. A aplicação solicita ativação em abertura, biblioteca ou fases, após confirmar que a persistência teve sucesso e sem diálogo, recompensa ou revelação pendentes. Todas as janelas do mesmo escopo precisam consentir; uma partida ou leitura em outra janela adia a ativação. A aba só recarrega em uma superfície segura e retorna a ela. Não regrava dados potencialmente mais recentes de outra janela durante essa negociação.

São mantidas a versão atual e uma anterior do cache para atender chunks antigos durante a transição. Galeria e relatórios de inspeção ficam fora da instalação offline essencial (66.659 bytes evitados); todos os recursos do jogo, sinopses e animações continuam incluídos. Não há exclusão de `localStorage` nem alteração dos formatos das conquistas e sessões. `writeSession` apenas passou a informar sucesso/falha.

Na primeira migração a partir de uma versão antiga sem a negociação entre janelas, pode ser necessário fechar as abas antigas uma vez. Recusar ou não responder à negociação conserva a versão anterior até outra oportunidade segura; o jogo permanece utilizável.

## Validação

- TypeScript e build de produção aprovados; 36 testes unitários passaram, incluindo retorno após atualização e falha de persistência.
- `tests/mobile-finish.ts`: Chromium/Edge e WebKit; 15 composições por motor, com 0, 2, 5, 8 e 10 conquistas em 320×568, 393×852 e 430×932. Inclui dificuldade, foco/Escape, sinopse, safe areas simuladas, viewport variável, rotação, movimento reduzido e interrupção de transições por segundo plano.
- `tests/reward-finish.ts`: dez livros em duas dimensões por motor (20 verificações por motor), associação exata de título/autor/sinopse, geometria segura, rolagem interna e contraste mínimo de 4,5:1.
- `tests/pwa-update.ts`: três versões, duas janelas, adiamento durante partida/leitura, preservação do tabuleiro/contadores/conquistas/dificuldade, chunk anterior disponível, apenas dois caches e versão nova offline. Aprovado em Chromium e WebKit.
- `tests/launch-recovery.ts`: módulo JavaScript deliberadamente bloqueado; feedback e nova tentativa funcionaram, preservando conquistas.
- `tests/library-life.ts`: regressão no Chromium com 15 composições, dez sinopses, três poses ancoradas, interações ocultas, pausa por visibilidade, movimento reduzido, chegadas após revelações, melodias originais e offline; sem erros.
- Campanha completa por interface: 279 movimentos, uma nova tentativa, dez livros, Blade, retrato, infinito e recarga offline, sem erros de página/HTTP.
- Regressões de narrativas/Blade: 30 introduções em três dimensões, nove verificações de poses e retomada nas três dificuldades. Sinopses: 73 verificações no Chromium e 63 no WebKit, duas ordens e três dimensões, sem antecipação dos bloqueados.
- `tests/offline-server.ts`: WebKit recarregou biblioteca, sinopse, retrato e partida animada após desligar o servidor HTTP. Esse método evita uma falha de navegação do controle de offline do WebKit/Windows.
- `tests/release.ts`: manifest, ícones, ausência de atalhos de teste, progresso legado e retrato offline aprovados.

Capturas e relatórios ficam em `test-results/`, fora do aplicativo publicado. A revisão visual encontrou e corrigiu o contraste da recompensa antes da entrega. Os testes usam contextos isolados; o progresso da jogadora não foi apagado.

Pacote final: JS 300,42 kB (96,91 kB gzip), CSS 65,93 kB (14,67 kB gzip), 147 arquivos no cache `cefa22d2929c`. Aumento comprimido de JS/CSS em relação ao ponto de restauração: aproximadamente 4,5 kB. Sem novas dependências.

## Arquivos

Produção: `index.html`, `public/manifest.webmanifest`, `scripts/service-worker.mjs`, `src/App.tsx`, `src/BookViewer.tsx`, `src/Game.tsx`, `src/main.tsx`, `src/session.ts`, `src/useDialog.ts`, `src/usePortrait.ts`; novos `AppBoundary.tsx`, `DifficultySelector.tsx`, `app-finish.css`, `useDialogExit.ts`, `usePwaUpdates.ts` e `useSceneTransition.ts` em `src/`.

Testes novos: `launch-recovery.ts`, `mobile-finish.ts`, `pwa-update.ts`, `pwa.test.ts`, `reward-finish.ts`. Testes existentes ajustados: `library-life.ts` aguarda o fechamento animado e a chegada das telas; `offline-server.ts` configura o runtime e sinaliza a ausência de rede quando o servidor é desligado. Documentação: este arquivo, `README.md` e `VALIDACAO.md`.

## Testar e limites

Prévia local: http://127.0.0.1:4173/viva-test/?v=finish5. Consulte o README para gerar/servir o pacote. Instalação e atualização reais no iPhone precisam ser verificadas após uma publicação autorizada em HTTPS; localhost no computador não é acessível pelo iPhone através desse endereço.

Não houve teste em iPhone físico, abertura real pelo ícone, VoiceOver, consumo de bateria ou medição de FPS no aparelho. Safe areas foram simuladas e o WebKit é o runtime desktop do Playwright. Não foi feita nova audição crítica; o WebKit/Windows deste ambiente não disponibiliza Web Audio. Não se promete 60 FPS nem uma splash nativa idêntica em todas as versões do iOS.
