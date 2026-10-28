# Viva! — Upgrade 6

Entrega incremental iniciada em 27/10 e validada em 28/10/2026. Restauração: `viva-pre-premium-6-20261027` (`76e8b51`). O recorte seguro previsto no próprio briefing foi aplicado: ingredientes descendentes ficam desativados na campanha; não foram reduzidas metas nem alteradas jogadas para acomodá-los.

## 1. Arte e fontes

Os oito JPGs e o briefing foram copiados sem alteração para `source-assets/premium6/`, com dimensões reais e SHA-256 em `originals.json`. `scripts/prepare_premium6.py` exporta 13 sprites com alpha e margem: pétalas, três estados do presente, oito lembranças e rabinho. O maior componente de cada célula elimina fragmentos dos vizinhos; o fundo é removido por conectividade para preservar papel, vidro e tons claros. O presente aberto tem transparência real também no centro.

Os arquivos de fundo HD previstos no documento **não foram fornecidos**. A imagem vazia mede 503 × 757; a montagem dos quatro estados mede 853 × 1280. A composição mantém as coordenadas 496 × 756: estados 0/1 usam a sala vazia; estados 2/3 usam o trecho superior retocado da montagem e o piso da sala vazia, evitando duplicar o cachorro embutido. Não há geração de uma ilustração substituta. A qualidade fica limitada à resolução entregue.

Fraunces, Nunito e Caveat são WOFF2 locais, com subconjuntos Latin/Latin Extended, `font-display: swap`, licenças SIL OFL e proveniência em `public/assets/fonts/audit.json`. Nunito/Fraunces têm preload. Caveat é usada somente na dedicatória. Nenhuma requisição a serviços de fontes ocorre durante o jogo. Sem dependência nova de execução.

Assets públicos: 6.321.164 → 6.988.848 bytes (**+667.684 bytes**, incluindo fontes, licenças e auditorias). JPGs originais: 1.966.349 bytes, fora do cache da aplicação. Scripts/auditorias registram os recortes; o service worker inclui os recursos necessários automaticamente.

## 2. Tabuleiro e recorte de balanceamento

O motor original foi estendido com campos opcionais. Pétalas pertencem à célula; presentes têm duas vidas, não combinam/não trocam, caem e recebem no máximo um dano por onda. Poderes e combinações adjacentes usam uma união de impactos, sem dano duplicado. A abertura de um presente também varre pétalas sob ele. O embaralhamento conserva as peças de obstáculo, suas vidas e as camadas. Dicas ignoram presentes e consideram os novos objetivos.

O protótipo de ingrediente usa `kind: -1`, guarda explícita contra combinações, queda normal, entrada no topo e coleta só no fundo de um tabuleiro estável. Poderes o preservam. Essas regras e sua persistência têm testes, mas **o ingrediente não está ativo na campanha publicada**: o primeiro ensaio com um ingrediente apresentou apenas 77% (Espiritismo), 81% (Roma) e 71% (Tatuagens) no Fácil. Mesmo uma pétala em Tatuagens ficou em 98/100 numa calibração intermediária. Para respeitar o mínimo de 99% e o congelamento das metas, a configuração final é:

| Tema | Peças | Pétalas Fácil/Médio/Difícil | Presentes Fácil/Médio/Difícil | Ingrediente |
|---|---:|---|---|---|
| Química | 4 | — | — | Desativado |
| Ensino Infantil | 5 | — | — | Desativado |
| Praia | 5 | 4 / 6 / 7 | — | Desativado |
| Kung Fu | 6 | — | 1 / 2 / 2 | Desativado |
| Meu Pet | 5 | 3 / 5 / 5 | — | Desativado |
| Espiritismo | 6 | — | — | Desativado |
| Roma | 6 | — | 1 / 2 / 2 | Desativado |
| Pagode | 5 | 4 / 6 / 7 | — | Desativado |
| Tatuagens | 7 | 0 / 5 / 5 | 0 / 2 / 2 | Desativado |
| Família | 6 | 1 / 2 / 2 | — | Desativado |

Todos continuam 7 × 8. Poderes aprovados, metas existentes, movimentos e escalas de dificuldade permanecem iguais. Há apenas duas dicas breves de estreia, em Praia/Kung Fu. O infinito permanece sem obstáculos.

### Simulação antes/depois

100 sementes por fase e dificuldade: 3.000 partidas de referência e 3.000 na configuração candidata, com execuções adicionais em Tatuagens após cada redução/correção. O bot guloso existente ganhou somente a percepção de pétalas, presentes e coluna do ingrediente; não prevê refills nem faz busca futura. A tabela final combina a execução completa com a reexecução de Tatuagens. Cada célula mostra **vitórias antes→depois; jogadas restantes médias antes→depois** (inclui derrotas, que terminam com zero).

| Tema | Fácil | Médio | Difícil |
|---|---|---|---|
| Química | 100→100%; 23.0→23.0 | 100→100%; 26.6→26.7 | 100→100%; 23.6→23.6 |
| Ensino Infantil | 100→100%; 24.0→24.0 | 100→100%; 25.4→25.4 | 100→100%; 20.9→20.9 |
| Praia | 100→100%; 25.8→25.1 | 100→99%; 26.7→26.0 | 99→98%; 21.1→20.4 |
| Kung Fu | 100→99%; 23.1→22.3 | 100→99%; 19.8→18.0 | 90→91%; 11.3→10.7 |
| Meu Pet | 100→100%; 29.3→28.7 | 100→100%; 31.1→31.3 | 100→100%; 26.1→26.4 |
| Espiritismo | 99→99%; 25.1→25.1 | 100→100%; 21.6→21.6 | 93→93%; 13.1→13.1 |
| Roma | 100→100%; 24.4→23.9 | 100→98%; 21.6→20.8 | 95→96%; 13.0→12.7 |
| Pagode | 100→100%; 33.5→32.8 | 100→100%; 34.8→34.5 | 100→100%; 29.9→29.4 |
| Tatuagens | 100→100%; 25.3→25.3 | 100→99%; 20.2→20.3 | 84→82%; 9.1→9.9 |
| Família | 99→100%; 24.2→24.0 | 99→98%; 21.0→19.8 | 93→97%; 11.9→12.1 |

O Fácil final fica em 99–100% por fase nesta amostra. A maior queda final é de 2 pontos percentuais em Tatuagens/Difícil (84→82%). Isso não garante a mesma taxa para pessoas nem em toda semente possível. Relatórios completos locais: `test-results/premium6-before.json`, `premium6-final-balance.json`; reprodução em `tests/balance.ts` e `tests/premium6-balance.ts`.

## 3. Vitória

“Conseguiu!” tem apoio creme opaco, contraste verde e Fraunces; é anunciado uma vez, com status/dica duplicados ocultos. Até oito peças recebem poderes direcionais e disparam numa cópia visual descartável. Não alteram coleta, contador, tabuleiro salvo, recompensa ou áudio. O efeito cabe na contemplação original de 2,2–2,6 s, sem espera adicional; um toque pode avançar. Movimento reduzido pula esse espetáculo. `won` no snapshot permite retomar uma vitória interrompida sem repetir a jogada nem tocar um novo som de vitória.

## 4. Biblioteca e recompensas

A segunda prateleira vazia reserva dez destinos fixos, medidos nas novas imagens. Base inclinada conforme a perspectiva; alturas próximas de 43 px na arte; inclinação de até 1°, contato e sombra discreta no painel; leve aquecimento das lombadas. As camadas de oclusão usam pixels exatos da madeira já comprimida, evitando emendas de cor. Ordem e áreas de seleção continuam vinculadas aos livros persistidos.

As oito lembranças decorativas derivam exclusivamente de `completed`, sem nova chave de progresso e sem interação/legenda. Diploma na prateleira alta; desenho/faixa/quadro na parede; álbum, vela e caixa de som nas superfícies; copo na mesa em primeiro plano. Campanhas antigas veem os objetos imediatamente, sem repetição de chegada.

`LibraryScene.tsx` reutiliza o mesmo cenário na biblioteca, recompensa e cerimônias. O livro é entregue com capa/título/autor e a ação existente, sem sinopse; ao aceitar, a capa voa para sua lombada, seguida da lembrança quando houver. O cenário sob a apresentação fica inerte para impedir toques em elementos ao fundo. Movimento reduzido apresenta o estado final sem voo. A leitura completa continua no visualizador da biblioteca.

Blade chega no tapete, com seus sprites, poses, textos e menu oculto preservados. A opção de infinito foi para a zona superior esquerda e não se sobrepõe ao retrato. Os quatro estágios e os estados de 0, 1, 4, 5, 6, 9 e 10 livros foram capturados em três tamanhos.

## 5. Interface

Controles de voltar/pausar agora usam SVG da mesma família plana da engrenagem: creme, borda dourada fina, traço verde, área mínima de 44 px. Links sublinhados viraram pills/chips; tipografia e contadores têm hierarquia comum e números tabulares. Os PNG/WebP ornamentados originais permanecem no acervo, mas não são renderizados como controles.

## 6. Encerramento

O retrato aparece na mesa dentro da sala. A luz reduz em cerca de 1,5 s; há brilho discreto e aproximação de 2,8 s, limitada a escala 1,15. O título entra em seguida, e a dedicatória surge em três linhas em Caveat. Seu `textContent` permanece exatamente:

> Jogo criado por Bruno, um filho que te ama pra sempre e te admira pela eternidade.

As mesmas ações e etapas persistidas de livro/revelação/aceite continuam valendo. O botão de retorno aparece suavemente e não depende de a música terminar. Ao sair, a melodia para pelo mecanismo existente. Movimento reduzido remove a aproximação. A sequência pausa quando a página fica oculta.

## 7. Rabinho

Somente Meu Pet, inclusive revisitas, sem infinito. Duas aparições por partida, após 6–12 s de repouso elegível, com 1,6 s e três oscilações. Gesto, seleção, cascata, pausa ou segundo plano cancelam a aparição. A cauda fica atrás da moldura, no canto superior direito; cabeçalho/objetivos ficam acima dela. Sem texto, toque ou som. Movimento reduzido a remove. Duas aparições foram observadas em tempo real, com alpha carregado, seguidas de um período sem terceira aparição.

## 8. Persistência e áudio

`viva-progress-v1`, dificuldade, histórias, ordem dos livros e passos de revelação não mudaram. A sessão mantém schema 1 e marca novas configurações com `campaignVersion: 3`. Versões 2/legadas retomam suas regras e nenhum obstáculo é retroativamente acrescentado. Snapshots novos guardam camadas, vidas, contadores e vitória pendente. Um sorteio de tabuleiro desnecessário na restauração foi eliminado para manter o mesmo consumo de RNG nas cascatas.

A validação de interrupção encontrou uma janela de gravação depois do aceite. A mesma gravação de progresso agora ocorre no layout effect, antes de liberar a próxima tela, sem alterar a máquina de estados. Isso evita que uma recarga imediata observe a etapa anterior.

`src/audio.ts`, suas preferências, volumes, melodias, pontos de chamada e temporizações não foram alterados. Não há nova chamada ao módulo de áudio, trilha de fundo ou som de ambiente. Os testes de áudio original e a verificação Git dos arquivos protegidos passaram.

## 9. Verificações

- TypeScript, build oficial e build QA; nenhuma dependência nova. A versão oficial continua forçando QA desativado.
- 52 testes unitários, incluindo papéis, presentes, pétalas, cores, gravidade, mistura de objetivos, shuffle, sessões antigas e estados de progresso.
- 21 cenários de VFX por motor em Chromium/Edge e WebKit: motor puro comparado ao componente real, com/sem movimento, trocas inválidas, poderes individuais/combinados, cascatas, cancelamento e vitória.
- 30 verificações do Upgrade 6 por motor: biblioteca em 375 × 667, 390 × 844 e 430 × 932; livros/áreas clicáveis; salvos antigos; vitória restaurada; livro/revelação/aceite; surpresas preservadas.
- Regressão da campanha existente: 13 composições por motor, dez fases via QA, modo infinito, sete tipos de tatuagem e sessões antigas. Mobile: 15 composições por motor, foco, Escape, leitura, safe areas e movimento reduzido. Configurações/Novo jogo passaram nos dois motores, incluindo ausência de API de áudio.
- Campanha Fácil completa com jogadas válidas: 165 movimentos, zero reinícios, sem botão de conclusão; Kung Fu/Médio em 30 jogadas e Tatuagens/Difícil em 44, também sem reinícios. O histórico está em `test-results/premium6/journey-report.json`.
- Fluxos de movimento: cópia de vitória sem mudar save; recarga durante o voo; chegada de Blade; recargas em três pontos do encerramento; alteração de movimento reduzido ao vivo. Gravação local `test-results/premium6/premium6-motion.webm` e capturas na mesma pasta.
- Offline real no WebKit de desktop: servidor de origem desligado, recarga, jogada válida, livro conquistado, biblioteca recarregada e sinopse lida. 19 recursos novos (13 sprites e seis fontes) respondem do cache; as três famílias carregam. Avisos internos de atualização do worker do WebKit são registrados separadamente: no teste online, essa classificação exige controller/worker ativos e resposta HTTP 200 para sw.js; os demais erros continuam reprovando o teste. O ensaio offline registra o aviso de rede separadamente, quando ocorrer.
- Auditoria de assets: oito originais preservados; 13 exports com margem/alpha; seis WOFF2; três OFL; presente aberto transparente; 74 quadros VFX protegidos e oclusão com a madeira real.
- Medição indicativa em Chromium/390 × 844: biblioteca pausada e animada tiveram p50 16,7 ms e p95 17 ms, zero quadros acima de 50 ms e zero mutações de DOM por quadro, 84 nós. É comparação local, sem garantia de FPS no aparelho.

### Ritmo de quadros no WebKit de desktop

O diagnóstico adicional encontrou uma limitação **já presente na versão publicada anterior**: com a sala animada, p50/p95 de 121/152 ms; nesta versão, amostras de 124–130/142–167 ms. Pausada, a sala ficou em cerca de 15/30 ms. O teste de orçamento relativo animado/pausado **não passou no WebKit de desktop**; não está sendo apresentado como validação de 60 FPS. Raios ocultos, respiração pausada, remoção de poeira e camadas de composição foram medidos individualmente, sem ganho consistente que justificasse mudar a ambientação aprovada. Texturas experimentais não foram integradas. O comportamento é registrado para validação em Safari/iPhone real; o Chromium passou no orçamento de comparação. Diagnóstico reproduzível: `tests/premium6-profile.mjs` e `tests/library-performance.ts`, relatórios locais `webkit-published-before-rendering.json`/`webkit-layer-profile.json`.

### Limitações e itens adiados

Ingredientes descendentes, presentes em Família e obstáculos no Fácil de Tatuagens ficaram fora da campanha para preservar a taxa de vitória exigida sem mexer no desafio aprovado. O motor opcional não significa recurso ativo para a jogadora. Os backgrounds HD separados não foram entregues; a biblioteca usa a resolução efetivamente disponível. Testes ocorreram em navegadores desktop com viewport mobile: **não houve instalação nem avaliação em iPhone físico**. Não foi simulada limitação de CPU no WebKit, cuja interface Playwright neste ambiente não oferece o CDP de throttling do Chromium. Termodinâmica, bateria e qualidade subjetiva no aparelho permanecem para teste real.

## 10. Arquivos e reprodução

Arte: `scripts/prepare_premium6.py`, `scripts/prepare_fonts.mjs`, `source-assets/premium6/`, `public/assets/premium6/`, `public/assets/fonts/`, fundos/máscaras da sala e manifesto de assets.

Gameplay: `src/engine.ts`, `obstacles.ts`, `session.ts`, `hint.ts`, `Game.tsx`, tipo opcional em `config.ts`. UI: `App.tsx`, `LibraryScene.tsx`, `RewardFlight.tsx`, `Celebration.tsx`, `TailPeek.tsx`, `FlatIcon.tsx`, `libraryLayout.ts`, `StageIntro.tsx`, `fonts.css`, `premium6.css`, `main.tsx`, `index.html`; fallback de cor de partículas em `useGameVfx.ts`.

QA: `tests/premium6*.ts`, `premium6_assets.py` e ajustes de expectativas antigas em `campaign.test.ts`, `campaign-app.ts`, `campaign_assets.py`, `celebrations.ts`, `pwa-update.ts`. Esses ajustes acompanham mudanças solicitadas de prateleira, apresentação e versão de configuração; não alteram o motor usado como oráculo.

Comandos: `pnpm test`, `pnpm build`, `pnpm build:qa`; `pnpm exec tsx tests/premium6-app.ts` (com `BROWSER_ENGINE=webkit` quando desejado); `pnpm exec tsx tests/premium6-journey.ts`, `tests/premium6-motion.ts`, `tests/premium6-offline.ts`; `BALANCE_SAMPLES=100 pnpm exec tsx tests/premium6-balance.ts`. Em telas curtas, os objetivos usam ícone acima do contador para manter o botão de dica inteiro e preservar o tamanho das peças. Os testes de navegador usam contextos isolados e não apagam o progresso da jogadora. Os artefatos locais não são versionados nem incluídos no cache do jogo.

## 11. Publicação

Autorizada expressamente no item 8.4 do briefing. O build gera um novo hash de cache e conserva a atualização coordenada em telas seguras. O teste de atualização exercita três versões, múltiplas janelas, adiamento durante jogo/leitura, preservação da partida e disponibilidade offline da nova versão.

Status de publicação: aguardando o commit final e a confirmação do workflow Pages. A verificação remota será registrada após o envio a `main`.
