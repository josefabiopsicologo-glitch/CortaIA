import { describe, expect, it } from "vitest";
import {
  detectAssetType,
  MAX_LOCAL_FILE_SIZE,
  validateMediaFile,
} from "./validation";

describe("detectAssetType", () => {
  it("reconhece tipos suportados", () => {
    expect(detectAssetType("video/mp4")).toBe("video");
    expect(detectAssetType("audio/mpeg")).toBe("audio");
    expect(detectAssetType("image/png")).toBe("image");
  });
  it("usa prefixo como fallback", () => {
    expect(detectAssetType("video/x-matroska")).toBe("video");
  });
  it("retorna null para tipos desconhecidos", () => {
    expect(detectAssetType("application/pdf")).toBeNull();
    expect(detectAssetType("")).toBeNull();
  });
});

describe("validateMediaFile", () => {
  it("aceita um mp4 válido", () => {
    const r = validateMediaFile({ name: "v.mp4", type: "video/mp4", size: 1024 });
    expect(r.ok).toBe(true);
    expect(r.type).toBe("video");
  });
  it("rejeita formato não suportado", () => {
    const r = validateMediaFile({ name: "a.pdf", type: "application/pdf", size: 1024 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/não suportado/i);
  });
  it("rejeita arquivo sem tipo (não confia na extensão)", () => {
    const r = validateMediaFile({ name: "video.mp4", type: "", size: 1024 });
    expect(r.ok).toBe(false);
  });
  it("rejeita arquivo vazio", () => {
    const r = validateMediaFile({ name: "v.mp4", type: "video/mp4", size: 0 });
    expect(r.ok).toBe(false);
  });
  it("rejeita arquivo grande demais", () => {
    const r = validateMediaFile({
      name: "v.mp4",
      type: "video/mp4",
      size: MAX_LOCAL_FILE_SIZE + 1,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/grande/i);
  });
});
