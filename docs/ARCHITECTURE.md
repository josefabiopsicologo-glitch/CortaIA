# Arquitetura — CortaIA

Documento vivo. Descreve as decisões estruturais do editor. Deve permanecer
conciso e refletir o que existe no código.

## Princípios

1. **Edição não destrutiva.** Nenhuma operação modifica o arquivo original.
   Cortes, splits, trim, texto e transformações alteram apenas o estado do
   projeto (Clips). A renderização real só acontece na exportação.
2. **Separação de responsabilidades.** UI (React) conversa com stores e com o
   Video Engine; lógica pura fica em `src/lib/` e é testada isoladamente.
3. **Migração futura para render no servidor.** A arquitetura inicial roda
   localmente, mas não impede mover a renderização para um pipeline
   `API → fila → worker → FFmpeg nativo → storage`.
4. **Segurança.** A IA (futura) nunca gera/roda comandos FFmpeg arbitrários.

## Camadas

```
Componentes React (src/components)
        │  (leem/despacham)
        ▼
Stores Zustand (src/store)         ── estado persistente + transitório
        │
        ▼
Lógica pura (src/lib)              ── clip-ops, time, validation, media
        │
        ▼
Video Engine (src/video-engine)   ── PLANEJADO: única fronteira com FFmpeg
        │
        ▼
FFmpeg / FFmpeg WASM              ── PLANEJADO
```

## Modelo de dados (`src/types`)

- **Project** — estado persistente completo: `canvas`, `tracks[]` (ordenadas),
  `assets` e `clips` (normalizados por id), `settings`.
- **Asset** — mídia original (imutável): `type`, `source` (Object URL local),
  `duration`, dimensões, `mimeType`, `fileSize`.
- **Clip** — união discriminada:
  - `MediaClip` (video/audio/image): referencia um Asset via `assetId`; guarda
    `timelineStart`, `duration`, `sourceStart`/`sourceEnd` (in/out), transformações
    (`position`, `scale`, `rotation`, `opacity`) e `volume`.
  - `TextClip`: `text` + estilo (fonte, tamanho, peso, cor, alinhamento, etc.).
- **Track** — `type` (`video|text|audio`), `clipIds[]` (ordem), flags
  (`locked/hidden/muted`).
- **Canvas** — `width/height/aspectRatio/backgroundColor`. Presets em
  `CANVAS_PRESETS` (9:16, 1:1, 16:9).
- **RenderPlan** — representação intermediária para exportação (camadas de
  vídeo/áudio/texto), independente de UI e de FFmpeg.

### Por que normalizado?

Guardar `clips` em `Record<id, Clip>` e referenciá-los por `clipIds` nas tracks
simplifica seleção, split (inserir vizinho), trim, mover entre faixas e o
histórico de Undo/Redo (snapshots baratos e comparáveis).

## Estado (`src/store`)

- **editor-store** (persistente): `project`, `selectedClipId`, `past`, `future`.
  Toda mutação estrutural passa por `commit`, que registra o snapshot anterior
  em `past` e limpa `future`. Ações: assets, clips, split, trim, move, texto,
  aspect ratio, undo/redo.
- **playback-store** (transitório): `currentTime`, `isPlaying`, `volume`,
  `muted`. Mantido **fora** do histórico e separado do projeto para que
  atualizações a cada frame (via `requestAnimationFrame`) não disparem rerender
  da árvore inteira nem poluam o Undo/Redo (ver seções 21 e 41 da spec).

## Timeline

- Escala centralizada em `pixelsPerSecond` (`src/lib/time.ts`):
  `x = tempo × pps` e `tempo = x / pps`. Coberto por testes.
- Régua adaptativa (intervalo de rótulos muda com o zoom), playhead sincronizado
  com o `playback-store`, clique para *seek*, clip selecionável.

## Player / Canvas

- O canvas respeita o aspect ratio do projeto e escala o conteúdo lógico
  (ex.: 1080×1920) para o tamanho renderizado; textos escalam pelo fator
  `alturaRenderizada / canvas.height`.
- Preview inicial reproduz **um** clip de vídeo primário (o primeiro da track de
  vídeo), mapeando o tempo da timeline para o tempo da fonte
  (`sourceStart + (t − timelineStart)`). A composição multi-clip/multi-track
  completa é responsabilidade da exportação.
- Performance: o `<video>` é a fonte de verdade durante a reprodução; um loop
  `requestAnimationFrame` escreve `currentTime` no store transitório.

## Exportação (planejada)

Fluxo alvo:

```
Project state → normalização → RenderPlan → Video Engine → FFmpeg → MP4 (H.264/AAC)
```

- `ExportService` / `VideoEngine.exportProject(project)` — componentes não
  montam comandos FFmpeg.
- Progresso **real** (sem porcentagem fake). FFmpeg WASM carregado sob demanda,
  com loading e liberação de recursos.

## Segurança da futura IA

```
IA → COMANDO ESTRUTURADO (JSON) → VALIDAÇÃO → EDITOR ACTION → VIDEO ENGINE → FFMPEG
```

Exemplo de comando estruturado válido: `{ "action": "trim", "start": 4.2, "end": 37.8 }`.
Nunca uma string FFmpeg livre.

## Performance — cuidados

- Evitar rerender geral a cada frame (playback isolado no store transitório).
- Não serializar arquivos gigantes no estado.
- Gerenciar Object URLs com `URL.createObjectURL` / `URL.revokeObjectURL`
  (`src/lib/media.ts` expõe `revokeAssetSource`).
- Não duplicar listeners; limpar efeitos.

## Dependências e vulnerabilidades

- `postcss` e `sharp` (transitivos do Next) foram fixados via `overrides` no
  `package.json` para versões corrigidas, **sem** subir o Next para uma major
  breaking. `npm audit` reporta 0 vulnerabilidades. Reavaliar os overrides
  quando o Next publicar uma versão que já traga as correções.
