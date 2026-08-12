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
import { splitClip, trimMediaClip, type TrimInput } from "@/lib/clip-ops";
import { createId } from "@/lib/id";

const HISTORY_LIMIT = 100;

/** Faixa padrão para um tipo de asset. */
function defaultTrackIdForAsset(asset: Asset): string {
  if (asset.type === "audio") return DEFAULT_TRACK_IDS.audio;
  return DEFAULT_TRACK_IDS.video;
}

function touch(project: Project): Project {
  return { ...project, updatedAt: Date.now() };
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

  // --- Clips ---
  addTextClip: (overrides?: Partial<TextClip>) => string;
  selectClip: (clipId: string | null) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, timelineStart: number) => void;
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

    newProject: (name, aspectRatio) =>
      set({
        project: createEmptyProject(name, aspectRatio),
        selectedClipId: null,
        past: [],
        future: [],
      }),

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

    moveClip: (clipId, timelineStart) =>
      commit((p) => {
        const clip = p.clips[clipId];
        if (!clip) return p;
        const next = { ...clip, timelineStart: Math.max(0, timelineStart) };
        return { ...p, clips: { ...p.clips, [clipId]: next } };
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
