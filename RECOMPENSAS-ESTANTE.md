# Recompensas, estante e ordem fixa dos livros

Base: `f25badc`. Ponto local de recuperação:
`viva-pre-reward-shelf-fixed-books-20261028`.

## Ajustes

- **Composição das recompensas:** `.library.immersive` tinha especificidade maior
  e aplicava `display: block` e `padding: 0` às recompensas, anulando o alinhamento
  flex e as safe areas. O seletor `.library.immersive.reward-in-room` passa a
  definir explicitamente a composição flex, centralizando o conjunto inteiro.
  O conteúdo ocupa sua altura natural, limitada pelo espaço útil; apenas a capa
  pode encolher quando necessário, com `object-fit: contain`. Textos e ações
  conservam suas dimensões. Não foram usados offsets para empurrar elementos.
- **Estante:** a linha de apoio ficava na borda frontal da prateleira. As âncoras
  foram elevadas 8 pixels na ilustração de 496 × 756, de interceptos 191/192 para
  183/184 conforme o estágio, preservando a inclinação de 0,048, as posições
  horizontais e as alturas. A correção é proporcional ao cenário renderizado.
  Sprite, botão e sombra de contato usam a mesma âncora; as máscaras existentes
  e os arquivos de imagem permanecem intactos. O voo calcula seu destino a partir
  do retângulo atualizado do botão na estante.
- **Livros:** `campaignBookIds` em `config.ts` define a sequência abaixo. Os IDs
  foram conferidos com os títulos reais. `fresh()` copia essa sequência, sem
  sortear nem consumir o gerador aleatório do gameplay. A validação aceita
  somente a ordem canônica. Ordens experimentais incompatíveis dão lugar a uma
  campanha nova, sem migração complexa. Novos saves, marcos, recompensas e
  reinícios usam a mesma associação. Repetir fases não concede outro livro.

| Fase | Tema | ID | Livro |
| --- | --- | --- | --- |
| 1 | Química | 1 | O Código Da Vinci |
| 2 | Ensino Infantil | 9 | A Sombra do Vento |
| 3 | Praia | 8 | Verity |
| 4 | Kung Fu | 5 | Se Houver Amanhã |
| 5 | Meu Pet | 2 | O Caçador de Pipas |
| 6 | Espiritismo | 4 | O Livro dos Espíritos |
| 7 | Roma | 10 | Comer, Rezar, Amar |
| 8 | Pagode | 6 | Nosso Lar |
| 9 | Tatuagens | 3 | A Paciente Silenciosa |
| 10 | Família | 7 | A Biblioteca da Meia-Noite |

## Arquivos

Aplicação: `src/config.ts`, `src/progress.ts`, `src/restart.ts`,
`src/libraryLayout.ts`, `src/premium6.css`. Documentação: `README.md` e este arquivo.

Testes novos: `tests/book-rewards.test.ts` e `tests/reward-shelf.ts`.
`tests/reward-finish.ts` foi atualizado para percorrer os dez pares reais
fase/livro, em vez de inserir livros arbitrários na quinta fase.
`tests/premium6-motion.ts` também compara o destino da animação com a posição
real da lombada. As demais alterações em fixtures substituem a ordem aleatória
antiga e removem o argumento de sorteio de `fresh()`/`restartJourney()`.

Nenhum texto, autor, sinopse, capa, lombada ou asset original foi modificado.
Não houve alteração no Match-3, balanceamento, som, Blade, encerramento,
Modo teste ou estratégia de atualização da PWA. Nenhuma dependência nova.

## Verificação e evidências

`tests/book-rewards.test.ts` verifica IDs/títulos, ausência de sorteio, cópias
independentes da ordem, unicidade, persistência, interrupções dos marcos,
idempotência das revisitas e rejeição de ordens experimentais incompatíveis.

`tests/reward-shelf.ts` cobre 30 estados por motor: introdução, primeiro livro e
último livro em três viewports, com e sem safe areas simuladas de 59/34 pixels;
mais biblioteca com 1/4/5/10 livros em três viewports. Mede centro da composição,
limites, sobreposição, âncoras e pontos de toque, além de abrir sinopses.

`tests/reward-finish.ts` confere os dez livros, capa/título/autor, recompensa sem
sinopse e leitura posterior, com 30 composições por motor e safe areas simuladas.

Resultados verificados nesta rodada:

- 58 testes unitários aprovados; TypeScript e builds oficial/QA aprovados.
- 30 estados de recompensa/estante por motor, mais 30 composições dos dez livros
  por motor, em Chromium/Edge e WebKit. Centro da composição com desvio máximo
  de aproximadamente 1,01 pixel na área útil, sem sobreposição ou corte.
- Biblioteca: 35 verificações por motor, quatro estágios e áreas de toque.
- Voo, vitória e cerimônias com movimento normal/reduzido: nove verificações;
  destino do voo dentro de 0,5 pixel do centro da lombada real.
- Apresentações especiais e dificuldade: 11 cenários por motor, incluindo
  carregamento lento e retorno de visibilidade.
- Campanha por jogadas reais: dez fases Fácil, Kung Fu Médio e Tatuagens Difícil,
  totalizando 243 jogadas sem reinícios nas sessões automatizadas. A simulação
  não representa garantia de facilidade para uma pessoa.
- Modo teste: dez recompensas únicas por motor, persistência e reinício com a
  ordem fixa, apresentações de Blade/família e modo infinito preservados.
- Configurações e reinício, inclusive sem API de áudio e durante uma jogada:
  aprovados. O turno antigo não restaura o progresso descartado.
- Offline WebKit com o servidor desligado: partida, recompensa, leitura da
  sinopse, Modo teste, fontes, presentes e apresentações especiais aprovados.
- Atualização da PWA com três versões e múltiplas janelas: atualização adiada
  durante jogo/leitura, estado preservado e nova versão disponível offline.
- Release: manifesto standalone/retrato, ícones HTTP 200, ausência do atalho
  por padrão e restauração da biblioteca/retrato offline aprovados.

Execução local, com o build servido na porta 4173 e prefixo `/viva-test/`:

```powershell
pnpm test
pnpm build
pnpm exec tsx tests/reward-shelf.ts
pnpm exec tsx tests/reward-finish.ts
$env:BROWSER_ENGINE='webkit'
pnpm exec tsx tests/reward-shelf.ts
pnpm exec tsx tests/reward-finish.ts
```

Evidências em `test-results/reward-shelf/`, ignoradas pelo Git e fora do build:

- `reward-comparison.jpg`: antes acima/depois abaixo, em viewport 390 × 844,
  com safe areas simuladas.
- `shelf-comparison.jpg`: 1/4/5/10 livros antes e depois.
- `after-<motor>.json`: medições das apresentações e da estante.
- `reward-finish-<motor>.json`: validação da associação e do conteúdo dos livros.

As quatro novas referências mencionadas no pedido não estavam disponíveis nos
anexos acessíveis desta mensagem. A avaliação utilizou os próprios assets,
medição de suas superfícies e capturas da versão publicada anterior. Chromium
e WebKit no Windows não substituem teste em iPhone físico. A limitação independente
de agendamento da ambientação da biblioteca no WebKit permanece fora do escopo.
