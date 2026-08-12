"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import { CANVAS_PRESETS } from "@/types";
import { createVideoEngine } from "@/video-engine";
import { exportProject, getExportBlocker } from "@/export/export-service";
import type { ExportPhase, ExportResult } from "@/video-engine";
import { ExportIcon } from "@/components/ui/icons";

type Status = "idle" | "running" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const PHASE_LABEL: Record<ExportPhase, string> = {
  idle: "",
  preparing: "Preparando…",
  processing: "Processando…",
  exporting: "Exportando…",
  done: "Concluído.",
  error: "Erro.",
};

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const project = useEditorStore((s) => s.project);
  const canvas = project.canvas;
  const preset = CANVAS_PRESETS[canvas.aspectRatio];

  const [status, setStatus] = useState<Status>("idle");
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const blocker = useMemo(() => getExportBlocker(project), [project]);

  // Revoga o Object URL do resultado ao desmontar.
  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  async function handleStart() {
    setStatus("running");
    setError(null);
    setPercent(0);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await exportProject(project, createVideoEngine(), {
        signal: controller.signal,
        onProgress: (p) => {
          setPhase(p.phase);
          if (typeof p.progress === "number") setPercent(Math.round(p.progress * 100));
        },
      });
      setResult(res);
      setStatus("done");
      setPercent(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha durante a exportação.");
      setStatus("error");
    } finally {
      controllerRef.current = null;
    }
  }

  function handleCancel() {
    controllerRef.current?.abort();
  }

  const fileName = `${project.name || "cortaia"}.webm`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Exportar"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ExportIcon size={16} /> Exportar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-muted hover:text-foreground"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg border border-border bg-panel p-3 text-xs text-muted">
            <div className="mb-1 flex justify-between">
              <span>Formato</span>
              <span className="text-foreground">
                {canvas.aspectRatio} · {preset.label}
              </span>
            </div>
            <div className="mb-1 flex justify-between">
              <span>Resolução</span>
              <span className="text-foreground">
                {canvas.width} × {canvas.height}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Arquivo</span>
              <span className="text-foreground">WebM (VP9/VP8)</span>
            </div>
          </div>

          {blocker && status === "idle" && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {blocker}
            </p>
          )}

          {status === "running" && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>{PHASE_LABEL[phase] || "Processando…"}</span>
                <span>{percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-accent transition-[width]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted">
                A gravação acontece em tempo real (a duração do vídeo é o tempo
                aproximado da exportação).
              </p>
            </div>
          )}

          {status === "error" && error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          {status === "done" && result && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-200">
              <p className="mb-2">
                Exportação concluída ({formatBytes(result.sizeBytes)}).
              </p>
              <a
                href={result.url}
                download={fileName}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500"
              >
                Baixar {fileName}
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          {status === "running" ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-red-400/60 hover:text-red-300"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={Boolean(blocker) || status === "done"}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-background transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExportIcon size={14} />
              {status === "error" ? "Tentar de novo" : "Iniciar exportação"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
