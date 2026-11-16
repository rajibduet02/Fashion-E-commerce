# Implementation summary

The storefront was kept. The smart mirror is a new route, `/mirror`, with on-device pose and segmentation and a separate server path for one consented realistic try-on.

Audit and plan, written before the mirror code: `docs/CODEBASE_AUDIT.md`, `docs/IMPLEMENTATION_PLAN.md`.

## How to run

```bash
npm install
npm run dev
```

The shop is at `http://localhost:5173`. The mirror is `http://localhost:5173/mirror`.

Realistic try-on also needs the API process:

```bash
copy .env.example .env
npm run dev:api
```

Put `FASHN_API_KEY` in `.env` when you have one. Leave it empty to keep the mirror local. The API then returns 503 and the page shows that message instead of a fake picture. `TRYON_PROVIDER=none` disables the provider the same way.

Production bundle: `npm run build`, then `npm run preview`. Preview does not start the API. Run `npm run dev:api` beside it if you need `/api`. The preview server does not use the Vite proxy, so point the page at the API or keep using `npm run dev` while the API is on port 8787.

There is no database. Nothing to migrate. Shop data stays in `localStorage` (`aurelle.v2`).

## Environment

| Variable | Purpose |
| --- | --- |
| `TRYON_PORT` | API port. Default 8787. Bind is always loopback |
| `TRYON_PROVIDER` | `fashn` or `none` |
| `FASHN_API_KEY` | Server only. Never imported by the React app |
| `TRYON_FASHN_MODE` | `quality` (default) or `performance` |

## Files

New:

- `src/pages/Mirror.tsx`
- `src/mirror/geometry.ts`, `src/mirror/geometry.test.ts`
- `src/mirror/vision.ts`, `src/mirror/render.ts`
- `server/tryon.mjs`, `server/validate.mjs`, `server/validate.test.mjs`
- `vitest.config.ts`, `.env.example`
- `public/mediapipe/pose_landmarker_lite.task`, `public/mediapipe/selfie_segmenter.tflite`
- `docs/CODEBASE_AUDIT.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/AI_INTEGRATION.md`, `docs/TESTING_REPORT.md`

Changed:

- `src/App.tsx` adds `/mirror`
- `src/components/Header.tsx` and `src/components/Footer.tsx` link to the mirror
- `src/pages/Product.tsx` adds "See it in the mirror"
- `src/pages/Admin.tsx` shows the derived mirror fit
- `src/styles.css` adds the mirror layout
- `vite.config.ts` proxies `/api` to the local API
- `package.json` adds `dev:api` and `test` (Vitest)
- `.gitignore` ignores `.env`

Existing try-on, cart, checkout, account, and catalog data were not replaced.

## Known limits

- Catalog photographs are lifestyle images, not transparent garment cutouts. The live overlay crops the center of the photo and warps it to the body. Edges and backgrounds inside that crop can still look like a photograph laid on the body. A true alpha PNG per product would sit more cleanly. The realistic path is the one that can repaint the garment.
- Realistic results require a FASHN key and the API process. This project does not ship IDM-VTON or CatVTON weights.
- One pose is tracked. A second person is ignored.
- Shoulder, hip, and neck positions are for alignment. They are not body measurements.
- The selfie segmenter separates person from background. Arms are put back with pose capsules, not with a separate hand model.
- Try-on photographs are not stored. There is no account-level history of mirror captures.
- The atelier desk can attach a PNG or WebP overlay to a product. Until that file exists, the live trial labels the catalog photograph as a fallback. Anchor type still comes from the category unless a garment type is saved on the product.
- The Kurtis category is still empty, as it was before this work.

## Tests

`npm test` and `npm run build` passed on 15 November 2026. Details and the checks that still need a camera or a provider key are in `docs/TESTING_REPORT.md`.
