# CLAUDE.md — CortaIA

Guia conciso para quem (humano ou IA) for desenvolver o CortaIA. Mantenha
este arquivo atualizado e enxuto — não é um diário.

## Visão

CortaIA é um **editor inteligente de vídeos** para criação de conteúdo curto
(Instagram Reels, TikTok, YouTube Shorts) e educacional. A evolução é:

```
EDITOR → AUTOMAÇÕES → TRANSCRIÇÃO → LEGENDAS → ANÁLISE → IA → AGENTE DE EDIÇÃO
```

Princípio: **não construir IA sobre uma timeline instável.** Primeiro um editor
tradicional confiável e não destrutivo; depois camadas de IA.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS 3 (tema "Dark Professional")
- Zustand (estado)
- Vitest (testes)
- Vídeo: FFmpeg / FFmpeg WASM (ainda **não** integrado — ver ROADMAP)

## Comandos

```bash
npm run dev        # desenvolvimento (http://localhost:3000)
npm run build      # build de produção
npm run start      # sobe o build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest (run único)
npm run test:watch # Vitest em watch
```

Rode `lint`, `typecheck`, `test` e `build` ao final de cada fase. Corrija erros
antes de prosseguir — não acumule.

## Arquitetura (resumo)

Ver `docs/ARCHITECTURE.md` para detalhes.

- **Edição não destrutiva**: cortes/splits/trim/texto alteram apenas o estado
  do projeto; a renderização real só ocorre na exportação.
- **Estado normalizado**: `assets` e `clips` ficam em `Record<id, …>`; `tracks`
  guardam a ordem via `clipIds`.
- **Dois stores** (`src/store/`):
  - `editor-store` — persistente (projeto, seleção, histórico Undo/Redo).
  - `playback-store` — transitório (currentTime/isPlaying/volume), **fora** do
    histórico, para não causar rerenders a cada frame.
- **Video Engine** (`src/video-engine/`, planejado): abstração única para
  operações de mídia. Componentes React **nunca** montam comandos FFmpeg.
- **RenderPlan** (`src/types/render.ts`): representação intermediária entre o
  estado e o motor de exportação.

## Modelo de dados

`src/types/`: `Project`, `Asset`, `Track`, `Clip` (união `MediaClip | TextClip`),
`Canvas` (presets 9:16 / 1:1 / 16:9), `RenderPlan`.

## Convenções

- Alias de import `@/*` → `src/*`.
- Lógica pura e testável em `src/lib/`; UI em `src/components/`.
- Nomes, comentários e textos de UI em português (público-alvo BR).
- Componentes de client marcam `"use client"`.
- Prefira funções puras para operações de clip (`src/lib/clip-ops.ts`) e
  cubra-as com testes.

## Regras de segurança

- A IA (futura) **nunca** executa strings FFmpeg arbitrárias. Fluxo obrigatório:
  `IA → comando estruturado → validação → editor action → Video Engine → FFmpeg`.
- Nunca commitar segredos. Usar `.env.local` (ver `.env.example`).

## Estado atual (implementado)

- Setup do projeto + correção de vulnerabilidades (overrides de `postcss`/`sharp`).
- Modelo de dados completo + stores + utilitários de tempo/validação.
- **43 testes** (time, clip-ops, validation, canvas, editor-store).
- **FASE 1 — Editor Shell**: TopBar, Sidebar (Mídia/Texto/Áudio/Legendas/IA),
  Canvas/Player, Properties, Timeline (régua, playhead, 3 tracks, split/delete,
  zoom). Upload real de mídia, preview de vídeo (single-clip), texto sobreposto,
  troca de formato, Undo/Redo, atalhos.

## Limitações conhecidas

- Preview mostra **um** clip de vídeo (composição multi-clip é da exportação).
- **Exportação ainda não implementada** (botão desabilitado).
- Trim visual por handles ainda não implementado (lógica pura já existe/testada).
- Playback de vídeo real não validado neste ambiente headless (ver QA_CHECKLIST).

## Próximos passos

Ver `docs/ROADMAP.md`. Em ordem: upload/player robustos → timeline (trim por
handles, snap) → Video Engine → exportação (RenderPlan → FFmpeg) → IA.
