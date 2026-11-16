# Codebase audit — AURELLE

Audit date: 15 November 2026. Scope is the application source under `src/`, `public/`, `server/` (none at audit time), and the root config. `node_modules` was not treated as project code.

There is no Git repository in this folder (`git status` reports `fatal: not a git repository`). There are no commits to preserve and no uncommitted Git changes to protect. Existing source files were left in place and extended rather than replaced.

## Architecture

AURELLE is a single-page storefront. Vite 7 serves a React 19 and TypeScript application. Routing is `react-router-dom` 7 in `src/App.tsx`. All shop state lives in `src/store.tsx` and is persisted to `localStorage` under the key `aurelle.v2`.

There is no application backend, database, authentication service, or job queue. Checkout, payments, coupons, and the admin desk are simulated in the browser. Photographs and generated previews never leave the browser unless a future server is added.

| Area | Location | Status |
| --- | --- | --- |
| Storefront shell | `src/App.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx` | Fully implemented |
| Design system | `src/styles.css`, `index.html` (Playfair Display, Inter) | Fully implemented |
| Catalog data | `src/data.ts`, `src/types.ts` | Implemented, requires improvement for a mirror |
| Cart, checkout, account, wardrobe, admin | `src/pages/*`, `src/store.tsx` | Fully implemented as a client prototype |
| Photo try-on | `src/pages/TryOn.tsx`, `src/face.ts`, `src/lib.ts` | Partially implemented |
| Live camera / smart mirror | — | Not implemented |
| Pose tracking | — | Not implemented |
| Person segmentation | — | Not implemented |
| Cloud virtual try-on | — | Not implemented |

## Dependencies

From `package.json`:

- `react`, `react-dom` 19
- `react-router-dom` 7
- `@mediapipe/tasks-vision` 1.2.3

Dev: `vite` 7, `typescript` 5.9, `@vitejs/plugin-react`.

No test runner, linter, UI kit, or server framework is installed. MediaPipe wasm and the face models are copied into `public/mediapipe/` and loaded from `/mediapipe`, so the face detector does not depend on a CDN at runtime.

Scripts: `dev`, `build` (`tsc --noEmit && vite build`), `preview`. No `test` or `lint` script.

## Routes and screens

Defined in `src/App.tsx`:

- `/` home, `/men`, `/women`, `/new`, `/trending`, `/edit/:season`
- `/product/:id`
- `/try-on` photo fitting room
- `/wardrobe`, `/cart`, `/checkout`, `/account`, `/account/:tab`
- `/wishlist`, `/search`, `/care`
- `/admin` without the storefront header
- `*` not found

Camera capture on the try-on page is an `<input capture>` file picker in `src/pages/TryOn.tsx`. It is not a live `MediaDevices` preview.

## Existing try-on

`src/face.ts` loads BlazeFace (full and short range) and the Face Landmarker (`public/mediapipe/face_landmarker.task`). `renderLook` in `src/lib.ts` places the visitor’s face oval onto the catalog photograph and crops the frame so the head stays visible.

That path is a local visualization. It does not track a live body, does not overlay a transparent garment on a camera feed, and does not call a garment-transfer model. Photos that do not contain a clear front-facing face are rejected instead of inventing a result.

## Catalog

`src/data.ts` holds men’s and women’s categories and about 35 products. Images are Unsplash URLs built by `img()` in `src/lib.ts`. They are ordinary photographs, not transparent AR cutouts, and they have no anchor metadata.

`Product` in `src/types.ts` has id, sku, name, gender, category, price, colors, sizes, images, copy, stock, and merchandising flags. It does not have a brand, a separate overlay asset, or anchor points.

The admin desk (`src/pages/Admin.tsx`) can add a product, edit stock, archive, hide categories, and manage coupons. New products get a placeholder photograph. There is no login. The desk is a client-side prototype.

## AI, security, and performance

- Face inference runs in the browser. No API keys exist. There is no `.env` or `.env.example`.
- Card numbers are not stored. Checkout keeps a last-four only if the visitor saves a card in the account prototype.
- `localStorage` holds cart, photos, looks, and orders. That is appropriate for a demo and is not private server storage.
- The try-on composite is synchronous on the main thread after the model loads. There is no live-video loop to leak, and also no live-video loop to reuse.
- No automated tests were present. `tsc --noEmit` was the only check in the build.

## Issues to fix while extending

1. A live mirror cannot be simulated by the still-photo face composite. It needs its own page and a pose-driven renderer.
2. Catalog photos cannot be treated as alpha garments. Overlays need a body quad, a soft mask, and occlusion of the face and arms.
3. A cloud try-on must not run in the browser with a key, and it must not invent an image when no provider is configured.
4. Measurements from an uncalibrated webcam must not be presented as centimetres.

## Priority

1. Smart mirror shell on the existing design system and catalog.
2. Camera lifecycle, device selection, and an upload fallback.
3. Local pose tracking, smoothing, and positioning guidance.
4. Landmark-anchored garment overlay with segmentation and arm/face occlusion.
5. A server-side provider interface for FASHN, disabled cleanly when no key is set.
6. Tests for the geometry and request validation, plus typecheck and production build.
