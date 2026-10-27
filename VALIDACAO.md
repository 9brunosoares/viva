# Evolução da campanha — 27/10/2026

- Recuperação: `viva-pre-campaign-evolution-20261027` / `04824ac`; trabalho em `codex/campaign-evolution`. Não publicado.
- Tatuagens integrada com sete tipos pessoais, cenário e introdução próprios; oito originais preservados por SHA-256. Vinte sprites extraídos, 58 quadros VFX preparados, 47 utilizados em sete sequências.
- Feixes procedurais percorrem as células com frentes de atlas proporcionais. Explosões mantêm escala uniforme. Recompensa sem sinopse; leitura completa na biblioteca. Apoio/oclusão de livros específico por estágio.
- Campanha varia quatro a sete tipos, distribuição, metas e tiers de poderes, mantendo grade 7 × 8. Novas partidas são versão 2; tabuleiro/metas de sessões legadas preservados. Áudio aprovado inalterado, sem trilha de fundo.
- TypeScript e 42 testes unitários aprovados. 1.920 simulações, duas estratégias: por estratégia Fácil 319/320, Médio 320/320, Difícil 306/320. São evidências de bots, não taxa de vitória humana.
- Campanha Chromium concluída legitimamente em 190 jogadas, zero reinícios. Dois motores: treze layouts por motor, legado de Cinema, sete tipos, derrota/retomada, dez livros, QA pelas dez fases, marcos e infinito.
- VFX: 21 cenários por motor; dez cenários adicionais inspecionam quadros reais, proporção e trajetórias. Vídeo contínuo Chromium e GIFs extraídos. WebKit/Windows usa relógio determinístico na inspeção detalhada; não equivale a validação de FPS no iPhone.
- Recompensas: vinte verificações por motor, associação dos dez livros e textos completos, duas dimensões, contraste e rolagem. Biblioteca: quinze composições, poses, marcos, sinopses, offline e progresso. Retomada/dificuldade/uma jogada consumida aprovadas.
- Game feel Chromium: onze grupos de gestos/cancelamentos, dicas, recuperação, derrota, infinito e desmontagem em diferentes momentos sem áudio/salvamento/recompensa tardios, zero erros.
- WebKit com servidor HTTP desligado: biblioteca, luz/poeira, retrato, sinopse, infinito e Tatuagens carregados do cache; atlas novo realmente pintou durante jogada offline. Corrigido caminho relativo da variável CSS do fundo externo, que tentava `assets/assets/` em base `./`.
- Integridade: vinte recortes com margens transparentes; quadrado vazio; partes claras preservadas; proporção 719 × 1280; 58 bordas de frames seguras; oclusão copiada da madeira; 26 arquivos de arte/áudio/narrativa protegidos inalterados.
- Build de distribuição `d19ede18e3e1` e QA `6905009e185f`, 171 arquivos cada. JS 310,06 kB (100,23 gzip); CSS 67,70 kB (14,99 gzip). Nenhuma dependência nova em execução. Botão Concluir fase somente DEV/QA, a pedido; distribuição limpa.
- Sem iPhone físico, audição crítica nova ou garantia de 60 FPS. Sem novas dimensões/formatos irregulares. Limitações dos atlas, tabela das dez fases, arquivos e evidências: [CAMPANHA.md](CAMPANHA.md).

---

# Reavaliação do Upgrade 3/5 — ambientação da biblioteca

- Base preservada: publicação `bbe29b6`; correção local em `codex/library-atmosphere`, sem publicação automática ou auditoria das outras etapas.
- Antes: dois gradientes radiais e oito pontos minúsculos efetivamente em execução, porém sem feixes. Em quatro segundos, apenas 0,013% dos pixels variava mais de três níveis RGB. Dois núcleos simulados ativavam modo simplificado sem poeira ou luz animada.
- Depois: três feixes nativos SVG com bordas/dissipação suaves, oito partículas de 1,8–2,8 px na faixa de sol, luz diurna localizada e reflexo de 3×2 px na cortina. Entrada de 1,4 s para luz e 1,1 s para poeira. Modo simplificado mantém três partículas e um feixe em movimento. Movimento reduzido continua estático, sem poeira; segundo plano e menus prioritários pausam.
- Pixel check dos dois motores confirmou raios, poeira, luz e reflexo isoladamente sobre fundo neutro. Comparação em tempo real de 0/4/8 s: cerca de 5% dos pixels muda acima do limiar em quatro segundos. Isso comprova movimento renderizado e não mede qualidade artística ou FPS.
- `library-atmosphere.ts`: 12 composições por motor (quatro estágios, três dimensões), Chromium/Edge e WebKit; geometria, execução, pausas, acessibilidade, modo simplificado e diagnóstico fora do release aprovados. WebKit Retina 3× também conferido. Nenhum erro de página.
- `library-life.ts`: 15 composições, dez sinopses, Blade/poses, retrato, chegadas, áudio, offline e progresso aprovados na execução isolada. Um timeout do teste no menu de Blade sob execução paralela não se repetiu; acrescentada captura em falhas, sem alterar o personagem.
- Offline: Chromium e WebKit; neste último, servidor HTTP realmente desligado. Arquivos do diagnóstico não integram `dist` nem o cache.
- Desempenho indicativo: p95 de 18,3 ms com cena parada e animada, 75 nós, zero mutações DOM por frame e zero frames acima de 50 ms na amostra de 180 frames por estado. Sem iPhone físico, garantia de FPS ou medição de bateria/temperatura.
- TypeScript, build e 36 testes unitários aprovados. Cache `fc37e087b75c`, 147 arquivos, JS 302,09 kB (97,48 gzip), CSS 67,35 kB (14,94 gzip). Nenhuma dependência ou imagem nova; livros, Blade, retrato, áudio, gameplay e progresso preservados.
- Evidência: gravação `test-results/library-atmosphere.webm`, prévias GIF e quadros de 0/4/8 s, `ambient-*-report.json`, `ambient-pixel-report.json`, `library-performance-report.json` e relatórios de regressão. Documentação e instruções: [AMBIENTACAO.md](AMBIENTACAO.md).

---

# Upgrade 5/5 — acabamento de aplicativo e UX mobile (27/10/2026)

- Ponto de restauração anterior às alterações: commit **0c96512**, tag `viva-pre-premium-5-20261027`, branch `codex/premium-5-mobile`. Alterações anteriores preservadas integralmente.
- Biblioteca com controles menores e agrupados, capítulos ilustrados com rolagem interna e fase atual centralizada, dificuldade com fechamento externo/Escape, tipografia editorial nas introduções, pausa/derrota com ação principal clara, livro/retrato com altura segura e foco contido. Nenhuma mudança de artes, coordenadas, narrativas, sinopses, áudio ou regras.
- Dissoluções sequenciais de 80/140 ms entre telas, fechamento de diálogos em 130 ms e respeito ao movimento reduzido. Navegação pendente finaliza ao entrar em segundo plano. View Transitions não é usado: a alternativa com snapshots falhou no WebKit durante redimensionamento e foi substituída por Web Animations API.
- Viewport dinâmica com fallback, safe areas, zoom preservado e documento sem rolagem nas telas imersivas. Inicialização com logo e nova tentativa de carregamento, Error Boundary, preload seletivo e cores de abertura coerentes.
- PWA adota atualização apenas em telas seguras, com persistência confirmada e anuência de todas as janelas. Mantém o cache atual e um anterior e preserva as chaves de progresso/sessão. Sem dependências novas.
- **36 testes unitários**, TypeScript e build aprovados. Cache final **cefa22d2929c**, 147 arquivos; JS 300,42 kB (96,91 kB gzip), CSS 65,93 kB (14,67 kB gzip).
- `mobile-finish.ts`: **15 composições por motor**, Chromium/Edge e WebKit, em 320×568, 393×852 (equivalente ao iPhone 14 Pro) e 430×932. Quatro estágios, coleção completa, capítulos, dificuldade, foco, Escape, safe areas simuladas, rotação, viewport variável e movimento reduzido passaram; nenhuma falha de página registrada.
- `reward-finish.ts`: dez livros × duas dimensões × dois motores; **40 verificações** de associação exata, enquadramento seguro, botão acessível e sinopse interna. Capturas revisadas; corrigida herança de cor clara da abertura. Contraste do título, autoria, mensagens e sinopse é de pelo menos **4,5:1** contra a região mais escura do papel.
- `pwa-update.ts`: **três versões e duas janelas** nos dois motores. Partida e leitura adiam atualização; saída para a biblioteca permite adoção, sem alterar tabuleiro/contadores/conquistas/dificuldade. Chunk anterior atendido, apenas dois caches mantidos e versão nova recarregada offline. `launch-recovery.ts`: falha proposital do módulo recuperada sem tela vazia ou perda de progresso.
- Campanha real completa: **279 movimentos, uma nova tentativa**, dez livros, Blade, encerramento familiar, infinito e offline, sem erros de página/HTTP. Narrativas/Blade: 30 introduções, nove verificações de poses e retomada nas três dificuldades. Sinopses: 73 verificações Chromium e 63 WebKit em duas ordens/três dimensões. Release: manifest, ícones, ausência de QA, progresso legado e retrato offline aprovados.
- `offline-server.ts` aprovado no pacote final: WebKit recarregou biblioteca, sinopse, retrato e partida animada com o servidor HTTP efetivamente desligado.
- `library-life.ts` repetido no Chromium: 15 composições, dez sinopses, poses ancoradas, interação oculta, pausa por visibilidade, movimento reduzido, chegadas e áudios originais, navegação repetida e offline aprovados.
- Testes em navegador/emulação, sem iPhone físico, instalação real na tela inicial, VoiceOver ou medição de bateria/FPS no aparelho. WebKit/Windows sem Web Audio; sons originais preservados e testes unitários aprovados, sem nova audição crítica. Primeira migração de abas antigas pode exigir fechá-las uma vez.
- Detalhes e arquivos: [MOBILE.md](MOBILE.md). Evidências em `test-results/mobile-finish-*-report.json`, `reward-finish-*-report.json`, `pwa-update*-report.json`, `launch-recovery-report.json`, relatórios de regressão e capturas correspondentes. Prévia local: http://127.0.0.1:4173/viva-test/?v=finish5. **Sem publicação remota ou auditoria da etapa 6.**

---

# Upgrade 4/5 — game feel e consistência do Match-3 (27/10/2026)

- Entrada revisada: feedback no pointerdown, deslizes curtos (13 px no teste 390×844), rejeição de diagonais ambíguas, rastreamento do ponteiro primário, cancelamento/lost capture, saída do tabuleiro e interrupção por visibilidade/blur/resize. O próximo toque permanece utilizável. Caminhos por teclado e clique assistivo preservados.
- Troca inválida percorre uma célula e retorna em 330 ms, sem custo ou alteração do tabuleiro. Quedas usam o orçamento da própria animação; criação de poderes mantém no mínimo 336 ms. Tempos dos poderes e vitória de 2,2–2,6 s preservados.
- Estados explícitos da sequência e escopo cancelável de esperas. Desmontagem durante troca, remoção, queda ou vitória não produz som, snapshot ou recompensa atrasados. Removida a gravação explícita duplicada da jogada; o snapshot fica a cargo do estado estável.
- Recuperação automática também em sessões abertas sem movimentos, sem perder jogadas ou contadores. A verificação de adjacência rejeita índices inválidos. Regras de criação/ativação de poderes e sorteios não foram alterados.
- Dica manual/ociosa prioriza objetivos e poderes sem RNG ou criação de IDs, apaga ao interagir e termina em 1,6 s, sem repetição contínua. Uma seleção anterior é limpa ao pedir dica. Objetivos ganharam marca de conclusão e semântica acessível de progresso.
- **34 testes unitários aprovados**, incluindo novos testes determinísticos de gestos, bordas, cancelamento de esperas, pureza das dicas e orçamento de queda/criação.
- `tests/game-feel.ts` aprovado em **Chromium/Edge e WebKit**, em emulação mobile: pressão antes de levantar o dedo, dois toques nativos, deslize curto equivalente, diagonais e saída sem ação, cancelamento/perda de captura/blur/visibilidade, segundo ponteiro, toques rápidos durante resolução, troca inválida, teclado, dicas temporárias, recuperação, derrota/reinício, infinito e desmontagem em cada fase assíncrona. Nenhum erro de página registrado.
- `tests/vfx-game.ts`: **21 cenários por navegador**, nos dois modos de movimento, comparados ao motor. Chromium e WebKit passaram para combinações de três/quatro/cinco, interseções, cascatas e todos os poderes/pares; também troca inválida, preferência de movimento dinâmica, frame lento, arraste e orientação, quatro viewports, Retina e vitória. Pico observado de 136 partículas, abaixo do limite de 180; nenhuma alteração no resultado lógico.
- `tests/balance.ts`: **960 partidas com sementes determinísticas** (32 por fase/dificuldade). Bot orientado aos objetivos: Fácil 320/320 vitórias, Médio 319/320, Difícil 303/320; médias de 21,17 / 28,33 / 34,35 movimentos usados por tentativa. Foram observadas até oito ondas e 14 recuperações bem-sucedidas. Toda posição oferecida ao bot tinha jogada válida. Nenhum ajuste de dificuldade feito. Esses resultados não estimam taxas humanas nem provam equilíbrio definitivo.
- Campanha integral jogada pela interface: **237 movimentos, nenhuma nova tentativa**, dez livros, Blade, retrato, infinito e recarga offline, sem erros de console/HTTP.
- `tests/game-feel-app.ts`: alteração de dificuldade persistida, uma jogada descontada, pausa/retomada, mesmo tabuleiro e contadores após recarga offline, coleção preservada e ausência de Blade/retrato antes da hora. Aprovado no pacote final.
- `tests/release.ts`: PWA standalone, manifest/ícones, ausência de atalhos QA, progresso legado e retrato offline aprovados. `tests/offline-server.ts`: biblioteca, sinopse, retrato e partida animada no WebKit com o servidor HTTP desligado.
- TypeScript e build final aprovados. Cache **58ab03a43cd0**, 152 arquivos. JS principal 292,17 kB (94,39 kB gzip); CSS 56,09 kB (12,72 kB gzip). Nenhuma dependência nova, serviço externo ou modificação de assets, áudios, biblioteca, narrativas, recompensas ou formato do progresso nesta etapa.
- Captura da vitória inspecionada: ícone, contagem e marca de objetivo completo legíveis no viewport de iPhone. Verificações são de navegador/emulação, sem dispositivo físico, audição crítica nova ou garantia de FPS. O WebKit Windows não oferece Web Audio neste ambiente; seus eventos/silêncio são testados, enquanto o Chromium oferece a API nativa.
- Evidências em `test-results/game-feel-*-report.json`, `game-feel-app-report.json`, `vfx-*-report.json`, `balance-report.json`, `browser-report.json`, `release-report.json`, `webkit-no-server-report.json` e capturas `game-feel-*.png` / `vfx-*.png`. Detalhes e arquivos: [GAMEPLAY.md](GAMEPLAY.md).
- Versão local em http://127.0.0.1:4173/viva-test/?v=feel4. Nenhuma publicação remota. Upgrade 5/5 e auditoria final não foram iniciados.

---

# Upgrade 3/5 — biblioteca viva e retorno ao áudio original (27/10/2026)

- Restaurados os oito efeitos e as duas melodias finitas de `5347344`, anterior à profissionalização. Frequências, envelopes, timbres, volumes relativos e tempos originais conferidos por teste. Sem trilha contínua. Os samples Kenney e arquivos auxiliares foram arquivados fora do release; preferências de volume/silêncio e conquistas foram preservadas.
- Biblioteca: gradientes locais na janela e luminária, oito pontos de poeira lenta, entrada de luz, seleção e chegada dos livros, respiração de Blade (até 0,6% vertical), crossfade com altura original das poses e reflexo estático discreto no retrato. Sem novos assets/dependências ou alteração de coordenadas das estantes.
- Ciclo de vida: componentes desmontam fora da biblioteca; segundo plano pausa ambiente e áudio. Movimento reduzido remove os novos movimentos e a poeira. Modo simplificado para indicadores de recursos limitados; objetos decorativos não consomem o sorteio do gameplay.
- TypeScript e build de produção aprovados. **29 testes unitários aprovados**, cobrindo regras, progressão, sessão, dificuldades, VFX e restauração do áudio.
- `tests/library-life.ts`: **15 composições por navegador**, em 320×568, 390×844 e 430×932; estados com 0, 2, 5, 8 e 10 conquistas. Passou em Chromium/Edge e WebKit. Dez sinopses por navegador, associação com as capas, posições originais, três poses com pés ancorados, menu sem indicação permanente, toque fora/Escape, silêncio inicial, livros incorporados após revelações e ausência de repetição ao recarregar.
- Verificadas pausa por visibilidade, alteração dinâmica de movimento reduzido, seis ciclos de navegação sem acumular partículas, modo simplificado por dois núcleos simulados e persistência integral do progresso nos contextos isolados.
- Chromium: as apresentações reais agendaram as 16/24 vozes das melodias originais de Blade/família e não iniciaram som na recarga. O WebKit deste ambiente Windows não oferece Web Audio; sua experiência silenciosa passou.
- `tests/vfx-game.ts`: 21 cenários reais (três/quatro/cinco, interseções, cascatas e todos os poderes/pares), cada um com movimento ligado/reduzido, comparados ao motor. Também passaram troca inválida, movimento reduzido dinâmico, frame lento, arraste em diferentes orientações, densidade Retina limitada e contemplação da vitória.
- Campanha inteira concluída pela interface: **304 movimentos, uma nova tentativa**, dez livros, revelações, infinito, recarga e offline; sem erros de console/HTTP. Dificuldade e regras não foram alteradas.
- `tests/synopses.ts`: **73 verificações** aprovadas no Chromium, incluindo ordens diferentes, livros bloqueados, ausência de atalho e sinopses offline.
- `tests/release.ts`: PWA standalone, manifest, ícones, ausência de QA/configurações técnicas, progresso legado e retrato oficial offline aprovados.
- Offline confirmado no Chromium por bloqueio de rede. No WebKit, o controle de offline do Playwright provoca erro interno de navegação; o teste `tests/offline-server.ts` **desligou o servidor HTTP** e comprovou recarga da biblioteca, leitura da sinopse, retrato e partida animada pelo cache.
- Medição indicativa de 180 frames por estado no Edge com emulação 390×844: cenário pausado e animado tiveram p95 de aproximadamente **18,1 ms**, nenhum frame acima de 50 ms, **zero mutações de DOM por frame** e 43 elementos em ambos. Isso não mede iPhone real, consumo energético ou estabilidade térmica.
- Capturas dos quatro estágios e poses inspecionadas. Ilustrações, retrato, proporções e apoio no tapete preservados. Não foi realizado teste em dispositivo físico nem audição crítica nesta rodada; não se garante 60 FPS.
- Evidências: `test-results/library-alive-*-report.json`, `library-alive-*.png`, `library-performance-report.json`, `vfx-chromium-report.json`, `browser-report.json`, `release-report.json`, `synopses-chromium-report.json` e `webkit-no-server-report.json`. Arquitetura: [BIBLIOTECA.md](BIBLIOTECA.md), [AUDIO.md](AUDIO.md).
- Versão refinada disponível localmente em http://127.0.0.1:4173/viva-test/?v=library3. Nenhuma publicação remota, upgrade 4/5, 5/5 ou auditoria final nesta rodada.

---

Os registros abaixo são históricos e incluem tentativas de áudio posteriormente rejeitadas e substituídas.

# Efeitos de puzzle/mobile da Kenney — versão sem trilha

- Trilha sonora removida da execução e do release, inclusive nas apresentações. Não há opção de música ou botão Ouvir. Preferências antigas não conseguem reativar trilhas. Os seis MP3 e o gerador rejeitado foram arquivados fora do pacote publicado. O áudio atual não contém osciladores, síntese de notas, fontes em loop ou carregamento de música.
- Banco próprio anterior integralmente substituído por arquivos dos packs CC0 Starter Kit Match-3 e Interface Sounds, de Kenney. Foram importados 16 OGG originais, com hash e licença; a saída é PCM WAV estéreo 32 kHz, aproximadamente 1 MB. Os 30 eventos existentes usam esses samples com ganho, de-click, EQ leve, variações limitadas e camadas curtas. A maior duração é inferior a 0,6 s. Arquivos e mapeamento em public/audio/sources.json e scripts/prepare_audio.py.
- O tabuleiro utiliza pops, deslocamentos e impactos; a biblioteca mantém respostas curtas de interface. Não foram adicionadas músicas ou ambientes aconchegantes ao gameplay. O mixer central continua usando Web Audio, agora só para efeitos: quatro vozes ativas, seis fontes totais incluindo encerramentos e um banco reutilizado. A segunda peça de uma troca não dispara outro clique de seleção, e combinações/poderes dão prioridade ao próprio efeito.
- TypeScript, build e 31 testes unitários aprovados. Conferidos os arquivos OGG reais, hashes, licença, catálogo, limites do PCM, ausência de MP3, migração e silêncio, gesto/contexto único, falhas e rajada de 2.000 eventos. O mixer nativo em OfflineAudioContext atingiu pico de 0,511 no teste de sobreposição, com amostras finitas; volume zero produz silêncio numérico.
- Chromium aprovou nove cenários com os samples novos: 3/4/5, quatro poderes, encontro e cascata. Disparos após as classes visuais, criação e movimento reduzido sem repetição continuam corretos. A ausência de música foi conferida no catálogo, controle, fontes e fluxo das cenas. Volume por toque, silêncio, restauração, preferências, progresso e painel em três viewports passaram. WebKit deste Windows não expõe Web Audio; o jogo silencioso continua funcional.
- Campanha real novamente aprovada: dez fases, 193 jogadas, nenhuma nova tentativa, nenhum erro. Biblioteca, Blade, livros, encerramento, progressão e infinito preservados. O teste offline decodificou/reproduziu o banco, verificou que todas as fontes eram de execução única e confirmou silêncio após recarga e ordem dos livros intacta.
- Prévia local independente em tests/sfx-preview.html: 15 botões de audição, sem gameplay ou mutação de progresso. Os 15 disparos foram verificados. A prévia não entra na publicação. Não foi realizada audição crítica nem teste em iPhone físico; os resultados técnicos não constituem aprovação subjetiva dos sons.
- Cache final a0a06516228b, 156 arquivos, sem trilhas. Novo banco effects-kenney.wav evita reutilizar o banco sintetizado a partir do cache anterior. Fontes/licenças em AUDIO.md. Evidências: kenney-audio-*-report.json, kenney-controls-report.json, kenney-offline-report.json, kenney-preview.png e browser-report.json em test-results/. Nenhuma publicação nesta rodada. Os registros abaixo são históricos.

---

# Correção após avaliação musical — canais independentes

- A avaliação do usuário reprovou as trilhas sintetizadas. A validação técnica anterior não representa aprovação musical. A música agora inicia em zero, inclusive para preferências antigas, preservando silêncio e volume de efeitos. Os arquivos de efeitos permanecem iguais.
- Botão Áudio abre painel compacto com liga/desliga e volume próprios para Música e Efeitos, além de silêncio geral. Zerar música encerra as fontes; zerar efeitos impede novas vozes e não reduz a música. Volumes são restaurados ao reativar. `viva-audio-v2` recebe a nova preferência sem tocar nas conquistas.
- TypeScript, build e 34 testes unitários aprovados. Teste de interface confirma migração, canais isolados, alteração de volume por toque, restauração, fechamento, persistência e progresso preservado. Painel dentro de 320×568, 390×844 e 430×932, com capturas inspecionadas. Fluxo audiovisual e teste offline dos novos controles aprovados. Cache final `3e3fefc5913e`, 160 arquivos.
- Fontes verificadas: OpenGameArt (duas faixas indicadas como CC0 pelos autores), Kenney Music Jingles (CC0) e Incompetech (opção Creative Commons gratuita com crédito). Opções de audição em `MUSIC_OPTIONS.md`. Nenhuma faixa externa foi incorporada nesta correção; a escolha musical permanece em avaliação.
- Evidências: `audio-controls-report.json`, `audio-controls-*.png`, `audio-chromium-report.json` e `audio-offline-report.json` em `test-results/`. Nenhuma publicação, alteração de gameplay ou geração de novos efeitos nesta correção. Os registros abaixo são históricos.

---

# Upgrade premium 2/5 — direção musical e áudio interativo

Esta seção descreve a entrega local mais recente. Os registros seguintes são históricos.

- Seis trilhas originais produzidas localmente: biblioteca (53,33 s), gameplay e versão ensolarada (43,64 s cada), versão delicada (45,71 s), chegada de Blade (12 s) e encerramento familiar (27,66 s). São quatro loops e dois temas finitos, com motivo recorrente, piano, dedilhados, celesta, cordas e percussão discreta sintetizados. A família termina com resolução em dó maior. Composição, timbres e pós-produção estão em `scripts/compose_audio.py`.
- Trinta efeitos próprios em banco PCM: toque, navegação, papel, troca, tentativa inválida, combinações de 3/4/5 em quatro estágios harmônicos, criação e quatro poderes, encontro de poderes, vitória, três variações de livro e três reações de Blade. Os disparos da onda ocorrem após o commit visual; criação acompanha a peça especial. IDs evitam repetição por mudança de movimento reduzido. Sons são limitados à duração das fases visuais, com liberação suave.
- Um único AudioContext, canais independentes de música/efeitos, compressor e proteção suave de picos. Oito efeitos ativos e até duas caudas, duas fontes musicais em crossfade, dois buffers musicais em cache LRU e um banco reutilizado. Poderes/recompensas reduzem a música, com retorno suave. Pausa reduz o acompanhamento; dificuldade/jogadas restantes não aceleram a trilha. Não há síntese contínua nem consumo do sorteio do gameplay.
- Botão discreto para ativar/silenciar, com posição adaptada à tela e área de 44 px. Verificação geométrica confirma que não encobre controles, livros ou Blade em três viewports. `viva-audio-v1` guarda volumes e silêncio separadamente do progresso; o campo antigo `sound` é respeitado quando não há preferência nova. Contexto só após gesto confiável; segundo plano suspende o áudio, e a volta aguarda novo gesto. Falhas de banco podem ser tentadas novamente; falhas de fontes não interrompem o jogo.
- Native Web Audio no Chromium/Edge decodificou os seis MP3 e as trinta regiões PCM: durações corretas, amostras finitas, limites do banco válidos e emendas contínuas. Renderização com o grafo real em OfflineAudioContext, volumes máximos e dez fontes concorrentes: pico medido de 0,501, sem clipping. Canais em zero produzem silêncio numérico. Masters também passaram na análise de amplitude e continuidade do script de produção.
- Fluxo de navegação, mudança biblioteca/partida, pausa, silêncio persistente, retorno de segundo plano simulado, assinatura de conquista, três reações de Blade e duas cerimônias aprovados. Nove cenários de gameplay verificam disparo após classes visuais, poderes individuais/combinados, criação e sequência harmônica de três cascatas. Alterar movimento reduzido durante um poder não repete o som. Telas de 320×568, 390×844 e 430×932 inspecionadas.
- TypeScript, build e **32 testes unitários** aprovados. Catálogo e arquivos conferidos; rajada de 2.000 eventos mantém limites de vozes, prioridades e limpeza. Campanha real novamente aprovada: dez fases, 264 jogadas, nenhuma nova tentativa, nenhum erro. Biblioteca, narrativas, dez livros, Blade, encerramento, progresso e infinito preservados. Mais 73 verificações de sinopses aprovadas, inclusive capas, bloqueios, progresso e leitura offline.
- Release sem atalhos QA e PWA standalone preservado. O teste offline recarrega sem conexão, decodifica as seis trilhas e o banco, reproduz biblioteca e jogada animada com som, confirma silêncio após recarga e preserva conquistas/ordem dos livros. Cache `45dddbfd791e`: 160 arquivos. Áudio distribuído ocupa cerca de 5,92 MB; JS principal 291,36 kB (93,90 kB gzip). Nenhuma dependência nova no navegador. NumPy e FFmpeg/libmp3lame via imageio-ffmpeg são ferramentas locais de produção; não são publicados.
- O WebKit instalado neste Windows não expõe Web Audio: nele o jogo foi validado em modo silencioso, sem erros. Não houve audição crítica nem teste em iPhone físico. Timbres percebidos, equilíbrio em alto-falantes/fones, latência, interrupções reais, bateria e fluidez no aparelho continuam pendentes. Não são prometidos 60 FPS ou qualidade subjetiva de estúdio por essas verificações técnicas.
- Evidências: `test-results/audio-chromium-report.json`, `audio-chromium-assets.json`, `audio-webkit-report.json`, `audio-offline-report.json`, capturas `audio-*.png`, `browser-report.json`, `synopses-chromium-report.json` e `release-report.json`. Detalhes de produção/arquitetura em `AUDIO.md`. Não houve publicação nem implementação dos upgrades 3–5 ou da auditoria final.

---

# Upgrade premium 1/5 — animações e efeitos do gameplay

Esta seção descreve a entrega local mais recente. Os registros seguintes são históricos.

- Peças com entrada em escala/opacidade, seleção elevada, troca contínua por FLIP/Web Animations, oscilação de tentativa inválida, contração/expansão ao combinar e quedas com aceleração e aterrissagem discreta. As novas peças recebem preenchimento anterior ao início do atraso para evitar lampejos; os poderes criados usam sua origem real na queda.
- Combinações de três, quatro e cinco têm intensidades diferentes. Fragmentos dos sprites aprovados, pétalas e brilhos acompanham a coleta; criação de poder concentra energia na célula correta. Cascatas aumentam intensidade dentro de limites e encurtam progressivamente os tempos secundários.
- Poderes mantêm os atlas e as regras existentes, com reflexo, brilho suave e órbitas em repouso. Ativação reforça os feixes de linha/coluna, ondas de área e conexões multicoloridas. Dois poderes têm apresentação mais forte. Os efeitos usam exatamente as células retornadas pelo motor, inclusive encadeamentos, sem redefinir o alcance dos poderes.
- Coletas necessárias enviam um pequeno sprite até o contador, com pulso no destino e destaque ao completar. Alvos permanecem vinculados entre ondas; partículas usam tempo real e posições analíticas para não atrasar ou perder pulsos após um quadro lento. A contemplação de vitória de 2,2–2,6 segundos foi preservada.
- Tecnologias nativas: CSS, Web Animations API e Canvas 2D. Nenhuma dependência nova, asset redesenhado ou mudança de motor. A apresentação possui gerador local independente do sorteio das peças. Pool fixo de 180 partículas reutilizadas, até 18 brilhos DOM e seis atlas de poder; resolução do canvas limitada a DPR 1,75. RAF apenas enquanto há partículas; limpeza de RAF, animações e observadores ao sair/desativar. Movimento reduzido elimina animações e mantém a identificação dos poderes.
- TypeScript, build de produção e 25 testes unitários aprovados. O novo teste de pool emite 2.000 partículas sem expandir seus objetos e verifica chegadas únicas com atraso. O motor, balanceamento, salvamento, áudio e as demais telas não foram alterados.
- Matriz Playwright com o componente real do jogo: 21 cenários por motor (Chromium/Edge e WebKit), cada um com movimento normal e reduzido. Inclui 3/4/5, criação horizontal/vertical/área/cor, ativações individuais, dez pares de poderes e três ondas consecutivas. Tabuleiro final, objetivos, poderes, cascatas e jogadas são comparados ao motor puro e entre os dois modos; a animação não muda o sorteio nem os resultados. Contadores recebem os trajetos e o pool respeita seu limite.
- Ambos os motores também aprovaram 320×568, 390×844, 430×932 e 844×390, arrasto com conversão de orientação, preferência de movimento reduzido alterada durante a ativação, vitória com contemplação e um bloqueio artificial de 420 ms entre ondas sem perder a reação do contador. Em contexto DPR 3, o bitmap permanece limitado a DPR 1,75. Capturas inspecionadas confirmam feixes e partículas alinhados às células e legíveis nas telas menores.
- Campanha real executada novamente: dez fases, 227 jogadas, nenhuma nova tentativa, nenhum erro. Conquistas, dez livros únicos, chegada de Blade, encerramento, infinito e retomada offline aprovados. O release confirma ausência de atalhos QA, manifesto standalone, ícones e saves antigos. WebKit também recarrega a biblioteca e realiza uma jogada animada com o servidor HTTP desligado. Nenhum progresso real do usuário foi reiniciado; contextos automatizados são isolados.
- Build com cache `cea3efc59dcc`, 152 arquivos. Bundle principal: 278,67 kB (90,16 kB gzip); CSS: 47,79 kB (11,12 kB gzip). Fixtures e instrumentação de teste ficam fora do release. Não houve publicação nesta rodada.
- Evidências em `test-results/vfx-*-report.json`, capturas `vfx-*.png`, `browser-report.json`, `release-report.json`, `fx-report.json` e `webkit-no-server-report.json`. O tempo `renderMs` dos relatórios mede apenas o trabalho local de desenho do canvas, excluindo composição/GPU e o restante do frame; não representa FPS. Testes em navegadores desktop/mobile emulados não confirmam desempenho, instalação ou áreas seguras em iPhone físico.

---

# Blade contextual e narrativas das fases

Esta seção descreve a entrega local mais recente. Os registros seguintes são históricos.

- Blade deixou de ter botões ou mensagens permanentes. O toque direto abre um menu contextual sem backdrop, com três opções, fechamento por seleção/toque fora/Escape e navegação por teclado. Entrada e saída em 180 ms; movimento reduzido elimina a animação. O menu fica dentro da tela e não muda o layout.
- Passeio usa `blade-2.webp` (em pé); petisco mantém `blade-4.webp` (acordado deitado); boa noite usa `blade-5.webp` (dormindo). São assets já existentes. A pose em pé foi normalizada pelo tamanho aparente, mantendo o apoio no chão na mesma coordenada. As três poses foram inspecionadas em 320×568, 390×844 e 430×932. A pose escolhida se mantém ao navegar nesta sessão.
- Corrigida a rolagem horizontal involuntária ao focar o cachorro: o cenário utiliza clipping sem criar um contêiner rolável, com a coluna da composição centralizada. As posições relativas dos livros, mesa, quadro e cachorro seguem a mesma arte. Nenhuma imagem foi refeita.
- Dez introduções com cenário aprovado, título, narrativa oficial, ícones dos objetivos e “Vamos lá!”. 30 verificações por motor (dez fases em três tamanhos), sem corte do botão ou scroll desnecessário. Meu Pet não apresenta o nome Blade antes da revelação; Família não cita Bruno, retrato ou surpresa. Fases concluídas e infinito entram direto no gameplay.
- Biblioteca conferida antes e depois do desbloqueio, com 0, 4, 5 e 10 conquistas, em três viewports: 12 verificações por motor. Não há tutorial, tooltip, indicação de interatividade ou área vazia reservada a Blade. Menu ausente por padrão, quadro na mesa e coleção acessível.
- Novos registros separados: `viva-stories-v1` guarda narrativas lidas por campanha; `viva-session-v1` guarda introdução pendente ou partida. A sessão é validada contra campanha, quantidade de conquistas, fase liberada e dificuldade. Tabuleiro, contadores, poderes, sequências, jogadas e momento infinito são restaurados. IDs de peças são reatribuídos ao carregar para evitar colisões. O estado estável é salvo antes de liberar a próxima jogada. Durante cascata interrompida, retoma-se a posição estável anterior; não se tenta restaurar uma animação a meio caminho.
- 23 testes unitários aprovados, incluindo narrativas sem spoilers, validação de sessão, compatibilidade de campanha e preservação do save antigo. TypeScript e build aprovados. As regras do Match-3, balanceamento, ordem dos livros, sinopses, marcos e assinatura não foram modificados.
- Campanha completa com introduções: dez fases, 235 movimentos, nenhuma repetição, nenhum erro e dez livros únicos. Marcos de Blade/retrato e reabertura offline aprovados. Teste de derrota e nova tentativa aprovado. Release continua sem QA, com manifesto standalone e ícones acessíveis.
- Chromium e WebKit passaram em 60 verificações de introduções, 24 de biblioteca e 18 de poses/interações. A retomada do mesmo tabuleiro e jogadas passou nas três dificuldades, após recarga e retorno da biblioteca. As 73 verificações de sinopses no Chromium passaram, incluindo leitura offline. WebKit carregou biblioteca e retrato pelo cache com o servidor HTTP desligado.
- Limitação real: testes em motores automatizados no Windows; instalação, áudio, vibração e áreas seguras físicas no iPhone ainda precisam de conferência no aparelho. Nenhum progresso do usuário foi reiniciado; todas as partidas de teste usam contextos isolados.
- Evidências: `test-results/story-blade-*-report.json`, `story-*-1.png` a `story-*-10.png`, `story-library-*.png`, `blade-*-quiet-*.png`, `blade-*-menu-*.png`, `blade-*-pose-*.png`, `browser-report.json`, `synopses-chromium-report.json`, `release-report.json` e `webkit-no-server-report.json`.

---

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

