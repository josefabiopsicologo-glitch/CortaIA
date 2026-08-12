# CortaIA — Edit Pro 🎬

Editor de vídeo com IA que roda no navegador. Importe um vídeo, corte, gere
legendas automáticas por IA, aplique cortes automáticos (remoção de silêncios) e
exporte o resultado em MP4 — tudo processado localmente no cliente via
**ffmpeg.wasm**, sem enviar o vídeo para um servidor.

## Recursos

- **Timeline com cortes** — divida, exclua, reordene e apare trechos do vídeo.
- **Cortes automáticos (IA)** — detecção de silêncio via Web Audio API que
  remove pausas e mantém só os melhores momentos.
- **Legendas automáticas (IA)** — transcrição por Whisper com legendas
  sincronizadas, exportáveis em `.srt` e/ou queimadas no vídeo.
- **Exportação em MP4** — renderização no navegador com ffmpeg.wasm.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS
- `@ffmpeg/ffmpeg` (ffmpeg.wasm) para corte/concatenação/exportação
- Web Audio API para detecção de silêncio
- Rota `/api/transcribe` compatível com a API Whisper (OpenAI)

## Como rodar

```bash
npm install
cp .env.example .env.local   # opcional: para legendas por IA
npm run dev
```

Abra http://localhost:3000.

> **Importante:** o ffmpeg.wasm precisa de um contexto *cross-origin isolated*.
> Os headers `Cross-Origin-Opener-Policy` e `Cross-Origin-Embedder-Policy` já
> estão configurados em `next.config.mjs`.

## Legendas por IA (opcional)

Para gerar legendas automáticas, defina no `.env.local`:

```
OPENAI_API_KEY=sk-...
# opcionais:
OPENAI_BASE_URL=https://api.openai.com/v1
TRANSCRIBE_MODEL=whisper-1
```

Sem a chave, a rota `/api/transcribe` retorna `501` e a interface segue
funcionando (edição, cortes e exportação) — apenas as legendas automáticas
ficam indisponíveis.

## Estrutura

```
src/
  app/
    api/transcribe/route.ts   # transcrição por IA (server-side)
    layout.tsx, page.tsx      # shell da aplicação
  components/
    Editor.tsx                # orquestrador do Edit Pro
    VideoPlayer.tsx           # player que reproduz a timeline
    Timeline.tsx              # trilha de clipes + legendas
    UploadDropzone.tsx        # importação de vídeo
    ExportDialog.tsx          # exportação em MP4
  hooks/
    useEditorState.ts         # estado + undo/redo
  lib/
    silence.ts                # cortes automáticos
    subtitles.ts              # legendas
    export.ts                 # pipeline de exportação (ffmpeg)
    ffmpeg.ts                 # loader do ffmpeg.wasm
    types.ts, format.ts       # modelos e utilidades
```
