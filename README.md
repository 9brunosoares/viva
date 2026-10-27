# Viva!

Um joguinho pra viver e passar o tempo: dez fases Match-3, dez livros em ordem aleatória persistente e uma biblioteca que cresce com a campanha. Aplicação estática em React e TypeScript, sem contas ou backend.

## Executar e gerar a entrega

Requer Node.js 22 ou superior e pnpm 11.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm preview
```

`pnpm build` verifica TypeScript e gera `dist/`, sempre com QA desativado, mesmo que o ambiente tenha `VITE_ENABLE_QA=true`. O cache offline é gerado junto com o build; não é instalado pelo servidor de desenvolvimento.

Para o servidor local desta entrega, em PowerShell:

```powershell
$env:VIVA_BASE='/viva-test/'
pnpm build
node scripts/serve.mjs
```

Abra http://127.0.0.1:4173/viva-test/?v=finish5. Atualizações aguardam uma tela segura e o consentimento das outras janelas do jogo, preservando partida e conquistas. Na primeira migração de uma versão antiga, pode ser necessário fechar e reabrir as abas uma vez.

## Acabamento mobile — upgrade 5/5

Biblioteca com controles integrados, fases como capítulos com rolagem interna, tipografia e recompensas mais legíveis, dificuldade acessível, diálogos com foco e transições curtas. Safe areas, viewport dinâmica, abertura recuperável e atualização offline coordenada completam o acabamento. Sem novos assets, dependências ou mudanças de regras, textos e áudio. Implementação, ponto de restauração, testes e limitações em [MOBILE.md](MOBILE.md). Não houve publicação automática nem auditoria da etapa 6.

## Testes sem atalhos na interface

Os botões de concluir fase e as prévias de QA foram removidos do código da interface, inclusive em desenvolvimento. A variável `VITE_ENABLE_QA` não pode reativá-los. Os mecanismos automatizados de teste de regras e persistência continuam em `tests/`, fora do aplicativo publicado. Scripts históricos que dependiam dos botões de QA documentam versões anteriores; a campanha real, os testes unitários e `tests/synopses.ts` validam a entrega atual.

## Experiência e progresso

A biblioteca ocupa a tela como ambiente, com controles flutuantes de Jogar/Continuar, fases, coleção e infinito quando desbloqueado. As artes e posições relativas de livros, Blade e quadro são preservadas. Fases bloqueadas ocultam nomes, temas e imagens. “Meus livros” e as lombadas abrem a capa do livro; “Ler sinopse” vira o volume e mostra título, autor e texto no verso. “Voltar à capa” desfaz o movimento. Somente a sinopse rola; a face oculta fica fora da navegação assistiva.

Toque em peças vizinhas ou arraste para trocar. Três combinam; quatro criam limpeza de linha/coluna; cinco criam poder de cor; interseções criam área. Poderes podem ser ativados e encadeados. Uma dica não gasta jogada. Não há tempo ou vidas. Cascatas terminam antes de avaliar vitória. Pausar, voltar à biblioteca ou recarregar preserva a última posição estável do tabuleiro, contadores e jogadas. “Recomeçar fase” inicia outro tabuleiro.

Cada fase inédita concede um livro. A ordem é sorteada uma vez e salva. Repetições e infinito não duplicam livros. A chave `viva-progress-v1` permanece compatível com campanhas anteriores. Testes automatizados usam contextos isolados, sem apagar o progresso do usuário.

Depois da última cascata, o tabuleiro permanece visível por 2,2 a 2,6 segundos para celebrar os objetivos, com luz dourada e “Conseguiu!”. A transição leva à recompensa. A primeira conquista explica a coleção em uma apresentação curta antes de mostrar o livro. As seguintes variam a mensagem; repetir fase celebra sem duplicar livro. A capa, autoria e sinopse aparecem na recompensa, com “Guardar na biblioteca”. Movimento reduzido conserva a mensagem e remove a animação.

Ao lado de Jogar, o botão de dificuldade abre Fácil, Médio e Difícil. Fácil usa exatamente os objetivos e jogadas anteriores; Médio aumenta coleções em 35% e soma cinco jogadas; Difícil aumenta em 65% e soma três. Fases com objetivos de poderes/cascatas recebem metas próprias. A seleção é salva separadamente em `viva-difficulty-v1`; não modifica `viva-progress-v1`. Cada partida congela seu balanceamento ao começar. O infinito renova objetivos no mesmo tabuleiro, sem limite de jogadas, derrota obrigatória ou livros adicionais.

Depois da fase 5, guardar o livro abre a chegada de Blade. Na biblioteca ele começa dormindo, sem frases ou pistas permanentes. Tocar nele abre três opções em um menu pequeno ao lado do cachorro. “Blade, vamos passear?” usa a pose em pé do atlas existente; “Quer petisco?” usa a pose deitado acordado aprovada; “Blade, boa noite.” restaura a pose dormindo. O menu fecha ao selecionar, tocar fora ou pressionar Escape. A pose escolhida permanece durante a sessão, inclusive ao visitar outras telas. Não há camada escura nem deslocamento de controles.

Cada fase ainda não concluída apresenta seu cenário, nome e narrativa curta antes de “Vamos lá!”. As histórias usam somente o contexto e peças já existentes. Meu Pet e Família não antecipam as revelações. Fases concluídas e modo infinito entram diretamente na partida. `viva-stories-v1` registra histórias já lidas por campanha; `viva-session-v1` guarda a apresentação pendente ou a partida, vinculando o tabuleiro à campanha, fase e dificuldade de origem. A chave de conquistas `viva-progress-v1` continua igual. Uma recarga durante uma cascata retoma a posição estável anterior ao movimento; não tenta reproduzir uma animação interrompida.

Guardar o décimo livro abre o encerramento familiar. O retrato oficial é exclusivamente `fotos/atlas_imagens/Retrato de Família com Cachorro Fofinho.png`, também usado no quadro da mesa e na ampliação. A assinatura aparece nesse momento e pode ser relida no quadro:

> Jogo criado por Bruno, um filho que te ama pra sempre e te admira pela eternidade.

Livro, revelação e aceite são persistidos separadamente. Uma interrupção retoma a etapa correta. Campanhas antigas completas preservam seus desbloqueios. O infinito continua disponível após a campanha.

Não há tela de configurações. Os efeitos sonoros e as animações ficam ativos por padrão; a preferência de movimento reduzido do sistema é respeitada, inclusive quando muda com o jogo aberto. O áudio só é liberado após interação real e fica silencioso se a API não existir. O jogo não possui trilha contínua; somente as duas melodias originais das apresentações de Blade/família. Vibração é uma melhoria opcional por detecção de suporte; sua ausência não afeta a partida.

## Áudio original e biblioteca viva

Os efeitos e as melodias curtas de Blade/família foram restaurados da versão anterior ao Upgrade 2/5. Não há trilha contínua, samples Kenney ou sons automáticos de ambiente. O botão Áudio conserva volume e silêncio, sem modificar o progresso. Detalhes e testes: [AUDIO.md](AUDIO.md).

O Upgrade 3/5 acrescenta iluminação localizada, entrada e seleção delicadas dos livros, respiração de Blade e crossfade entre poses originais. A ambientação foi recalibrada após comparação de capturas reais: três feixes solares suaves, oito pontos de poeira visíveis na faixa de sol e reflexo delicado na cortina. O modo simplificado mantém três pontos e um feixe animado; movimento reduzido conserva luz estática. Posições, imagens e quatro estágios preservados. Tecnologias nativas, sem novas dependências. Arquitetura: [BIBLIOTECA.md](BIBLIOTECA.md); diagnóstico, intensidades, gravação e testes: [AMBIENTACAO.md](AMBIENTACAO.md).

## Controle e ritmo — Upgrade 4/5

O toque agora reage ao encostar, e o deslize distingue intenção de diagonais ambíguas. Cancelamento, perda de captura e segundo ponteiro são tratados sem consumir o toque seguinte. Trocas inválidas vão à célula vizinha e voltam sem cobrar jogada. Quedas curtas aguardam a própria animação, preservando o tempo de criação de poderes e a contemplação da vitória.

As esperas da jogada são canceladas ao desmontar a partida; o salvamento ocorre somente no estado estável. Sessões sem jogadas válidas também são recuperadas ao abrir, preservando objetivos e movimentos. A dica prioriza objetivos/poderes, dura 1,6 s e pode aparecer uma única vez após nove segundos de inatividade. Nenhuma meta ou dificuldade foi alterada.

Arquivos, arquitetura, verificações e resultados das 960 simulações: [GAMEPLAY.md](GAMEPLAY.md). Os testes de interação passaram em Chromium e WebKit, além das regras, poderes e campanha. Isso não substitui avaliação no iPhone físico.

Versão local: http://127.0.0.1:4173/viva-test/?v=feel4. Nenhuma publicação remota nesta rodada.

## Assets e efeitos

Os originais em `fotos/atlas_imagens/` são preservados. Recortes por componentes e regiões semânticas, com margem transparente, evitam fragmentos vizinhos. Tabuleiro, capas/lombadas, controles, poderes e recompensas têm exportações independentes. O recorte do retrato remove somente o fundo neutro externo à moldura, sem recriar personagens.

```sh
python -m pip install -r requirements-assets.txt
python scripts/prepare_assets.py
python tests/assets_test.py
python tests/books_test.py
python tests/controls_test.py
```

`public/assets/manifest.json` registra as origens. Poderes possuem destaque estático, animação suave em repouso e efeitos específicos de linha, coluna, área e cor; combinações são mais intensas, com orçamento limitado de partículas. Movimento reduzido conserva a identificação visual e elimina a camada animada.

O acabamento do tabuleiro usa CSS, Web Animations API (trocas contínuas, entrada, queda e aterrissagem) e Canvas 2D (fragmentos dos próprios sprites, pétalas, brilhos, ondas e trajetos até os objetivos). Cascatas intensificam os efeitos de forma limitada; o brilho de criação acompanha a posição real do poder. A camada visual tem sorteio próprio, sem consumir o gerador das peças. Não foram adicionadas dependências. O pool reutiliza até 180 partículas, além dos até 18 brilhos e seis atlas da camada de poderes. O canvas limita sua resolução a 1,75 vezes o tamanho CSS, encerra o RAF quando ocioso e libera animações/observadores ao sair ou ativar movimento reduzido. Nenhum asset foi redesenhado.

## Verificação

`pnpm test` cobre regras, persistência, marcos, áudio e vibração. Scripts Playwright em `tests/` verificam campanha real, sinopses, responsividade, encerramentos, tentativa/repetição, release e cache. Use `BROWSER_CHANNEL=msedge` se não houver Chromium do Playwright. Os scripts compatíveis aceitam `VIVA_TEST_URL` para apontar a outro servidor local. `tests/release.ts` verifica a porta 4173; `tests/offline-server.ts` inicia e desliga seu próprio servidor na 4199. As fixtures visuais de poderes em `tests/fx.html` não entram no build de produção.

Para verificar o upgrade visual, inicie `pnpm dev --port 4175` e execute `pnpm exec tsx tests/vfx-game.ts`. Em PowerShell, `$env:BROWSER_ENGINE='webkit'` seleciona o WebKit; sem essa variável o roteiro usa Chromium/Edge. Os 21 cenários usam o componente real do jogo e comparam seu resultado com o motor puro, com movimento normal e reduzido: 3/4/5, criação dos quatro poderes, ativações, dez pares e cascatas. Também verificam coleta, vitória, arrasto, rotação, telas pequenas, limite Retina e um quadro lento simulado. A fixture `tests/vfx-game.html` existe somente no servidor de desenvolvimento e não é publicada. No jogo normal, combine quatro/cinco ou faça uma interseção para criar poderes e troque-os com vizinhos para ativar; dois poderes vizinhos mostram o efeito combinado.

Resultados e limitações estão em `VALIDACAO.md`; capturas e relatórios ficam em `test-results/`.

## Publicação e iPhone

O workflow `.github/workflows/pages.yml` instala dependências, testa e publica `dist/` quando a branch main é enviada, usando o nome do repositório como caminho-base. O repositório configurado é `https://github.com/9brunosoares/viva`; a publicação é `https://9brunosoares.github.io/viva/`. Esta rodada de refinamento é verificada localmente antes de um novo envio.

Para outro caminho, defina `VIVA_BASE='/nome-do-repositorio/'` antes de `pnpm build`. Para domínio raiz, use `/`; o padrão `./` gera caminhos relativos.

No iPhone, abra o endereço HTTPS publicado no Safari, aguarde o carregamento inicial e use Compartilhar → Adicionar à Tela de Início. Depois de o cache ser instalado, o jogo funciona offline. As instruções técnicas ficam aqui, fora da interface do jogo.

O manifesto continua em retrato. O jogo tenta o bloqueio de orientação quando a API existe. Se o Safari recusar, um canvas vertical gira em conjunto com a composição, incluindo controles, diálogos e direção dos gestos. As barras do navegador e a orientação do sistema continuam sob controle do iOS; não é possível forçá-las pelo site. A verificação física de notch e gestos continua necessária.

O progresso é local ao navegador/app instalado. Prefira começar pelo ícone instalado; contextos de armazenamento podem diferir. Apagar os dados do site pode remover conquistas. Não há sincronização ou exportação. Instalação, áudio, vibração, áreas seguras e desempenho no iPhone físico exigem verificação no aparelho. WebKit automatizado em Windows não substitui essa etapa.
