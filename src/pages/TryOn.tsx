import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { useTitle } from "../hooks";
import { warmFaceDetector } from "../face";
import { money, readPhotoFile, renderLook } from "../lib";
import type { Product } from "../types";

const STAGES = ["Finding your face", "Aligning it to the outfit", "Matching light and color"];

export function TryOn() {
  useTitle("AI Try-On");
  const { products, photos, addPhoto, addLook, addToCart, recordTryOn } = useStore();
  const [params] = useSearchParams();
  const location = useLocation();
  const incoming = (location.state as { photo?: string } | null)?.photo;

  const initialProduct = params.get("product");
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<string | null>(incoming ?? null);
  const [photoLabel, setPhotoLabel] = useState(incoming ? "From your wardrobe" : "");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [productId, setProductId] = useState(initialProduct ?? "w3");
  const [color, setColor] = useState(params.get("color") ?? "");
  const [size, setSize] = useState("");
  const [gender, setGender] = useState<"all" | "men" | "women">("all");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [signature, setSignature] = useState("");
  const [view, setView] = useState<"slider" | "side">("slider");
  const [zoom, setZoom] = useState<"before" | "after" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  useEffect(() => {
    void warmFaceDetector();
  }, []);

  const available = products.filter((product) => !product.archived);
  const product = available.find((item) => item.id === productId) ?? available[0];

  useEffect(() => {
    if (!product) return;
    if (!product.colors.some((swatch) => swatch.name === color)) setColor(product.colors[0]?.name ?? "");
    if (!product.sizes.includes(size)) setSize(product.sizes.length === 1 ? product.sizes[0] : product.sizes[Math.min(2, product.sizes.length - 1)]);
  }, [product, color, size]);

  useEffect(() => {
    if (step !== 3 || !photo || !product) return;
    const id = ++run.current;
    setProgress(8);
    setStage(0);
    setError("");
    const timers = [
      window.setTimeout(() => {
        if (run.current === id) {
          setProgress(36);
          setStage(1);
        }
      }, 700),
      window.setTimeout(() => {
        if (run.current === id) {
          setProgress(68);
          setStage(2);
        }
      }, 1400),
    ];
    const finish = window.setTimeout(async () => {
      if (run.current !== id) return;
      const tint = product.colors.find((swatch) => swatch.name === color)?.hex ?? "#B89B72";
      try {
        const composed = await renderLook(photo, product.images[0], tint);
        if (run.current !== id) return;
        setResult(composed);
        setSignature(`${product.id}:${color}`);
        setProgress(100);
        recordTryOn(product.id);
        window.setTimeout(() => {
          if (run.current === id) setStep(4);
        }, 350);
      } catch (reason) {
        if (run.current !== id) return;
        setResult(null);
        setError(reason instanceof Error ? reason.message : "We couldn’t compose this photograph. Try another image with even light.");
        setStep(4);
      }
    }, 2300);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
  }, [step, photo, product, color, recordTryOn]);

  async function useFile(file: File | undefined) {
    if (!file) return;
    try {
      const src = await readPhotoFile(file);
      setPhoto(src);
      setPhotoLabel("Your photograph");
      setError("");
      setResult(null);
      addPhoto({ id: crypto.randomUUID(), src, label: "Uploaded photograph", createdAt: Date.now() });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not use that file.");
    }
  }

  const stale = Boolean(result && signature && signature !== `${product?.id}:${color}`);
  const filtered = available.filter((item) => gender === "all" || item.gender === gender);

  function download() {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result;
    link.download = `aurelle-${product?.id ?? "look"}.jpg`;
    link.click();
  }

  function saveLook() {
    if (!photo || !result || !product) return;
    addLook({
      id: crypto.randomUUID(),
      photo,
      result,
      productId: product.id,
      color,
      size: size || product.sizes[0],
      createdAt: Date.now(),
    });
  }

  return (
    <div className="studio">
      <div className="studio-top wrap">
        <div>
          <p className="eyebrow">AI fitting room</p>
          <h1>Try it on, then decide.</h1>
        </div>
        <ol className="stepper">
          {["Photograph", "Outfit", "Compose", "Your look"].map((label, index) => {
            const number = index + 1;
            const enabled = number < 3 || (number === 4 && result);
            return (
              <li key={label}>
                <button
                  className={step === number ? "on" : ""}
                  disabled={!enabled || step === 3}
                  onClick={() => enabled && step !== 3 && setStep(number)}
                >
                  <span>0{number}</span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="studio-grid wrap">
        <section className="stage">
          {step === 1 && (
            <PhotoStep
              photo={photo}
              label={photoLabel}
              dragOver={dragOver}
              error={error}
              onBrowse={() => fileRef.current?.click()}
              onCamera={() => cameraRef.current?.click()}
              onDrag={(over) => setDragOver(over)}
              onDrop={(file) => void useFile(file)}
              onClear={() => {
                setPhoto(null);
                setResult(null);
              }}
              onContinue={() => photo && setStep(2)}
              samples={photos}
              onSample={(src, name) => {
                setPhoto(src);
                setPhotoLabel(name);
                setError("");
                setResult(null);
              }}
            />
          )}
          {step === 3 && photo && (
            <div className="processing">
              <div className="scan-frame">
                <img src={photo} alt="Your photograph being prepared" />
                <span className="scan-line" />
              </div>
              <div className="progress">
                <div style={{ width: `${progress}%` }} />
              </div>
              <p>{STAGES[stage]}</p>
              <small>{progress}%</small>
            </div>
          )}
          {(step === 2 || step === 4) && photo && product && (
            <ResultStage
              step={step}
              photo={photo}
              result={result}
              product={product}
              view={view}
              setView={setView}
              zoom={zoom}
              setZoom={setZoom}
              error={error}
              stale={stale}
            />
          )}
        </section>

        <aside className="studio-side">
          {product && (
            <>
              <p className="eyebrow">{step === 1 ? "Selected to try" : "Outfit"}</p>
              <img className="side-product" src={product.images[0]} alt={product.name} />
              <h2>{product.name}</h2>
              <p className="quiet">
                {product.category} · {money(product.price)}
              </p>
              <p>{product.description}</p>
              <div className="choice">
                <div className="choice-label">
                  <span>Color</span>
                  <strong>{color}</strong>
                </div>
                <div className="swatches">
                  {product.colors.map((swatch) => (
                    <button
                      key={swatch.name}
                      className={color === swatch.name ? "on" : ""}
                      style={{ background: swatch.hex }}
                      aria-label={swatch.name}
                      onClick={() => setColor(swatch.name)}
                    />
                  ))}
                </div>
              </div>
              <div className="choice">
                <div className="choice-label">
                  <span>Size for checkout</span>
                  <strong>{size}</strong>
                </div>
                <div className="sizes">
                  {product.sizes.map((option) => (
                    <button key={option} className={size === option ? "on" : ""} onClick={() => setSize(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <button className="btn btn-gold btn-full" disabled={!photo || !product} onClick={() => setStep(3)}>
              Generate my look
            </button>
          )}
          {step === 4 && (
            <div className="stack">
              {stale && <p className="notice">You changed the outfit. Generate again to refresh the preview.</p>}
              <button className="btn btn-gold btn-full" disabled={!photo} onClick={() => setStep(3)}>
                {result ? "Generate again" : "Generate my look"}
              </button>
              <button className="btn btn-line btn-full" onClick={() => setStep(2)}>
                Try another outfit
              </button>
              <button className="btn btn-line btn-full" disabled={!result} onClick={download}>
                Download result
              </button>
              <button className="btn btn-line btn-full" disabled={!result} onClick={saveLook}>
                Save to My Looks
              </button>
              <button
                className="btn btn-primary btn-full"
                disabled={!product || product.stock === 0}
                onClick={() => product && addToCart({ productId: product.id, size: size || product.sizes[0], color })}
              >
                {product?.stock === 0 ? "Sold out" : "Add to cart"}
              </button>
              <Link className="text-btn" to="/wardrobe">
                Open virtual wardrobe
              </Link>
            </div>
          )}
          {step < 4 && (
            <p className="fine-note">
              The preview is a visualization composed from your photograph and the garment. Actual fit, fabric, and appearance may vary.
            </p>
          )}
        </aside>
      </div>

      {(step === 2 || step === 4) && (
        <section className="wrap outfit-picker">
          <div className="section-head">
            <h2>Choose another piece</h2>
            <div className="chip-wrap">
              {(["all", "women", "men"] as const).map((option) => (
                <button key={option} className={`chip light ${gender === option ? "on" : ""}`} onClick={() => setGender(option)}>
                  {option === "all" ? "All" : option === "women" ? "Women" : "Men"}
                </button>
              ))}
            </div>
          </div>
          <div className="rail">
            {filtered.map((item) => (
              <button key={item.id} className={`mini ${item.id === product?.id ? "on" : ""}`} onClick={() => setProductId(item.id)}>
                <img src={item.images[0]} alt="" />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <aside className="disclaimer">
        <strong>A visualization, not a fitting guarantee.</strong>
        <span>AI-generated previews show a possible appearance. Cloth, drape, color, and size in person can differ from the image.</span>
      </aside>

      <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void useFile(event.target.files?.[0])} />
      <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => void useFile(event.target.files?.[0])} />

      {zoom && (
        <div className="modal-wrap" onMouseDown={() => setZoom(null)}>
          <div className="modal wide" onMouseDown={(event) => event.stopPropagation()}>
            <img className="zoom-img" src={zoom === "after" && result ? result : photo ?? ""} alt={zoom === "after" ? "AI visualization" : "Original photograph"} />
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoStep({
  photo,
  label,
  dragOver,
  error,
  onBrowse,
  onCamera,
  onDrag,
  onDrop,
  onClear,
  onContinue,
  samples,
  onSample,
}: {
  photo: string | null;
  label: string;
  dragOver: boolean;
  error: string;
  onBrowse: () => void;
  onCamera: () => void;
  onDrag: (over: boolean) => void;
  onDrop: (file: File | undefined) => void;
  onClear: () => void;
  onContinue: () => void;
  samples: { id: string; src: string; label: string }[];
  onSample: (src: string, label: string) => void;
}) {
  return (
    <div className="photo-step">
      {!photo ? (
        <div
          className={`drop ${dragOver ? "over" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            onDrag(true);
          }}
          onDragLeave={() => onDrag(false)}
          onDrop={(event) => {
            event.preventDefault();
            onDrag(false);
            onDrop(event.dataTransfer.files?.[0]);
          }}
        >
          <p className="eyebrow">Step one</p>
          <h2>Upload your photo</h2>
          <p>Drop a photograph here, or choose one from your device.</p>
          <div className="hero-actions">
            <button className="btn btn-gold" onClick={onBrowse}>
              Upload image
            </button>
            <button className="btn btn-line" onClick={onCamera}>
              Use camera
            </button>
          </div>
        </div>
      ) : (
        <div className="preview-block">
          <img src={photo} alt="Selected photograph" />
          <div>
            <p className="eyebrow">{label}</p>
            <h2>This is the photograph we’ll use.</h2>
            <div className="hero-actions">
              <button className="btn btn-gold" onClick={onContinue}>
                Continue
              </button>
              <button className="btn btn-line" onClick={onBrowse}>
                Replace
              </button>
              <button className="btn btn-line" onClick={onCamera}>
                Retake
              </button>
              <button className="text-btn" onClick={onClear}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="err-text">{error}</p>}
      <div className="reqs">
        <h3>A useful photograph</h3>
        <ul>
          <li>JPG, PNG, or WEBP, up to 8 MB.</li>
          <li>Full or three-quarter length works best.</li>
          <li>Keep your full face in the frame and look toward the camera.</li>
          <li>Even light. A plain background helps.</li>
        </ul>
      </div>
      <div>
        <h3 className="sample-title">Or start from a studio sample</h3>
        <div className="samples">
          {samples.map((sample) => (
            <button key={sample.id} onClick={() => onSample(sample.src, sample.label)}>
              <img src={sample.src} alt="" />
              <span>{sample.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultStage({
  step,
  photo,
  result,
  product,
  view,
  setView,
  zoom,
  setZoom,
  error,
  stale,
}: {
  step: number;
  photo: string;
  result: string | null;
  product: Product;
  view: "slider" | "side";
  setView: (view: "slider" | "side") => void;
  zoom: "before" | "after" | null;
  setZoom: (zoom: "before" | "after" | null) => void;
  error: string;
  stale: boolean;
}) {
  const after = result ?? product.images[0];
  return (
    <div className="result-stage">
      {step === 2 && (
        <div className="preview-block solo">
          <img src={photo} alt="Your photograph" />
          <p>Photograph ready. Choose a color, then generate the look.</p>
        </div>
      )}
      {step === 4 && (
        <>
          <div className="view-toggle">
            <button className={view === "slider" ? "on" : ""} onClick={() => setView("slider")}>
              Before / after
            </button>
            <button className={view === "side" ? "on" : ""} onClick={() => setView("side")}>
              Side by side
            </button>
          </div>
          {error && <p className="err-text">{error}</p>}
          {view === "slider" ? (
            <Compare before={photo} after={after} stale={stale || !result} />
          ) : (
            <div className="side-by-side">
              <figure>
                <button onClick={() => setZoom("before")}>
                  <img src={photo} alt="Original photograph" />
                </button>
                <figcaption>Original photo</figcaption>
              </figure>
              <figure>
                <button onClick={() => setZoom("after")}>
                  <img src={after} alt="AI try-on visualization" />
                </button>
                <figcaption>{result ? "AI try-on" : "Garment reference"}</figcaption>
              </figure>
            </div>
          )}
          <div className="zoom-row">
            <button className="text-btn" onClick={() => setZoom("before")}>
              Zoom original
            </button>
            <button className="text-btn" onClick={() => setZoom("after")}>
              Zoom preview
            </button>
          </div>
          <p className="fine-note">
            Your face from the photograph is aligned onto the outfit. Actual fit, fabric, color, and appearance may vary.
          </p>
          {zoom ? null : stale && <p className="notice">Preview is from the previous color. Generate again to update it.</p>}
        </>
      )}
    </div>
  );
}

function Compare({ before, after, stale }: { before: string; after: string; stale: boolean }) {
  const [pos, setPos] = useState(56);
  const box = useRef<HTMLDivElement>(null);

  function move(clientX: number) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(92, Math.max(8, next)));
  }

  const label = useMemo(() => (stale ? "Reference" : "AI try-on"), [stale]);

  return (
    <div
      className="compare"
      ref={box}
      onPointerDown={(event) => {
        (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
        move(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.buttons === 1 || event.currentTarget.hasPointerCapture(event.pointerId)) move(event.clientX);
      }}
    >
      <img src={after} alt={label} />
      <img src={before} alt="Original photograph" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <i style={{ left: `${pos}%` }} />
      <span className="tag left">Before</span>
      <span className="tag right">{label}</span>
    </div>
  );
}
