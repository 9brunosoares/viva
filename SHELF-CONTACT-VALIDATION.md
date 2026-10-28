# Contato dos livros com a prateleira — 28/10/2026

Correção exclusivamente visual sobre `1eb7aa10916505b29cd378b81e06273976da045c`.
Ponto de recuperação local: `viva-pre-shelf-contact-20261028`.

## Diagnóstico e composição

A antiga reta de apoio era praticamente igual nos quatro estágios, embora o
ressalto superior da madeira esteja em posições diferentes. Além disso, a caixa
alpha dos sprites incluía uma franja semitransparente abaixo da base sólida. Isso
produzia um vão, sobretudo nos estágios 2 e 3. A sombra difusa acompanhava essa
caixa, e as faixas antigas de oclusão não coincidiam com a superfície calibrada.

`source-assets/shelf-contact/calibration.json` registra pontos medidos no sistema
nativo 496 × 756. `shelfY(stage, x)` interpola os segmentos da superfície superior,
sem usar a borda inferior da frente da madeira. Estágios 0 e 1 têm fundos idênticos
e compartilham a calibração; 2 e 3 têm pontos próprios.

O gerador mede o limite opaco (alpha >= 200) na região central de cada lombada,
excluindo a franja e preservando as dimensões alpha originais. `bookPlacement`
compensa a margem e a inclinação já existente do livro para apoiar sua base naquele
ponto do móvel. Larguras, alturas, coordenadas horizontais e ordem não mudaram.

A sombra de contato é estreita, orientada pela inclinação local, sem desfoque amplo.
A frente da prateleira começa 0,55 pixel nativo abaixo do apoio e usa uma faixa de
5,5 pixels, copiada da própria ilustração. Os pixels RGB visíveis das quatro
máscaras são idênticos aos do cenário original. Os quatro cenários e as dez
lombadas permanecem byte a byte iguais aos da versão anterior.

## Verificação visual e geométrica

`tests/shelf-contact.ts` testa 0, 1, 4, 5, 6, 9 e 10 livros nas viewports
375 × 667, 390 × 844 e 430 × 932, em Chromium e WebKit (42 estados).
As capturas usam o jogo renderizado, com movimento reduzido para a medição em
repouso. Os pontos são projetados pela transformação CSS real, não pelo retângulo
HTML. Também verifica o alvo do toque, a ordem, cada sinopse e o progresso intacto.

Folga vertical na captura Chromium 390 × 844, coleção completa, em pixels CSS:

| Livro (ID) | Antes | Depois |
| --- | ---: | ---: |
| O Código Da Vinci (1) | 4,513 | -0,002 |
| A Sombra do Vento (9) | 4,409 | 0,003 |
| Verity (8) | 4,079 | 0,001 |
| Se Houver Amanhã (5) | 4,022 | 0,006 |
| O Caçador de Pipas (2) | 3,388 | -0,003 |
| O Livro dos Espíritos (4) | 3,210 | 0,007 |
| Comer, Rezar, Amar (10) | 2,949 | -0,004 |
| Nosso Lar (6) | 2,646 | 0,006 |
| A Paciente Silenciosa (3) | 2,695 | 0,008 |
| A Biblioteca da Meia-Noite (7) | 2,271 | 0,006 |

Maior diferença contra o plano calibrado em todos os estados: 0,013 pixel CSS
no Chromium e 0,016 no WebKit. Essa medida verifica o encaixe do modelo; não
representa precisão subpixel da própria ilustração rasterizada. As ampliações e
as capturas no tamanho de apresentação foram inspecionadas separadamente.

Artefatos locais, ignorados pelo Git e ausentes do build:

- `test-results/shelf-contact/before-chromium-*.png`: versão anterior.
- `test-results/shelf-contact/after-{engine}-{count}-{width}.png`: composição final.
- `comparison-chromium-10-390.png`: antes, depois e diagnóstico dos dez livros.
- `diagnostic-{engine}-{count}-{width}.png`: superfície turquesa, bases rosas e IDs.
- `test-results/premium6/premium6-motion.webm`: fluxo de vitória, voo e cerimônias.

## Persistência e atualização

Nenhum arquivo de persistência, configuração de campanha, fluxo de recompensa,
áudio, Blade, service worker ou estratégia de atualização foi modificado.
O cache muda pelo hash normal do build; não se força recarga em uma partida.

`tests/shelf-update.ts` serve o build anterior arquivado e o novo em uma origem
isolada. Em ambos os motores, testa campanha parcial com sessão ativa e campanha
completa com sinopse aberta. Todos os registros `viva-*` ficam **byte a byte
idênticos** antes/depois da atualização, incluindo a sessão, dificuldade, efeitos,
volume, modo teste e estados de revelação. A atualização aguarda a saída da partida
ou da leitura, retorna à biblioteca, não repete recompensas e retoma a sessão de
19 movimentos. A máscara nova é verificada por SHA-256 mesmo com cache HTTP fresco.

Não foi usado o perfil real da jogadora, nem a ação Novo jogo.

## Verificações concluídas

- TypeScript e build oficial de produção.
- 60 testes unitários aprovados.
- 42 estados de encaixe em Chromium/WebKit; 60 estados de recompensa/estante.
- Regressão funcional: 35 verificações em cada motor, sem erros críticos.
- Nove verificações de animação, incluindo destino real do voo do livro,
  vitória, interrupção, Blade e família.
- Biblioteca: 15 layouts, dez sinopses, poses/interações de Blade e persistência.
- Ambientação: 12 layouts, movimento reduzido, pausa por atenção/segundo plano.
- Atualização real anterior/nova: duas campanhas por motor com todos os registros
  locais idênticos, além do teste PWA existente de três versões em Chromium.
- Offline no WebKit com servidor de origem desligado: 23 recursos HTTP 200,
  incluindo as quatro máscaras e as dez lombadas; recompensa e cerimônias
  funcionais. O diagnóstico de acesso ao worker com a origem desligada é esperado;
  não houve erro crítico de aplicação.

Arquivos de produto alterados: `src/libraryLayout.ts`, `src/LibraryScene.tsx`,
`src/spineMetrics.ts`, `src/shelfSurface.ts`, `src/premium6.css`, as quatro máscaras
`public/assets/library-shelf-depth-*.webp` e `public/assets/shelf-depth.json`.
Os demais arquivos são o gerador, a calibração, documentação e testes de QA.
Os testes antigos da biblioteca foram alinhados às cerimônias já aprovadas, que
usam o próprio cenário e não possuem o botão Ouvir; nenhum componente de cerimônia
foi alterado nesta correção.

## Reprodução

1. Antes de editar/buildar, copiar `dist` para
   `test-results/shelf-contact/release-before` (arquivo de QA local).
2. Executar `python scripts/verify_shelf_contact.py` para medir as bases.
3. Com a versão anterior servida em 4173, executar
   `SHELF_BEFORE=true tsx tests/shelf-contact.ts`.
4. Para regenerar os assets derivados: `python scripts/prepare_shelf_depth.py` e
   Prettier nos dois arquivos TS gerados; depois `pnpm build`.
5. Executar `tsx tests/shelf-contact.ts` e `tsx tests/shelf-update.ts` para cada
   `BROWSER_ENGINE=chromium` e `webkit`.
6. Executar novamente `python scripts/verify_shelf_contact.py` para as ampliações.

Python usa Pillow e NumPy já disponíveis localmente; nenhuma dependência de
runtime foi adicionada. Testes feitos em navegadores desktop com viewport/toque
emulados, sem alegação de teste em iPhone físico.
