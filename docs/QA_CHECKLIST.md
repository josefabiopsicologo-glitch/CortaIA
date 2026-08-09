# QA Checklist — CortaIA

Legenda: **PASS** (verificado) · **FAIL** (falhou) · **NOT TESTED** (não
validado ainda) · **N/A** (não implementado).

> Regra: nunca marcar PASS sem testar de fato.
>
> Última verificação automatizada: build de produção + smoke test com Chromium
> (Playwright) validando renderização e interação de texto. Fluxos que dependem
> de um arquivo de vídeo real **não** foram validados neste ambiente headless.

## Verificações automatizadas (CI local)

| Item | Status | Evidência |
| ---- | ------ | --------- |
| `npm run typecheck` | PASS | sem erros |
| `npm run lint` | PASS | sem warnings/erros |
| `npm test` (Vitest) | PASS | 43 testes (time, clip-ops, validation, canvas, store) |
| `npm run build` | PASS | build de produção concluído |
| App abre sem erros de runtime | PASS | HTTP 200 + screenshot, `NO_PAGE_ERRORS` |

## Checklist funcional (MVP)

| # | Item | Status | Nota |
| - | ---- | ------ | ---- |
| 1 | Aplicação abre | PASS | shell renderiza (screenshot) |
| 2 | Upload MP4 | NOT TESTED | fluxo implementado; sem vídeo real no ambiente |
| 3 | Vídeo aparece no canvas | NOT TESTED | preview single-clip implementado |
| 4 | Metadata correta | NOT TESTED | leitura via `HTMLVideoElement` implementada |
| 5 | Duração correta | NOT TESTED | depende de mídia real |
| 6 | Play | NOT TESTED | controle implementado |
| 7 | Pause | NOT TESTED | controle implementado |
| 8 | Seek | NOT TESTED | régua/barra implementadas |
| 9 | Playhead acompanha o vídeo | NOT TESTED | sync via rAF implementado |
| 10 | Timeline funciona (régua, tracks, playhead) | PASS | validado visualmente |
| 11 | Split funciona | PASS (lógica) / NOT TESTED (UI manual) | `clip-ops`/store testados |
| 12 | Trim funciona | PASS (lógica) / N/A (handles UI) | `trimMediaClip` testado; handles pendentes |
| 13 | Delete funciona | PASS (lógica) / NOT TESTED (UI manual) | store testado |
| 14 | Texto funciona | PASS | add título → canvas + timeline + propriedades |
| 15 | Áudio funciona | NOT TESTED | upload/track implementados; playback pendente |
| 16 | Volume funciona | NOT TESTED | controle implementado |
| 17 | Formato 9:16 | PASS | padrão; canvas correto |
| 18 | Formato 1:1 | PASS (lógica) / NOT TESTED (UI manual) | preset + teste unitário |
| 19 | Formato 16:9 | PASS (lógica) / NOT TESTED (UI manual) | preset + teste unitário |
| 20 | Undo/Redo | PASS (lógica) | store testado (encadeado, limpa future) |
| 21 | Exportação funciona | N/A | não implementada (FASE 11) |
| 22 | Vídeo exportado abre | N/A | idem |
| 23 | Resultado corresponde ao projeto | N/A | idem |

## Como validar manualmente os itens NOT TESTED

1. `npm run dev` e abrir `http://localhost:3000`.
2. Aba **Mídia** → importar um `.mp4` curto. Conferir itens 2–9.
3. Selecionar o clip → **Dividir** (ou tecla `S`) no playhead → itens 11/13.
4. Trocar o formato no seletor (9:16 / 1:1 / 16:9) → itens 17–19.
5. Aba **Áudio** → importar `.mp3` → itens 15/16.
6. Marcar cada item como PASS/FAIL conforme o resultado real.
