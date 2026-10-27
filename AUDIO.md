# Viva! — áudio original restaurado

Os efeitos e as duas melodias finitas foram restaurados a partir de `5347344:src/audio.ts`, anterior ao Upgrade 2/5. Não existe trilha contínua na biblioteca nem durante as partidas.

## Identidade preservada
- Seleção, combinação, criação, poder, dois poderes, cascata, vitória e livro usam as mesmas frequências, envelopes, durações, volumes relativos e espaçamento da versão anterior.
- As apresentações de Blade e da família recuperam as melodias originais de oito e doze notas. O botão “Ouvir” também retorna. Sair da apresentação encerra as notas agendadas.
- Blade e a leitura de sinopses voltam a ser silenciosos. Foram removidos os sons extras de navegação, troca e erro introduzidos na tentativa de profissionalização.
- Os disparos das ondas continuam sincronizados com o commit dos efeitos visuais do Upgrade 1/5.

## Execução
Web Audio API nativa, sem dependências, arquivos de áudio, download ou conexão. Os instrumentos são os pequenos sinos originais: fundamental e segundo harmônico a 15%, ataque de 18 ms e decaimento exponencial.

A camada de ciclo de vida mantém um único contexto, libera nós finalizados e limita o total de osciladores agendados a 96. Áudio depende de gesto confiável. Segundo plano encerra as vozes e suspende o contexto; voltar aguarda novo gesto. Ausência de Web Audio mantém o jogo silencioso e funcional.

O botão Áudio conserva silêncio e volume, salvos em `viva-audio-v3`, separado das conquistas. No volume padrão de 60%, o ganho final corresponde ao da versão original. A preferência legada de música é ignorada. Som desativado também silencia as duas apresentações.

## Recursos rejeitados
Os samples Kenney, banco WAV, catálogo, scripts e testes exclusivos desses samples foram arquivados em `.audio-tools/rejected-kenney/`. As trilhas anteriormente rejeitadas continuam em `.audio-tools/rejected-score/`. Ambas são pastas locais ignoradas e não entram em `dist/` nem no cache da PWA.

## Verificação
`tests/audio.test.ts` confere as oito sequências, pesos harmônicos, envelopes e horários exatos; as duas melodias; cancelamento; silêncio/volume; limite de vozes; limpeza; segundo plano; APIs ausentes; migração de preferências sem acesso às conquistas.

`tests/library-life.ts` verifica, no Chromium, as notas realmente agendadas pela interface das duas apresentações e a ausência de autoplay ao recarregar. O WebKit disponível no Windows não expõe Web Audio: nele é conferida a experiência silenciosa. Não foi realizada audição crítica ou validação em iPhone físico nesta rodada.
