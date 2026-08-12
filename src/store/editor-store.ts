/**
 * editor-store — estado PERSISTENTE do editor (projeto, seleção, histórico).
 *
 * Regras de arquitetura:
 *  - Estado transitório de playback (currentTime/isPlaying) fica em
 *    playback-store.ts, fora do histórico, para evitar rerenders a cada frame.
 *  - Toda mutação estrutural passa por `commit`, que registra o snapshot
 *    anterior em `past` (Undo/Redo). Seleção e histórico não entram no
 *    histórico de projeto.
 */

import { create } from "zustand";
import type {
  Asset,
  AspectRatio,
  Clip,
  MediaClip,
  Project,
  TextClip,
  Track,
} from "@/types";
import { canvasFromPreset, isMediaClip } from "@/types";
import {
  createEmptyProject,
  createMediaClipFromAsset,
  createTextClip,
  DEFAULT_TRACK_IDS,
} from "@/lib/factories";
import {
  clampStartWithinNeighbors,
  splitClip,
  trimMediaClip,
  type TrimInput,
} from "@/lib/clip-ops";
import { createId } from "@/lib/id";
import { clearAssetThumbnail } from "@/lib/thumbnails";

const HISTORY_LIMIT = 100;

/** Faixa padrão para um tipo de asset. */
function defaultTrackIdForAsset(asset: Asset): string {
  if (asset.type === "audio") return DEFAULT_TRACK_IDS.audio;
  return DEFAULT_TRACK_IDS.video;
}

function touch(project: Project): Project {
  return { ...project, updatedAt: Date.now() };
}

/** Revoga um Object URL de mídia com segurança (no-op fora do browser). */
function revokeSource(source: string | undefined): void {
  if (
    source &&
    source.startsWith("blob:") &&
    typeof URL !== "undefined" &&
    typeof URL.revokeObjectURL === "function"
  ) {
    URL.revokeObjectURL(source);
  }
}

export interface EditorState {
  project: Project;
  selectedClipId: string | null;
  past: Project[];
  future: Project[];

  // --- Projeto ---
  newProject: (name?: string, aspectRatio?: AspectRatio) => void;
  setProjectName: (name: string) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;

  // --- Assets ---
  addAsset: (asset: Asset) => void;
  /** Adiciona o asset e cria um clip correspondente na faixa apropriada. */
  addAssetWithClip: (asset: Asset) => string;
  /** Remove um asset, seus clips e revoga o Object URL da mídia. */
  removeAsset: (assetId: string) => void;

  // --- Clips ---
  addTextClip: (overrides?: Partial<TextClip>) => string;
  selectClip: (clipId: string | null) => void;
  removeClip: (clipId: string) => void;
  /** Duplica um clip logo após o original, na mesma faixa. Retorna o novo id. */
  duplicateClip: (clipId: string) => string | null;
  /** Desloca o clip na timeline por um delta em segundos (nunca negativo). */
  nudgeClip: (clipId: string, deltaSeconds: number) => void;
  moveClip: (clipId: string, timelineStart: number) => void;
  /** Move sem histórico durante um gesto, respeitando os vizinhos da faixa. */
  moveClipTransient: (clipId: string, timelineStart: number) => void;
  updateClip: (clipId: string, patch: Partial<MediaClip>) => void;
  updateTextClip: (clipId: string, patch: Partial<TextClip>) => void;
  splitClipAt: (clipId: string, atTime: number) => string | null;
  trimClip: (clipId: string, trim: TrimInput) => void;

  // --- Gestos (drag/resize) ---
  /** Registra um ponto de undo antes de um gesto contínuo (arrastar/redimensionar). */
  beginInteraction: () => void;
  /** Substitui um clip sem tocar no histórico (updates transitórios do gesto). */
  replaceClipTransient: (clip: Clip) => void;

  // --- Histórico ---
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // --- Derivados ---
  getSelectedClip: () => Clip | null;
  getTrackForClip: (clipId: string) => Track | null;
  getProjectDuration: () => number;
}

export const useEditorStore = create<EditorState>((set, get) => {
  /** Aplica uma mutação registrando o estado anterior no histórico. */
  function commit(mutator: (project: Project) => Project) {
    set((state) => {
      const next = touch(mutator(state.project));
      const past = [...state.past, state.project].slice(-HISTORY_LIMIT);
      return { project: next, past, future: [] };
    });
  }

  /** Fim do clip anterior e início do próximo, na ordem da faixa. */
  function neighborsFor(
    project: Project,
    clipId: string,
  ): { prevEnd: number; nextStart: number } {
    const track = project.tracks.find((t) => t.clipIds.includes(clipId));
    if (!track) return { prevEnd: 0, nextStart: Infinity };
    const idx = track.clipIds.indexOf(clipId);
    const prev = idx > 0 ? project.clips[track.clipIds[idx - 1]] : undefined;
    const next =
      idx < track.clipIds.length - 1
        ? project.clips[track.clipIds[idx + 1]]
        : undefined;
    return {
      prevEnd: prev ? prev.timelineStart + prev.duration : 0,
      nextStart: next ? next.timelineStart : Infinity,
    };
  }

  function clampedStart(
    project: Project,
    clipId: string,
    desiredStart: number,
  ): number {
    const clip = project.clips[clipId];
    if (!clip) return Math.max(0, desiredStart);
    const { prevEnd, nextStart } = neighborsFor(project, clipId);
    return clampStartWithinNeighbors(desiredStart, clip.duration, prevEnd, nextStart);
  }

  function addClipToTrack(project: Project, clip: Clip): Project {
    const tracks = project.tracks.map((t) =>
      t.id === clip.trackId ? { ...t, clipIds: [...t.clipIds, clip.id] } : t,
    );
    return {
      ...project,
      tracks,
      clips: { ...project.clips, [clip.id]: clip },
    };
  }

  return {
    project: createEmptyProject(),
    selectedClipId: null,
    past: [],
    future: [],

    newProject: (name, aspectRatio) => {
      for (const asset of Object.values(get().project.assets)) {
        revokeSource(asset.source);
      }
      set({
        project: createEmptyProject(name, aspectRatio),
        selectedClipId: null,
        past: [],
        future: [],
      });
    },

    setProjectName: (name) => commit((p) => ({ ...p, name })),

    setAspectRatio: (aspectRatio) =>
      commit((p) => ({
        ...p,
        canvas: canvasFromPreset(aspectRatio, p.canvas.backgroundColor),
      })),

    addAsset: (asset) =>
      commit((p) => ({ ...p, assets: { ...p.assets, [asset.id]: asset } })),

    addAssetWithClip: (asset) => {
      const trackId = defaultTrackIdForAsset(asset);
      const clip = createMediaClipFromAsset(asset, trackId);
      commit((p) => {
        const withAsset: Project = {
          ...p,
          assets: { ...p.assets, [asset.id]: asset },
        };
        return addClipToTrack(withAsset, clip);
      });
      set({ selectedClipId: clip.id });
      return clip.id;
    },

    removeAsset: (assetId) => {
      const asset = get().project.assets[assetId];
      commit((p) => {
        const assets = { ...p.assets };
        delete assets[assetId];
        const clips = { ...p.clips };
        const removedIds = new Set<string>();
        for (const clip of Object.values(p.clips)) {
          if (isMediaClip(clip) && clip.assetId === assetId) {
            delete clips[clip.id];
            removedIds.add(clip.id);
          }
        }
        const tracks = p.tracks.map((t) => ({
          ...t,
          clipIds: t.clipIds.filter((id) => !removedIds.has(id)),
        }));
        return { ...p, assets, clips, tracks };
      });
      revokeSource(asset?.source);
      clearAssetThumbnail(assetId);
      const sel = get().selectedClipId;
      if (sel && !get().project.clips[sel]) set({ selectedClipId: null });
    },

    addTextClip: (overrides) => {
      const clip = createTextClip(DEFAULT_TRACK_IDS.text, overrides);
      commit((p) => addClipToTrack(p, clip));
      set({ selectedClipId: clip.id });
      return clip.id;
    },

    selectClip: (clipId) => set({ selectedClipId: clipId }),

    removeClip: (clipId) => {
      commit((p) => {
        const clips = { ...p.clips };
        delete clips[clipId];
        const tracks = p.tracks.map((t) => ({
          ...t,
          clipIds: t.clipIds.filter((id) => id !== clipId),
        }));
        return { ...p, tracks, clips };
      });
      if (get().selectedClipId === clipId) set({ selectedClipId: null });
    },

    duplicateClip: (clipId) => {
      const original = get().project.clips[clipId];
      if (!original) return null;
      const newId = createId("clip");
      const copy: Clip = {
        ...original,
        id: newId,
        timelineStart: original.timelineStart + original.duration,
      };
      commit((p) => {
        const tracks = p.tracks.map((t) => {
          if (t.id !== original.trackId) return t;
          const idx = t.clipIds.indexOf(clipId);
          const clipIds = [...t.clipIds];
          clipIds.splice(idx + 1, 0, newId);
          return { ...t, clipIds };
        });
        return { ...p, tracks, clips: { ...p.clips, [newId]: copy } };
      });
      set({ selectedClipId: newId });
      return newId;
    },

    nudgeClip: (clipId, deltaSeconds) =>
      commit((p) => {
        const clip = p.clips[clipId];
        if (!clip) return p;
        const start = clampedStart(p, clipId, clip.timelineStart + deltaSeconds);
        return { ...p, clips: { ...p.clips, [clipId]: { ...clip, timelineStart: start } } };
      }),

    moveClip: (clipId, timelineStart) =>
      commit((p) => {
        const clip = p.clips[clipId];
        if (!clip) return p;
        const start = clampedStart(p, clipId, timelineStart);
        return { ...p, clips: { ...p.clips, [clipId]: { ...clip, timelineStart: start } } };
      }),

    moveClipTransient: (clipId, timelineStart) =>
      set((state) => {
        const clip = state.project.clips[clipId];
        if (!clip) return state;
        const start = clampedStart(state.project, clipId, timelineStart);
        return {
          project: {
            ...state.project,
            clips: { ...state.project.clips, [clipId]: { ...clip, timelineStart: start } },
          },
        };
      }),

    updateClip: (clipId, patch) =>
      commit((p) => {
        const clip = p.clips[clipId];
        if (!clip || !isMediaClip(clip)) return p;
        const next = { ...clip, ...patch } as MediaClip;
        return { ...p, clips: { ...p.clips, [clipId]: next } };
      }),

    updateTextClip: (clipId, patch) =>
      commit((p) => {
        const clip = p.clips[clipId];
        if (!clip || clip.type !== "text") return p;
        const next = { ...clip, ...patch } as TextClip;
        return { ...p, clips: { ...p.clips, [clipId]: next } };
      }),

    splitClipAt: (clipId, atTime) => {
      const clip = get().project.clips[clipId];
      if (!clip) return null;
      const newId = createId("clip");
      const result = splitClip(clip, atTime, newId);
      if (!result) return null;
      commit((p) => {
        const tracks = p.tracks.map((t) => {
          if (t.id !== clip.trackId) return t;
          const idx = t.clipIds.indexOf(clipId);
          const clipIds = [...t.clipIds];
          clipIds.splice(idx + 1, 0, newId);
          return { ...t, clipIds };
        });
        return {
          ...p,
          tracks,
          clips: { ...p.clips, [clipId]: result.left, [newId]: result.right },
        };
      });
      return newId;
    },

    trimClip: (clipId, trim) =>
      commit((p) => {
        const clip = p.clips[clipId];
        if (!clip || !isMediaClip(clip)) return p;
        const asset = p.assets[(clip as MediaClip).assetId];
        const assetDuration = asset?.duration ?? clip.sourceEnd;
        const next = trimMediaClip(clip, trim, assetDuration);
        return { ...p, clips: { ...p.clips, [clipId]: next } };
      }),

    beginInteraction: () =>
      set((state) => ({
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future: [],
      })),

    replaceClipTransient: (clip) =>
      set((state) => ({
        project: {
          ...state.project,
          clips: { ...state.project.clips, [clip.id]: clip },
        },
      })),

    undo: () =>
      set((state) => {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        return {
          project: previous,
          past: state.past.slice(0, -1),
          future: [state.project, ...state.future].slice(0, HISTORY_LIMIT),
        };
      }),

    redo: () =>
      set((state) => {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        return {
          project: next,
          past: [...state.past, state.project].slice(-HISTORY_LIMIT),
          future: state.future.slice(1),
        };
      }),

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    getSelectedClip: () => {
      const { project, selectedClipId } = get();
      return selectedClipId ? (project.clips[selectedClipId] ?? null) : null;
    },

    getTrackForClip: (clipId) => {
      const { project } = get();
      return project.tracks.find((t) => t.clipIds.includes(clipId)) ?? null;
    },

    getProjectDuration: () => {
      const { project } = get();
      let max = 0;
      for (const clip of Object.values(project.clips)) {
        max = Math.max(max, clip.timelineStart + clip.duration);
      }
      return max;
    },
  };
});
