import { beforeEach, describe, expect, it } from "vitest";
import type { Asset } from "@/types";
import { useEditorStore } from "./editor-store";
import { DEFAULT_TRACK_IDS } from "@/lib/factories";

const videoAsset: Asset = {
  id: "asset_v",
  type: "video",
  name: "clip.mp4",
  source: "blob:fake",
  duration: 60,
  width: 1920,
  height: 1080,
  mimeType: "video/mp4",
  fileSize: 1000,
};

function reset() {
  useEditorStore.getState().newProject("Teste", "9:16");
}

describe("editor-store", () => {
  beforeEach(reset);

  it("começa com projeto vazio e três faixas", () => {
    const { project } = useEditorStore.getState();
    expect(project.tracks).toHaveLength(3);
    expect(Object.keys(project.clips)).toHaveLength(0);
  });

  it("adiciona asset + clip na faixa de vídeo e seleciona", () => {
    const clipId = useEditorStore.getState().addAssetWithClip(videoAsset);
    const s = useEditorStore.getState();
    expect(s.project.assets[videoAsset.id]).toBeDefined();
    expect(s.project.clips[clipId]).toBeDefined();
    expect(s.selectedClipId).toBe(clipId);
    const videoTrack = s.project.tracks.find((t) => t.id === DEFAULT_TRACK_IDS.video)!;
    expect(videoTrack.clipIds).toContain(clipId);
  });

  it("divide um clip em dois na timeline", () => {
    const clipId = useEditorStore.getState().addAssetWithClip(videoAsset);
    const newId = useEditorStore.getState().splitClipAt(clipId, 25);
    expect(newId).not.toBeNull();
    const s = useEditorStore.getState();
    expect(s.project.clips[clipId].duration).toBe(25);
    expect(s.project.clips[newId!].timelineStart).toBe(25);
    const track = s.project.tracks.find((t) => t.id === DEFAULT_TRACK_IDS.video)!;
    // A parte direita fica imediatamente após a esquerda.
    expect(track.clipIds).toEqual([clipId, newId]);
  });

  it("não divide fora dos limites do clip", () => {
    const clipId = useEditorStore.getState().addAssetWithClip(videoAsset);
    expect(useEditorStore.getState().splitClipAt(clipId, 999)).toBeNull();
  });

  it("remove clip e limpa a seleção", () => {
    const clipId = useEditorStore.getState().addAssetWithClip(videoAsset);
    useEditorStore.getState().removeClip(clipId);
    const s = useEditorStore.getState();
    expect(s.project.clips[clipId]).toBeUndefined();
    expect(s.selectedClipId).toBeNull();
    const track = s.project.tracks.find((t) => t.id === DEFAULT_TRACK_IDS.video)!;
    expect(track.clipIds).not.toContain(clipId);
  });

  it("adiciona texto na faixa de texto", () => {
    const id = useEditorStore.getState().addTextClip({ text: "Título" });
    const s = useEditorStore.getState();
    expect(s.project.clips[id].type).toBe("text");
    const track = s.project.tracks.find((t) => t.id === DEFAULT_TRACK_IDS.text)!;
    expect(track.clipIds).toContain(id);
  });

  it("faz undo e redo de uma operação", () => {
    const store = useEditorStore.getState();
    const clipId = store.addAssetWithClip(videoAsset);
    expect(Object.keys(useEditorStore.getState().project.clips)).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(Object.keys(useEditorStore.getState().project.clips)).toHaveLength(0);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().project.clips[clipId]).toBeDefined();
  });

  it("undo encadeado (asset+clip -> split)", () => {
    const clipId = useEditorStore.getState().addAssetWithClip(videoAsset);
    useEditorStore.getState().splitClipAt(clipId, 30);
    expect(Object.keys(useEditorStore.getState().project.clips)).toHaveLength(2);

    useEditorStore.getState().undo(); // desfaz split
    expect(Object.keys(useEditorStore.getState().project.clips)).toHaveLength(1);

    useEditorStore.getState().undo(); // desfaz add
    expect(Object.keys(useEditorStore.getState().project.clips)).toHaveLength(0);
  });

  it("uma nova ação limpa o 'future'", () => {
    useEditorStore.getState().addAssetWithClip(videoAsset);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().canRedo()).toBe(true);
    useEditorStore.getState().addTextClip();
    expect(useEditorStore.getState().canRedo()).toBe(false);
  });

  it("duplica um clip logo após o original, na mesma faixa", () => {
    const clipId = useEditorStore.getState().addAssetWithClip(videoAsset);
    const original = useEditorStore.getState().project.clips[clipId];
    const newId = useEditorStore.getState().duplicateClip(clipId);
    expect(newId).not.toBeNull();
    const s = useEditorStore.getState();
    const copy = s.project.clips[newId!];
    expect(copy.timelineStart).toBe(original.timelineStart + original.duration);
    expect(s.selectedClipId).toBe(newId);
    const track = s.project.tracks.find((t) => t.id === DEFAULT_TRACK_IDS.video)!;
    expect(track.clipIds).toEqual([clipId, newId]);
  });

  it("faz nudge do clip sem passar de zero", () => {
    const clipId = useEditorStore.getState().addAssetWithClip(videoAsset);
    useEditorStore.getState().nudgeClip(clipId, 2);
    expect(useEditorStore.getState().project.clips[clipId].timelineStart).toBe(2);
    useEditorStore.getState().nudgeClip(clipId, -10);
    expect(useEditorStore.getState().project.clips[clipId].timelineStart).toBe(0);
  });

  it("remove asset junto com seus clips e limpa a seleção", () => {
    const clipId = useEditorStore.getState().addAssetWithClip(videoAsset);
    useEditorStore.getState().removeAsset(videoAsset.id);
    const s = useEditorStore.getState();
    expect(s.project.assets[videoAsset.id]).toBeUndefined();
    expect(s.project.clips[clipId]).toBeUndefined();
    expect(s.selectedClipId).toBeNull();
    const track = s.project.tracks.find((t) => t.id === DEFAULT_TRACK_IDS.video)!;
    expect(track.clipIds).not.toContain(clipId);
  });

  it("troca o aspect ratio", () => {
    useEditorStore.getState().setAspectRatio("16:9");
    const c = useEditorStore.getState().project.canvas;
    expect(c.aspectRatio).toBe("16:9");
    expect(c.width).toBe(1920);
  });

  it("calcula a duração do projeto pelo clip mais distante", () => {
    const clipId = useEditorStore.getState().addAssetWithClip(videoAsset);
    useEditorStore.getState().moveClip(clipId, 10);
    expect(useEditorStore.getState().getProjectDuration()).toBe(70);
  });
});
