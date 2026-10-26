# Refinamento premium — biblioteca, vitória e dificuldade

Esta seção descreve a versão local mais recente. Os registros seguintes são históricos.

- Biblioteca sem card, com cenário aprovado como ambiente e HUD sobreposto. Cinco estados (0, 2, 5, 8 e 10 livros) em três viewports (320×568, 390×844 e 430×932) aprovados nos dois motores: 15 verificações por motor. Livros, duas poses de Blade e retrato sobre a mesa preservados; respostas e frases integram o cenário. O seletor compacto de dificuldade abre ao lado de Jogar.
- Fácil reproduz exatamente o balanceamento anterior. Médio usa +35% nas coleções e +5 jogadas; Difícil usa +65% e +3 jogadas. Metas de ativação e cascatas foram adaptadas nas fases que já as possuíam. Motor, distribuição e criação de poderes não foram alterados. Preferência em chave separada `viva-difficulty-v1`; o save antigo permanece intacto.
- 720 simulações determinísticas (24 por fase/dificuldade), com robô guloso: Fácil 240/240 vitórias e média 21,3 jogadas; Médio 239/240 e 28,6; Difícil 224/240 e 34,8. São comparações entre os mesmos conjuntos de sementes, não previsão de desempenho humano. A estimativa de tempo no relatório assume 3 segundos por jogada e exclui reflexão e tempo adicional de efeitos.
- Vitória após todas as cascatas, com objetivos completos, última coleta destacada, luz e mensagem no tabuleiro por 2,2–2,6 segundos. O tabuleiro permanece visível e bloqueia toques até a transição. A primeira recompensa explica a coleção antes de mostrar o livro. Demais recompensas variam a frase, mantêm a sinopse e usam “Guardar na biblioteca”. Repetição não concede outro livro.
- Campanha completa por jogadas reais: 10 fases, 212 movimentos, nenhuma repetição e nenhum erro. Ordem salva, dez livros únicos, chegada de Blade, retrato final e offline aprovados. Testes de regras/marcos continuam cobrindo as etapas de revelação; conteúdo emocional e assinatura permanecem iguais.
- No navegador, três dificuldades jogadas até a recompensa nos dois motores, vitória em movimento normal e reduzido, introdução da coleção e leitura de capa/verso aprovadas. Chromium também verificou repetição e renovação do primeiro objetivo infinito no mesmo tabuleiro. O infinito exibe ∞, renova objetivos sem fim obrigatório e conserva conquistas.
- Livro conquistado abre somente a capa; “Ler sinopse” vira em 500 ms e mostra uma superfície de verso com título, autor e texto oficial. Só o texto rola. Face oculta usa `inert`/`aria-hidden`; navegação assistiva permanece no mesmo diálogo. As dez sinopses, autorias e IDs foram preservados. Os roteiros de sinopses foram adaptados à nova interação.
- Rotação em viewport mobile aprovada no Chromium e WebKit. O manifesto segue em retrato; quando `screen.orientation.lock` é recusado, a composição vertical gira com os controles e ajusta a direção dos gestos. O site não pode obrigar a orientação das barras do Safari/sistema; a validação física das safe areas, áudio, vibração e instalação no iPhone continua necessária.
- TypeScript, build e 21 testes unitários aprovados. Derrota/nova tentativa, release sem atalhos QA, manifesto/ícones, saves antigos e retrato offline aprovados. WebKit também recarregou do cache após desligar o servidor de teste. Nenhum progresso real foi reiniciado; contextos de teste são isolados. Nenhum asset aprovado foi refeito nesta rodada.
- Evidências em `test-results/`: `balance-report.json`, `premium-chromium-report.json`, `premium-webkit-report.json`, capturas `premium-*-library-*.png`, `premium-*-book-*.png`, `premium-*-victory-*.png`, `premium-*-intro-*.png`, `premium-*-reward-*.png`, `synopses-*-report.json`, `browser-report.json`, `release-report.json` e `webkit-no-server-report.json`.

---

# Atualização final — sinopses e remoção dos atalhos

- Dez sinopses oficiais incluídas por ID fixo, com títulos e autores fornecidos. A recompensa mantém sua apresentação; apenas o modal de leitura recebe o texto completo. Capas, lombadas, prateleiras e todos os demais assets foram preservados.
- Janela existente adaptada para rolar somente a sinopse, com capa, título, autor, navegação e retorno visíveis. Texto de 16 px e entrelinha 1,6. Trocar de livro reinicia a rolagem do texto.
- Botão de concluir fase e prévias de QA removidos do código da interface, inclusive em desenvolvimento e no antigo build separado. Nenhuma variável de ambiente pode reativar esses controles. Os testes de regras/persistência continuam fora do aplicativo; os antigos roteiros que dependem de botões removidos são históricos.
- TypeScript, build e 18 testes unitários aprovados. Campanha existente executada novamente por jogadas reais: dez fases, 288 movimentos, nenhuma nova tentativa e nenhum erro. Teste existente de derrota e nova tentativa aprovado.
- Sinopses: 73 verificações no Chromium e 63 no WebKit, com dois embaralhamentos e três viewports de iPhone (320×568, 390×844, 430×932). Associação de capa/título/autor/texto, abertura pelas lombadas, fechamento, navegação limitada aos conquistados, rolagem interna sem corte horizontal e progresso inalterado aprovados. A inspeção visual confirmou o modal pequeno, inclusive o autor de Nosso Lar em múltiplas linhas.
- Chromium também recarregou offline e percorreu as dez sinopses com suas capas. Teste existente do release aprovou manifesto standalone, ícones acessíveis, ausência de QA, saves antigos e retrato offline. Cache atualizado: 5023b7accfc7, 152 arquivos. Instalação física no iPhone não foi repetida; manifesto, service worker e configuração PWA foram preservados.
- Nenhum progresso do usuário foi reiniciado. Testes usam contextos isolados. Nenhuma regra, dificuldade, recompensa, ordem persistente dos livros, cena, som, interação de Blade ou modo infinito foi alterado.
- Evidências: `test-results/synopses-chromium-report.json`, `synopses-webkit-report.json`, `synopsis-chromium-320.png`, `synopsis-webkit-320.png`, `browser-report.json` e `release-report.json`.

---

# Revisão final — 26/10/2026

Esta seção descreve a entrega atual; as seções abaixo são registros históricos de versões anteriores.

- TypeScript e os dois builds aprovados. `dist/` é release sem QA, inclusive quando chamado com `VITE_ENABLE_QA=true`; `dist-qa/` é separado. Release acessível em http://127.0.0.1:4173/viva-test/ e QA em http://127.0.0.1:4174/viva-test/ enquanto os servidores locais estiverem ativos. Nenhuma publicação remota foi feita.
- 18 testes unitários aprovados: tabuleiros, trocas, poderes/cascatas, campanha/persistência, etapas dos marcos, compatibilidade com saves antigos, áudio limitado a interação e vibração opcional. Teste de derrota e nova tentativa imediata aprovado.
- Campanha completa jogada por trocas reais: dez fases, 246 movimentos, nenhuma repetição e nenhum erro de página/HTTP. Dez livros únicos, mesma ordem após recarga, revelações, biblioteca e entrada no infinito aprovados. Campanha de QA também concluída pelas dez fases, com guardas de clique duplicado, recargas e recompensas sem duplicação. As dez recompensas couberam em 320×568.
- Matriz final: 65 combinações de tela/estado no Chromium em release e 65 no WebKit em QA, em 320×568, 390×844, 430×932, 1366×768 e 1440×900. Sem rolagem da página nas telas testadas; controles visíveis, criação e ativação real de poder aprovadas. Não houve erros de página/requisição.
- Experiência final aprovada no Chromium e WebKit: ausência de configurações e texto técnico, coleção com navegação e retorno de foco, preferência do sistema reagindo ao vivo, oito layouts de cerimônias por motor, assinatura exata, retrato oficial e progresso antigo preservado. Os campos antigos de som/movimento são mantidos no save por compatibilidade, mas não comandam mais a interface.
- Cinco fixtures visuais de poderes aprovadas: linha, coluna, área, cor e combinação. Efeitos distintos, combinação reforçada, limite de partículas e redução de movimento verificados. As fixtures são exclusivas de teste e não entram no release. Sons possuem oito identidades sintetizadas distintas e melodias finitas com limpeza ao sair da cena.
- Assets auditados: 60 peças, 20 capas/lombadas e 32 exports dos atlas de controles/poderes/recompensas. Margens transparentes, centralização das peças, pausa limpa e origem exclusiva das duas variantes do retrato aprovadas. Inspeção visual das pranchas e cenas concluída. Originais preservados.
- O único retrato em uso é `Retrato de Família com Cachorro Fofinho.png`. Cena final, moldura sobre a mesa e ampliação usam esse arquivo. Nenhum personagem foi recriado; a variante de objeto remove apenas o fundo neutro externo à moldura. A mensagem é exatamente: “Jogo criado por Bruno, um filho que te ama pra sempre e te admira pela eternidade.”
- Release final: ausência de QA/configurações, manifesto standalone, ícones disponíveis, campanha antiga e retrato oficial offline aprovados. Cache final `1f12c0c58c0d`, 152 arquivos. O protocolo offline do Playwright WebKit para Windows apresenta erro interno ao recarregar; por isso foi feito também um teste com servidor HTTP realmente desligado. Nesse teste o WebKit recarregou a biblioteca, a miniatura e a ampliação do retrato pelo cache com sucesso.
- Limitações reais: WebKit automatizado no Windows não expõe AudioContext neste ambiente; nele foi verificado o fallback silencioso e a ausência do botão Ouvir. Chromium e mocks verificaram desbloqueio por gesto, agendamento e limites de áudio. Qualidade auditiva, vibração, instalação PWA, áreas seguras físicas e desempenho em iPhone real continuam pendentes de teste no aparelho. Suporte a vibração é detectado e sua ausência é silenciosa.
- O progresso do usuário não foi reiniciado: as campanhas automatizadas usam contextos de navegador isolados. Para ativar uma atualização, feche abas antigas do jogo e reabra; não apague os dados do site.

Evidências principais em `test-results/`: `browser-report.json`, `qa-report.json`, `final-chromium-report.json`, `final-webkit-report.json`, `polish-chromium-release-report.json`, `polish-webkit-qa-report.json`, `fx-report.json`, `release-report.json`, `webkit-no-server-report.json`, `release-library.png`, `final-*-family-*.png`, `power-*-active.png` e `final-controls-audit.png`.

---

# Validação do Viva!

## Nova biblioteca e revelações afetivas

- Atlas novo inspecionado: `Evolução de um cantinho de leitura aconchegante.png`, RGB, 1024×1536, quatro painéis. Recortes 496×756 sem separadores brancos. A mesa é preservada como primeiro plano; o quadro está em sua superfície, fora da estante. Uma camada transparente do próprio cenário mantém Blade atrás da borda da mesa.
- `pnpm test`: 15 testes aprovados, incluindo livro → revelação → aceite, bloqueio de avanço com revelação pendente, restauração das duas etapas, campanha antiga com conquistas intactas e rejeição de dados inconsistentes. A chave de progresso continua a mesma; as informações novas são opcionais para saves antigos.
- Campanha QA completada novamente pelas dez fases: nomes antes/depois de Blade, dez livros únicos, revelações separadas após guardar os livros das fases 5 e 10, recarga antes/depois da apresentação, desbloqueios, repetição, infinito e offline aprovados no Chromium.
- Nova biblioteca verificada em 65 combinações de estado/tela no Chromium, incluindo o retrato na mesa. Livros e ícones passaram novamente nos testes de exportação (20 e 60 arquivos).
- As duas cenas passaram em quatro viewports (320×568, 390×844, 430×932 e 1366×768), total de oito verificações por motor, no Chromium e no WebKit. Título, quadro/Blade e botões ficaram visíveis sem rolagem. Melodias locais distintas implementadas; o botão de ouvir foi acionado sem erros, mas a avaliação auditiva e as políticas de áudio do iPhone físico ainda são manuais.
- Saves antigos completos continuam com os dez livros, Blade e retrato. Rever as cenas pelas ferramentas de QA mantém o estado salvo idêntico. As prévias não concedem recompensas extras.
- Offline: aprovado no Chromium, incluindo o retrato novo carregado do cache. No WebKit automatizado para Windows, `page.reload` offline falhou duas vezes com “WebKit encountered an internal error”. Essa parte não foi declarada aprovada; verificar no Safari real. O teste com `SKIP_OFFLINE=true` registra explicitamente a pendência.
- Evidências: `test-results/qa-report.json`, `test-results/chromium-celebrations-report.json`, `test-results/webkit-celebrations-report.json`, `test-results/polish-chromium-qa-report.json`, cenas `*-ceremony-*.png` e `webkit-table-final.png`.

## Rodada de UX/UI, altura e QA

- TypeScript e build de produção passaram. Os 11 testes de lógica e persistência passaram novamente. O motor mantém as mesmas regras e agora expõe quais poderes realmente dispararam para orientar os efeitos.
- Os 20 arquivos de livros (capas e lombadas) passaram em `tests/books_test.py`: isolamento, orientação vertical e margem transparente. Foram inspecionados visualmente em conjunto com a nova engrenagem. Os originais não foram modificados. Posições das prateleiras foram revistas nas quatro artes; sombras e alturas acompanham seus pontos de apoio.
- Em build normal, o atalho QA foi confirmado ausente no navegador. Em build com `VITE_ENABLE_QA=true`, a conclusão das dez fases pelo botão concedeu dez livros únicos na sequência salva. Cliques duplicados, próximos desbloqueios, Blade a partir da fase 5, retrato/infinito após a fase 10, recarga após a fase 6, repetição e infinito sem livros extras e reabertura offline passaram.
- `tests/polish.ts` passou no Edge/Chromium: 65 verificações em cinco viewports (320×568, 390×844, 430×932, 1366×768, 1440×900). Abertura, quatro bibliotecas, mapas e partidas ficaram sem rolagem vertical/horizontal da página, com os controles testados dentro da tela. O mesmo teste passou com o botão QA presente.
- A mesma matriz de 65 verificações passou no WebKit 26.5 automatizado em Windows, com os mesmos cinco viewports. Isto testa o motor do Safari; não equivale a teste num iPhone físico.
- Criação e ativação de um poder foram feitas por jogadas normais no Edge e no WebKit. Foram confirmados tile especial, camada de efeitos correspondente, limpeza da camada após a resolução e ausência de erros de página/requisição. Movimento reduzido conserva o destaque estático e suprime a camada animada.
- O build local entregue está com QA habilitado. O pipeline de publicação segue sem essa flag. `VITE_ENABLE_QA=false` desativa o botão em qualquer ambiente; não muda conquistas ou armazenamento.
- Evidências: `test-results/polish-release-report.json` (primeiro build normal), `test-results/polish-chromium-qa-report.json`, `test-results/polish-webkit-qa-report.json`, `test-results/qa-report.json` e capturas `polish-*.png`, `qa-*.png`.

## Rodada de refinamento

- Os 60 sprites do tabuleiro foram regenerados por componentes de transparência e conferidos numa prancha em fundo claro e escuro. `tests/assets_test.py` passou: arquivos 160 × 160, margem transparente e caixa alfa centralizada, incluindo ossinho e rosto de Blade.
- Os 11 testes de regras e persistência passaram novamente. O motor Match-3 e o esquema/chave de salvamento não foram alterados nesta rodada.
- `tests/refinement.ts` passou no Edge em contexto mobile isolado: abertura sem nome ou revelação familiar, entrada obrigatória pela biblioteca, retorno direto ao hub com progresso, nove fases inicialmente bloqueadas sem nomes/cenários, revelação apenas até a próxima fase, três frases do Blade e somente duas poses.
- A pose acordada de Blade teve largura visual 8,6% maior e altura 2,6% maior que a pose dormindo, no mesmo ponto da sala. As duas mantêm proporções semelhantes.
- O estado salvo foi comparado integralmente antes/depois das interações e de uma recarga offline: permaneceu idêntico. Foram verificadas larguras de 320 e 430 pixels e presença do botão principal dentro da tela.
- O teste de campanha jogou novamente as dez fases, em 215 jogadas e nenhuma nova tentativa, passando pela biblioteca entre recompensas. Dez livros únicos, mesma ordem após recarga, modais, retrato, modo infinito e carregamento offline passaram, sem erros críticos de console ou respostas HTTP de erro.
- Evidências: `test-results/refinement-report.json`, `test-results/browser-report.json`, `test-results/refined-*.png` e `test-results/tiles-refined.png`.

Se uma aba da versão anterior continuar aberta, feche as abas do jogo e reabra para permitir a ativação do novo service worker. Isso não apaga o progresso local.

## Evidências automatizadas

- 11 testes de regras e persistência executados com sucesso: 100 tabuleiros iniciais sem combinações prontas e com movimento válido; trocas válidas e inválidas; combinações simultâneas; criação de poderes de quatro, cinco e interseção; ativação em cadeia; cor; gravidade; ausência de movimentos e substituição; campanha sem duplicação; estado inválido e falhas de armazenamento.
- TypeScript verificado sem erros.
- Build de produção gerado sob `/viva-test/` e service worker com cache completo dos arquivos estáticos.

Teste integral no Edge/Chromium com emulação mobile: as dez fases foram jogadas e concluídas pela interface, em 218 jogadas e nenhuma nova tentativa. Verificações passaram para dez recompensas únicas, mesma ordem após recarga, biblioteca completa, Blade, modais de livro e retrato, entrada no modo infinito, telas de 320 × 568 e 430 × 932 e recarregamento offline. Nenhum erro crítico de console ou resposta HTTP de erro foi registrado. Relatório: `test-results/browser-report.json`.

Após os ajustes finais de recorte e foco, uma verificação adicional passou para os quatro estados da biblioteca (0, 2, 5 e 10 conquistas), bloqueio de Blade antes da fase 5, retrato somente após a fase 10, repetição sem perda de conquistas, troca inválida sem consumir jogada, gesto de arrastar com animações ligadas, reinício, diálogo acessível e tabuleiro em 320 × 568. Capturas em `test-results/*-final.png`.

Uma tentativa deliberadamente não concluída na fase 4 foi jogada até esgotar os movimentos. A mensagem acolhedora e o botão de reinício imediato funcionaram; a nova partida retornou a 42 jogadas. Captura: `test-results/failed-attempt.png`.

## Validação manual necessária

- Safari em iPhone físico, instalação na Tela de Início e reabertura standalone.
- Safe areas em aparelhos com recorte e indicador inferior reais; mudança da barra do Safari.
- Volume, modo silencioso e ativação de áudio no aparelho da Elis.
- Conforto do gesto e legibilidade percebida pela usuária.
- Endereço HTTPS real do GitHub Pages após criar o repositório e publicar.

Não foram alegados testes em iOS físico nem publicação remota.

