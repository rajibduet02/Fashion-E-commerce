# Live trial room

Route: `/trial`. Navigation label: Live Trial. Page title: Live Virtual Trial Room.

The page is a dressing room on top of the mirror engines. It does not load a second copy of the MediaPipe models. `loadPoseLandmarker` and `loadSegmenter` return the same promises the mirror already uses.

## What happens on the page

Opening `/trial` asks for the camera immediately. The stream stays up while the catalog is filtered and while garments are switched. Changing clothes does not call `getUserMedia` again. Leaving the page stops the tracks.

The stage is the wide column. The catalog is the narrow column. On a narrow screen the stage comes first, then the controls, then a horizontally scrolling set of categories and the product list.

A click on a garment updates the outfit and the next animation frame draws it. There is no Generate step for the live overlay.

## Outfit rules

Slots are upper body, lower body, full length, and outerwear.

- A shirt and jeans can be worn together.
- A jacket sits over a shirt, jeans, or a dress.
- Choosing a dress clears the separate top and trousers, because those regions overlap.
- Choosing the same piece again removes it. Reset outfit clears every slot.
- Shoes and accessories stay in the catalog and are not placed on the body.

Layer order, back to front: trousers, top, dress, jacket. The head and arms are redrawn from the camera after every layer, so the face and hands stay visible.

If pose confidence drops, the last pose is held for a few frames. After that the garment comes off and the framing hint is shown instead of a guess.

## Garment files

Products gained optional fields: `overlayImage`, `tryOnImage`, `garmentMask`, `anchorPoints`, and `garmentType`. Older `aurelle.v2` saves do not have them. Missing fields are ignored.

`overlayImage` is meant to be a transparent PNG or WebP of the garment alone. The atelier desk uploads it from the Products table. The file stays in the existing browser save, capped at 1.6 MB. A JPEG can be stored, and the trial treats it as a photograph because it has no transparency.

When `overlayImage` is absent, the trial still warps the catalog photo and shows the line “Catalog photo fallback. This piece has no transparent garment cut-out.” That fallback is not described as a cut-out.

`tryOnImage`, when present, is the picture sent to FASHN. Otherwise the catalog image is sent. `garmentType` overrides the category anchor. `anchorPoints` is stored for a product and is not used as a body measurement.

## Realistic preview

**Realistic AI Preview** opens a consent panel, captures a clean frame with no overlay, and posts one garment to the existing `/api/try-on` route. The garment is the dress if one is worn, otherwise the jacket, top, or trousers. Without `FASHN_API_KEY` the server returns 503 and the panel shows that error. The live camera is unchanged.

## Cart

Add to cart uses the existing cart action and adds each piece currently worn, with the size and color chosen in the trial bar.

## Not claimed

The overlay is a 2D warp. It is not a fabric simulation and it does not measure clothing size.
