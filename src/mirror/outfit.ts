import { anchorKind, type AnchorKind } from "./geometry";
import type { GarmentType, Product } from "../types";

export type OutfitSlots = {
  top: string | null;
  bottom: string | null;
  dress: string | null;
  outer: string | null;
};

export const EMPTY_OUTFIT: OutfitSlots = { top: null, bottom: null, dress: null, outer: null };

export const LAYER_ORDER: (keyof OutfitSlots)[] = ["bottom", "top", "dress", "outer"];

export const TRIAL_FILTERS = [
  { id: "all", label: "All" },
  { id: "men", label: "Men" },
  { id: "women", label: "Women" },
  { id: "tees", label: "T-shirts" },
  { id: "shirts", label: "Shirts" },
  { id: "jackets", label: "Jackets" },
  { id: "hoodies", label: "Hoodies" },
  { id: "dresses", label: "Dresses" },
  { id: "jeans", label: "Jeans and trousers" },
  { id: "traditional", label: "Traditional clothing" },
] as const;

export type TrialFilter = (typeof TRIAL_FILTERS)[number]["id"];

export function resolveKind(product: Pick<Product, "category" | "garmentType">): AnchorKind {
  return product.garmentType ?? anchorKind(product.category);
}

export function isCutout(src?: string) {
  if (!src) return false;
  return /^data:image\/(png|webp)/i.test(src) || /\.(png|webp)(\?|$)/i.test(src);
}

export function slotFor(kind: AnchorKind): keyof OutfitSlots | null {
  if (kind === "top") return "top";
  if (kind === "bottom") return "bottom";
  if (kind === "dress") return "dress";
  if (kind === "outer") return "outer";
  return null;
}

export function applyGarment(slots: OutfitSlots, id: string, kind: AnchorKind): OutfitSlots {
  const slot = slotFor(kind);
  if (!slot) return slots;
  if (slots[slot] === id) return { ...slots, [slot]: null };
  if (kind === "dress") return { ...slots, dress: id, top: null, bottom: null };
  if (kind === "top" || kind === "bottom") return { ...slots, [slot]: id, dress: null };
  return { ...slots, outer: id };
}

export function removeGarment(slots: OutfitSlots, id: string): OutfitSlots {
  const next: OutfitSlots = { ...slots };
  (Object.keys(next) as (keyof OutfitSlots)[]).forEach((key) => {
    if (next[key] === id) next[key] = null;
  });
  return next;
}

export function outfitIds(slots: OutfitSlots) {
  return LAYER_ORDER.map((slot) => slots[slot]).filter((id): id is string => Boolean(id));
}

export function matchesTrialFilter(product: Pick<Product, "gender" | "category">, filter: TrialFilter) {
  const category = product.category.toLowerCase();
  if (filter === "men") return product.gender === "men";
  if (filter === "women") return product.gender === "women";
  if (filter === "tees") return category.includes("t-shirt");
  if (filter === "shirts") return category === "shirts" || category.includes("tops");
  if (filter === "jackets") return category.includes("jacket");
  if (filter === "hoodies") return category.includes("hoodie");
  if (filter === "dresses") return category === "dresses";
  if (filter === "jeans") return /jean|pant|trouser/.test(category);
  if (filter === "traditional") return /traditional|saree|kurti|lehenga/.test(category);
  return true;
}

export function previewPiece(slots: OutfitSlots, products: Product[]) {
  const id = slots.dress || slots.outer || slots.top || slots.bottom;
  return products.find((product) => product.id === id) ?? null;
}

export function garmentTypeLabel(kind: GarmentType | AnchorKind) {
  if (kind === "top") return "Upper body";
  if (kind === "outer") return "Outerwear";
  if (kind === "dress") return "Full body";
  if (kind === "bottom") return "Lower body";
  return "Accessory";
}
