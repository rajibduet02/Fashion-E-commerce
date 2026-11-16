import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTitle } from "../hooks";
import { money, readPhotoFile } from "../lib";
import { cameraErrorMessage, openVideoStream, withCameraLock } from "../mirror/camera";
import { anchorKind, anchorLabel, fashnCategory, guidance, smoothLandmarks, type Guidance, type Landmark } from "../mirror/geometry";
import { captureClean, paintFrame } from "../mirror/render";
import { loadPoseLandmarker, loadSegmenter, readCategoryMask, type MaskFrame } from "../mirror/vision";
import type { ImageSegmenter, PoseLandmarker } from "@mediapipe/tasks-vision";
import { useStore } from "../store";

const EMPTY: Guidance = { code: "waiting", message: "Start the camera, or upload a photograph.", ready: false };

export function Mirror() {
  useTitle("Smart Mirror");
  const { products, addToCart } = useStore();
  const [params] = useSearchParams();
  const available = products.filter((product) => !product.archived);
  const categories = useMemo(() => ["All", ...Array.from(new Set(available.map((product) => product.category)))], [available]);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState(params.get("product") || available.find((item) => item.category === "Dresses")?.id || available[0]?.id || "");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [mode, setMode] = useState<"ar" | "realistic">("ar");
  const [mirrored, setMirrored] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [modelState, setModelState] = useState<"loading" | "ready" | "error">("loading");
  const [hint, setHint] = useState<Guidance>(EMPTY);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cleanShot, setCleanShot] = useState<string | null>(null);
  const [arShot, setArShot] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [aiState, setAiState] = useState<"idle" | "working">("idle");
  const [aiError, setAiError] = useState("");
  const [compare, setCompare] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const segmentRef = useRef<ImageSegmenter | null>(null);
  const garmentRef = useRef<HTMLImageElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const hintRef = useRef(EMPTY.message);
  const mirroredRef = useRef(mirrored);
  const kindRef = useRef(anchorKind("Dresses"));
  mirroredRef.current = mirrored;

  const product = available.find((item) => item.id === productId) ?? available[0];
  const kind = anchorKind(product?.category ?? "");
  kindRef.current = kind;
  const shown = available.filter((item) => (category === "All" || item.category === category) && item.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!product) return;
    if (!product.colors.some((swatch) => swatch.name === color)) setColor(product.colors[0]?.name ?? "");
    if (!product.sizes.includes(size)) setSize(product.sizes[Math.min(2, product.sizes.length - 1)] ?? product.sizes[0] ?? "");
  }, [product, color, size]);

  useEffect(() => {
    let cancelled = false;
    loadPoseLandmarker()
      .then((pose) => {
        if (!cancelled) {
          poseRef.current = pose;
          setModelState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setModelState("error");
      });
    loadSegmenter()
      .then((segmenter) => {
        if (!cancelled) segmentRef.current = segmenter;
      })
      .catch(() => {
        segmentRef.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!product) {
      garmentRef.current = null;
      return;
    }
    let cancelled = false;
    garmentRef.current = null;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!cancelled) garmentRef.current = image;
    };
    image.onerror = () => {
      const plain = new Image();
      plain.onload = () => {
        if (!cancelled) garmentRef.current = plain;
      };
      plain.src = product.images[0];
    };
    image.src = product.images[0];
    return () => {
      cancelled = true;
    };
  }, [product]);

  useEffect(() => {
    if (!photo) {
      photoRef.current = null;
      return;
    }
    const image = new Image();
    image.onload = () => {
      photoRef.current = image;
    };
    image.src = photo;
  }, [photo]);

  useEffect(() => {
    const video = videoRef.current;
    let stopped = false;
    let busy = false;
    let smoothed: Landmark[] | null = null;
    let missed = 0;
    let mask: MaskFrame | null = null;
    let lastMask = 0;
    let poseStamp = 0;
    let maskStamp = 0;
    let skip = 0;
    let frame = 0;

    const nextStamp = (current: number) => Math.max(current + 1, performance.now());

    const tick = () => {
      if (stopped) return;
      frame = window.requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const live = video && video.readyState >= 2 ? video : null;
      const source = photoRef.current ?? live;
      if (!canvas || !ctx || !source) return;
      const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
      const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
      if (!width || !height) return;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      paintFrame({
        ctx,
        source,
        width,
        height,
        mirrored: mirroredRef.current,
        landmarks: smoothed,
        garment: garmentRef.current,
        kind: kindRef.current,
        mask,
      });
      const pose = poseRef.current;
      if (!pose || busy || skip > 0) {
        if (skip > 0 && !busy) skip -= 1;
        return;
      }
      busy = true;
      window.setTimeout(() => {
        if (stopped) {
          busy = false;
          return;
        }
        const started = performance.now();
        try {
          poseStamp = nextStamp(poseStamp);
          const found = pose.detectForVideo(source, poseStamp).landmarks[0] as Landmark[] | undefined;
          if (found?.length) {
            smoothed = smoothLandmarks(smoothed, found);
            missed = 0;
          } else if (missed < 8 && smoothed) {
            missed += 1;
          } else {
            smoothed = null;
            missed = 0;
          }
          const next = guidance(smoothed);
          if (next.message !== hintRef.current) {
            hintRef.current = next.message;
            setHint(next);
          }
          const segmenter = segmentRef.current;
          const now = performance.now();
          if (segmenter && now - lastMask > 220) {
            lastMask = now;
            maskStamp = nextStamp(maskStamp);
            mask = readCategoryMask(segmenter.segmentForVideo(source, maskStamp));
          }
          const elapsed = performance.now() - started;
          if (elapsed > 90) skip = 2;
          else if (elapsed > 48) skip = 1;
        } catch {
          missed = Math.min(missed + 1, 8);
        } finally {
          busy = false;
        }
      }, 0);
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
    };
  }, [photo, running]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
  }

  async function startCamera(nextDevice = deviceId, nextFacing = facing) {
    stopCamera();
    setCameraError("");
    setPhoto(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser cannot open a camera. Upload a photograph instead.");
      return;
    }
    await withCameraLock(async () => {
      try {
        const stream = await openVideoStream(nextDevice, nextFacing);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const listed = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
        setCameras(listed);
        const active = stream.getVideoTracks()[0]?.getSettings().deviceId;
        if (active) setDeviceId(active);
        setRunning(true);
      } catch (error) {
        setCameraError(cameraErrorMessage(error));
      }
    });
  }

  async function useUpload(file: File | undefined) {
    if (!file) return;
    try {
      stopCamera();
      setPhoto(await readPhotoFile(file));
      setCameraError("");
      setCleanShot(null);
      setArShot(null);
      setResult(null);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Could not read that photograph.");
    }
  }

  function currentSource() {
    const video = videoRef.current;
    if (photoRef.current) return photoRef.current;
    if (video && video.readyState >= 2) return video;
    return null;
  }

  function capture() {
    const canvas = canvasRef.current;
    const source = currentSource();
    if (!canvas || !source) return;
    const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
    const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
    try {
      setArShot(canvas.toDataURL("image/jpeg", 0.9));
    } catch {
      setArShot(null);
      setCameraError("The garment photograph could not be saved into the capture. The live overlay is still on screen.");
    }
    setCleanShot(captureClean(source, width, height, mirrored));
    setResult(null);
    setCompare(true);
    setAiError("");
  }

  async function generate() {
    if (!consent) {
      setAiError("Confirm consent before this photograph is sent.");
      return;
    }
    if (!cleanShot || !product) {
      setAiError("Capture a photograph before generating a try-on.");
      return;
    }
    if (!hint.ready) {
      setAiError("Hold a clear, centered pose so your shoulders and hips are visible.");
      return;
    }
    setAiState("working");
    setAiError("");
    try {
      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          person: cleanShot,
          garment: product.images[0],
          category: fashnCategory(kind),
        }),
      });
      const payload = (await response.json()) as { image?: string; error?: string };
      if (!response.ok || !payload.image) throw new Error(payload.error || "The try-on request failed.");
      setResult(payload.image);
      setCompare(true);
    } catch (error) {
      setResult(null);
      setAiError(error instanceof Error ? error.message : "The try-on request failed.");
    } finally {
      setAiState("idle");
    }
  }

  function resetLook() {
    setCleanShot(null);
    setArShot(null);
    setResult(null);
    setCompare(false);
    setAiError("");
  }

  const after = mode === "realistic" ? result : arShot;
  const before = cleanShot;

  return (
    <div className="mirror-page">
      <header className="mirror-top">
        <div>
          <p className="eyebrow">Smart mirror</p>
          <h1>Stand in. Choose the cloth.</h1>
        </div>
        <div className="mirror-modes">
          <button className={mode === "ar" ? "on" : ""} onClick={() => setMode("ar")} type="button">
            Real-time AR
          </button>
          <button className={mode === "realistic" ? "on" : ""} onClick={() => setMode("realistic")} type="button">
            Realistic try-on
          </button>
        </div>
      </header>

      <div className="mirror-shell">
        <section className="mirror-stage" ref={stageRef}>
          <video ref={videoRef} playsInline muted autoPlay />
          <canvas ref={canvasRef} />
          {!running && !photo && (
            <div className="mirror-empty">
              <p>The mirror is off.</p>
              <button className="btn btn-gold" type="button" onClick={() => void startCamera()}>
                Start camera
              </button>
            </div>
          )}
          <p className={`mirror-hint ${hint.ready ? "ready" : ""}`} aria-live="polite">
            {modelState === "loading" ? "Preparing body tracking…" : hint.message}
          </p>
          {cameraError && <p className="mirror-error">{cameraError}</p>}
          {modelState === "error" && <p className="mirror-error">Body tracking could not start. Refresh the page and try again.</p>}
          <div className="mirror-controls">
            {running ? (
              <button type="button" onClick={stopCamera}>
                Stop camera
              </button>
            ) : (
              <button type="button" onClick={() => void startCamera()}>
                Start camera
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const next = facing === "user" ? "environment" : "user";
                setFacing(next);
                setDeviceId("");
                void startCamera("", next);
              }}
            >
              Flip camera
            </button>
            <label>
              <input type="checkbox" checked={mirrored} onChange={(event) => setMirrored(event.target.checked)} />
              Mirror
            </label>
            <button type="button" onClick={() => stageRef.current?.requestFullscreen?.()}>
              Full screen
            </button>
            <button type="button" onClick={capture} disabled={!running && !photo}>
              Capture photo
            </button>
            <button type="button" onClick={resetLook}>
              Reset
            </button>
            <label className="upload">
              Upload
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void useUpload(event.target.files?.[0])} />
            </label>
          </div>
          {cameras.length > 1 && (
            <label className="mirror-devices">
              Camera
              <select
                value={deviceId}
                onChange={(event) => {
                  setDeviceId(event.target.value);
                  void startCamera(event.target.value);
                }}
              >
                {cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || "Camera"}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>

        <aside className="mirror-catalog">
          <div className="section-head">
            <h2>{product?.name ?? "Catalog"}</h2>
            {product && <Link to={`/product/${product.id}`}>View product</Link>}
          </div>
          {product && (
            <div className="mirror-selected">
              <img src={product.images[0]} alt="" />
              <div>
                <p>{product.category}</p>
                <strong>{money(product.price)}</strong>
                <p>{anchorLabel(kind)} · follows your pose</p>
                <div className="swatches">
                  {product.colors.map((swatch) => (
                    <button key={swatch.name} className={swatch.name === color ? "on" : ""} type="button" onClick={() => setColor(swatch.name)} aria-label={swatch.name} style={{ background: swatch.hex }} />
                  ))}
                </div>
                <div className="sizes">
                  {product.sizes.slice(0, 6).map((option) => (
                    <button key={option} className={option === size ? "on" : ""} type="button" onClick={() => setSize(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the rail" aria-label="Search garments" />
          <div className="chip-wrap">
            {categories.map((item) => (
              <button key={item} className={`chip ${item === category ? "on" : ""}`} type="button" onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="mirror-rail">
            {shown.map((item) => (
              <button key={item.id} className={item.id === product?.id ? "on" : ""} type="button" onClick={() => { setProductId(item.id); setResult(null); }}>
                <img src={item.images[0]} alt="" />
                <span>{item.name}</span>
              </button>
            ))}
          </div>

          {mode === "realistic" && (
            <div className="mirror-ai">
              <label>
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                Send this capture and the garment to the configured try-on provider for this request only. It is not saved on this server.
              </label>
              <button className="btn btn-gold btn-full" type="button" disabled={aiState === "working"} onClick={() => void generate()}>
                {aiState === "working" ? "Generating…" : "Generate realistic try-on"}
              </button>
              {aiError && <p className="mirror-error">{aiError}</p>}
            </div>
          )}

          {compare && before && (
            <div className="mirror-compare">
              <figure>
                <img src={before} alt="Captured photograph" />
                <figcaption>Before</figcaption>
              </figure>
              <figure>
                <img src={after || before} alt="Try-on result" />
                <figcaption>{after ? (mode === "realistic" ? "Generated" : "With garment") : "Capture a result"}</figcaption>
              </figure>
              {after && (
                <a className="btn btn-line btn-full" href={after} download="aurelle-mirror.jpg">
                  Download
                </a>
              )}
              <button className="btn btn-line btn-full" type="button" onClick={() => product && addToCart({ productId: product.id, size: size || product.sizes[0], color })}>
                Add to cart
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
