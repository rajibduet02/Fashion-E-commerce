export type Facing = "user" | "environment";

let tail: Promise<unknown> = Promise.resolve();

/** Run camera opens one at a time so a second request waits until the first has released the device. */
export function withCameraLock<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function cameraAttempts(deviceId: string, facing: Facing): Array<boolean | MediaTrackConstraints> {
  if (deviceId) {
    return [
      { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      { deviceId: { ideal: deviceId } },
      true,
    ];
  }
  return [
    { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
    { facingMode: { ideal: facing } },
    true,
  ];
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission was denied. Allow the camera in the address bar, then choose Enable camera.";
  }
  if (name === "NotFoundError") return "No camera was found. Connect a webcam or upload a photograph.";
  if (name === "NotReadableError" || name === "AbortError" || name === "TrackStartError") {
    return "The camera is connected, but the browser could not start it. Close other tabs or apps using it, then choose Enable camera.";
  }
  if (name === "OverconstrainedError") return "This camera rejected the requested mode. Choose another camera or upload a photograph.";
  return "The camera could not be started. Upload a photograph to continue.";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canRetry(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  return name === "NotReadableError" || name === "AbortError" || name === "OverconstrainedError" || name === "NotFoundError" || name === "TrackStartError";
}

export async function openVideoStream(deviceId: string, facing: Facing): Promise<MediaStream> {
  let last: unknown;
  for (const video of cameraAttempts(deviceId, facing)) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, video });
    } catch (error) {
      last = error;
      if (!canRetry(error)) throw error;
    }
  }
  await wait(400);
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  } catch (error) {
    last = error;
    if (!canRetry(error)) throw error;
  }
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  for (const device of devices) {
    if (device.kind !== "videoinput" || !device.deviceId || device.deviceId === deviceId) continue;
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId: { exact: device.deviceId } } });
    } catch (error) {
      last = error;
      if (!canRetry(error)) throw error;
    }
  }
  throw last instanceof Error ? last : new Error("The camera could not be started.");
}
