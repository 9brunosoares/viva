# Viva! — biblioteca viva, Upgrade 3/5

## Reavaliação da ambientação

A primeira implementação abaixo foi reavaliada em execução: os gradientes e pontos estavam ativos, mas eram pouco perceptíveis; o modo simplificado deixava todo o ambiente estático. A correção atual acrescenta três feixes solares suaves, poeira mais legível na luz e reflexo localizado na cortina. O modo simplificado mantém movimento leve. Ilustrações, livros, Blade e retrato foram preservados. Implementação, intensidades, gravação e provas de renderização estão em [AMBIENTACAO.md](AMBIENTACAO.md).

O restante deste arquivo registra a primeira implementação histórica, anterior à recalibração.

## Composição e tecnologia
A biblioteca permanece em React/DOM, sobre as quatro ilustrações originais de 496 × 756. O estágio continua em `libraryState`: 0–1, 2–4, 5–7 e 8–10 fases. Recortes e posições dos livros em `libraryLayout.ts` não foram alterados.

`LibraryAtmosphere.tsx` adiciona luz e poeira em coordenadas proporcionais à sala. A janela ocupa a esquerda em todos os estágios; a luminária fica ao lado da poltrona. Os dois pares iniciais compartilham as mesmas coordenadas, e os estágios 2/3 compensam a altura da luminária. Gradientes radiais locais variam lentamente em opacidade, sem filtro sobre a ilustração inteira. O porta-retrato desbloqueado recebe apenas um reflexo estático suave.

Oito elementos de poeira são reutilizados em animações CSS lentas de 19–28 segundos, com opacidade máxima de 21%, em uma faixa livre diante da cortina. Não há Canvas adicional, RAF permanente, giroscópio, novos assets ou dependências. Não foi forçado parallax: a sala é uma ilustração única; deslocar o primeiro plano também deslocaria a mesa em relação ao retrato.

## Livros
O toque levanta visualmente a lombada em quatro pixels, sem mudar a posição do botão na prateleira. A seleção continua evidenciada enquanto a apresentação existente abre com opacidade e deslocamento curtos. Capas, autores, textos, rolagem e ordem persistida permanecem iguais.

Depois de uma conquista inédita, a primeira volta à biblioteca incorpora o livro com uma entrada de 1,2 s e luz breve. Esse estado é transitório, separado das conquistas. Ao retomar uma revelação pendente de Blade/família, o livro entra após o aceite; reabrir a biblioteca não repete a animação. Não há substituição da recompensa ou das cerimônias.

## Blade
As três poses existentes são preservadas: dormir (5), em pé (2) e deitado acordado (4). A respiração varia somente a escala vertical da camada em até 0,6%, com origem nos pés e ciclo de 6,8 s. A arte não é redesenhada.

Trocas usam crossfade de 240 ms. A pose anterior mantém sua altura original mesmo quando o botão adota a altura da nova pose, mantendo a mesma linha de apoio. Há no máximo duas imagens durante essa transição. Petisco usa a pose aprovada e uma resposta discreta em opacidade. O menu continua oculto até tocar no cachorro e fecha por escolha, toque fora ou Escape.

## Ciclo de vida e acessibilidade
- A camada só existe na tela da biblioteca.
- Segundo plano pausa luz, poeira e respiração.
- Livro/retrato/dificuldade em foco reduzem a ambientação e pausam o movimento ambiental; o menu de Blade e o painel de áudio também reduzem a atenção decorativa.
- `prefers-reduced-motion` remove poeira e animações novas, inclusive se mudar com o jogo aberto.
- Economia de dados, até dois núcleos ou até 2 GB de memória informados pelo navegador selecionam iluminação estática e removem poeira. São indicadores, não medição térmica ou garantia de performance.
- Listeners e timeouts têm cleanup. Não há atualização de estado por frame nem sorteios compartilhados com o Match-3.
- Tudo acompanha o cache estático existente da PWA.

## Arquivos desta etapa
Produção: `src/LibraryAtmosphere.tsx`, `src/library-life.css`, `src/App.tsx`, `src/BladeCompanion.tsx`, `src/main.tsx`. A restauração de áudio está em `src/audio.ts`, `src/Celebration.tsx` e nas integrações de `Game.tsx`, `BookViewer.tsx` e `App.tsx`.

Verificações: `tests/library-life.ts`, `tests/audio.test.ts`, `tests/audio-app.tsx`, `tests/offline-server.ts`; testes existentes de campanha, release e efeitos. Capturas e relatórios em `test-results/library-alive-*`.

## Como conferir
Abra a biblioteca e observe a luz da cortina e da luminária por alguns segundos. Toque nas lombadas; depois, em Blade, quando desbloqueado. Alterne passear, petisco e boa noite. Para conferir a entrada de um livro, conclua uma fase inédita e guarde a recompensa.

O fluxo permanece funcional sem som e offline. Testes são de navegador e emulação mobile, não de iPhone físico. A suavidade, consumo energético e conforto perceptivo no aparelho real ainda precisam de conferência; não se promete 60 FPS. Nenhum upgrade 4/5, 5/5 ou auditoria final foi iniciado.
