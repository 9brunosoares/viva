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

Abra http://127.0.0.1:4173/viva-test/. Feche abas antigas e reabra para ativar uma atualização do cache, sem apagar o progresso.

## Testes sem atalhos na interface

Os botões de concluir fase e as prévias de QA foram removidos do código da interface, inclusive em desenvolvimento. A variável `VITE_ENABLE_QA` não pode reativá-los. Os mecanismos automatizados de teste de regras e persistência continuam em `tests/`, fora do aplicativo publicado. Scripts históricos que dependiam dos botões de QA documentam versões anteriores; a campanha real, os testes unitários e `tests/synopses.ts` validam a entrega atual.

## Experiência e progresso

A biblioteca ocupa a tela como ambiente, com controles flutuantes de Jogar/Continuar, fases, coleção e infinito quando desbloqueado. As artes e posições relativas de livros, Blade e quadro são preservadas. Fases bloqueadas ocultam nomes, temas e imagens. “Meus livros” e as lombadas abrem a capa do livro; “Ler sinopse” vira o volume e mostra título, autor e texto no verso. “Voltar à capa” desfaz o movimento. Somente a sinopse rola; a face oculta fica fora da navegação assistiva.

Toque em peças vizinhas ou arraste para trocar. Três combinam; quatro criam limpeza de linha/coluna; cinco criam poder de cor; interseções criam área. Poderes podem ser ativados e encadeados. Uma dica não gasta jogada. Não há tempo ou vidas. Cascatas terminam antes de avaliar vitória. Pausar mantém a partida nesta sessão; sair ou fechar o jogo inicia outro tabuleiro ao retornar.

Cada fase inédita concede um livro. A ordem é sorteada uma vez e salva. Repetições e infinito não duplicam livros. A chave `viva-progress-v1` permanece compatível com campanhas anteriores. Testes automatizados usam contextos isolados, sem apagar o progresso do usuário.

Depois da última cascata, o tabuleiro permanece visível por 2,2 a 2,6 segundos para celebrar os objetivos, com luz dourada e “Conseguiu!”. A transição leva à recompensa. A primeira conquista explica a coleção em uma apresentação curta antes de mostrar o livro. As seguintes variam a mensagem; repetir fase celebra sem duplicar livro. A capa, autoria e sinopse aparecem na recompensa, com “Guardar na biblioteca”. Movimento reduzido conserva a mensagem e remove a animação.

Ao lado de Jogar, o botão de dificuldade abre Fácil, Médio e Difícil. Fácil usa exatamente os objetivos e jogadas anteriores; Médio aumenta coleções em 35% e soma cinco jogadas; Difícil aumenta em 65% e soma três. Fases com objetivos de poderes/cascatas recebem metas próprias. A seleção é salva separadamente em `viva-difficulty-v1`; não modifica `viva-progress-v1`. Cada partida congela seu balanceamento ao começar. O infinito renova objetivos no mesmo tabuleiro, sem limite de jogadas, derrota obrigatória ou livros adicionais.

Depois da fase 5, guardar o livro abre a chegada de Blade. Ele possui uma pose dormindo e uma acordado, proporcionais. Toque nele, em “Blade, vamos passear?” ou “Quer petisco?” para acordá-lo; “Blade, boa noite.” o faz dormir.

Guardar o décimo livro abre o encerramento familiar. O retrato oficial é exclusivamente `fotos/atlas_imagens/Retrato de Família com Cachorro Fofinho.png`, também usado no quadro da mesa e na ampliação. A assinatura aparece nesse momento e pode ser relida no quadro:

> Jogo criado por Bruno, um filho que te ama pra sempre e te admira pela eternidade.

Livro, revelação e aceite são persistidos separadamente. Uma interrupção retoma a etapa correta. Campanhas antigas completas preservam seus desbloqueios. O infinito continua disponível após a campanha.

Não há tela de configurações. Som e animações ficam ativos por padrão; a preferência de movimento reduzido do sistema é respeitada, inclusive quando muda com o jogo aberto. O áudio só é liberado após interação real e fica silencioso se a API não existir. Combinações, criação/ativação de poderes, poderes combinados, cascatas e vitória têm sons distintos sintetizados localmente. As cerimônias têm melodias finitas e botão “Ouvir” quando suportado. Vibração é uma melhoria opcional por detecção de suporte; sua ausência não afeta a partida.

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

## Verificação

`pnpm test` cobre regras, persistência, marcos, áudio e vibração. Scripts Playwright em `tests/` verificam campanha real, sinopses, responsividade, encerramentos, tentativa/repetição, release e cache. Use `BROWSER_CHANNEL=msedge` se não houver Chromium do Playwright. Os scripts compatíveis aceitam `VIVA_TEST_URL` para apontar a outro servidor local. `tests/release.ts` verifica a porta 4173; `tests/offline-server.ts` inicia e desliga seu próprio servidor na 4199. As fixtures visuais de poderes em `tests/fx.html` não entram no build de produção.

Resultados e limitações estão em `VALIDACAO.md`; capturas e relatórios ficam em `test-results/`.

## Publicação e iPhone

O workflow `.github/workflows/pages.yml` instala dependências, testa e publica `dist/` quando a branch main é enviada, usando o nome do repositório como caminho-base. O repositório configurado é `https://github.com/9brunosoares/viva`; a publicação é `https://9brunosoares.github.io/viva/`. Esta rodada de refinamento é verificada localmente antes de um novo envio.

Para outro caminho, defina `VIVA_BASE='/nome-do-repositorio/'` antes de `pnpm build`. Para domínio raiz, use `/`; o padrão `./` gera caminhos relativos.

No iPhone, abra o endereço HTTPS publicado no Safari, aguarde o carregamento inicial e use Compartilhar → Adicionar à Tela de Início. Depois de o cache ser instalado, o jogo funciona offline. As instruções técnicas ficam aqui, fora da interface do jogo.

O manifesto continua em retrato. O jogo tenta o bloqueio de orientação quando a API existe. Se o Safari recusar, um canvas vertical gira em conjunto com a composição, incluindo controles, diálogos e direção dos gestos. As barras do navegador e a orientação do sistema continuam sob controle do iOS; não é possível forçá-las pelo site. A verificação física de notch e gestos continua necessária.

O progresso é local ao navegador/app instalado. Prefira começar pelo ícone instalado; contextos de armazenamento podem diferir. Apagar os dados do site pode remover conquistas. Não há sincronização ou exportação. Instalação, áudio, vibração, áreas seguras e desempenho no iPhone físico exigem verificação no aparelho. WebKit automatizado em Windows não substitui essa etapa.
