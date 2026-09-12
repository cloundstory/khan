"""Remove a baked neutral checkerboard from a single warm-toned object.

This is intentionally narrow asset-workshop tooling. It detects the warm object,
builds a solid silhouette from its vertical extents, and writes a true RGBA PNG.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def longest_true_run(values: np.ndarray) -> tuple[int, int]:
    best_start = best_end = 0
    run_start: int | None = None
    for index, value in enumerate(values):
        if value and run_start is None:
            run_start = index
        if run_start is not None and (not value or index == len(values) - 1):
            run_end = index if value else index - 1
            if run_end - run_start > best_end - best_start:
                best_start, best_end = run_start, run_end
            run_start = None
    return best_start, best_end


def connected_mask(pixels: np.ndarray) -> np.ndarray:
    # Flood through the neutral checkerboard from the canvas edge. Neutral areas
    # enclosed by the illustrated object remain part of the object.
    spread = pixels.max(axis=2) - pixels.min(axis=2)
    background_candidate = spread <= 10
    exterior_image = Image.fromarray((~background_candidate).astype(np.uint8) * 255, "L").copy()
    ImageDraw.floodfill(exterior_image, (0, 0), 128, thresh=0)
    rough_object = np.asarray(exterior_image) != 128

    # Remove isolated colored noise in the checkerboard by keeping the large
    # component that contains (or is nearest to) the canvas center.
    object_image = Image.fromarray(rough_object.astype(np.uint8) * 255, "L").copy()
    center_x = object_image.width // 2
    center_y = object_image.height // 2
    object_array = np.asarray(object_image)
    if object_array[center_y, center_x] == 0:
        candidates = np.argwhere(object_array > 0)
        distances = (candidates[:, 0] - center_y) ** 2 + (candidates[:, 1] - center_x) ** 2
        center_y, center_x = candidates[int(np.argmin(distances))]
    ImageDraw.floodfill(object_image, (int(center_x), int(center_y)), 128, thresh=0)
    return (np.asarray(object_image) == 128).astype(np.uint8) * 255


def silhouette_mask(warm_seed: np.ndarray) -> np.ndarray:
    seed_counts = warm_seed.sum(axis=0)
    active_columns = seed_counts >= 4
    left, right = longest_true_run(active_columns)

    mask = np.zeros(warm_seed.shape, dtype=np.uint8)
    for x in range(left, right + 1):
        ys = np.flatnonzero(warm_seed[:, x])
        if len(ys) < 4:
            continue
        top = max(0, int(ys[0]))
        bottom = min(mask.shape[0] - 1, int(ys[-1]))
        mask[top : bottom + 1, x] = 255

    # Fill the tiny missing tips caused by antialiasing at the far left/right.
    for x in range(left, right + 1):
        if mask[:, x].any():
            continue
        neighbours = []
        for nx in range(max(left, x - 3), min(right, x + 3) + 1):
            ys = np.flatnonzero(mask[:, nx])
            if len(ys):
                neighbours.append((int(ys[0]), int(ys[-1])))
        if neighbours:
            mask[min(v[0] for v in neighbours) : max(v[1] for v in neighbours) + 1, x] = 255

    return mask


def character_mask(pixels: np.ndarray) -> np.ndarray:
    """Extract a dark-or-coloured character from a neutral checkerboard.

    Image models sometimes bake a gray checkerboard into an RGB result instead
    of returning alpha. Unlike the earlier warm-object workflow, a reader has
    charcoal trousers and hair as well as green knitwear. Treating both dark
    and chromatic pixels as a seed preserves those details, then a small
    morphological close gives the full figure one connected support region.
    """
    highest = pixels.max(axis=2)
    lowest = pixels.min(axis=2)
    chroma = highest - lowest

    # Neutral grid cells are bright and have almost no channel spread. Dark
    # charcoal details and every coloured textile/skin/book pixel stay alive.
    seed = (chroma > 10) | (highest < 165)
    seed_image = Image.fromarray(seed.astype(np.uint8) * 255, "L")

    # Close thin transparent gaps between the reader's connected silhouette,
    # then retain only the component nearest the canvas centre.
    support_image = seed_image.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.MinFilter(31))
    support_array = np.asarray(support_image)
    center_y, center_x = support_image.height // 2, support_image.width // 2
    if support_array[center_y, center_x] == 0:
        candidates = np.argwhere(support_array > 0)
        if len(candidates) == 0:
            return np.zeros(seed.shape, dtype=np.uint8)
        distances = (candidates[:, 0] - center_y) ** 2 + (candidates[:, 1] - center_x) ** 2
        center_y, center_x = candidates[int(np.argmin(distances))]
    component = support_image.copy()
    ImageDraw.floodfill(component, (int(center_x), int(center_y)), 128, thresh=0)
    support = np.asarray(component) == 128

    # Permit a tiny antialiasing halo around the selected silhouette, while
    # keeping the original pixel test as the alpha source so grid cells remain
    # completely transparent.
    grown = np.asarray(Image.fromarray(support.astype(np.uint8) * 255, "L").filter(ImageFilter.MaxFilter(9))) > 0
    return (seed & grown).astype(np.uint8) * 255


def extract(source: Path, destination: Path, qa_path: Path | None, mode: str, exclude_neon: bool) -> None:
    image = Image.open(source).convert("RGB")
    pixels = np.asarray(image).astype(np.int16)
    red, green, blue = (pixels[:, :, channel] for channel in range(3))

    # The generated checkerboard is neutral gray; the illustrated assets are warm.
    warm_seed = ((red - blue) > 7) & ((red - green) > 2)
    neon = (((red > 175) & (green < 100) & (blue < 85)) | ((red > 210) & (green > 160) & (blue < 65)))
    if exclude_neon:
        warm_seed &= ~neon
    if mode == "silhouette":
        mask = silhouette_mask(warm_seed)
    elif mode == "character":
        mask = character_mask(pixels)
    else:
        mask = connected_mask(pixels)

    rgba = np.dstack((pixels.astype(np.uint8), mask))
    if exclude_neon:
        rgba[neon, 3] = 0
    rgba[mask == 0, :3] = 0
    result = Image.fromarray(rgba, "RGBA")
    destination.parent.mkdir(parents=True, exist_ok=True)
    result.save(destination, "PNG", optimize=True)

    if qa_path:
        panel_width, panel_height = result.size
        qa = Image.new("RGB", (panel_width, panel_height * 2), "#f1eadf")
        qa.paste(result, (0, 0), result)
        dark = Image.new("RGB", result.size, "#26302d")
        dark.paste(result, (0, 0), result)
        qa.paste(dark, (0, panel_height))
        draw = ImageDraw.Draw(qa)
        draw.text((18, 16), "LIGHT BACKGROUND", fill="#4f443c")
        draw.text((18, panel_height + 16), "DARK BACKGROUND", fill="#f1eadf")
        qa_path.parent.mkdir(parents=True, exist_ok=True)
        qa.save(qa_path, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--qa", type=Path)
    parser.add_argument("--mode", choices=("silhouette", "connected", "character"), default="silhouette")
    parser.add_argument("--exclude-neon", action="store_true")
    args = parser.parse_args()
    extract(args.source, args.destination, args.qa, args.mode, args.exclude_neon)


if __name__ == "__main__":
    main()
