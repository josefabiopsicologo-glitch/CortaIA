/**
 * playback-store — estado TRANSITÓRIO de reprodução.
 *
 * Mantido separado do editor-store para que atualizações de alta frequência
 * (currentTime a cada frame) não entrem no histórico nem provoquem rerender
 * de toda a árvore do editor. Componentes assinam apenas os campos que usam.
 */

import { create } from "zustand";
import { clamp } from "@/lib/time";

export interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  /** Volume master do preview (0..1). */
  volume: number;
  muted: boolean;

  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  reset: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentTime: 0,
  isPlaying: false,
  volume: 1,
  muted: false,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  seek: (time) => set({ currentTime: Math.max(0, time) }),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setVolume: (volume) => set({ volume: clamp(volume, 0, 1) }),
  setMuted: (muted) => set({ muted }),
  reset: () => set({ currentTime: 0, isPlaying: false }),
}));
