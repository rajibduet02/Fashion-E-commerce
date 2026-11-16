export type Point = { x: number; y: number };

export type Landmark = { x: number; y: number; z?: number; visibility?: number };

export type AnchorKind = "top" | "outer" | "dress" | "bottom" | "accessory";

export type Quad = { tl: Point; tr: Point; br: Point; bl: Point };

export type Guidance = { code: string; message: string; ready: boolean };

export const POSE = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export function anchorKind(category: string): AnchorKind {
  const name = category.toLowerCase();
  if (/shoe|accessor|heel|watch|hoop|jewel/.test(name)) return "accessory";
  if (/jean|pant|trouser|short|skirt|palazzo/.test(name)) return "bottom";
  if (/dress|gown|saree|lehenga|kurti|anarkali|party/.test(name)) return "dress";
  if (/jacket|hoodie|coat|blazer|suit|formal|overcoat/.test(name)) return "outer";
  if (/traditional/.test(name)) return "dress";
  return "top";
}

export function anchorLabel(kind: AnchorKind) {
  if (kind === "top") return "Upper body";
  if (kind === "outer") return "Outer layer";
  if (kind === "dress") return "Full length";
  if (kind === "bottom") return "Lower body";
  return "Accessory";
}

export function fashnCategory(kind: AnchorKind): "tops" | "bottoms" | "one-pieces" | "auto" {
  if (kind === "bottom") return "bottoms";
  if (kind === "dress") return "one-pieces";
  if (kind === "accessory") return "auto";
  return "tops";
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function seen(landmarks: Landmark[] | null, index: number, minimum = 0.45) {
  const point = landmarks?.[index];
  if (!point) return false;
  return (point.visibility ?? 1) >= minimum;
}

export function smoothLandmarks(previous: Landmark[] | null, next: Landmark[], alpha = 0.42): Landmark[] {
  if (!previous || previous.length !== next.length) return next.map((point) => ({ ...point }));
  return next.map((point, index) => {
    const prior = previous[index];
    const visibility = point.visibility ?? 1;
    if (!prior || visibility < 0.35) return visibility < 0.25 ? { ...prior } : { ...point };
    return {
      x: prior.x + (point.x - prior.x) * alpha,
      y: prior.y + (point.y - prior.y) * alpha,
      z: point.z,
      visibility,
    };
  });
}

export function toPixels(landmarks: Landmark[], width: number, height: number, mirrored: boolean): Point[] {
  return landmarks.map((point) => ({
    x: (mirrored ? 1 - point.x : point.x) * width,
    y: point.y * height,
  }));
}

export function neckPoint(points: Point[]): Point | null {
  const left = points[POSE.leftShoulder];
  const right = points[POSE.rightShoulder];
  if (!left || !right) return null;
  const shoulders = midpoint(left, right);
  const span = distance(left, right);
  return { x: shoulders.x, y: shoulders.y - span * 0.42 };
}

function quadFrom(tl: Point, tr: Point, br: Point, bl: Point): Quad | null {
  const area = Math.abs((tl.x * (tr.y - bl.y) + tr.x * (br.y - tl.y) + br.x * (bl.y - tr.y) + bl.x * (tl.y - br.y)) / 2);
  if (area < 80) return null;
  return { tl, tr, br, bl };
}

export function garmentQuad(kind: AnchorKind, points: Point[]): Quad | null {
  const leftShoulder = points[POSE.leftShoulder];
  const rightShoulder = points[POSE.rightShoulder];
  const leftHip = points[POSE.leftHip];
  const rightHip = points[POSE.rightHip];
  const leftKnee = points[POSE.leftKnee];
  const rightKnee = points[POSE.rightKnee];
  const leftAnkle = points[POSE.leftAnkle];
  const rightAnkle = points[POSE.rightAnkle];
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;

  const shoulderSpan = distance(leftShoulder, rightShoulder);
  const hipSpan = distance(leftHip, rightHip);
  const span = Math.max(24, shoulderSpan, hipSpan);
  const pad = span * (kind === "outer" ? 0.34 : 0.22);
  const neck = neckPoint(points);
  const topY = neck ? neck.y : midpoint(leftShoulder, rightShoulder).y - span * 0.2;
  const hipY = Math.max(leftHip.y, rightHip.y);
  const half = span / 2;
  const chest = midpoint(leftShoulder, rightShoulder);

  if (kind === "accessory") {
    if (!leftAnkle || !rightAnkle) return null;
    const ankleSpan = Math.max(span * 0.45, distance(leftAnkle, rightAnkle));
    const center = midpoint(leftAnkle, rightAnkle);
    return quadFrom(
      { x: center.x - ankleSpan * 0.55, y: center.y - ankleSpan * 0.35 },
      { x: center.x + ankleSpan * 0.55, y: center.y - ankleSpan * 0.35 },
      { x: center.x + ankleSpan * 0.7, y: center.y + ankleSpan * 0.45 },
      { x: center.x - ankleSpan * 0.7, y: center.y + ankleSpan * 0.45 },
    );
  }

  if (kind === "bottom") {
    const hemL = leftAnkle ?? leftKnee ?? { x: leftHip.x, y: leftHip.y + span * 1.6 };
    const hemR = rightAnkle ?? rightKnee ?? { x: rightHip.x, y: rightHip.y + span * 1.6 };
    const rise = span * 0.18;
    const waist = midpoint(leftHip, rightHip);
    const hem = Math.max(hemL.y, hemR.y);
    return quadFrom(
      { x: waist.x - half * 0.72, y: waist.y - rise },
      { x: waist.x + half * 0.72, y: waist.y - rise },
      { x: waist.x + half * 0.78, y: hem },
      { x: waist.x - half * 0.78, y: hem },
    );
  }

  const dressHem = (side: Point, knee?: Point, ankle?: Point) => {
    if (kind !== "dress") return { x: side.x, y: hipY + span * (kind === "outer" ? 0.28 : 0.02) };
    if (ankle) return ankle;
    if (knee) return { x: knee.x, y: knee.y + span * 0.85 };
    return { x: side.x, y: hipY + span * 1.7 };
  };
  const hemL = dressHem(leftHip, leftKnee, leftAnkle);
  const hemR = dressHem(rightHip, rightKnee, rightAnkle);

  return quadFrom(
    { x: chest.x - half - pad, y: topY },
    { x: chest.x + half + pad, y: topY },
    { x: chest.x + half + pad * 0.45, y: kind === "top" ? hipY : Math.max(hemL.y, hemR.y) },
    { x: chest.x - half - pad * 0.45, y: kind === "top" ? hipY : Math.max(hemL.y, hemR.y) },
  );
}

export function guidance(landmarks: Landmark[] | null): Guidance {
  if (!landmarks) {
    return { code: "missing", message: "Step into the center of the mirror.", ready: false };
  }
  const shoulders = seen(landmarks, POSE.leftShoulder) && seen(landmarks, POSE.rightShoulder);
  if (!shoulders) {
    return { code: "upper", message: "Make sure your shoulders are visible.", ready: false };
  }
  const left = landmarks[POSE.leftShoulder];
  const right = landmarks[POSE.rightShoulder];
  const span = Math.abs(left.x - right.x);
  const center = (left.x + right.x) / 2;
  const visibility = [POSE.leftShoulder, POSE.rightShoulder, POSE.leftHip, POSE.rightHip]
    .map((index) => landmarks[index]?.visibility ?? 0)
    .reduce((sum, value) => sum + value, 0) / 4;
  if (visibility < 0.35) {
    return { code: "light", message: "Improve the room lighting and face the mirror.", ready: false };
  }
  if (span < 0.08) return { code: "closer", message: "Move closer to the camera.", ready: false };
  if (span > 0.62) return { code: "back", message: "Step back slightly.", ready: false };
  if (center < 0.34 || center > 0.66) return { code: "center", message: "Stand in the center.", ready: false };
  const hips = seen(landmarks, POSE.leftHip, 0.35) && seen(landmarks, POSE.rightHip, 0.35);
  if (!hips) return { code: "body", message: "Step back so more of your body is in frame.", ready: false };
  const angle = Math.atan2(right.y - left.y, right.x - left.x);
  if (Math.abs(angle) > 0.85) return { code: "turn", message: "Turn a little more toward the mirror.", ready: false };
  return { code: "hold", message: "Hold your position.", ready: true };
}

export type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };

export function affineMatrix(s0: Point, s1: Point, s2: Point, d0: Point, d1: Point, d2: Point): Matrix | null {
  const denom = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denom) < 1e-4) return null;
  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denom;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denom;
  const e = (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / denom;
  const f = (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / denom;
  return { a, b, c, d, e, f };
}

export function applyMatrix(matrix: Matrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}
