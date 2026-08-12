import { describe, expect, it, vi } from "vitest";
import type { Asset, Project, RenderPlan } from "@/types";
import {
  createEmptyProject,
  createMediaClipFromAsset,
  DEFAULT_TRACK_IDS,
} from "@/lib/factories";
import type {
  ExportOptions,
  ExportProgress,
  ExportResult,
  VideoEngine,
} from "@/video-engine";
import { exportProject, getExportBlocker } from "./export-service";

const videoAsset: Asset = {
  id: "asset_v",
  type: "video",
  name: "v.mp4",
  source: "blob:v",
  duration: 10,
  width: 1920,
  height: 1080,
  mimeType: "video/mp4",
  fileSize: 100,
};

function projectWithVideo(): Project {
  const p = createEmptyProject("t", "9:16");
  p.assets[videoAsset.id] = videoAsset;
  const clip = createMediaClipFromAsset(videoAsset, DEFAULT_TRACK_IDS.video, 0);
  p.clips[clip.id] = clip;
  p.tracks = p.tracks.map((t) =>
    t.id === DEFAULT_TRACK_IDS.video ? { ...t, clipIds: [clip.id] } : t,
  );
  return p;
}

const fakeResult: ExportResult = {
  url: "blob:out",
  mimeType: "video/webm",
  sizeBytes: 1234,
};

class FakeEngine implements VideoEngine {
  async export(_plan: RenderPlan, options?: ExportOptions): Promise<ExportResult> {
    options?.onProgress?.({ phase: "processing", progress: 0.5 });
    return fakeResult;
  }
}

class FailingEngine implements VideoEngine {
  async export(): Promise<ExportResult> {
    throw new Error("Falha durante a exportação.");
  }
}

describe("getExportBlocker", () => {
  it("bloqueia projeto vazio", () => {
    expect(getExportBlocker(createEmptyProject())).toMatch(/timeline/i);
  });
  it("libera projeto com vídeo", () => {
    expect(getExportBlocker(projectWithVideo())).toBeNull();
  });
});

describe("exportProject", () => {
  it("emite fases e retorna o resultado", async () => {
    const phases: ExportProgress["phase"][] = [];
    const result = await exportProject(projectWithVideo(), new FakeEngine(), {
      onProgress: (p) => phases.push(p.phase),
    });
    expect(result).toEqual(fakeResult);
    expect(phases[0]).toBe("preparing");
    expect(phases).toContain("done");
  });

  it("propaga erro do engine com fase de erro", async () => {
    const onProgress = vi.fn();
    await expect(
      exportProject(projectWithVideo(), new FailingEngine(), { onProgress }),
    ).rejects.toThrow(/falha/i);
    const phases = onProgress.mock.calls.map((c) => c[0].phase);
    expect(phases).toContain("error");
  });

  it("recusa exportar projeto sem vídeo", async () => {
    await expect(
      exportProject(createEmptyProject(), new FakeEngine()),
    ).rejects.toThrow(/timeline/i);
  });

  it("respeita cancelamento prévio", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      exportProject(projectWithVideo(), new FakeEngine(), {
        signal: controller.signal,
      }),
    ).rejects.toThrow(/cancelada/i);
  });
});
