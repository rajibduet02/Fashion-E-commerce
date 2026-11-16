# Testing report

Date: 15 November 2026.

## Automated

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npm test` (`vitest run`) | 12 tests, 2 files, passed |
| `npm run build` | Passed. CSS about 32 kB gzip 7.4 kB. App JS about 408 kB gzip 127 kB. MediaPipe bundle about 144 kB gzip 44 kB |
| ESLint | Not installed. There is no lint script |
| End-to-end runner | Not installed. Browser checks below were done by hand in the dev server |

Unit coverage:

- Category to anchor, and anchor to FASHN category (`src/mirror/geometry.test.ts`)
- Framing hints for a missing person, distance, centering, and a held pose
- Landmark smoothing, including a low-confidence point that keeps the previous position
- Affine triangle mapping
- Garment quad on a torso, and rejection when the hips are missing
- Try-on body validation: consent, JPEG, rejected GIF, unknown category falling back to `auto` (`server/validate.test.mjs`)

## API, without a provider key

`node server/tryon.mjs` reported `provider=unconfigured`.

- Missing consent: HTTP 400, "Consent is required before a photograph can be uploaded."
- Consented JPEG with no `FASHN_API_KEY`: HTTP 503, code `TRYON_PROVIDER_UNCONFIGURED`. The body explains that the live mirror still runs on the device. No image was returned.
- Vite proxy `POST http://localhost:5173/api/try-on` with a GIF data URL: HTTP 400, "Use a JPEG, PNG, or WEBP photograph."

## Browser

Dev server: `http://localhost:5173/mirror`.

| Scenario | What happened |
| --- | --- |
| Mirror route, catalog, category chips, color and size | Crimson Gown opened as the default dress. Selecting Selvedge Straight Jean switched the panel to Jeans & Pants, lower-body placement, indigo, and waist sizes |
| Product page | `/product/w3` still shows Try it with AI, cart, and reviews, and adds See it in the mirror |
| Admin products | The table has a Mirror fit column (Upper body, Lower body, and the other derived labels). Stock editing is unchanged |
| Body tracking on an uploaded full-body photograph | Pose loaded from local files. The gown warp followed the torso. The face and arms stayed visible. A raised-arm pose first collapsed the cloth into a strip; the quad now uses the wider of the shoulders and hips |
| Camera hardware | `getUserMedia` returned `NotReadableError: Could not start video source`. The stage shows that the camera is busy or unavailable and keeps the upload path. Permission-denied and no-camera branches are coded and covered by the error names; this machine did not produce those two errors |
| Realistic try-on without consent | "Confirm consent before this photograph is sent." |
| Generate with consent and no capture | "Capture a photograph before generating a try-on." |
| Generate after capture while the pose is turned | "Hold a clear, centered pose so your shoulders and hips are visible." No substitute image was shown |
| Narrow layout | At a 390×844 viewport the stage stacks under the title and the mode switch. The catalog sits below the stage |
| Storefront regression | Header, footer, product purchase actions, and the admin desk still render |

## Live trial (`/trial`)

Checked in the browser on 15 November 2026.

- The route opens with the title Live Virtual Trial Room and a Live Trial item in the main navigation.
- The camera started on entry and reported that the hardware was busy. Enable Camera, upload, and the framing hint stayed available.
- An uploaded full-body photograph kept tracking while Merino Crew and Selvedge Straight Jean were selected together. The stage labeled the catalog photographs as a fallback, not as cut-outs. The face and arms stayed visible.
- Add to cart put both pieces in the existing bag (Indigo, size 32, and Ivory, size M, total $266).
- Realistic AI Preview asked for consent and did not invent an image.
- Dresses filter showed Crimson Gown and Floral Coast Dress.
- At 390px wide the stage, controls, and selected piece stack in one column.

## Needs a person, a camera, or a key

These were not completed here:

- Front and rear cameras, an external USB webcam, and a granted permission prompt
- Full-screen mirror on a portrait kiosk
- Walking, stepping out of frame, and returning, on a live camera
- Several people in the frame (the landmarker is configured for one pose)
- Low light and partial body on a live camera
- A completed FASHN image, a provider timeout, and a network drop during polling
- Download of a real provider image

The live overlay and the error paths above are what this environment could exercise.
