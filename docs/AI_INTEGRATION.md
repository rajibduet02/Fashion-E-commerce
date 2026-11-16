# AI integration

Two different systems share the mirror. They are not interchangeable.

## On-device tracking

Package: `@mediapipe/tasks-vision` 1.2.3. Models are local files, not a CDN:

- `public/mediapipe/pose_landmarker_lite.task`
- `public/mediapipe/selfie_segmenter.tflite`
- `public/mediapipe/vision_wasm_internal.js` and `.wasm` (already used by the face try-on)

`loadPoseLandmarker` tries the GPU delegate and falls back to CPU. The landmarker runs in VIDEO mode, tracks one pose, and reads shoulders, elbows, wrists, hips, knees, and ankles. The neck is the shoulder midpoint shifted upward by a fraction of the shoulder span. It is an estimate for placing cloth, not a measured landmark.

The segmenter outputs a category mask. Any non-zero class is treated as the person. It runs about every 220ms, slower than pose, so the overlay can stay interactive.

Framing messages come from landmark confidence and position: step in, show the shoulders, improve the light, move closer, step back, stand in the center, show more of the body, turn toward the mirror, hold. These are image-space hints. An uncalibrated webcam cannot produce centimetre measurements, and the UI does not claim any.

The live trial at `/trial` uses this same on-device tracker. Selecting a garment updates the overlay immediately and does not call FASHN. **Realistic AI Preview** is the only control on that page that can reach the provider, and only after consent.

## Captured-image try-on

Provider interface: the `providers` map in `server/tryon.mjs`. The active name is `TRYON_PROVIDER` (`fashn` by default, or `none` to disable). An unknown name returns `TRYON_PROVIDER_UNKNOWN`. Adding a provider means adding a function with the same input shape. The page does not change.

The configured provider is FASHN try-on v1.6:

1. `POST https://api.fashn.ai/v1/run` with `model_name: "tryon-v1.6"`.
2. Inputs are `model_image` (the consented capture), `garment_image` (the catalog URL or data URL), `category` (`tops`, `bottoms`, `one-pieces`, or `auto`), `garment_photo_type: "model"`, and `mode` (`quality`, or `performance` when `TRYON_FASHN_MODE=performance`).
3. Poll `GET https://api.fashn.ai/v1/status/{id}` until `completed` or about 60 seconds.
4. Download the output URL on the server and return it to the browser as a data URL.

Authorization is `Bearer` plus `FASHN_API_KEY`. The browser never sees that key.

If the key is missing, or `TRYON_PROVIDER=none`, the API responds with HTTP 503 and `TRYON_PROVIDER_UNCONFIGURED`. The page shows that message. It does not paint a stand-in image.

IDM-VTON and CatVTON were not installed. They need a local GPU stack and model weights that this project does not ship. FASHN is the specialized try-on API that fits the existing Node process. A later provider can be registered in the same map.

## What the realistic result is asked to keep

FASHN try-on is a garment-transfer model: the captured person and the selected product image are the inputs. The request does not ask a general image model to invent a new person. Facial identity, pose, and garment fidelity are properties of that model and of the photographs sent to it. This app does not post-edit the provider image.

## Request rules

- Consent must be the boolean `true`.
- The person image must be a JPEG, PNG, or WEBP data URL, at most about 8MB.
- The garment must be an `http(s)` URL or an image data URL.
- Eight requests per IP per ten minutes. A repeated in-flight payload shares one provider job.
- The server logs the category and the error code. It does not log image bytes.
