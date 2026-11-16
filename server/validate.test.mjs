import { describe, expect, it } from "vitest";
import { validateTryOnBody } from "./validate.mjs";

const photo = `data:image/jpeg;base64,${"a".repeat(32)}`;

describe("validateTryOnBody", () => {
  it("requires explicit consent", () => {
    expect(validateTryOnBody({ person: photo, garment: "https://example.com/gown.jpg" }).error).toMatch(/Consent/);
  });

  it("accepts a consented JPEG and a remote garment", () => {
    const result = validateTryOnBody({
      consent: true,
      person: photo,
      garment: "https://example.com/gown.jpg",
      category: "one-pieces",
    });
    expect(result.value).toMatchObject({ category: "one-pieces", person: photo });
  });

  it("rejects image types the provider path does not accept", () => {
    expect(validateTryOnBody({ consent: true, person: "data:image/gif;base64,aaaa", garment: "https://example.com/gown.jpg" }).error).toMatch(/JPEG/);
  });

  it("falls back when the category is not one the provider understands", () => {
    const result = validateTryOnBody({ consent: true, person: photo, garment: "https://example.com/gown.jpg", category: "shoes" });
    expect(result.value.category).toBe("auto");
  });
});
