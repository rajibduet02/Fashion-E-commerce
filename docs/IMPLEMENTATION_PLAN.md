# Implementation plan

The storefront, catalog, cart, account, admin desk, and still-photo try-on stay as they are. The mirror is a new route and a set of modules beside them.

## Mirror interface

Add `/mirror` inside the existing storefront layout. Reuse the ink, ivory, and gold tokens in `src/styles.css`.

The screen has a large stage and a catalog column. The catalog filters by category and selects a product already in the store. Controls cover camera start and stop, device choice, front and rear facing modes, mirror flip, fullscreen, live AR, captured realistic try-on, photo capture, before and after, and reset.

Portrait and narrow layouts stack the catalog under the stage so a vertical mirror display still works.

## Camera

Use `navigator.mediaDevices`. Ask for a video track only. List cameras after permission. Release tracks on stop and on unmount. If the hardware or the permission is missing, accept a still photograph and run the same overlay on that image.

Guidance is derived from pose landmarks: step back, move closer, stand in the center, show more of the body, improve the light, hold still. These are framing hints. They are not body measurements.

## Tracking and overlay

Load MediaPipe Pose Landmarker (lite) from `public/mediapipe`, using the wasm already shipped for the face tools. Read shoulders, elbows, wrists, hips, knees, and ankles. Estimate the neck from the shoulder midpoint. Smooth landmarks with an exponential blend and keep the last good pose for a few frames when detection drops.

Map each catalog category to an anchor profile: top, outerwear, dress, bottoms, or accessory. Warp the product photograph into the landmark quad with two affine triangles. Feather the edge. Run the selfie segmenter on a slower cadence and use it so the garment does not paint the background. Redraw the head and the arms from the live frame so the face stays visible and arms can pass in front of the cloth.

Inference is skipped when a previous pass is still running. The camera frame is drawn every animation frame from the latest landmarks. Frames are not uploaded.

## Realistic try-on

Add `server/tryon.mjs`. The browser posts one consented capture and the garment image to `/api/try-on`. The server is the only place that reads `FASHN_API_KEY`. The provider is a function map so another model can be added without changing the page.

If the key or provider is missing, the server returns `TRYON_PROVIDER_UNCONFIGURED` and the page shows that message. It does not draw a substitute “AI” image. The existing face composite on `/try-on` remains a local preview and is labeled as one.

Uploads are size-checked, consent is required, requests are rate-limited, and images are not written to disk.

## Catalog and admin

Anchor profiles are derived from the existing category string. The admin product table shows that profile. No localStorage migration and no new database.

## Checks

Unit tests cover anchor mapping, smoothing, guidance, the affine warp, and API validation. `tsc` and `vite build` stay the production checks. Camera hardware and a FASHN key are called out as manual tests.
