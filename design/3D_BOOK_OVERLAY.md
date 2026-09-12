# 2D room + 3D book overlay

The concept route at `/?concept-lab` demonstrates the intended boundary:

The pickup/inspect/return timing is defined in `BOOK_PICKUP_MOTION_REFERENCE.md`, distilled from the user-provided `khan-shelf.html` reference.

1. The room is a raster/illustration layer. It owns composition, texture and calm ambient motion.
2. Transparent React buttons sit over known book anchors. They are DOM controls with accessible labels, not raycasts hidden inside a canvas.
3. A click selects one `Book.id`, then opens one overlay dialog containing one orthographic React Three Fiber canvas.
4. The selected book is the same data object used by the list/detail flow. Its cover texture is drawn from the real cover URL when available, with a deterministic title/color fallback when it is not.
5. Closing the overlay unmounts the viewer. The room never becomes a 3D scene and does not need to render a canvas per book.

## Production shape

Move `BookModel` into a separate lazy `BookViewer3D` module. Keep `ConceptLab` or the production Home shell free of a Three import until the user selects a book. Preload the viewer module on hotspot focus/hover if the device has enough bandwidth, and use one shared viewer instance for all books.

The viewer should receive only serializable view props (`book`, `coverUrl`, `mode`) and report UI events upward. Dexie/Zustand remain the source of truth for status changes. The overlay can offer inspect, open, start reading and close; it should not mutate status simply because the model rotated.

## Smoothness rules

- Use one Canvas in the overlay, an orthographic camera, one model and a small light rig.
- Draw or load the cover texture once per selected book; dispose textures and geometry when the dialog closes.
- Keep the underlying 2D scene static while the overlay is active; avoid a second animation loop behind it.
- Use the pickup transition from `BOOK_PICKUP_MOTION_REFERENCE.md`: animate from the selected book anchor to center in about 900 ms with a small arc, then allow drag rotation. Return to the same anchor before unmounting.
- Respect reduced motion by disabling auto-rotation and leaving a static three-quarter view.
- Use a 44–48px DOM hotspot and keep a list fallback for users who do not use pointer input.
- On mobile, the viewer becomes a bottom sheet with a 280–340px canvas rather than a full-screen 3D takeover.

## Current proof

`src/design/ConceptLab.tsx` implements the proof with sample `Book` records and `public/concept/home-v5.png`. It is an art/interaction lab, not yet the production Home route. The browser check confirmed the 2D scene, three accessible book hotspots, dialog opening, 3D depth and auto-rotation. The current proof opens at center; the anchor-to-center pickup and return motion are the next implementation step. The existing production cover pipeline remains available for remote covers, local photos and cached covers.
