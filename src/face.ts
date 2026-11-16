import type { Detection, FaceDetector } from "@mediapipe/tasks-vision";

export type Point = { x: number; y: number };

export type FaceFit = {
  rightEye: Point;
  leftEye: Point;
  nose: Point;
  mouth: Point;
  box: { x: number; y: number; width: number; height: number };
};

export type Portrait = FaceFit & { oval: Point[] };

const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

type Crop = { sx: number; sy: number; sw: number; sh: number };

let filesetPromise: Promise<unknown> | null = null;
const detectors: Partial<Record<"full" | "short", Promise<FaceDetector>>> = {};
let landmarkerPromise: Promise<import("@mediapipe/tasks-vision").FaceLandmarker> | null = null;

async function fileset() {
  if (!filesetPromise) {
    filesetPromise = import("@mediapipe/tasks-vision")
      .then(({ FilesetResolver }) => FilesetResolver.forVisionTasks("/mediapipe"))
      .catch((error: unknown) => {
        filesetPromise = null;
        throw error;
      });
  }
  return filesetPromise;
}

function detector(kind: "full" | "short") {
  if (!detectors[kind]) {
    const model = kind === "full" ? "blaze_face_full_range.tflite" : "blaze_face_short_range.tflite";
    detectors[kind] = (async () => {
      const { FaceDetector } = await import("@mediapipe/tasks-vision");
      const wasm = await fileset();
      return FaceDetector.createFromOptions(wasm as Awaited<ReturnType<(typeof import("@mediapipe/tasks-vision"))["FilesetResolver"]["forVisionTasks"]>>, {
        baseOptions: { modelAssetPath: `/mediapipe/${model}`, delegate: "CPU" },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.3,
      });
    })().catch((error: unknown) => {
      delete detectors[kind];
      filesetPromise = null;
      throw error;
    });
  }
  return detectors[kind]!;
}

function landmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const wasm = await fileset();
      return FaceLandmarker.createFromOptions(wasm as Awaited<ReturnType<(typeof import("@mediapipe/tasks-vision"))["FilesetResolver"]["forVisionTasks"]>>, {
        baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 1,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })().catch((error: unknown) => {
      landmarkerPromise = null;
      filesetPromise = null;
      throw error;
    });
  }
  return landmarkerPromise;
}

export function warmFaceDetector() {
  return Promise.all([detector("full"), landmarker()]).then(() => undefined);
}

function pointFrom(detection: Detection, index: number, box: Detection["boundingBox"], width: number, height: number, fx: number, fy: number): Point {
  const key = detection.keypoints[index];
  if (!key || box == null) {
    return {
      x: (box?.originX ?? 0) + (box?.width ?? 0) * fx,
      y: (box?.originY ?? 0) + (box?.height ?? 0) * fy,
    };
  }
  return {
    x: key.x <= 1.2 ? key.x * width : key.x,
    y: key.y <= 1.2 ? key.y * height : key.y,
  };
}

function readFace(detections: Detection[], width: number, height: number): FaceFit | null {
  let best: Detection | null = null;
  let bestArea = 0;
  for (const detection of detections) {
    const box = detection.boundingBox;
    const score = detection.categories[0]?.score ?? 0;
    if (!box || score < 0.3 || box.width < 12 || box.height < 12) continue;
    const area = box.width * box.height;
    if (area > bestArea) {
      best = detection;
      bestArea = area;
    }
  }
  const box = best?.boundingBox;
  if (!best || !box) return null;
  return {
    rightEye: pointFrom(best, 0, box, width, height, 0.32, 0.4),
    leftEye: pointFrom(best, 1, box, width, height, 0.68, 0.4),
    nose: pointFrom(best, 2, box, width, height, 0.5, 0.56),
    mouth: pointFrom(best, 3, box, width, height, 0.5, 0.74),
    box: { x: box.originX, y: box.originY, width: box.width, height: box.height },
  };
}

export async function detectFace(source: HTMLImageElement | HTMLCanvasElement, width: number, height: number) {
  const full = await detector("full");
  const found = readFace(full.detect(source).detections, width, height);
  if (found) return found;
  const close = await detector("short");
  return readFace(close.detect(source).detections, width, height);
}

function portraitFrom(marks: { x: number; y: number }[], width: number, height: number): Portrait | null {
  if (marks.length < 468) return null;
  const pt = (index: number): Point => ({ x: marks[index].x * width, y: marks[index].y * height });
  const rightEye = midpoint(pt(33), pt(133));
  const leftEye = midpoint(pt(263), pt(362));
  const nose = pt(1);
  const mouth = midpoint(pt(13), pt(14));
  const features = [rightEye, leftEye, nose, mouth];
  const inside = features.every((p) => p.x > width * 0.03 && p.x < width * 0.97 && p.y > height * 0.03 && p.y < height * 0.97);
  if (!inside || distance(leftEye, rightEye) < 8) return null;
  const oval = OVAL.map(pt);
  const xs = oval.map((p) => p.x);
  const ys = oval.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (maxX - minX < 16 || maxY - minY < 16) return null;
  return {
    rightEye,
    leftEye,
    nose,
    mouth,
    oval,
    box: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  };
}

export async function readPortrait(image: HTMLImageElement): Promise<Portrait | null> {
  const marker = await landmarker();
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const direct = marker.detect(image).faceLandmarks[0];
  if (direct) {
    const portrait = portraitFrom(direct, width, height);
    if (portrait) return portrait;
  }

  const cropH = Math.round(height * 0.72);
  const cropW = Math.round(width * 0.86);
  const sx = Math.round((width - cropW) / 2);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = cropW * scale;
  canvas.height = cropH * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, sx, 0, cropW, cropH, 0, 0, canvas.width, canvas.height);
  const zoomed = marker.detect(canvas).faceLandmarks[0];
  if (!zoomed) return null;
  const portrait = portraitFrom(zoomed, canvas.width, canvas.height);
  if (!portrait) return null;
  const back = (pt: Point): Point => ({ x: sx + pt.x / scale, y: pt.y / scale });
  return {
    rightEye: back(portrait.rightEye),
    leftEye: back(portrait.leftEye),
    nose: back(portrait.nose),
    mouth: back(portrait.mouth),
    oval: portrait.oval.map(back),
    box: {
      x: sx + portrait.box.x / scale,
      y: portrait.box.y / scale,
      width: portrait.box.width / scale,
      height: portrait.box.height / scale,
    },
  };
}

export async function detectGarmentFace(image: HTMLImageElement) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const direct = await detectFace(image, width, height);
  if (direct) return direct;

  const cropH = Math.round(height * 0.62);
  const cropW = Math.round(width * 0.82);
  const sx = Math.round((width - cropW) / 2);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = cropW * scale;
  canvas.height = cropH * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, sx, 0, cropW, cropH, 0, 0, canvas.width, canvas.height);
  const zoomed = await detectFace(canvas, canvas.width, canvas.height);
  if (!zoomed) return null;
  const back = (pt: Point): Point => ({ x: sx + pt.x / scale, y: pt.y / scale });
  return {
    rightEye: back(zoomed.rightEye),
    leftEye: back(zoomed.leftEye),
    nose: back(zoomed.nose),
    mouth: back(zoomed.mouth),
    box: {
      x: sx + zoomed.box.x / scale,
      y: zoomed.box.y / scale,
      width: zoomed.box.width / scale,
      height: zoomed.box.height / scale,
    },
  };
}

export function cropAroundFace(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  face: FaceFit | null,
): Crop {
  const frame = frameWidth / frameHeight;
  let sw: number;
  let sh: number;
  if (imageWidth / imageHeight > frame) {
    sh = imageHeight;
    sw = Math.min(imageWidth, sh * frame);
  } else {
    sw = imageWidth;
    sh = Math.min(imageHeight, sw / frame);
  }
  let sx = (imageWidth - sw) / 2;
  let sy = (imageHeight - sh) / 2;
  if (face) {
    const eyeX = (face.leftEye.x + face.rightEye.x) / 2;
    const eyeY = (face.leftEye.y + face.rightEye.y) / 2;
    sx = eyeX - sw / 2;
    sy = eyeY - sh * 0.18;
  }
  return {
    sx: Math.max(0, Math.min(imageWidth - sw, sx)),
    sy: Math.max(0, Math.min(imageHeight - sh, sy)),
    sw,
    sh,
  };
}

function mapPoint(pt: Point, crop: Crop, frameWidth: number, frameHeight: number): Point {
  return {
    x: ((pt.x - crop.sx) / crop.sw) * frameWidth,
    y: ((pt.y - crop.sy) / crop.sh) * frameHeight,
  };
}

export function mapFace(face: FaceFit, crop: Crop, frameWidth: number, frameHeight: number): FaceFit {
  const origin = mapPoint({ x: face.box.x, y: face.box.y }, crop, frameWidth, frameHeight);
  const far = mapPoint({ x: face.box.x + face.box.width, y: face.box.y + face.box.height }, crop, frameWidth, frameHeight);
  return {
    rightEye: mapPoint(face.rightEye, crop, frameWidth, frameHeight),
    leftEye: mapPoint(face.leftEye, crop, frameWidth, frameHeight),
    nose: mapPoint(face.nose, crop, frameWidth, frameHeight),
    mouth: mapPoint(face.mouth, crop, frameWidth, frameHeight),
    box: { x: origin.x, y: origin.y, width: far.x - origin.x, height: far.y - origin.y },
  };
}

export function faceInFrame(face: FaceFit, width: number, height: number) {
  const midX = (face.leftEye.x + face.rightEye.x) / 2;
  const midY = (face.leftEye.y + face.rightEye.y) / 2;
  return midX > width * 0.05 && midX < width * 0.95 && midY > height * 0.02 && midY < height * 0.72 && face.box.width > 22 && face.box.height > 22;
}

function eyePair(face: FaceFit) {
  return face.leftEye.x >= face.rightEye.x
    ? { outward: face.leftEye, inward: face.rightEye }
    : { outward: face.rightEye, inward: face.leftEye };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function skinLike(r: number, g: number, b: number) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return r > 45 && cr > 128 && cr < 182 && cb > 72 && cb < 132 && r >= g - 8;
}

function sampleSkin(ctx: CanvasRenderingContext2D, point: Point, radius: number) {
  const size = Math.max(4, Math.round(radius));
  const sx = Math.max(0, Math.round(point.x - size));
  const sy = Math.max(0, Math.round(point.y - size));
  const sw = Math.min(size * 2, ctx.canvas.width - sx);
  const sh = Math.min(size * 2, ctx.canvas.height - sy);
  if (sw < 4 || sh < 4) return null;
  const data = ctx.getImageData(sx, sy, sw, sh).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 20 || !skinLike(data[i], data[i + 1], data[i + 2])) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }
  if (count < 8) return null;
  return { r: r / count, g: g / count, b: b / count };
}

function matchSkin(ctx: CanvasRenderingContext2D, from: { r: number; g: number; b: number }, to: { r: number; g: number; b: number }) {
  const strength = 0.62;
  const gain = {
    r: 1 + (Math.min(1.28, Math.max(0.78, to.r / Math.max(1, from.r))) - 1) * strength,
    g: 1 + (Math.min(1.28, Math.max(0.78, to.g / Math.max(1, from.g))) - 1) * strength,
    b: 1 + (Math.min(1.28, Math.max(0.78, to.b / Math.max(1, from.b))) - 1) * strength,
  };
  const image = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8 || !skinLike(data[i], data[i + 1], data[i + 2])) continue;
    data[i] = Math.min(255, data[i] * gain.r);
    data[i + 1] = Math.min(255, data[i + 1] * gain.g);
    data[i + 2] = Math.min(255, data[i + 2] * gain.b);
  }
  ctx.putImageData(image, 0, 0);
}

function place(pt: Point, origin: Point, target: Point, scale: number, rotation: number): Point {
  const dx = (pt.x - origin.x) * scale;
  const dy = (pt.y - origin.y) * scale;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { x: target.x + dx * cos - dy * sin, y: target.y + dx * sin + dy * cos };
}

function expand(points: Point[], factor: number) {
  const center = points.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
  center.x /= points.length;
  center.y /= points.length;
  return points.map((pt) => ({ x: center.x + (pt.x - center.x) * factor, y: center.y + (pt.y - center.y) * factor }));
}

function trace(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const pt of points.slice(1)) ctx.lineTo(pt.x, pt.y);
  ctx.closePath();
}

export function paintAlignedFace(ctx: CanvasRenderingContext2D, person: HTMLImageElement, user: Portrait, model: FaceFit) {
  const userEyes = eyePair(user);
  const modelEyes = eyePair(model);
  const userDist = distance(userEyes.outward, userEyes.inward);
  const modelDist = distance(modelEyes.outward, modelEyes.inward);
  if (userDist < 4 || modelDist < 8) return model.box.y + model.box.height;

  const userMid = midpoint(userEyes.outward, userEyes.inward);
  const modelMid = midpoint(modelEyes.outward, modelEyes.inward);
  const userAngle = Math.atan2(userEyes.outward.y - userEyes.inward.y, userEyes.outward.x - userEyes.inward.x);
  const modelAngle = Math.atan2(modelEyes.outward.y - modelEyes.inward.y, modelEyes.outward.x - modelEyes.inward.x);
  const rotation = modelAngle - userAngle;
  const eyeScale = modelDist / userDist;
  const boxScale = model.box.height / Math.max(1, user.box.height);
  const scale = boxScale > 0.15 ? Math.max(eyeScale, boxScale) * 1.08 : eyeScale * 1.08;

  const layer = document.createElement("canvas");
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const lctx = layer.getContext("2d");
  if (!lctx) return model.box.y + model.box.height;
  lctx.imageSmoothingEnabled = true;
  lctx.imageSmoothingQuality = "high";

  lctx.save();
  lctx.translate(modelMid.x, modelMid.y);
  lctx.rotate(rotation);
  lctx.scale(scale, scale);
  lctx.translate(-userMid.x, -userMid.y);
  lctx.drawImage(person, 0, 0);
  lctx.restore();

  const placedNose = place(user.nose, userMid, modelMid, scale, rotation);
  const modelSkin = sampleSkin(ctx, model.nose, Math.max(6, modelDist * 0.2));
  const userSkin = sampleSkin(lctx, placedNose, Math.max(6, modelDist * 0.2));
  if (modelSkin && userSkin) matchSkin(lctx, userSkin, modelSkin);

  const placed = user.oval.map((pt) => place(pt, userMid, modelMid, scale, rotation));
  lctx.globalCompositeOperation = "destination-in";
  lctx.fillStyle = "#000";
  lctx.save();
  lctx.filter = "blur(16px)";
  trace(lctx, expand(placed, 1.24));
  lctx.fill();
  lctx.filter = "none";
  trace(lctx, expand(placed, 1.08));
  lctx.fill();
  lctx.restore();

  ctx.drawImage(layer, 0, 0);
  return Math.max(...placed.map((pt) => pt.y));
}
