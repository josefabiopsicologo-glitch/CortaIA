"use client";

import type { AspectRatio } from "@/types";
import { CANVAS_PRESETS } from "@/types";
import { useEditorStore } from "@/store/editor-store";
import {
  ExportIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/ui/icons";

const ASPECT_OPTIONS: AspectRatio[] = ["9:16", "1:1", "16:9"];

export function TopBar() {
  const name = useEditorStore((s) => s.project.name);
  const aspectRatio = useEditorStore((s) => s.project.canvas.aspectRatio);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const setAspectRatio = useEditorStore((s) => s.setAspectRatio);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-panel px-4">
      <div className="flex items-center gap-2 pr-2">
        <span className="text-lg font-semibold tracking-tight">
          Corta<span className="text-accent">IA</span>
        </span>
      </div>

      <div className="h-6 w-px bg-border" />

      <input
        aria-label="Nome do projeto"
        value={name}
        onChange={(e) => setProjectName(e.target.value)}
        className="max-w-[220px] rounded-md bg-transparent px-2 py-1 text-sm text-foreground/90 outline-none hover:bg-elevated focus:bg-elevated focus:ring-1 focus:ring-border"
      />

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-md border border-border bg-elevated">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Desfazer (Ctrl/Cmd+Z)"
            className="flex h-8 w-8 items-center justify-center rounded-l-md text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UndoIcon />
          </button>
          <div className="h-5 w-px bg-border" />
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Refazer (Ctrl/Cmd+Shift+Z)"
            className="flex h-8 w-8 items-center justify-center rounded-r-md text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RedoIcon />
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted">
          <span className="sr-only">Formato</span>
          <select
            aria-label="Formato do projeto"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="h-8 rounded-md border border-border bg-elevated px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-accent"
          >
            {ASPECT_OPTIONS.map((ar) => (
              <option key={ar} value={ar}>
                {ar} · {CANVAS_PRESETS[ar].width}×{CANVAS_PRESETS[ar].height}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled
          title="Exportação chega na próxima fase"
          className="flex h-8 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-background opacity-60"
        >
          <ExportIcon size={16} />
          Exportar
        </button>
      </div>
    </header>
  );
}
