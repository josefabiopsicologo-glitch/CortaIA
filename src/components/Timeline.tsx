'use client';

import { useRef } from 'react';
import type { Clip, Subtitle } from '@/lib/types';
import { formatTime } from '@/lib/format';

interface Props {
  duration: number;
  clips: Clip[];
  subtitles: Subtitle[];
  currentTime: number;
  selectedClipId: string | null;
  onSeek: (sourceTime: number) => void;
  onSelectClip: (id: string) => void;
}

export default function Timeline({
  duration,
  clips,
  subtitles,
  currentTime,
  selectedClipId,
  onSeek,
  onSelectClip,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  // Marcas de tempo na régua (a cada ~1/8 da duração).
  const ticks = Array.from({ length: 9 }, (_, i) => (duration * i) / 8);

  return (
    <div className="select-none">
      {/* Régua */}
      <div className="relative mb-1 h-4 text-[10px] text-neutral-500">
        {ticks.map((t, i) => (
          <span key={i} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>
            {formatTime(t)}
          </span>
        ))}
      </div>

      {/* Pista de clipes */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-16 w-full cursor-pointer rounded-lg bg-neutral-900 ring-1 ring-neutral-800"
      >
        {clips.map((c) => {
          const selected = c.id === selectedClipId;
          return (
            <div
              key={c.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectClip(c.id);
              }}
              title={`${formatTime(c.start)} – ${formatTime(c.end)}`}
              className={`absolute top-1 bottom-1 flex items-center justify-center overflow-hidden rounded-md text-xs font-medium transition
                ${selected ? 'bg-brand ring-2 ring-white/70' : 'bg-brand/70 hover:bg-brand'}`}
              style={{ left: `${pct(c.start)}%`, width: `${Math.max(0.5, pct(c.end - c.start))}%` }}
            >
              <span className="truncate px-1 text-white/90">{formatTime(c.end - c.start)}</span>
            </div>
          );
        })}

        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{ left: `${pct(currentTime)}%` }}
        >
          <div className="absolute -top-1 -left-[3px] h-2 w-2 rounded-full bg-red-500" />
        </div>
      </div>

      {/* Pista de legendas */}
      <div className="relative mt-2 h-6 w-full rounded-lg bg-neutral-900/60 ring-1 ring-neutral-800">
        {subtitles.map((s) => (
          <div
            key={s.id}
            title={s.text}
            className="absolute top-1 bottom-1 overflow-hidden rounded bg-emerald-600/70 px-1 text-[10px] leading-4 text-white"
            style={{ left: `${pct(s.start)}%`, width: `${Math.max(0.4, pct(s.end - s.start))}%` }}
          >
            <span className="truncate">{s.text}</span>
          </div>
        ))}
        {!subtitles.length && (
          <span className="absolute inset-0 flex items-center pl-2 text-[10px] text-neutral-600">
            Legendas aparecerão aqui
          </span>
        )}
      </div>
    </div>
  );
}
