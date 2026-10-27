# Reavaliação do Upgrade 3/5 — ambientação perceptível

Correção sobre `bbe29b6`, na branch `codex/library-atmosphere`. Não altera ilustrações, composição, estantes, livros, Blade, retrato, áudio, regras ou persistência. Sem publicação automática e sem auditoria das outras etapas.

## O que havia, e o que realmente aparecia

A implementação anterior foi executada em um contexto mobile isolado de 393×852, com movimento normal e oito núcleos simulados. A sala informava `data-ambient="active"` e `data-motion="full"`; as animações estavam em execução, suas timelines avançavam e as capturas mostraram alteração de pixels. O problema era a intensidade, não uma ausência geral de montagem do componente.

- `LibraryAtmosphere.tsx` era montado dentro de `.library-room`, acima da imagem e abaixo dos livros/primeiro plano. Havia **dois gradientes radiais**, nenhum feixe solar: cortina/janela em 23% × 20%, ciclo alternado de 17 s (34 s completo); luminária em 37% × 36–37%, ciclo alternado de 13 s.
- Oito partículas CSS de **1,1–1,8 px**, restritas a 20–31% da largura e 12–32% da altura da ilustração, com opacidade máxima de **21%**, ciclos de 19–28 s e deslocamento pequeno. O tamanho era em pixels CSS; o enquadramento da sala não tornava esses pontos maiores no telefone.
- A luz tinha uma entrada de 900 ms. As interações de livros, respiração/poses de Blade e reflexo estático do retrato também existiam, mas não constituíam movimento ambiental contínuo do cenário.
- Fora da biblioteca as camadas desmontavam. Segundo plano, livro, retrato e dificuldade pausavam a ambientação; Blade aberto também pausava a camada ambiental. O painel de áudio diminuía sua opacidade. Movimento reduzido removia poeira e animações.
- O modo simplificado, selecionado por economia de dados ou indicadores de até dois núcleos/2 GB, **removia toda a poeira e deixava as duas luzes estáticas**. Isso foi reproduzido com dois núcleos simulados. Não é possível afirmar que esse era o modo do iPhone do usuário sem inspecioná-lo.

Em duas capturas reais separadas por quatro segundos, a luz da janela variou em opacidade de 0,584 a 0,637, mas só **43 pixels (0,013% da tela)** mudaram mais de três níveis RGB. A diferença média por canal foi 0,034/255. As capturas confirmam o relato de uma sala essencialmente estática. Presença de nós e nomes de animação não foram usados isoladamente como prova de ambientação visível.

Evidências anteriores: `test-results/ambient-before-report.json`, `ambient-before-0.png`, `ambient-before-4.png`. O código original pode ser consultado no commit publicado `bbe29b6`.

## O que foi corrigido

Os quatro arquivos `library-0.webp` a `library-3.webp` foram inspecionados individualmente, assim como o primeiro plano com transparência. São ilustrações planas de 496×756 com a mesma janela à esquerda, cortina, poltrona e luz projetada sobre o tapete. Não há camadas recortadas adequadas para mover plantas/móveis sem criar defeitos. Os novos efeitos movimentam luz e ar; os objetos continuam imóveis.

| Camada | Localização e aparência | Intensidade e ritmo |
| --- | --- | --- |
| Raios solares | Três faixas diagonais partem da abertura da janela, atravessam o espaço diante da poltrona e se dissipam em direção ao tapete. Terminam antes da mesa em primeiro plano; ficam atrás de livros, Blade e objetos sobrepostos. | Gradientes transversais com bordas transparentes e máscara longitudinal de dissipação. Pico do gradiente 28%, multiplicado por opacidade de 42–88% e pela máscara. Ciclos alternados de 7/9/11 s; deslocamento óptico máximo de 2×1 px. Não há faixa branca sólida nem flash. |
| Poeira iluminada | Oito pontos distribuídos ao longo da faixa de sol entre janela, poltrona e tapete; o resto da sala não recebe confetes. | 1,8–2,8 px, opacidade até 62%, brilho local pequeno, caminhos suaves de 13–20 s e fases diferentes. Percurso vertical de até 49 px por ciclo; deriva lateral de até 18 px. Alguns pontos entram/saem da luz enquanto outros permanecem visíveis. |
| Luz ambiental | Gradiente local amplo junto à janela, centro em 13% × 26%; luminária ancorada em 37% × 35–36% conforme estágio. | Luz diurna varia de 45–90% sobre um gradiente cuja própria opacidade máxima é 18%; alternância de 8 s. A luminária conserva sua variação discreta de 13 s. Nenhum filtro de cor cobre a ilustração inteira. |
| Reflexo na cortina | Mancha de luz difusa restrita à cortina, em 15–29% da largura e 7–39% da altura da sala. | Opacidade baixa, alternância de 9 s e deslocamento de 3×2 px. Move-se a projeção luminosa, não o tecido nem as plantas. |
| Chegada | A sala mantém a transição de navegação existente; luz e poeira entram separadamente. | Luz aparece em 1,4 s e poeira em 1,1 s, sem bloquear toques ou impor espera. |

Observe primeiro a diagonal clara que sai da janela e passa diante do braço da poltrona. Em seguida, acompanhe os poucos pontos luminosos subindo nessa região. Em aproximadamente quatro a oito segundos, a intensidade dos feixes e o reflexo na cortina mudam suavemente. As prateleiras continuam estáveis e legíveis.

### Modos e ciclo de vida

- Completo: três feixes animados, oito partículas, luz diurna/luminária e reflexo da cortina.
- Simplificado: **três partículas e um feixe continuam animados**, junto à luz diurna. Dois feixes são estáticos; reflexo e oscilação da luminária são dispensados. Os mesmos indicadores conservadores de recursos continuam selecionando esse modo, mas não apagam mais toda a vida do ambiente.
- `prefers-reduced-motion`: nenhuma poeira ou animação ambiental. A iluminação suave permanece estática. A mudança funciona também com o jogo aberto.
- Segundo plano e interações prioritárias mantêm as pausas existentes. Fechar o menu retoma as mesmas timelines; sair da biblioteca desmonta as camadas. Não há loop JavaScript por frame, novo timer recorrente, sorteio de gameplay ou criação crescente de partículas.

## Como visualizar e isolar cada efeito

Prévia do jogo: http://127.0.0.1:4173/viva-test/?v=ambient-fix.

Diagnóstico local: http://127.0.0.1:4175/tests/library-ambient.html. Permite alternar os quatro estágios, modo completo/simplificado e camadas **Tudo, Raios, Poeira, Luz, Reflexo e Original**, além de pausar. Usa o mesmo `LibraryAtmosphere` e CSS de produção, sem gravar conquistas ou preferências. O movimento reduzido continua respeitado.

Essa página está exclusivamente em `tests/`, é montada somente em desenvolvimento e não é importada pelo jogo. O build foi verificado: não contém seus controles, seletores de diagnóstico ou arquivo HTML, e seu service worker não a inclui no cache. Não foi criado atalho de debug acessível à jogadora.

## Evidência e validação

- Capturas em tempo real após 0, 4 e 8 segundos, sem acelerar ou buscar posições das animações: `ambient-{chromium,webkit}-{0s,4s,8s}.png`.
- Gravação real do aplicativo em viewport 393×852: `test-results/library-atmosphere.webm`. Prévia GIF de 12,6 s, com os intervalos reais das capturas e paleta única para evitar cintilação artificial: `library-atmosphere-preview.gif`; detalhe da região iluminada: `library-atmosphere-detail.gif`.
- Capturas de **cada camada isolada sobre fundo neutro**, nos dois motores, confirmam que os raios, poeira, luz e reflexo são efetivamente rasterizados. As diferenças medidas são de centenas a dezenas de milhares de pixels conforme a área de cada camada; todas passaram. Isso detecta inclusive uma possível falha de máscara SVG que a mera existência do elemento não detectaria.
- Na rodada final, aproximadamente **5% dos pixels** variaram mais de três níveis RGB em quatro segundos nos dois motores, contra 0,013% antes; diferença média de 0,389/255. O restante da ilustração permanece estável. Esses números comprovam movimento renderizado, não são uma pontuação de qualidade artística.
- `tests/library-atmosphere.ts`: **12 composições por motor**, quatro estágios × 320×568/393×852/430×932, sem rolagem global; geometria original dos livros preservada. Timelines avançando em tempo real, poeira deslocando, pausas de atenção/visibilidade, movimento reduzido, modo simplificado ainda animado, diagnóstico e ausência no release. Chromium/Edge e WebKit aprovados, sem erros de página. Conferência adicional em WebKit 393×852 com DPR 3 aprovada.
- `tests/library-life.ts`: 15 composições, dez sinopses, poses/interações de Blade, retrato, chegadas, áudio original, movimento reduzido, navegação repetida, offline e progresso passaram. Um timeout do teste no menu de Blade durante execução paralela foi investigado; a execução isolada passou, sem mudança no personagem ou na interação. Capturas de falha foram acrescentadas para diagnóstico futuro.
- `tests/offline-server.ts`: WebKit com o servidor HTTP desligado recarrega biblioteca, sinopse, retrato e partida pelo cache; também confere três feixes e animação ativa. Chromium validou recarga offline da biblioteca com os novos efeitos. Nenhum recurso externo é necessário.
- `tests/library-performance.ts`: 180 frames por estado, 75 nós na sala, zero mutações de DOM por frame; p95 aproximadamente **18,3 ms** tanto parado quanto animado, nenhum frame acima de 50 ms nessa execução. É uma comparação indicativa em desktop, sem medição de consumo de GPU/bateria ou desempenho físico do iPhone.
- TypeScript, build e **36 testes unitários** aprovados. Pacote: JS 302,09 kB (97,48 kB gzip), CSS 67,35 kB (14,94 kB gzip), cache `fc37e087b75c`, 147 arquivos. Acréscimo de aproximadamente 0,84 kB gzip de JS/CSS. Sem dependências novas.

Para reproduzir, gere o build com `VIVA_BASE=/viva-test/`, execute `scripts/serve.mjs` e o Vite na porta 4175. Depois use `tsx tests/library-atmosphere.ts` (também com `BROWSER_ENGINE=webkit`), `node tests/record-library-atmosphere.mjs` e `python scripts/review_library_atmosphere.py` com Pillow. Os resultados ficam fora do release em `test-results/`.

## Arquivos e limites

Produção: `src/LibraryAtmosphere.tsx`, `src/library-life.css` e uma propriedade em `src/App.tsx` para distinguir modo simplificado de movimento reduzido. Nenhum arquivo de imagem, coordenada de coleção, Blade, retrato, áudio, engine ou persistência foi editado.

Verificação: novos `tests/library-atmosphere.ts`, `tests/library-ambient.html`, `tests/library-ambient.tsx`, `tests/library-ambient.css`, `tests/record-library-atmosphere.mjs`, `scripts/review_library_atmosphere.py`; ajustes proporcionais em `tests/library-life.ts` e `tests/offline-server.ts`. Documentação: `AMBIENTACAO.md`, `BIBLIOTECA.md`, `README.md` e `VALIDACAO.md`.

Não houve teste em iPhone físico, medição de bateria/temperatura ou garantia de 60 FPS. O WebKit usado é o runtime de desktop do Playwright. A avaliação final de brilho e conforto na tela real deve considerar luminosidade ambiente e as preferências de movimento da jogadora. A publicação autorizada usa o workflow Pages já existente, preservando a estratégia de atualização e o formato dos dados.
