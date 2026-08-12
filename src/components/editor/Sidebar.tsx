"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import { createAssetFromFile } from "@/lib/media";
import { validateMediaFile } from "@/lib/validation";
import { formatTimecode } from "@/lib/time";
import {
  AudioIcon,
  CaptionIcon,
  MediaIcon,
  SparklesIcon,
  TextIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/ui/icons";

type TabId = "media" | "text" | "audio" | "captions" | "ai";

const TABS: { id: TabId; label: string; icon: typeof MediaIcon }[] = [
  { id: "media", label: "Mídia", icon: MediaIcon },
  { id: "text", label: "Texto", icon: TextIcon },
  { id: "audio", label: "Áudio", icon: AudioIcon },
  { id: "captions", label: "Legendas", icon: CaptionIcon },
  { id: "ai", label: "IA", icon: SparklesIcon },
];

export function Sidebar() {
  const [tab, setTab] = useState<TabId>("media");

  return (
    <aside className="flex h-full">
      {/* Coluna de abas (ícones) */}
      <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-panel py-3">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex w-14 flex-col items-center gap-1 rounded-md py-2 text-[10px] transition-colors ${
                active
                  ? "bg-elevated text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Painel de conteúdo da aba */}
      <div className="w-64 shrink-0 overflow-y-auto border-r border-border bg-panel p-3">
        {tab === "media" && <MediaPanel accept="video" />}
        {tab === "audio" && <MediaPanel accept="audio" />}
        {tab === "text" && <TextPanel />}
        {tab === "captions" && (
          <ComingSoon
            title="Legendas"
            description="Transcrição automática e legendas palavra por palavra chegam depois que o editor estiver sólido."
          />
        )}
        {tab === "ai" && (
          <ComingSoon
            title="Editor IA — em breve"
            description="Você poderá pedir cortes, Shorts e ajustes em linguagem natural. Primeiro construímos um editor confiável."
          />
        )}
      </div>
    </aside>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </h2>
  );
}

function MediaPanel({ accept }: { accept: "video" | "audio" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const assets = useEditorStore((s) => s.project.assets);
  const addAssetWithClip = useEditorStore((s) => s.addAssetWithClip);
  const removeAsset = useEditorStore((s) => s.removeAsset);

  const list = Object.values(assets).filter((a) =>
    accept === "audio" ? a.type === "audio" : a.type !== "audio",
  );

  const acceptAttr =
    accept === "audio" ? "audio/*" : "video/*,image/*";

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const check = validateMediaFile(file);
        if (!check.ok) {
          setError(check.error ?? "Arquivo inválido.");
          continue;
        }
        const asset = await createAssetFromFile(file);
        addAssetWithClip(asset);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao importar.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <PanelTitle>{accept === "audio" ? "Áudio" : "Mídia"}</PanelTitle>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-elevated/50 px-3 py-6 text-center text-sm text-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60"
      >
        <UploadIcon />
        <span>{busy ? "Importando…" : "Arraste ou selecione um arquivo"}</span>
        <span className="text-[11px] text-muted">
          {accept === "audio" ? "MP3, WAV, M4A" : "MP4, MOV, WebM, imagens"}
        </span>
      </button>

      {error && (
        <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {list.map((asset) => (
          <div
            key={asset.id}
            className="group flex items-center gap-3 rounded-md border border-border bg-elevated px-2 py-2"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-background text-accent">
              {asset.type === "audio" ? <AudioIcon size={16} /> : <MediaIcon size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-foreground/90">{asset.name}</p>
              <p className="text-[10px] text-muted">
                {asset.type === "image" ? "imagem" : formatTimecode(asset.duration)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeAsset(asset.id)}
              title="Remover mídia"
              aria-label={`Remover ${asset.name}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
            >
              <TrashIcon size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextPanel() {
  const addTextClip = useEditorStore((s) => s.addTextClip);
  return (
    <div>
      <PanelTitle>Texto</PanelTitle>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => addTextClip({ text: "Título", fontSize: 96, fontWeight: 800 })}
          className="w-full rounded-md border border-border bg-elevated px-3 py-3 text-left text-lg font-bold text-foreground transition-colors hover:border-accent"
        >
          Adicionar título
        </button>
        <button
          type="button"
          onClick={() => addTextClip({ text: "Texto", fontSize: 56, fontWeight: 500 })}
          className="w-full rounded-md border border-border bg-elevated px-3 py-3 text-left text-sm text-foreground transition-colors hover:border-accent"
        >
          Adicionar texto
        </button>
      </div>
    </div>
  );
}

function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <PanelTitle>{title}</PanelTitle>
      <div className="rounded-lg border border-border bg-elevated/50 p-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-background text-accent">
          <SparklesIcon />
        </div>
        <p className="text-xs leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}
