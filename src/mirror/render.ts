import { POSE, affineMatrix, distance, garmentQuad, midpoint, neckPoint, toPixels, type AnchorKind, type Landmark, type Point, type Quad } from "./geometry";
import type { MaskFrame } from "./vision";

let garmentLayer: HTMLCanvasElement | null = null;
let maskScratch: HTMLCanvasElement | null = null;

function scratchCanvas(current: HTMLCanvasElement | null, width: number, height: number) {
  const canvas = current ?? document.createElement("canvas");
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.clearRect(0, 0, width, height);
  }
  return canvas;
}

function trace(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  s0: Point,
  s1: Point,
  s2: Point,
  d0: Point,
  d1: Point,
  d2: Point,
) {
  const matrix = affineMatrix(s0, s1, s2, d0, d1, d2);
  if (!matrix) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function addCapsule(ctx: CanvasRenderingContext2D, a: Point, b: Point, radius: number) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const ox = Math.cos(angle + Math.PI / 2) * radius;
  const oy = Math.sin(angle + Math.PI / 2) * radius;
  ctx.moveTo(a.x + ox, a.y + oy);
  ctx.lineTo(b.x + ox, b.y + oy);
  ctx.arc(b.x, b.y, radius, angle + Math.PI / 2, angle - Math.PI / 2);
  ctx.lineTo(a.x - ox, a.y - oy);
  ctx.arc(a.x, a.y, radius, angle - Math.PI / 2, angle + Math.PI / 2);
  ctx.closePath();
}

export function captureClean(source: CanvasImageSource, width: number, height: number, mirrored: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawVideo(ctx, source, width, height, mirrored);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function drawVideo(ctx: CanvasRenderingContext2D, source: CanvasImageSource, width: number, height: number, mirrored: boolean) {
  ctx.save();
  if (mirrored) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, width, height);
  ctx.restore();
}

export type GarmentLayer = { image: HTMLImageElement; kind: AnchorKind; cutout: boolean };

const LAYER_RANK: Record<AnchorKind, number> = { bottom: 0, top: 1, dress: 2, outer: 3, accessory: 4 };

export function paintFrame(options: {
  ctx: CanvasRenderingContext2D;
  source: CanvasImageSource;
  width: number;
  height: number;
  mirrored: boolean;
  landmarks: Landmark[] | null;
  garment?: HTMLImageElement | null;
  kind?: AnchorKind;
  layers?: GarmentLayer[];
  mask: MaskFrame | null;
}) {
  const { ctx, source, width, height, mirrored, landmarks, garment, kind, mask } = options;
  ctx.clearRect(0, 0, width, height);
  drawVideo(ctx, source, width, height, mirrored);
  const layers = options.layers ?? (garment && kind ? [{ image: garment, kind, cutout: false }] : []);
  if (!landmarks || layers.length === 0) return;

  const pixels = toPixels(landmarks, width, height, mirrored);
  const hasDress = layers.some((layer) => layer.kind === "dress");
  const ordered = [...layers]
    .filter((layer) => layer.image.complete && layer.image.naturalWidth > 0)
    .filter((layer) => !(hasDress && (layer.kind === "top" || layer.kind === "bottom")))
    .sort((a, b) => LAYER_RANK[a.kind] - LAYER_RANK[b.kind]);
  for (const layer of ordered) paintLayer(ctx, layer, pixels, mask, width, height, mirrored);
  if (ordered.length) restoreBody(ctx, source, width, height, mirrored, pixels);
}

function paintLayer(
  ctx: CanvasRenderingContext2D,
  layer: GarmentLayer,
  pixels: Point[],
  mask: MaskFrame | null,
  width: number,
  height: number,
  mirrored: boolean,
) {
  const quad = garmentQuad(layer.kind, pixels);
  if (!quad) return;
  garmentLayer = scratchCanvas(garmentLayer, width, height);
  const gctx = garmentLayer.getContext("2d");
  if (!gctx) return;
  const sw = layer.image.naturalWidth || layer.image.width;
  const sh = layer.image.naturalHeight || layer.image.height;
  const sourceQuad = layer.cutout
    ? { tl: { x: 0, y: 0 }, tr: { x: sw, y: 0 }, br: { x: sw, y: sh }, bl: { x: 0, y: sh } }
    : sourceCrop(layer.kind, sw, sh);
  drawTriangle(gctx, layer.image, sourceQuad.tl, sourceQuad.tr, sourceQuad.br, quad.tl, quad.tr, quad.br);
  drawTriangle(gctx, layer.image, sourceQuad.tl, sourceQuad.br, sourceQuad.bl, quad.tl, quad.br, quad.bl);
  gctx.globalCompositeOperation = "destination-in";
  gctx.filter = "blur(10px)";
  gctx.fillStyle = "#000";
  trace(gctx, [quad.tl, quad.tr, quad.br, quad.bl]);
  gctx.fill();
  gctx.filter = "none";
  if (mask) applyPersonMask(gctx, mask, width, height, mirrored);
  ctx.save();
  ctx.globalAlpha = layer.cutout ? 1 : 0.92;
  ctx.drawImage(garmentLayer, 0, 0);
  ctx.restore();
}

function sourceCrop(kind: AnchorKind, width: number, height: number): Quad {
  const frame = {
    top: [0.28, 0.16, 0.44, 0.4],
    outer: [0.24, 0.1, 0.52, 0.62],
    dress: [0.3, 0.14, 0.4, 0.76],
    bottom: [0.3, 0.4, 0.4, 0.5],
    accessory: [0.34, 0.34, 0.32, 0.32],
  }[kind];
  const [x, y, w, h] = frame;
  const left = width * x;
  const top = height * y;
  const right = width * (x + w);
  const bottom = height * (y + h);
  return {
    tl: { x: left, y: top },
    tr: { x: right, y: top },
    br: { x: right, y: bottom },
    bl: { x: left, y: bottom },
  };
}

function applyPersonMask(ctx: CanvasRenderingContext2D, mask: MaskFrame, width: number, height: number, mirrored: boolean) {
  maskScratch = scratchCanvas(maskScratch, mask.width, mask.height);
  const scratch = maskScratch;
  const sctx = scratch.getContext("2d");
  if (!sctx) return;
  const image = sctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i += 1) {
    const alpha = mask.data[i] > 0 ? 255 : 0;
    const offset = i * 4;
    image.data[offset + 3] = alpha;
  }
  sctx.putImageData(image, 0, 0);
  ctx.save();
  if (mirrored) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(scratch, 0, 0, width, height);
  ctx.restore();
}

function restoreBody(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  mirrored: boolean,
  points: Point[],
) {
  const leftShoulder = points[POSE.leftShoulder];
  const rightShoulder = points[POSE.rightShoulder];
  if (!leftShoulder || !rightShoulder) return;
  const span = Math.max(20, distance(leftShoulder, rightShoulder));
  const neck = neckPoint(points) ?? midpoint(leftShoulder, rightShoulder);
  const cut = neck.y + span * 0.06;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, Math.max(0, cut));
  const radius = span * 0.18;
  const bones: Array<[number, number]> = [
    [POSE.leftShoulder, POSE.leftElbow],
    [POSE.leftElbow, POSE.leftWrist],
    [POSE.rightShoulder, POSE.rightElbow],
    [POSE.rightElbow, POSE.rightWrist],
  ];
  for (const [start, end] of bones) {
    const a = points[start];
    const b = points[end];
    if (a && b) addCapsule(ctx, a, b, radius);
  }
  ctx.clip();
  drawVideo(ctx, source, width, height, mirrored);
  ctx.restore();
}
