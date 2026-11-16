import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ImageSegmenter, PoseLandmarker } from "@mediapipe/tasks-vision";
import { useTitle } from "../hooks";
import { money, readPhotoFile } from "../lib";
import { cameraErrorMessage, openVideoStream, withCameraLock } from "../mirror/camera";
import { fashnCategory, guidance, smoothLandmarks, type Guidance, type Landmark } from "../mirror/geometry";
import {
  EMPTY_OUTFIT,
  LAYER_ORDER,
  TRIAL_FILTERS,
  applyGarment,
  isCutout,
  matchesTrialFilter,
  outfitIds,
  previewPiece,
  removeGarment,
  resolveKind,
  type OutfitSlots,
  type TrialFilter,
} from "../mirror/outfit";
import { captureClean, paintFrame, type GarmentLayer } from "../mirror/render";
import { loadPoseLandmarker, loadSegmenter, readCategoryMask, type MaskFrame } from "../mirror/vision";
import { useStore } from "../store";
import type { Product } from "../types";

const WAITING: Guidance = { code: "waiting", message: "Stand in the center so your full body is in frame.", ready: false };

export function Trial() {
  useTitle("Live Virtual Trial Room");
  const { products, addToCart, toast } = useStore();
  const available = useMemo(() => products.filter((product) => !product.archived), [products]);
  const [filter, setFilter] = useState<TrialFilter>("all");
  const [query, setQuery] = useState("");
  const [outfit, setOutfit] = useState<OutfitSlots>(EMPTY_OUTFIT);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sizeChoice, setSizeChoice] = useState<Record<string, string>>({});
  const [colorChoice, setColorChoice] = useState<Record<string, string>>({});
  const [mirrored, setMirrored] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [modelState, setModelState] = useState<"loading" | "ready" | "error">("loading");
  const [hint, setHint] = useState<Guidance>(WAITING);
  const [photo, setPhoto] = useState<string | null>(null);
  const [session, setSession] = useState(1);
  const [consent, setConsent] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewState, setPreviewState] = useState<"idle" | "working">("idle");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [shot, setShot] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const segmentRef = useRef<ImageSegmenter | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const layersRef = useRef<GarmentLayer[]>([]);
  const hintRef = useRef(WAITING.message);
  const mirroredRef = useRef(true);
  const deviceRef = useRef("");
  const facingRef = useRef<"user" | "environment">("user");
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  mirroredRef.current = mirrored;

  const shown = available.filter((product) => matchesTrialFilter(product, filter) && product.name.toLowerCase().includes(query.toLowerCase()));
  const worn = outfitIds(outfit)
    .map((id) => available.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));
  const active = available.find((product) => product.id === activeId) ?? worn[worn.length - 1] ?? null;
  const usingFallback = worn.some((product) => !isCutout(product.overlayImage));

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
    layersRef.current = LAYER_ORDER.flatMap((slot) => {
      const id = outfit[slot];
      const product = id ? available.find((item) => item.id === id) : undefined;
      if (!product) return [];
      const src = product.overlayImage || product.images[0];
      let image = imagesRef.current.get(src);
      if (!image) {
        image = new Image();
        image.crossOrigin = "anonymous";
        image.src = src;
        imagesRef.current.set(src, image);
      }
      return [{ image, kind: resolveKind(product), cutout: isCutout(product.overlayImage) }];
    });
  }, [outfit, available]);

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
    let stopped = false;
    const video = videoRef.current;
    void withCameraLock(async () => {
      if (stopped) return;
      setCameraError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser cannot open a camera. Upload a photograph instead.");
        return;
      }
      try {
        const stream = await openVideoStream(deviceRef.current, facingRef.current);
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          await new Promise((resolve) => setTimeout(resolve, 300));
          return;
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setPhoto(null);
        const listed = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
        setCameras(listed);
        const activeDevice = stream.getVideoTracks()[0]?.getSettings().deviceId;
        if (activeDevice) setDeviceId(activeDevice);
        setRunning(true);
      } catch (error) {
        if (stopped) return;
        setCameraError(cameraErrorMessage(error));
        setRunning(false);
        const listed = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        setCameras(listed.filter((device) => device.kind === "videoinput"));
      }
    });
    return () => {
      stopped = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (video) video.srcObject = null;
    };
  }, [session]);

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
        layers: layersRef.current,
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

  function stopCamera() {
    deviceRef.current = "";
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
  }

  function choose(product: Product) {
    const kind = resolveKind(product);
    if (kind === "accessory") {
      toast("Shoes and accessories stay in the catalog. Choose a garment to wear.", "err");
      return;
    }
    setOutfit((current) => applyGarment(current, product.id, kind));
    setActiveId(product.id);
    setSizeChoice((current) => ({ ...current, [product.id]: current[product.id] ?? product.sizes[Math.min(2, product.sizes.length - 1)] ?? product.sizes[0] }));
    setColorChoice((current) => ({ ...current, [product.id]: current[product.id] ?? product.colors[0]?.name ?? "" }));
    setPreviewImage(null);
  }

  function currentSource() {
    if (photoRef.current) return photoRef.current;
    const video = videoRef.current;
    if (video && video.readyState >= 2) return video;
    return null;
  }

  function capture() {
    const canvas = canvasRef.current;
    const source = currentSource();
    if (!canvas || !source) return;
    try {
      setShot(canvas.toDataURL("image/jpeg", 0.9));
    } catch {
      setCameraError("The capture could not be saved from this frame.");
    }
  }

  async function useUpload(file: File | undefined) {
    if (!file) return;
    try {
      stopCamera();
      setPhoto(await readPhotoFile(file));
      setCameraError("");
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Could not read that photograph.");
    }
  }

  async function generatePreview() {
    const piece = previewPiece(outfit, available);
    const source = currentSource();
    if (!piece || !source) {
      setPreviewError("Select a garment and stand in frame before requesting a preview.");
      setPreviewOpen(true);
      return;
    }
    if (!consent) {
      setPreviewError("Confirm consent before this photograph is sent.");
      setPreviewOpen(true);
      return;
    }
    if (!hint.ready) {
      setPreviewError("Hold a clear, centered pose so your shoulders and hips are visible.");
      setPreviewOpen(true);
      return;
    }
    const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
    const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
    const clean = captureClean(source, width, height, mirrored);
    if (!clean) return;
    setPreviewOpen(true);
    setPreviewState("working");
    setPreviewError("");
    try {
      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          person: clean,
          garment: piece.tryOnImage || piece.images[0],
          category: fashnCategory(resolveKind(piece)),
        }),
      });
      const payload = (await response.json()) as { image?: string; error?: string };
      if (!response.ok || !payload.image) throw new Error(payload.error || "The preview request failed.");
      setPreviewImage(payload.image);
    } catch (error) {
      setPreviewImage(null);
      setPreviewError(error instanceof Error ? error.message : "The preview request failed.");
    } finally {
      setPreviewState("idle");
    }
  }

  function addOutfit() {
    if (!worn.length) {
      toast("Choose a garment first.", "err");
      return;
    }
    worn.forEach((product) => {
      addToCart({
        productId: product.id,
        size: sizeChoice[product.id] || product.sizes[0],
        color: colorChoice[product.id] || product.colors[0]?.name || "",
      });
    });
  }

  const status = running ? "Camera live" : photo ? "Photograph" : "Camera off";

  return (
    <div className="trial">
      <header className="trial-top">
        <div>
          <p className="eyebrow">AURELLE</p>
          <h1>Live Virtual Trial Room</h1>
        </div>
        <div className="trial-status">
          <span>{status}</span>
          <span>{modelState === "loading" ? "Preparing body tracking" : modelState === "error" ? "Tracking unavailable" : "Tracking on this device"}</span>
          <button type="button" onClick={() => stageRef.current?.requestFullscreen?.()}>
            Fullscreen
          </button>
        </div>
      </header>

      <section className="trial-stage" ref={stageRef}>
        <video ref={videoRef} playsInline muted autoPlay />
        <canvas ref={canvasRef} />
        {!running && !photo && (
          <div className="trial-empty">
            <p>{cameraError || "The camera is starting."}</p>
            <button className="btn btn-gold" type="button" onClick={() => setSession((value) => value + 1)}>
              Enable camera
            </button>
          </div>
        )}
        <p className={`trial-hint ${hint.ready ? "ready" : ""}`} aria-live="polite">
          {modelState === "loading" ? "Preparing body tracking…" : hint.message}
        </p>
        {usingFallback && worn.length > 0 && <p className="trial-fallback">Catalog photo fallback. This piece has no transparent garment cut-out.</p>}
        {cameras.length > 0 && (
          <label className="trial-devices">
            Camera
            <select
              value={deviceId}
              onChange={(event) => {
                deviceRef.current = event.target.value;
                setDeviceId(event.target.value);
                setSession((value) => value + 1);
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
        {shot && (
          <a className="trial-shot" href={shot} download="aurelle-trial.jpg">
            Download capture
          </a>
        )}
      </section>

      <aside className="trial-catalog">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clothing" aria-label="Search clothing" />
        <div className="trial-filters">
          {TRIAL_FILTERS.map((item) => (
            <button key={item.id} className={item.id === filter ? "on" : ""} type="button" onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="trial-rail">
          {shown.map((product) => {
            const selected = outfitIds(outfit).includes(product.id);
            return (
              <button key={product.id} className={selected ? "on" : ""} type="button" onClick={() => choose(product)}>
                <img src={product.images[0]} alt="" />
                <span>
                  <strong>{product.name}</strong>
                  <em>{money(product.price)}</em>
                  <small>{product.colors.map((color) => color.name).join(" · ")}</small>
                  {isCutout(product.overlayImage) ? <small>Transparent overlay</small> : <small>Catalog photo</small>}
                </span>
              </button>
            );
          })}
          {shown.length === 0 && <p>Nothing in this edit.</p>}
        </div>
      </aside>

      <footer className="trial-bottom">
        <div className="trial-controls">
          {running ? (
            <button type="button" onClick={stopCamera}>
              Stop camera
            </button>
          ) : (
            <button type="button" onClick={() => setSession((value) => value + 1)}>
              Start camera
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              facingRef.current = facingRef.current === "user" ? "environment" : "user";
              deviceRef.current = "";
              setSession((value) => value + 1);
            }}
          >
            Switch camera
          </button>
          <label>
            <input type="checkbox" checked={mirrored} onChange={(event) => setMirrored(event.target.checked)} />
            Mirror flip
          </label>
          <button type="button" onClick={capture} disabled={!running && !photo}>
            Capture photo
          </button>
          <button type="button" onClick={() => active && setOutfit((current) => removeGarment(current, active.id))} disabled={!active}>
            Remove garment
          </button>
          <button type="button" onClick={() => setOutfit(EMPTY_OUTFIT)}>
            Reset outfit
          </button>
          <button type="button" onClick={() => setPreviewOpen(true)}>
            Realistic AI Preview
          </button>
          <label className="upload">
            Upload
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void useUpload(event.target.files?.[0])} />
          </label>
        </div>
        <div className="trial-selected">
          {active ? (
            <>
              <div>
                <strong>{active.name}</strong>
                <span>{money(active.price)}</span>
                <Link to={`/product/${active.id}`}>View product</Link>
              </div>
              <div className="sizes">
                {active.sizes.slice(0, 6).map((option) => (
                  <button key={option} className={option === (sizeChoice[active.id] || active.sizes[0]) ? "on" : ""} type="button" onClick={() => setSizeChoice((current) => ({ ...current, [active.id]: option }))}>
                    {option}
                  </button>
                ))}
              </div>
              <div className="swatches">
                {active.colors.map((swatch) => (
                  <button
                    key={swatch.name}
                    className={swatch.name === (colorChoice[active.id] || active.colors[0]?.name) ? "on" : ""}
                    type="button"
                    aria-label={swatch.name}
                    style={{ background: swatch.hex }}
                    onClick={() => setColorChoice((current) => ({ ...current, [active.id]: swatch.name }))}
                  />
                ))}
              </div>
            </>
          ) : (
            <p>Select a garment. It appears on the live preview immediately.</p>
          )}
          <button className="btn btn-gold" type="button" onClick={addOutfit}>
            Add to cart
          </button>
        </div>
        {worn.length > 1 && (
          <p className="trial-layers">
            Wearing {worn.map((product) => product.name).join(", ")}. A full-length piece replaces a separate top and trousers.
          </p>
        )}
      </footer>

      {previewOpen && (
        <div className="trial-preview" role="dialog" aria-label="Realistic AI preview">
          <div>
            <h2>Realistic AI Preview</h2>
            <p>This sends one still photograph and {previewPiece(outfit, available)?.name ?? "the selected garment"} to the configured provider. The live trial keeps running without it.</p>
            <label>
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              I agree to send this capture for this request only. It is not saved on this server.
            </label>
            <div className="trial-preview-actions">
              <button className="btn btn-gold" type="button" disabled={previewState === "working"} onClick={() => void generatePreview()}>
                {previewState === "working" ? "Generating…" : "Generate preview"}
              </button>
              <button className="btn btn-line" type="button" onClick={() => setPreviewOpen(false)}>
                Back to live trial
              </button>
            </div>
            {previewError && <p className="trial-preview-error">{previewError}</p>}
            {previewImage && <img src={previewImage} alt="Realistic try-on result" />}
          </div>
        </div>
      )}
    </div>
  );
}
