import { describe, expect, it } from "vitest";
import type { Asset } from "@/types";
import {
  createEmptyProject,
  createMediaClipFromAsset,
  createTextClip,
  DEFAULT_TRACK_IDS,
} from "@/lib/factories";
import { buildRenderPlan } from "./render-plan";

const videoAsset: Asset = {
  id: "asset_v",
  type: "video",
  name: "v.mp4",
  source: "blob:v",
  duration: 30,
  width: 1920,
  height: 1080,
  mimeType: "video/mp4",
  fileSize: 100,
};

function projectWithClips() {
  const p = createEmptyProject("t", "9:16");
  p.assets[videoAsset.id] = videoAsset;

  const clip = createMediaClipFromAsset(videoAsset, DEFAULT_TRACK_IDS.video, 0);
  p.clips[clip.id] = clip;
  p.tracks = p.tracks.map((t) =>
    t.id === DEFAULT_TRACK_IDS.video ? { ...t, clipIds: [clip.id] } : t,
  );

  const text = createTextClip(DEFAULT_TRACK_IDS.text, { timelineStart: 2, duration: 4 });
  p.clips[text.id] = text;
  p.tracks = p.tracks.map((t) =>
    t.id === DEFAULT_TRACK_IDS.text ? { ...t, clipIds: [text.id] } : t,
  );
  return p;
}

describe("buildRenderPlan", () => {
  it("materializa canvas e fps", () => {
    const plan = buildRenderPlan(projectWithClips());
    expect(plan.width).toBe(1080);
    expect(plan.height).toBe(1920);
    expect(plan.aspectRatio).toBe("9:16");
    expect(plan.fps).toBe(30);
  });

  it("separa camadas de vídeo e texto", () => {
    const plan = buildRenderPlan(projectWithClips());
    expect(plan.videoLayers).toHaveLength(1);
    expect(plan.textLayers).toHaveLength(1);
    expect(plan.audioLayers).toHaveLength(0);
  });

  it("calcula a duração pelo clip mais distante", () => {
    const plan = buildRenderPlan(projectWithClips());
    expect(plan.duration).toBe(30); // vídeo 0-30 domina o texto 2-6
  });

  it("ignora clips desabilitados", () => {
    const p = projectWithClips();
    for (const id of Object.keys(p.clips)) {
      p.clips[id] = { ...p.clips[id], enabled: false };
    }
    const plan = buildRenderPlan(p);
    expect(plan.videoLayers).toHaveLength(0);
    expect(plan.textLayers).toHaveLength(0);
    expect(plan.duration).toBe(0);
  });

  it("projeto vazio gera plano vazio", () => {
    const plan = buildRenderPlan(createEmptyProject());
    expect(plan.duration).toBe(0);
    expect(plan.videoLayers).toHaveLength(0);
  });
});
