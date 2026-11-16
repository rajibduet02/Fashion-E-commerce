const MAX_CHARS = 8 * 1024 * 1024;

const CATEGORIES = new Set(["auto", "tops", "bottoms", "one-pieces"]);

export function validateTryOnBody(body) {
  if (!body || typeof body !== "object") return { error: "Send a JSON body." };
  if (body.consent !== true) return { error: "Consent is required before a photograph can be uploaded." };
  if (typeof body.person !== "string" || !body.person.startsWith("data:image/")) {
    return { error: "The captured photo must be a JPEG or PNG data URL." };
  }
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(body.person)) {
    return { error: "Use a JPEG, PNG, or WEBP photograph." };
  }
  if (body.person.length > MAX_CHARS) return { error: "The photograph is too large." };
  if (typeof body.garment !== "string" || body.garment.length < 12) return { error: "A garment image is required." };
  if (body.garment.startsWith("data:") && body.garment.length > MAX_CHARS) return { error: "The garment image is too large." };
  if (!body.garment.startsWith("data:image/") && !/^https?:\/\//i.test(body.garment)) {
    return { error: "The garment image must be a URL or a data URL." };
  }
  const category = CATEGORIES.has(body.category) ? body.category : "auto";
  return { value: { person: body.person, garment: body.garment, category } };
}
