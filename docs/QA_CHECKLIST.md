# QA Checklist — CortaIA

Legenda: **PASS** (verificado) · **FAIL** (falhou) · **NOT TESTED** (não
validado ainda) · **N/A** (não implementado).

> Regra: nunca marcar PASS sem testar de fato.
>
> Última verificação automatizada: build de produção + testes com Chromium
> (Playwright) validando renderização, interação de texto, drag/resize na
> timeline e **exportação de ponta a ponta** (importar um WebM gerado no
> browser → exportar → arquivo `video/webm` real). O que ainda depende de
> inspeção humana (playback de vídeo real, conferência visual do resultado)
> segue marcado como NOT TESTED.

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
| 12 | Trim por handles | PASS | resize da borda validado via Playwright (+120px) |
| 12b | Arrastar clip (mover) + snap + Undo | PASS | move +100px e Undo (1 passo) validados via Playwright |
| 13 | Delete funciona | PASS (lógica) / NOT TESTED (UI manual) | store testado |
| 13b | Duplicar (Ctrl+D) + nudge (setas) | PASS | validado via Playwright (1→2 clips, cópia deslocada) |
| 13c | Remover mídia + revoga Object URL | PASS (lógica) | store testado (asset + clips removidos) |
| 13d | Clips não se sobrepõem (mover/nudge) | PASS | `clampStartWithinNeighbors` testado + Playwright (drag contra vizinho para no limite) |
| 13e | Thumbnail no clip de vídeo/imagem | PASS | Playwright: clip de vídeo renderiza `<img>` com data URL (JPEG) |
| 14 | Texto funciona | PASS | add título → canvas + timeline + propriedades |
| 15 | Áudio funciona | NOT TESTED | upload/track implementados; playback pendente |
| 16 | Volume funciona | NOT TESTED | controle implementado |
| 17 | Formato 9:16 | PASS | padrão; canvas correto |
| 18 | Formato 1:1 | PASS (lógica) / NOT TESTED (UI manual) | preset + teste unitário |
| 19 | Formato 16:9 | PASS (lógica) / NOT TESTED (UI manual) | preset + teste unitário |
| 20 | Undo/Redo | PASS (lógica) | store testado (encadeado, limpa future) |
| 21 | Exportação funciona | PASS | E2E via Playwright: importar WebM → exportar → arquivo real de ~130 KB (`video/webm`) |
| 22 | Vídeo exportado abre | NOT TESTED | blob WebM válido gerado; abertura em player externo não checada aqui |
| 23 | Resultado corresponde ao projeto | NOT TESTED | composição (vídeo contain + textos) implementada; conferência visual manual pendente |

## Como validar manualmente os itens NOT TESTED

1. `npm run dev` e abrir `http://localhost:3000`.
2. Aba **Mídia** → importar um `.mp4` curto. Conferir itens 2–9.
3. Selecionar o clip → **Dividir** (ou tecla `S`) no playhead → itens 11/13.
4. Trocar o formato no seletor (9:16 / 1:1 / 16:9) → itens 17–19.
5. Aba **Áudio** → importar `.mp3` → itens 15/16.
6. Marcar cada item como PASS/FAIL conforme o resultado real.
