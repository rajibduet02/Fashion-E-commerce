import { describe, expect, it } from "vitest";
import { applyGarment, isCutout, matchesTrialFilter, outfitIds, removeGarment, resolveKind, EMPTY_OUTFIT } from "./outfit";

describe("trial outfits", () => {
  it("layers a shirt with trousers and a jacket", () => {
    const shirt = applyGarment(EMPTY_OUTFIT, "shirt", "top");
    const jeans = applyGarment(shirt, "jeans", "bottom");
    const look = applyGarment(jeans, "jacket", "outer");
    expect(outfitIds(look)).toEqual(["jeans", "shirt", "jacket"]);
  });

  it("replaces a top and trousers when a dress is chosen", () => {
    const layered = applyGarment(applyGarment(EMPTY_OUTFIT, "tee", "top"), "jeans", "bottom");
    const dress = applyGarment(layered, "gown", "dress");
    expect(dress).toMatchObject({ top: null, bottom: null, dress: "gown" });
    const back = applyGarment(dress, "tee", "top");
    expect(back.dress).toBeNull();
    expect(back.top).toBe("tee");
  });

  it("removes one piece and leaves the rest", () => {
    const look = applyGarment(applyGarment(EMPTY_OUTFIT, "tee", "top"), "jeans", "bottom");
    expect(outfitIds(removeGarment(look, "tee"))).toEqual(["jeans"]);
  });

  it("uses a saved garment type ahead of the category name", () => {
    expect(resolveKind({ category: "Dresses", garmentType: "outer" })).toBe("outer");
    expect(resolveKind({ category: "Jeans & Pants" })).toBe("bottom");
  });

  it("recognises a transparent overlay and the catalog filters", () => {
    expect(isCutout("data:image/png;base64,aaa")).toBe(true);
    expect(isCutout("https://images.example/look.jpg")).toBe(false);
    expect(matchesTrialFilter({ gender: "men", category: "T-Shirts" }, "tees")).toBe(true);
    expect(matchesTrialFilter({ gender: "women", category: "Traditional Wear" }, "traditional")).toBe(true);
    expect(matchesTrialFilter({ gender: "women", category: "Dresses" }, "jeans")).toBe(false);
  });
});
