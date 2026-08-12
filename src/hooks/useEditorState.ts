'use client';

// Estado central do editor: clipes, legendas, seleção e histórico (undo/redo).

import { useCallback, useRef, useState } from 'react';
import type { Clip, Subtitle } from '@/lib/types';
import { uid } from '@/lib/format';

interface HistoryEntry {
  clips: Clip[];
  subtitles: Subtitle[];
}

export interface EditorState {
  clips: Clip[];
  subtitles: Subtitle[];
  selectedClipId: string | null;
  duration: number;
  canUndo: boolean;
  canRedo: boolean;

  init: (duration: number) => void;
  setClips: (clips: Clip[], label?: string) => void;
  setSubtitles: (subs: Subtitle[]) => void;
  selectClip: (id: string | null) => void;

  splitAt: (time: number) => void;
  deleteClip: (id: string) => void;
  moveClip: (id: string, direction: -1 | 1) => void;
  trimSelected: (edge: 'start' | 'end', time: number) => void;

  undo: () => void;
  redo: () => void;
  reset: () => void;
}

export function useEditorState(): EditorState {
  const [clips, setClipsRaw] = useState<Clip[]>([]);
  const [subtitles, setSubtitlesRaw] = useState<Subtitle[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const past = useRef<HistoryEntry[]>([]);
  const future = useRef<HistoryEntry[]>([]);
  const [, forceRender] = useState(0);

  const snapshot = useCallback(
    (): HistoryEntry => ({ clips, subtitles }),
    [clips, subtitles]
  );

  const commit = useCallback(
    (nextClips: Clip[], nextSubs: Subtitle[]) => {
      past.current.push(snapshot());
      if (past.current.length > 100) past.current.shift();
      future.current = [];
      setClipsRaw(nextClips);
      setSubtitlesRaw(nextSubs);
      forceRender((n) => n + 1);
    },
    [snapshot]
  );

  const init = useCallback((dur: number) => {
    const clip: Clip = { id: uid('clip'), start: 0, end: dur };
    past.current = [];
    future.current = [];
    setDuration(dur);
    setClipsRaw([clip]);
    setSubtitlesRaw([]);
    setSelectedClipId(clip.id);
  }, []);

  const setClips = useCallback(
    (next: Clip[]) => commit(next, subtitles),
    [commit, subtitles]
  );

  const setSubtitles = useCallback(
    (subs: Subtitle[]) => commit(clips, subs),
    [commit, clips]
  );

  const selectClip = useCallback((id: string | null) => setSelectedClipId(id), []);

  const splitAt = useCallback(
    (time: number) => {
      const idx = clips.findIndex((c) => time > c.start + 0.05 && time < c.end - 0.05);
      if (idx === -1) return;
      const c = clips[idx];
      const a: Clip = { id: uid('clip'), start: c.start, end: time };
      const b: Clip = { id: uid('clip'), start: time, end: c.end };
      const next = [...clips.slice(0, idx), a, b, ...clips.slice(idx + 1)];
      commit(next, subtitles);
      setSelectedClipId(b.id);
    },
    [clips, subtitles, commit]
  );

  const deleteClip = useCallback(
    (id: string) => {
      const next = clips.filter((c) => c.id !== id);
      commit(next, subtitles);
      if (selectedClipId === id) setSelectedClipId(next[0]?.id ?? null);
    },
    [clips, subtitles, commit, selectedClipId]
  );

  const moveClip = useCallback(
    (id: string, direction: -1 | 1) => {
      const idx = clips.findIndex((c) => c.id === id);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= clips.length) return;
      const next = [...clips];
      [next[idx], next[target]] = [next[target], next[idx]];
      commit(next, subtitles);
    },
    [clips, subtitles, commit]
  );

  const trimSelected = useCallback(
    (edge: 'start' | 'end', time: number) => {
      if (!selectedClipId) return;
      const next = clips.map((c) => {
        if (c.id !== selectedClipId) return c;
        if (edge === 'start') return { ...c, start: Math.min(Math.max(0, time), c.end - 0.1) };
        return { ...c, end: Math.max(Math.min(duration, time), c.start + 0.1) };
      });
      commit(next, subtitles);
    },
    [clips, subtitles, commit, selectedClipId, duration]
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(snapshot());
    setClipsRaw(prev.clips);
    setSubtitlesRaw(prev.subtitles);
    forceRender((n) => n + 1);
  }, [snapshot]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(snapshot());
    setClipsRaw(next.clips);
    setSubtitlesRaw(next.subtitles);
    forceRender((n) => n + 1);
  }, [snapshot]);

  const reset = useCallback(() => {
    past.current = [];
    future.current = [];
    setClipsRaw([]);
    setSubtitlesRaw([]);
    setSelectedClipId(null);
    setDuration(0);
  }, []);

  return {
    clips,
    subtitles,
    selectedClipId,
    duration,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    init,
    setClips,
    setSubtitles,
    selectClip,
    splitAt,
    deleteClip,
    moveClip,
    trimSelected,
    undo,
    redo,
    reset,
  };
}
