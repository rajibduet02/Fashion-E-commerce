import { describe, expect, it } from "vitest";
import {
  affineMatrix,
  anchorKind,
  applyMatrix,
  fashnCategory,
  garmentQuad,
  guidance,
  smoothLandmarks,
  type Landmark,
} from "./geometry";

function standing(patch?: (points: Landmark[]) => void): Landmark[] {
  const points = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
  points[11] = { x: 0.4, y: 0.3, visibility: 0.9 };
  points[12] = { x: 0.6, y: 0.3, visibility: 0.9 };
  points[23] = { x: 0.42, y: 0.55, visibility: 0.9 };
  points[24] = { x: 0.58, y: 0.55, visibility: 0.9 };
  points[25] = { x: 0.42, y: 0.72, visibility: 0.9 };
  points[26] = { x: 0.58, y: 0.72, visibility: 0.9 };
  points[27] = { x: 0.42, y: 0.9, visibility: 0.9 };
  points[28] = { x: 0.58, y: 0.9, visibility: 0.9 };
  patch?.(points);
  return points;
}

describe("garment anchors", () => {
  it("maps catalog categories onto body regions", () => {
    expect(anchorKind("T-Shirts")).toBe("top");
    expect(anchorKind("Shirts")).toBe("top");
    expect(anchorKind("Jackets")).toBe("outer");
    expect(anchorKind("Hoodies")).toBe("outer");
    expect(anchorKind("Dresses")).toBe("dress");
    expect(anchorKind("Sarees")).toBe("dress");
    expect(anchorKind("Kurtis")).toBe("dress");
    expect(anchorKind("Traditional")).toBe("dress");
    expect(anchorKind("Jeans")).toBe("bottom");
    expect(anchorKind("Shorts")).toBe("bottom");
    expect(anchorKind("Heels")).toBe("accessory");
  });

  it("maps those regions to the try-on provider categories", () => {
    expect(fashnCategory("top")).toBe("tops");
    expect(fashnCategory("outer")).toBe("tops");
    expect(fashnCategory("bottom")).toBe("bottoms");
    expect(fashnCategory("dress")).toBe("one-pieces");
    expect(fashnCategory("accessory")).toBe("auto");
  });
});

describe("pose guidance", () => {
  it("asks the person to step in when nobody is tracked", () => {
    expect(guidance(null)).toMatchObject({ code: "missing", ready: false });
  });

  it("asks for a closer, farther, or centered stance", () => {
    expect(guidance(standing((points) => {
      points[11].x = 0.48;
      points[12].x = 0.52;
    })).code).toBe("closer");
    expect(guidance(standing((points) => {
      points[11].x = 0.1;
      points[12].x = 0.9;
    })).code).toBe("back");
    expect(guidance(standing((points) => {
      points[11].x = 0.05;
      points[12].x = 0.25;
    })).code).toBe("center");
  });

  it("holds only when shoulders and hips are visible and centered", () => {
    expect(guidance(standing()).code).toBe("hold");
    expect(guidance(standing((points) => {
      points[23].visibility = 0.1;
      points[24].visibility = 0.1;
    })).code).toBe("body");
  });
});

describe("tracking math", () => {
  it("smooths motion and keeps the last point when confidence drops", () => {
    const previous = [{ x: 0, y: 0, visibility: 1 }];
    expect(smoothLandmarks(previous, [{ x: 1, y: 0, visibility: 1 }], 0.5)[0].x).toBe(0.5);
    expect(smoothLandmarks(previous, [{ x: 1, y: 1, visibility: 0.1 }], 0.5)[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("builds an affine map that lands the triangle corners", () => {
    const matrix = affineMatrix({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 10, y: 20 }, { x: 30, y: 20 }, { x: 10, y: 40 });
    expect(matrix).not.toBeNull();
    if (!matrix) return;
    expect(applyMatrix(matrix, { x: 0, y: 0 })).toEqual({ x: 10, y: 20 });
    expect(applyMatrix(matrix, { x: 1, y: 0 })).toEqual({ x: 30, y: 20 });
    expect(applyMatrix(matrix, { x: 0, y: 1 })).toEqual({ x: 10, y: 40 });
  });

  it("places a top on the torso and refuses a pose without hips", () => {
    const pixels = standing().map((point) => ({ x: point.x * 1000, y: point.y * 1000 }));
    const quad = garmentQuad("top", pixels);
    expect(quad?.tl.y).toBeLessThan(quad?.bl.y ?? 0);
    expect(garmentQuad("top", pixels.slice(0, 12))).toBeNull();
  });
});
