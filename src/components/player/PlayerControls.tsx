"use client";

import { useEditorStore } from "@/store/editor-store";
import { usePlaybackStore } from "@/store/playback-store";
import { formatTimecode } from "@/lib/time";
import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  VolumeIcon,
} from "@/components/ui/icons";

export function PlayerControls() {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const volume = usePlaybackStore((s) => s.volume);
  const toggle = usePlaybackStore((s) => s.toggle);
  const seek = usePlaybackStore((s) => s.seek);
  const setVolume = usePlaybackStore((s) => s.setVolume);

  const duration = useEditorStore((s) => {
    let max = 0;
    for (const c of Object.values(s.project.clips)) {
      max = Math.max(max, c.timelineStart + c.duration);
    }
    return max;
  });

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) * 100 : 0;

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-t border-border bg-panel px-4">
      <button
        type="button"
        onClick={() => seek(0)}
        title="Voltar ao início"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:text-foreground"
      >
        <SkipBackIcon size={16} />
      </button>

      <button
        type="button"
        onClick={toggle}
        title="Play/Pause (Espaço)"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-background transition-colors hover:bg-accent-hover"
      >
        {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
      </button>

      <span className="w-24 shrink-0 font-mono text-xs text-muted">
        {formatTimecode(currentTime, true)} / {formatTimecode(duration, true)}
      </span>

      <input
        type="range"
        aria-label="Progresso"
        min={0}
        max={Math.max(duration, 0.01)}
        step={0.01}
        value={Math.min(currentTime, duration)}
        onChange={(e) => seek(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-accent"
        style={{
          background: `linear-gradient(to right, var(--accent) ${progress}%, var(--border) ${progress}%)`,
        }}
      />

      <div className="flex items-center gap-2">
        <VolumeIcon size={16} className="text-muted" />
        <input
          type="range"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-border accent-accent"
        />
      </div>
    </div>
  );
}
