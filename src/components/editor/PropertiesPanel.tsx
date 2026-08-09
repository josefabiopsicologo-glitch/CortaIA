"use client";

import { useEditorStore } from "@/store/editor-store";
import type { MediaClip, TextAlign, TextClip } from "@/types";
import { isTextClip } from "@/types";
import { TrashIcon } from "@/components/ui/icons";

export function PropertiesPanel() {
  const selectedId = useEditorStore((s) => s.selectedClipId);
  const clip = useEditorStore((s) =>
    selectedId ? (s.project.clips[selectedId] ?? null) : null,
  );
  const removeClip = useEditorStore((s) => s.removeClip);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-panel">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Propriedades
        </h2>
        {clip && (
          <button
            type="button"
            onClick={() => removeClip(clip.id)}
            title="Excluir (Delete)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-red-400"
          >
            <TrashIcon size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!clip && (
          <p className="mt-6 text-center text-xs text-muted">
            Selecione um clip na timeline ou no canvas para editar suas
            propriedades.
          </p>
        )}
        {clip && isTextClip(clip) && <TextProps clip={clip} />}
        {clip && !isTextClip(clip) && <MediaProps clip={clip} />}
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-accent"
      />
      <span className="w-10 shrink-0 text-right font-mono text-[11px] text-foreground/80">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-elevated px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-accent";

function MediaProps({ clip }: { clip: MediaClip }) {
  const update = useEditorStore((s) => s.updateClip);
  const set = (patch: Partial<MediaClip>) => update(clip.id, patch);

  return (
    <div>
      <SectionTitle>Transformação</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Posição X">
          <input
            type="number"
            className={inputCls}
            value={clip.position.x}
            onChange={(e) =>
              set({ position: { ...clip.position, x: Number(e.target.value) } })
            }
          />
        </Field>
        <Field label="Posição Y">
          <input
            type="number"
            className={inputCls}
            value={clip.position.y}
            onChange={(e) =>
              set({ position: { ...clip.position, y: Number(e.target.value) } })
            }
          />
        </Field>
      </div>
      <Field label="Escala">
        <Slider value={clip.scale} min={0.1} max={3} step={0.05} onChange={(v) => set({ scale: v })} />
      </Field>
      <Field label="Rotação (°)">
        <Slider value={clip.rotation} min={-180} max={180} step={1} onChange={(v) => set({ rotation: v })} />
      </Field>
      <Field label="Opacidade">
        <Slider value={clip.opacity} min={0} max={1} step={0.01} onChange={(v) => set({ opacity: v })} />
      </Field>

      {clip.type !== "image" && (
        <>
          <SectionTitle>Áudio</SectionTitle>
          <Field label="Volume">
            <Slider value={clip.volume} min={0} max={1} step={0.01} onChange={(v) => set({ volume: v })} />
          </Field>
        </>
      )}
    </div>
  );
}

function TextProps({ clip }: { clip: TextClip }) {
  const update = useEditorStore((s) => s.updateTextClip);
  const set = (patch: Partial<TextClip>) => update(clip.id, patch);
  const aligns: TextAlign[] = ["left", "center", "right"];

  return (
    <div>
      <SectionTitle>Conteúdo</SectionTitle>
      <Field label="Texto">
        <textarea
          className={`${inputCls} min-h-[64px] resize-y`}
          value={clip.text}
          onChange={(e) => set({ text: e.target.value })}
        />
      </Field>

      <SectionTitle>Estilo</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tamanho">
          <input
            type="number"
            className={inputCls}
            value={clip.fontSize}
            onChange={(e) => set({ fontSize: Number(e.target.value) })}
          />
        </Field>
        <Field label="Peso">
          <select
            className={inputCls}
            value={clip.fontWeight}
            onChange={(e) => set({ fontWeight: Number(e.target.value) })}
          >
            {[400, 500, 600, 700, 800, 900].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Cor">
          <input
            type="color"
            className="h-8 w-full cursor-pointer rounded-md border border-border bg-elevated"
            value={clip.color}
            onChange={(e) => set({ color: e.target.value })}
          />
        </Field>
        <Field label="Alinhamento">
          <div className="flex overflow-hidden rounded-md border border-border">
            {aligns.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => set({ align: a })}
                className={`flex-1 py-1.5 text-[11px] capitalize transition-colors ${
                  clip.align === a
                    ? "bg-accent text-background"
                    : "bg-elevated text-muted hover:text-foreground"
                }`}
              >
                {a === "left" ? "Esq." : a === "center" ? "Centro" : "Dir."}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Opacidade">
        <Slider value={clip.opacity} min={0} max={1} step={0.01} onChange={(v) => set({ opacity: v })} />
      </Field>
      <Field label="Rotação (°)">
        <Slider value={clip.rotation} min={-180} max={180} step={1} onChange={(v) => set({ rotation: v })} />
      </Field>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted first:mt-0">
      {children}
    </h3>
  );
}
