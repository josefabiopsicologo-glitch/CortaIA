import { describe, expect, it } from "vitest";
import { CANVAS_PRESETS, canvasFromPreset } from "./canvas";

describe("CANVAS_PRESETS", () => {
  it("define as três resoluções do MVP", () => {
    expect(CANVAS_PRESETS["9:16"]).toMatchObject({ width: 1080, height: 1920 });
    expect(CANVAS_PRESETS["1:1"]).toMatchObject({ width: 1080, height: 1080 });
    expect(CANVAS_PRESETS["16:9"]).toMatchObject({ width: 1920, height: 1080 });
  });
});

describe("canvasFromPreset", () => {
  it("materializa dimensões a partir do aspecto", () => {
    const c = canvasFromPreset("9:16");
    expect(c.width).toBe(1080);
    expect(c.height).toBe(1920);
    expect(c.aspectRatio).toBe("9:16");
  });
  it("aceita cor de fundo customizada", () => {
    expect(canvasFromPreset("1:1", "#123456").backgroundColor).toBe("#123456");
  });
});
