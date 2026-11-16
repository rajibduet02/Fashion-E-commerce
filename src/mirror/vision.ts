import type { ImageSegmenter, PoseLandmarker } from "@mediapipe/tasks-vision";

let filesetPromise: Promise<unknown> | null = null;
let posePromise: Promise<PoseLandmarker> | null = null;
let segmentPromise: Promise<ImageSegmenter> | null = null;

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

async function createPose(delegate: "GPU" | "CPU") {
  const { PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const wasm = await fileset();
  return PoseLandmarker.createFromOptions(wasm as Awaited<ReturnType<(typeof import("@mediapipe/tasks-vision"))["FilesetResolver"]["forVisionTasks"]>>, {
    baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_lite.task", delegate },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.45,
    minPosePresenceConfidence: 0.45,
    minTrackingConfidence: 0.45,
  });
}

async function createSegmenter(delegate: "GPU" | "CPU") {
  const { ImageSegmenter } = await import("@mediapipe/tasks-vision");
  const wasm = await fileset();
  return ImageSegmenter.createFromOptions(wasm as Awaited<ReturnType<(typeof import("@mediapipe/tasks-vision"))["FilesetResolver"]["forVisionTasks"]>>, {
    baseOptions: { modelAssetPath: "/mediapipe/selfie_segmenter.tflite", delegate },
    runningMode: "VIDEO",
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });
}

export function loadPoseLandmarker() {
  if (!posePromise) {
    posePromise = createPose("GPU").catch(() => createPose("CPU")).catch((error: unknown) => {
      posePromise = null;
      throw error;
    });
  }
  return posePromise;
}

export function loadSegmenter() {
  if (!segmentPromise) {
    segmentPromise = createSegmenter("GPU").catch(() => createSegmenter("CPU")).catch((error: unknown) => {
      segmentPromise = null;
      throw error;
    });
  }
  return segmentPromise;
}

export type MaskFrame = { width: number; height: number; data: Uint8Array };

export function readCategoryMask(result: { categoryMask?: { width: number; height: number; getAsUint8Array: () => Uint8Array } | null }): MaskFrame | null {
  const mask = result.categoryMask;
  if (!mask) return null;
  return { width: mask.width, height: mask.height, data: mask.getAsUint8Array() };
}
