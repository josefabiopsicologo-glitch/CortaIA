"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import { usePlaybackStore } from "@/store/playback-store";
import type { Asset, Clip, MediaClip, Track } from "@/types";
import { isMediaClip } from "@/types";
import {
  clipTimelineEnd,
  resizeTextClip,
  snapTime,
  trimMediaClip,
} from "@/lib/clip-ops";
import { pixelsToTime, timeToPixels, formatTimecode } from "@/lib/time";
import { SplitIcon, TrashIcon } from "@/components/ui/icons";

const LABEL_WIDTH = 96;
const TRACK_HEIGHT = 56;
const RULER_HEIGHT = 28;
const MIN_TIMELINE_SECONDS = 12;
const SNAP_PIXELS = 8;
const DRAG_THRESHOLD_PX = 3;

export function Timeline() {
  const [pps, setPps] = useState(48);
  const contentRef = useRef<HTMLDivElement>(null);

  const tracks = useEditorStore((s) => s.project.tracks);
  const clips = useEditorStore((s) => s.project.clips);
  const assets = useEditorStore((s) => s.project.assets);
  const selectedId = useEditorStore((s) => s.selectedClipId);
  const selectClip = useEditorStore((s) => s.selectClip);
  const splitClipAt = useEditorStore((s) => s.splitClipAt);
  const removeClip = useEditorStore((s) => s.removeClip);
  const duration = useEditorStore((s) => {
    let max = 0;
    for (const c of Object.values(s.project.clips)) {
      max = Math.max(max, c.timelineStart + c.duration);
    }
    return max;
  });

  const currentTime = usePlaybackStore((s) => s.currentTime);
  const seek = usePlaybackStore((s) => s.seek);

  const totalSeconds = Math.max(duration + 4, MIN_TIMELINE_SECONDS);
  const contentWidth = timeToPixels(totalSeconds, pps);

  function handleScrub(e: React.PointerEvent<HTMLDivElement>) {
    const el = contentRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft;
    seek(Math.max(0, pixelsToTime(x, pps)));
  }

  function handleSplit() {
    if (selectedId) splitClipAt(selectedId, currentTime);
  }

  return (
    <div className="flex h-full flex-col bg-panel">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <button
          type="button"
          onClick={handleSplit}
          disabled={!selectedId}
          title="Dividir no playhead (S)"
          className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 text-xs text-foreground/90 transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SplitIcon size={14} /> Dividir
        </button>
        <button
          type="button"
          onClick={() => selectedId && removeClip(selectedId)}
          disabled={!selectedId}
          title="Excluir (Delete)"
          className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 text-xs text-foreground/90 transition-colors hover:border-red-400/60 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <TrashIcon size={14} /> Excluir
        </button>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted">
          <span>Zoom</span>
          <input
            type="range"
            min={12}
            max={160}
            step={4}
            value={pps}
            onChange={(e) => setPps(Number(e.target.value))}
            className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-border accent-accent"
          />
        </div>
      </div>

      {/* Corpo: rótulos fixos + área rolável */}
      <div className="flex min-h-0 flex-1">
        <div
          className="shrink-0 border-r border-border bg-panel"
          style={{ width: LABEL_WIDTH }}
        >
          <div style={{ height: RULER_HEIGHT }} className="border-b border-border" />
          {tracks.map((t) => (
            <div
              key={t.id}
              style={{ height: TRACK_HEIGHT }}
              className="flex items-center border-b border-border px-3 text-xs font-medium text-muted"
            >
              {t.name}
            </div>
          ))}
        </div>

        <div ref={contentRef} className="relative min-w-0 flex-1 overflow-x-auto">
          <div style={{ width: contentWidth, minWidth: "100%" }}>
            <Ruler totalSeconds={totalSeconds} pps={pps} onScrub={handleScrub} />

            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                clips={clips}
                assets={assets}
                pps={pps}
                selectedId={selectedId}
                currentTime={currentTime}
                onSelectClip={selectClip}
                onScrub={handleScrub}
              />
            ))}
          </div>

          <div
            className="pointer-events-none absolute top-0 z-10 w-px bg-accent"
            style={{
              left: timeToPixels(currentTime, pps),
              height: RULER_HEIGHT + tracks.length * TRACK_HEIGHT,
            }}
          >
            <div className="absolute -left-1.5 -top-0.5 h-3 w-3 rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Ruler({
  totalSeconds,
  pps,
  onScrub,
}: {
  totalSeconds: number;
  pps: number;
  onScrub: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const step = pps < 24 ? 5 : pps < 60 ? 2 : 1;
  const marks: number[] = [];
  for (let s = 0; s <= totalSeconds; s += step) marks.push(s);

  return (
    <div
      onPointerDown={onScrub}
      className="relative cursor-pointer border-b border-border bg-elevated/40"
      style={{ height: RULER_HEIGHT }}
    >
      {marks.map((s) => (
        <div
          key={s}
          className="absolute top-0 flex h-full flex-col justify-between"
          style={{ left: timeToPixels(s, pps) }}
        >
          <span className="pl-1 text-[10px] leading-none text-muted">
            {formatTimecode(s)}
          </span>
          <div className="h-1.5 w-px bg-border" />
        </div>
      ))}
    </div>
  );
}

const CLIP_STYLES: Record<
  Track["type"],
  { bg: string; border: string; text: string }
> = {
  video: { bg: "bg-accent-muted/40", border: "border-accent/60", text: "text-foreground" },
  audio: { bg: "bg-emerald-600/30", border: "border-emerald-500/60", text: "text-emerald-100" },
  text: { bg: "bg-violet-600/30", border: "border-violet-500/60", text: "text-violet-100" },
};

function TrackRow({
  track,
  clips,
  assets,
  pps,
  selectedId,
  currentTime,
  onSelectClip,
  onScrub,
}: {
  track: Track;
  clips: Record<string, Clip>;
  assets: Record<string, Asset>;
  pps: number;
  selectedId: string | null;
  currentTime: number;
  onSelectClip: (id: string) => void;
  onScrub: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const style = CLIP_STYLES[track.type];

  // Alvos de snap: início do projeto, playhead e bordas de todos os clips.
  const snapTargets = [0, currentTime];
  for (const c of Object.values(clips)) {
    snapTargets.push(c.timelineStart, clipTimelineEnd(c));
  }

  return (
    <div
      onPointerDown={onScrub}
      className="relative border-b border-border"
      style={{ height: TRACK_HEIGHT }}
    >
      {track.clipIds.map((id) => {
        const clip = clips[id];
        if (!clip) return null;
        return (
          <TimelineClip
            key={id}
            clip={clip}
            asset={isMediaClip(clip) ? assets[clip.assetId] : undefined}
            pps={pps}
            selected={selectedId === id}
            style={style}
            snapTargets={snapTargets}
            onSelect={onSelectClip}
          />
        );
      })}
    </div>
  );
}

type DragMode = "move" | "trim-start" | "trim-end";
interface DragState {
  mode: DragMode;
  startX: number;
  original: Clip;
  started: boolean;
}

function TimelineClip({
  clip,
  asset,
  pps,
  selected,
  style,
  snapTargets,
  onSelect,
}: {
  clip: Clip;
  asset?: Asset;
  pps: number;
  selected: boolean;
  style: { bg: string; border: string; text: string };
  snapTargets: number[];
  onSelect: (id: string) => void;
}) {
  const beginInteraction = useEditorStore((s) => s.beginInteraction);
  const replaceClipTransient = useEditorStore((s) => s.replaceClipTransient);
  const moveClipTransient = useEditorStore((s) => s.moveClipTransient);
  const drag = useRef<DragState | null>(null);

  const label = clip.type === "text" && "text" in clip ? clip.text : clip.type;
  const snapThreshold = SNAP_PIXELS / pps;
  const assetDuration = asset?.duration ?? (isMediaClip(clip) ? clip.sourceEnd : 0);

  function start(mode: DragMode, e: React.PointerEvent<HTMLElement>) {
    e.stopPropagation();
    e.preventDefault();
    onSelect(clip.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      mode,
      startX: e.clientX,
      original: useEditorStore.getState().project.clips[clip.id] ?? clip,
      started: false,
    };
  }

  function move(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const dxPx = e.clientX - d.startX;
    if (!d.started) {
      if (Math.abs(dxPx) < DRAG_THRESHOLD_PX) return;
      d.started = true;
      beginInteraction(); // um único ponto de undo por gesto
    }
    const dt = pixelsToTime(dxPx, pps);
    const original = d.original;

    if (d.mode === "move") {
      const desired = original.timelineStart + dt;
      const snappedStart = snapTime(desired, snapTargets, snapThreshold);
      // Também tenta grudar a borda direita.
      const endDesired = snappedStart + original.duration;
      const snappedEnd = snapTime(endDesired, snapTargets, snapThreshold);
      const finalStart =
        snappedEnd !== endDesired ? snappedEnd - original.duration : snappedStart;
      moveClipTransient(clip.id, finalStart);
      return;
    }

    if (d.mode === "trim-start") {
      const desiredEdge = original.timelineStart + dt;
      const edge = snapTime(desiredEdge, snapTargets, snapThreshold);
      const delta = edge - original.timelineStart;
      const next = isMediaClip(original)
        ? trimMediaClip(
            original as MediaClip,
            { sourceStart: (original as MediaClip).sourceStart + delta },
            assetDuration,
          )
        : resizeTextClip(original, { startDelta: delta });
      replaceClipTransient(next);
      return;
    }

    // trim-end
    const desiredEdge = clipTimelineEnd(original) + dt;
    const edge = snapTime(desiredEdge, snapTargets, snapThreshold);
    const delta = edge - clipTimelineEnd(original);
    const next = isMediaClip(original)
      ? trimMediaClip(
          original as MediaClip,
          { sourceEnd: (original as MediaClip).sourceEnd + delta },
          assetDuration,
        )
      : resizeTextClip(original, { endDelta: delta });
    replaceClipTransient(next);
  }

  function end(e: React.PointerEvent<HTMLElement>) {
    if (drag.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
    drag.current = null;
  }

  const left = timeToPixels(clip.timelineStart, pps);
  const width = Math.max(timeToPixels(clip.duration, pps), 10);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Clip ${label}`}
      onPointerDown={(e) => start("move", e)}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      className={`group absolute top-1.5 flex h-[calc(100%-12px)] cursor-grab touch-none items-center overflow-hidden rounded-md border px-2 text-left text-[11px] active:cursor-grabbing ${style.bg} ${style.text} ${
        selected ? "border-accent ring-2 ring-accent" : style.border
      }`}
      style={{ left, width }}
    >
      {/* Handle esquerdo */}
      <span
        onPointerDown={(e) => start("trim-start", e)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="absolute left-0 top-0 h-full w-2 cursor-col-resize bg-black/20 opacity-0 transition-opacity group-hover:opacity-100"
      />
      <span className="pointer-events-none truncate">{label}</span>
      {/* Handle direito */}
      <span
        onPointerDown={(e) => start("trim-end", e)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-black/20 opacity-0 transition-opacity group-hover:opacity-100"
      />
    </div>
  );
}
