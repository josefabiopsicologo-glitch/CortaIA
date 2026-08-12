'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Clip, Subtitle } from '@/lib/types';

export interface PlayerHandle {
  seek: (sourceTime: number) => void;
  play: () => void;
  pause: () => void;
}

interface Props {
  src: string;
  clips: Clip[];
  subtitles: Subtitle[];
  /** reporta o tempo atual no vídeo de origem */
  onTime?: (sourceTime: number) => void;
  onPlayState?: (playing: boolean) => void;
}

/**
 * Player que reproduz a timeline: toca os clipes em ordem, pulando os trechos
 * cortados. Sobrepõe a legenda ativa.
 */
const VideoPlayer = forwardRef<PlayerHandle, Props>(function VideoPlayer(
  { src, clips, subtitles, onTime, onPlayState },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clipsRef = useRef<Clip[]>(clips);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  useImperativeHandle(ref, () => ({
    seek: (t: number) => {
      if (videoRef.current) videoRef.current.currentTime = t;
    },
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
  }));

  // Encontra o clipe que contém um tempo de origem, ou o próximo clipe adiante.
  const findClipAt = (t: number): { index: number; inside: boolean } => {
    const cs = clipsRef.current;
    for (let i = 0; i < cs.length; i++) {
      if (t >= cs[i].start && t < cs[i].end) return { index: i, inside: true };
      if (t < cs[i].start) return { index: i, inside: false };
    }
    return { index: cs.length - 1, inside: false };
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const cs = clipsRef.current;
    const { index, inside } = findClipAt(t);

    if (!inside && cs.length) {
      // Está num trecho cortado: pula para o início do próximo clipe.
      const next = cs[index];
      if (next && t < next.start) {
        v.currentTime = next.start;
      } else if (index >= cs.length - 1 && t >= cs[cs.length - 1].end) {
        v.pause();
      }
    }

    onTime?.(t);

    const active = subtitles.find((s) => t >= s.start && t <= s.end);
    setCaption(active?.text ?? '');
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        src={src}
        className="mx-auto max-h-[52vh] w-auto"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => onPlayState?.(true)}
        onPause={() => onPlayState?.(false)}
        controls={false}
        playsInline
      />
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6">
          <span className="max-w-[85%] rounded bg-black/70 px-3 py-1.5 text-center text-lg font-medium leading-snug text-white">
            {caption}
          </span>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
