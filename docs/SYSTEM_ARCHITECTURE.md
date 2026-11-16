# System architecture

AURELLE remains a Vite, React, and TypeScript storefront. The smart mirror is a route inside that storefront. Shop data still lives in the browser under `localStorage` key `aurelle.v2`. There is no database and no migration.

## Browser

| Piece | Role |
| --- | --- |
| `src/pages/Mirror.tsx` | Camera, catalog, capture, and the realistic-try-on request |
| `src/pages/Trial.tsx` | Live trial room. Same tracker, layered outfit, catalog stays on screen |
| `src/mirror/outfit.ts` | Which garments can be worn together, and the trial filters |
| `src/mirror/vision.ts` | Loads Pose Landmarker and the selfie segmenter from `/mediapipe` |
| `src/mirror/geometry.ts` | Landmark smoothing, framing hints, and garment quads |
| `src/mirror/render.ts` | Draws the camera, warps the garment, and restores the head and arms |
| `src/pages/TryOn.tsx`, `src/face.ts` | Existing still-photo face alignment. Unchanged |

The mirror page draws the camera or an uploaded photograph on a canvas every animation frame. Pose and segmentation run after that paint, on a timer, and only when the previous pass has finished. If a pass takes longer than about 50ms, the next one or two frames skip inference. A dropped pose is held for up to eight frames.

Live frames are not uploaded. A realistic try-on sends one JPEG captured from the clean camera frame, after the person checks the consent box.

## Server

`server/tryon.mjs` listens on `127.0.0.1` and port `TRYON_PORT` (default 8787). Vite proxies `/api` to that process during `npm run dev`.

The only route is `POST /api/try-on`. The handler validates the body, rate-limits by IP (8 requests in 10 minutes), and deduplicates an in-flight request that repeats the same person image, garment, and category. The server does not write the photograph to disk. The response is a data URL or an error code. Nothing is stored as try-on history.

## Garment placement
``````` 
Catalog categories map to an anchor:

| Catalog examples | Anchor | Provider category 
| --- | --- | --- |
| T-shirts, shirts, tops | Upper body | `tops` |
| Jackets, hoodies, suits | Outer layer | `tops` |
| Dresses, sarees, party wear, traditional wear | Full length | `one-pieces` |
| Jeans, trousers, skirts | Lower body | `bottoms` |
| Shoes and accessories | Accessory | `auto` |

The product photograph is not a transparent cutout. The overlay uses the central region of that photograph and warps it onto the torso or legs. The selfie segmenter keeps the warp off the background. The head band and arm capsules are copied back from the camera so the face and arms stay in front of the cloth.

## Privacy boundary

Pose and segmentation stay in the browser. The realistic path is the only upload, and it requires an explicit checkbox. The API key stays in the server environment. `.env` is gitignored. `.env.example` lists the variable names with empty secrets.
