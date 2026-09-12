"""Split the approved bookcase master into pixel-aligned back/front layers."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


FRONT_POLYGONS_V1 = (
    # Top cap and its dark underside.
    [(112, 96), (978, 66), (1031, 98), (1030, 142), (978, 144), (116, 158)],
    # Left and right front posts.
    [(116, 100), (162, 122), (160, 1208), (151, 1241), (117, 1238)],
    [(942, 91), (982, 96), (983, 1249), (971, 1265), (941, 1262)],
    # Four shelf fronts, then the base shelf/front.
    [(151, 298), (945, 297), (945, 352), (153, 355)],
    [(152, 508), (945, 507), (945, 560), (153, 561)],
    [(152, 707), (945, 706), (945, 768), (153, 770)],
    [(152, 916), (945, 914), (945, 986), (153, 982)],
    [(151, 1125), (945, 1124), (945, 1230), (153, 1216)],
)

FRONT_POLYGONS_V2 = (
    [(54, 97), (966, 98), (967, 137), (942, 160), (90, 160), (55, 132)],
    [(68, 128), (113, 134), (113, 1347), (102, 1434), (66, 1434)],
    [(909, 129), (954, 130), (954, 1433), (893, 1433), (907, 1348)],
    [(106, 326), (912, 326), (914, 376), (108, 376)],
    [(107, 525), (912, 525), (914, 571), (108, 571)],
    [(107, 710), (912, 710), (914, 761), (108, 761)],
    [(107, 913), (912, 913), (914, 967), (108, 967)],
    [(107, 1104), (912, 1104), (914, 1161), (108, 1161)],
    [(107, 1294), (913, 1294), (913, 1404), (108, 1404)],
)

SHELF_BASELINES_V1 = (304, 514, 712, 922, 1132)
SHELF_BASELINES_V2 = (328, 527, 712, 915, 1106, 1296)
BOOK_COLORS = ("#536862", "#a8654d", "#cfb77d", "#667083", "#8a7656")


def create_front(master: Image.Image, polygons: tuple[list[tuple[int, int]], ...]) -> Image.Image:
    selection = Image.new("L", master.size, 0)
    draw = ImageDraw.Draw(selection)
    for polygon in polygons:
        draw.polygon(polygon, fill=255)
    alpha = Image.new("L", master.size, 0)
    alpha.paste(master.getchannel("A"), mask=selection)
    front = master.copy()
    front.putalpha(alpha)
    return front


def add_test_books(canvas: Image.Image, preset: str) -> None:
    draw = ImageDraw.Draw(canvas)
    if preset == "v2":
        for row, baseline in enumerate(SHELF_BASELINES_V2):
            x = 120
            index = 0
            while x < 880:
                width = 17 + ((row * 11 + index * 7) % 18)
                height = 105 + ((row * 17 + index * 13) % 55)
                lean = (-3, 0, 2, 0, 3)[(row + index) % 5]
                top = baseline - height
                fill = BOOK_COLORS[(row + index) % len(BOOK_COLORS)]
                polygon = [(x + lean, top), (x + width + lean, top), (x + width, baseline + 12), (x, baseline + 12)]
                draw.polygon(polygon, fill=fill, outline="#493f38")
                if width > 23:
                    draw.line((x + width // 2 + lean, top + 13, x + width // 2, baseline - 8), fill="#efe4cd", width=2)
                draw.line((x + 2, baseline + 3, x + width - 2, baseline + 3), fill="#2f2a26", width=2)
                x += width + 4
                index += 1
        return

    for row, baseline in enumerate(SHELF_BASELINES_V1):
        x = 174
        for index in range(9):
            width = 54 + ((row * 13 + index * 17) % 24)
            height = 112 + ((row * 19 + index * 23) % 48)
            top = baseline - height
            fill = BOOK_COLORS[(row + index) % len(BOOK_COLORS)]
            draw.rounded_rectangle(
                (x, top, min(x + width, 925), baseline + 9),
                radius=3,
                fill=fill,
                outline="#493f38",
                width=3,
            )
            draw.line((x + 9, top + 9, x + 9, baseline - 4), fill="#efe4cd", width=2)
            x += width + 9
            if x > 885:
                break


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("master", type=Path)
    parser.add_argument("back", type=Path)
    parser.add_argument("front", type=Path)
    parser.add_argument("qa", type=Path)
    parser.add_argument("--preset", choices=("v1", "v2"), default="v1")
    args = parser.parse_args()

    master = Image.open(args.master).convert("RGBA")
    args.back.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(args.master, args.back)

    polygons = FRONT_POLYGONS_V2 if args.preset == "v2" else FRONT_POLYGONS_V1
    front = create_front(master, polygons)
    front.save(args.front, "PNG", optimize=True)

    light = Image.new("RGBA", master.size, "#f1eadfff")
    light.alpha_composite(master)
    add_test_books(light, args.preset)
    light.alpha_composite(front)

    dark = Image.new("RGBA", master.size, "#26302dff")
    dark.alpha_composite(master)
    add_test_books(dark, args.preset)
    dark.alpha_composite(front)

    qa = Image.new("RGB", (master.width * 2, master.height), "white")
    qa.paste(light.convert("RGB"), (0, 0))
    qa.paste(dark.convert("RGB"), (master.width, 0))
    args.qa.parent.mkdir(parents=True, exist_ok=True)
    qa.save(args.qa, "JPEG", quality=92, optimize=True)


if __name__ == "__main__":
    main()
