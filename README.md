# CortaIA

**Editor inteligente de vídeos** para criação de conteúdo curto — Instagram
Reels, TikTok e YouTube Shorts — com edição tradicional hoje e edição assistida
por IA no futuro.

> Status: em desenvolvimento ativo. Editor Shell (FASE 1) funcional; exportação
> e camadas de IA ainda por vir (ver [Roadmap](docs/ROADMAP.md)).

## Objetivo

Permitir que criadores (psicólogos, professores, especialistas, infoprodutores)
transformem vídeos brutos em conteúdo pronto para publicar — de forma simples,
rápida e, no futuro, com ajuda de IA (“transforme este vídeo em 5 Reels”,
“remova os silêncios”, “coloque legendas”).

A filosofia é construir primeiro um **editor confiável e não destrutivo**, e só
então adicionar automações e inteligência artificial sobre uma base sólida.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS 3 — tema *Dark Professional*
- [Zustand](https://github.com/pmndrs/zustand) para estado
- [Vitest](https://vitest.dev/) para testes
- Vídeo: FFmpeg / FFmpeg WASM (planejado — ver Roadmap)

## Requisitos

- Node.js 18.18+ (recomendado 20 ou 22)
- npm 10+

## Instalação

```bash
npm install
```

## Execução

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Testes e verificações

```bash
npm test           # testes unitários (Vitest)
npm run typecheck  # checagem de tipos (tsc --noEmit)
npm run lint       # ESLint
npm run build      # build de produção
```

## Arquitetura (resumo)

Edição **não destrutiva**: todas as operações (cortar, dividir, mover, texto)
alteram apenas o estado do projeto; a renderização real acontece só na
exportação. O estado é normalizado e dividido em dois stores — um persistente
(projeto + histórico Undo/Redo) e um transitório (playback), para performance.

Detalhes completos em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
src/
  app/            # Next.js App Router (layout, página)
  components/     # UI (editor, canvas, player, timeline, ui)
  hooks/          # hooks (atalhos de teclado, etc.)
  lib/            # lógica pura e testável (time, clip-ops, validation, media)
  store/          # Zustand (editor-store, playback-store)
  types/          # modelo de dados (Project, Asset, Clip, Track, Canvas, Render)
  video-engine/   # abstração de operações de vídeo (planejado)
```

## Formatos suportados

| Preset  | Resolução   | Plataformas                          |
| ------- | ----------- | ------------------------------------ |
| `9:16`  | 1080 × 1920 | Reels · Shorts · TikTok              |
| `1:1`   | 1080 × 1080 | Instagram                            |
| `16:9`  | 1920 × 1080 | YouTube                              |

## Limitações atuais

- Preview exibe um único clip de vídeo (composição completa fica para a
  exportação).
- Exportação ainda não implementada.
- Trim por handles visuais pendente (a lógica pura já existe e é testada).

## Roadmap

Ver [docs/ROADMAP.md](docs/ROADMAP.md). Qualidade das checagens manuais em
[docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md).
