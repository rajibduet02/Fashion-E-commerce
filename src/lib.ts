import { cropAroundFace, detectGarmentFace, faceInFrame, mapFace, paintAlignedFace, readPortrait } from "./face";
import type { Coupon, Product, Review } from "./types";

export const img = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function moneyRound(n: number) {
  return Math.round(n * 100) / 100;
}

export function discountFor(subtotal: number, coupon: Coupon | null) {
  if (!coupon || !coupon.active || subtotal <= 0) return 0;
  if (coupon.type === "percent") return moneyRound((subtotal * coupon.value) / 100);
  return Math.min(subtotal, coupon.value);
}

export function shippingFor(subtotal: number, method: "standard" | "express" | "atelier") {
  if (subtotal <= 0) return 0;
  if (method === "express") return 28;
  if (method === "atelier") return 45;
  return subtotal >= 150 ? 0 : 12;
}

export function offPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round((1 - price / compareAt) * 100);
}

export function matchesQuery(product: Product, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return [product.name, product.category, product.gender, product.fabric, product.description, ...product.details]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

const REVIEW_POOL: Review[] = [
  {
    name: "Clara M.",
    meta: "Paris · Verified",
    title: "The shoulder sits exactly as promised",
    text: "I compared two sizes in the fitting room, then ordered the smaller. The cloth has weight without stiffness.",
    rating: 5,
  },
  {
    name: "Meher Q.",
    meta: "Mumbai · Verified",
    title: "Worth the pause before checkout",
    text: "Seeing the border against my own photograph settled the decision. The drape in person is close, a touch softer.",
    rating: 5,
  },
  {
    name: "Jonah E.",
    meta: "London · Verified",
    title: "Quietly well made",
    text: "Seams are even, the color matches the studio image, and it didn’t need a tailor on arrival.",
    rating: 4,
  },
  {
    name: "Helena V.",
    meta: "Copenhagen · Verified",
    title: "A piece I keep reaching for",
    text: "The hand-feel is the thing the photograph couldn’t fully explain. Soft, and it holds its shape by evening.",
    rating: 5,
  },
  {
    name: "Adrian P.",
    meta: "New York · Verified",
    title: "True to the size guide",
    text: "I followed the chest measurement rather than my usual size. It was the right call.",
    rating: 4,
  },
  {
    name: "Sofia L.",
    meta: "Milan · Verified",
    title: "Evening, without the costume",
    text: "It reads polished in low light and still feels like clothing, not a costume. I’ll wear it past the party.",
    rating: 5,
  },
  {
    name: "Rafi N.",
    meta: "Dubai · Verified",
    title: "Color is faithful",
    text: "The ivory is warm, not stark. Packed simply, arrived pressed, and the buttons feel solid.",
    rating: 4,
  },
  {
    name: "Ines D.",
    meta: "Lisbon · Verified",
    title: "Returned the first, kept the second",
    text: "The preview nudged me toward a different color. The one I kept is the one I had tried on screen.",
    rating: 5,
  },
];

export function reviewsFor(id: string): Review[] {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return [0, 1, 2].map((offset) => REVIEW_POOL[(hash + offset * 3) % REVIEW_POOL.length]);
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = src;
  });
}

function drawCrop(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  crop: { sx: number; sy: number; sw: number; sh: number },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, x, y, w, h);
}

function paintDressUnderFace(
  ctx: CanvasRenderingContext2D,
  garment: HTMLImageElement,
  chin: number,
  tint: string,
  width: number,
  height: number,
) {
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const gctx = layer.getContext("2d");
  if (!gctx) return;
  const destTop = Math.min(Math.max(chin, height * 0.28), height * 0.5);
  const destH = height - destTop;
  const iw = garment.naturalWidth;
  const ih = garment.naturalHeight;
  const sy = ih * 0.3;
  const sh = ih - sy;
  const sliceRatio = iw / sh;
  const destRatio = width / destH;
  let sx = 0;
  let sw = iw;
  let ssy = sy;
  let ssh = sh;
  if (sliceRatio > destRatio) {
    sw = sh * destRatio;
    sx = (iw - sw) / 2;
  } else {
    ssh = iw / destRatio;
    ssy = sy + Math.max(0, (sh - ssh) / 2);
  }
  gctx.drawImage(garment, sx, ssy, sw, ssh, 0, destTop, width, destH);
  gctx.globalCompositeOperation = "destination-in";
  const fade = gctx.createLinearGradient(0, destTop, 0, destTop + Math.min(110, destH * 0.22));
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  gctx.fillStyle = fade;
  gctx.fillRect(0, 0, width, height);
  gctx.globalCompositeOperation = "source-atop";
  gctx.globalAlpha = 0.14;
  gctx.fillStyle = tint;
  gctx.fillRect(0, destTop, width, destH);
  ctx.drawImage(layer, 0, 0);
}

export async function renderLook(personSrc: string, garmentSrc: string, tint: string) {
  const person = await loadImage(personSrc);
  let garment: HTMLImageElement | null = null;
  try {
    garment = await loadImage(garmentSrc);
  } catch {
    garment = null;
  }

  const width = 720;
  const height = 960;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  let userFace;
  try {
    userFace = await readPortrait(person);
  } catch {
    throw new Error("Face alignment couldn’t start. Refresh the page and try the photograph again.");
  }
  if (!userFace) {
    throw new Error("We couldn’t find a clear face in your photograph. Keep your full face in the frame and look toward the camera.");
  }

  let garmentFace = null;
  if (garment) {
    try {
      garmentFace = (await readPortrait(garment)) ?? (await detectGarmentFace(garment));
    } catch {
      garmentFace = null;
    }
  }

  ctx.fillStyle = "#171717";
  ctx.fillRect(0, 0, width, height);

  const garmentCrop = garment
    ? cropAroundFace(garment.naturalWidth, garment.naturalHeight, width, height, garmentFace)
    : null;
  const mappedGarment = garment && garmentFace && garmentCrop ? mapFace(garmentFace, garmentCrop, width, height) : null;
  const aligned = Boolean(garment && mappedGarment && faceInFrame(mappedGarment, width, height));

  if (aligned && garment && garmentCrop && mappedGarment) {
    drawCrop(ctx, garment, garmentCrop, 0, 0, width, height);
    const chin = paintAlignedFace(ctx, person, userFace, mappedGarment);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, chin, width, height - chin);
    ctx.clip();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = tint;
    ctx.fillRect(0, chin, width, height - chin);
    ctx.restore();
  } else {
    const personCrop = cropAroundFace(person.naturalWidth, person.naturalHeight, width, height, userFace);
    drawCrop(ctx, person, personCrop, 0, 0, width, height);
    const mappedUser = mapFace(userFace, personCrop, width, height);
    const chin = Math.max(mappedUser.mouth.y, mappedUser.box.y + mappedUser.box.height);
    if (garment && faceInFrame(mappedUser, width, height)) paintDressUnderFace(ctx, garment, chin, tint, width, height);
  }

  const vignette = ctx.createRadialGradient(width / 2, height * 0.28, width * 0.3, width / 2, height * 0.45, width * 0.86);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.7, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(184,155,114,0.9)";
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  ctx.fillStyle = "rgba(23,23,23,0.58)";
  ctx.fillRect(0, height - 58, width, 58);
  ctx.fillStyle = "#F5F3EF";
  ctx.font = "500 13px Inter, sans-serif";
  ctx.fillText("AURELLE   ·   AI VISUALIZATION", 22, height - 32);
  ctx.font = "400 11px Inter, sans-serif";
  ctx.fillStyle = "rgba(245,243,239,0.78)";
  ctx.fillText("Fit, fabric, and color may vary", 22, height - 14);

  return canvas.toDataURL("image/jpeg", 0.84);
}

export function compressPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 1200;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not prepare that photo."));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that photo."));
    };
    image.src = url;
  });
}

export async function readOverlayFile(file: File) {
  if (!/^image\/(png|webp|jpeg|jpg)$/i.test(file.type)) throw new Error("Use a PNG, WebP, or JPEG garment image.");
  if (file.size > 1_600_000) throw new Error("Overlay images need to be 1.6 MB or smaller.");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that overlay."));
    reader.readAsDataURL(file);
  });
}

export async function readPhotoFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Use a JPG or PNG photograph.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Photographs need to be 8 MB or smaller.");
  return compressPhoto(file);
}
