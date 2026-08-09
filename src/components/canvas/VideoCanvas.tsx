"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import { usePlaybackStore } from "@/store/playback-store";
import type { MediaClip, TextClip } from "@/types";
import { isTextClip } from "@/types";
import { MediaIcon } from "@/components/ui/icons";

/** Retorna o primeiro clip de vídeo da faixa de vídeo (preview primário). */
function usePrimaryVideoClip(): MediaClip | null {
  return useEditorStore((s) => {
    const track = s.project.tracks.find((t) => t.type === "video");
    if (!track) return null;
    for (const id of track.clipIds) {
      const clip = s.project.clips[id];
      if (clip && clip.type === "video") return clip;
    }
    return null;
  });
}

export function VideoCanvas() {
  const canvas = useEditorStore((s) => s.project.canvas);
  const primary = usePrimaryVideoClip();
  const asset = useEditorStore((s) =>
    primary ? s.project.assets[primary.assetId] : undefined,
  );

  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Fator de escala: pixels reais do box / resolução lógica do canvas.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientHeight / canvas.height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvas.height]);

  const hasContent = Boolean(primary && asset);

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-6">
      <div
        ref={boxRef}
        className="relative overflow-hidden rounded-lg shadow-2xl ring-1 ring-border"
        style={{
          aspectRatio: `${canvas.width} / ${canvas.height}`,
          height: "100%",
          maxWidth: "100%",
          backgroundColor: canvas.backgroundColor,
        }}
      >
        {hasContent ? (
          <VideoPreview clip={primary!} src={asset!.source} />
        ) : (
          <EmptyCanvas />
        )}
        <TextOverlays scale={scale} />
      </div>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-elevated text-muted">
        <MediaIcon size={26} />
      </div>
      <p className="px-6 text-sm text-muted">Importe um vídeo para começar.</p>
    </div>
  );
}

/**
 * Preview de um único clip de vídeo (fase inicial).
 * A composição multi-clip / multi-track completa é feita na exportação (FASE 11).
 */
function VideoPreview({ clip, src }: { clip: MediaClip; src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const volume = usePlaybackStore((s) => s.volume);
  const muted = usePlaybackStore((s) => s.muted);
  const seekTarget = usePlaybackStore((s) => s.currentTime);
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime);
  const pause = usePlaybackStore((s) => s.pause);

  const rafRef = useRef<number | null>(null);
  // Evita loop de feedback entre seek (store) e timeupdate (vídeo).
  const isScrubbingFromStore = useRef(false);

  const toSource = useMemo(
    () => (timelineTime: number) =>
      clip.sourceStart + (timelineTime - clip.timelineStart),
    [clip.sourceStart, clip.timelineStart],
  );

  // Volume / mute
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.volume = volume;
      v.muted = muted;
    }
  }, [volume, muted]);

  // Play / Pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      void v.play().catch(() => pause());
    } else {
      v.pause();
    }
  }, [isPlaying, pause]);

  // Seek vindo da store (clique na timeline/regua) quando NÃO tocando.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isPlaying) return;
    const target = toSource(seekTarget);
    if (Math.abs(v.currentTime - target) > 0.05) {
      isScrubbingFromStore.current = true;
      v.currentTime = Math.max(0, target);
    }
  }, [seekTarget, isPlaying, toSource]);

  // Loop de sincronização: vídeo -> store enquanto toca.
  useEffect(() => {
    if (!isPlaying) return;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        const timelineTime =
          clip.timelineStart + (v.currentTime - clip.sourceStart);
        setCurrentTime(timelineTime);
        if (v.currentTime >= clip.sourceEnd) {
          v.pause();
          pause();
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, clip.timelineStart, clip.sourceStart, clip.sourceEnd, setCurrentTime, pause]);

  return (
    <video
      ref={videoRef}
      src={src}
      className="h-full w-full object-contain"
      playsInline
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = clip.sourceStart;
      }}
    />
  );
}

function TextOverlays({ scale }: { scale: number }) {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const clips = useEditorStore((s) => s.project.clips);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectClip = useEditorStore((s) => s.selectClip);

  const active = Object.values(clips).filter(
    (c): c is TextClip =>
      isTextClip(c) &&
      c.enabled &&
      currentTime >= c.timelineStart &&
      currentTime < c.timelineStart + c.duration,
  );

  return (
    <>
      {active.map((clip) => (
        <button
          key={clip.id}
          type="button"
          onClick={() => selectClip(clip.id)}
          className={`absolute cursor-pointer whitespace-pre-wrap px-2 ${
            selectedClipId === clip.id ? "ring-2 ring-accent" : ""
          }`}
          style={{
            left: `${clip.position.x * 100}%`,
            top: `${clip.position.y * 100}%`,
            transform: `translate(-50%, -50%) rotate(${clip.rotation}deg)`,
            fontFamily: clip.fontFamily,
            fontSize: clip.fontSize * scale,
            fontWeight: clip.fontWeight,
            color: clip.color,
            backgroundColor: clip.backgroundColor,
            textAlign: clip.align,
            opacity: clip.opacity,
            maxWidth: "90%",
          }}
        >
          {clip.text}
        </button>
      ))}
    </>
  );
}
