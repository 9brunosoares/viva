# Blade: pigmentação azul-arroxeada da língua

Base: `4504c24`. Ponto de recuperação:
`viva-pre-blade-tongue-20261028`.

## Imagens

O atlas original foi localizado em
`fotos/atlas_imagens/Folha de poses do Chow Chow Blade.png` (1774 × 887, RGBA).
Uma cópia original e a versão corrigida estão em
`source-assets/blade-tongue/poses-original.png` e `poses-corrected.png`.
Nenhum corte, pose ou coordenada foi alterado.

Recursos públicos corrigidos:

- `public/assets/blade-0.webp`: em pé, vista lateral.
- `public/assets/blade-1.webp`: sentado, pequena ponta da língua.
- `public/assets/blade-2.webp`: em pé, interação de passeio.
- `public/assets/blade-3.webp`: em movimento.
- `public/assets/blade-4.webp`: acordado, petisco e apresentação especial.
- `public/assets/blade-7.webp`: rosto.
- `public/assets/tile-5-5.webp`: rosto usado na paleta de seis tipos do infinito.
  A campanha Meu Pet mantém sua paleta original de cinco tipos.
- `public/assets/family.webp` e `family-object.webp`: exclusivamente a língua
  do cachorro dentro do retrato. Pessoas, moldura e todos os outros pixels
  permanecem intactos.

As poses dormindo `blade-5.webp` e `blade-6.webp` não foram editadas e continuam
idênticas byte a byte. Os arquivos anteriores dos nove recursos modificados
ficam arquivados em `source-assets/blade-tongue/originals/`, fora do build público.

## Técnica e cores

`scripts/correct_blade_tongue.py` aplica máscaras locais revisadas, descritas em
`source-assets/blade-tongue/regions.json`. O limite da máscara é estrito: o
suavizamento não modifica pixels fora dos polígonos. A seleção por crominância
protege brancos dos reflexos/dentes. A luminância original transporta sulcos,
textura, sombras e brilho para um pigmento azul-violeta acinzentado, com reflexos
menos saturados. Não há preenchimento uniforme, geração de personagem ou filtro
CSS novo.

Exemplos de meios-tons exportados: `#605F87` na pose em pé, `#5E5D84` na pose
acordada, `#4C4B6C` no ícone e `#4E4D6F` no retrato. Há variação por pixel conforme
a iluminação original.

Os WebPs são gravados sem perdas e com preservação exata dos pixels transparentes.
Isso permite garantir zero mudanças fora da língua, inclusive na fotografia.
O custo é aproximadamente 2,4 MiB adicionais no conjunto público; a resolução e
o tamanho decodificado em memória continuam iguais. Não há processamento de cor
durante o jogo, dependência nova ou serviço externo.

Para reprodução:

```powershell
python scripts/correct_blade_tongue.py
python tests/blade_tongue_test.py
```

O padrão usa os originais arquivados, evitando deterioração por edições sucessivas.
`scripts/prepare_assets.py` aplica a mesma correção ao final da extração normal
(`use_current=True`), para que a geração futura não reintroduza a língua rosa.

## Progresso, atualização e offline

Nenhum arquivo em `src/` foi alterado. Permanecem intactos o formato dos saves,
as chaves locais, a ordem dos livros, a dificuldade, as sessões, os marcos de
Blade/família, a interface e as músicas.

`scripts/service-worker.mjs` continua calculando a versão a partir do conteúdo
dos recursos. As requisições de instalação usam `cache: 'reload'`, pois um
arquivo com o mesmo nome poderia estar rosa no cache HTTP ainda válido. O cache
novo passa a conter as imagens corrigidas. O protocolo existente de adoção
segura permanece: jogo/leitura ativos adiam a atualização, e o estado é salvo
antes da recarga. Não há limpeza de localStorage nem reinício de campanha.

## Verificações

- `tests/blade_tongue_test.py`: quatro testes, nove arquivos exportados e atlas;
  tamanho, alpha e todos os pixels fora das máscaras idênticos; língua realmente
  azul-violeta e correlação de luminância superior a 0,98 no interior; poses
  dormindo com SHA-256 inalterado.
- 58 testes unitários existentes aprovados; TypeScript e build de produção
  aprovados.
- `tests/blade-tongue.ts`: 14 verificações por motor, em Chromium/Edge e WebKit,
  com 375 × 667, 390 × 844 e 430 × 932. Decodifica os elementos efetivamente
  renderizados, lê seus pixels e captura biblioteca/passeio/petisco, chegada,
  ícone do infinito, cerimônia familiar e retrato ampliado. As interações não
  modificam o progresso salvo.
- `tests/pwa-update.ts`: três versões, duas janelas, jogo e leitura ativos,
  progresso e tabuleiro preservados, imagens anteriores com cache HTTP válido
  por uma hora substituídas pelas novas, incluindo nova versão offline.

Capturas e relatórios em `test-results/blade-tongue/`, ignorados pelo Git:
`blade-comparison.jpg`, `mouth-comparison.jpg`, `pixel-audit.json`,
`chromium-report.json`, `webkit-report.json` e capturas das telas reais.

A validação usa navegadores no Windows, com viewport equivalente ao iPhone.
Não foi realizado teste em iPhone físico. A limitação independente da ambientação
no WebKit não foi alterada nem reavaliada como parte desta correção pontual.
