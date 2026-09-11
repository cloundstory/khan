export const ROOM_CANVAS = { width: 1536, height: 1024 } as const;

export type AssetAnchor = 'top-left' | 'top-center' | 'center' | 'bottom-center';

export interface RoomAssetSpec {
  key: string;
  src: string;
  source: string;
  anchor: AssetAnchor;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  status: 'candidate' | 'approved';
}

export interface ShelfRowSpec {
  id: string;
  left: number;
  right: number;
  baseline: number;
  maxBookHeight: number;
  capacity: number;
  decor?: {
    kind: 'globe' | 'plant' | 'model';
    start: number;
    span: number;
  };
}

/**
 * Production room assets are added here only after export and visual inspection.
 * Coordinates use the shared 1536 × 1024 desktop composition.
 */
export const ROOM_ASSETS = {
  roomShellDesktop: {
    key: 'room-shell-desktop',
    src: 'set/v4/room-shell-desktop-v2.webp',
    source: 'design/assets/v4/source/room-shell-desktop-v2.png',
    anchor: 'top-left',
    x: 0,
    y: 0,
    width: ROOM_CANVAS.width,
    height: ROOM_CANVAS.height,
    zIndex: 0,
    status: 'candidate',
  },
  rug: {
    key: 'rug',
    src: 'set/v4/rug-v2.webp',
    source: 'design/assets/v4/source/rug-v2.png',
    anchor: 'bottom-center',
    x: 900,
    y: 1010,
    width: 1080,
    height: 300,
    zIndex: 10,
    status: 'candidate',
  },
  bookcaseBack: {
    key: 'bookcase-back',
    src: 'set/v4/bookcase-back-v3.webp',
    source: 'design/assets/v4/source/bookcase-back-v3.png',
    anchor: 'bottom-center',
    x: 340,
    y: 700,
    width: 490,
    height: 650,
    zIndex: 20,
    status: 'candidate',
  },
  bookcaseFront: {
    key: 'bookcase-front',
    src: 'set/v4/bookcase-front-v3.webp',
    source: 'design/assets/v4/source/bookcase-front-v3.png',
    anchor: 'bottom-center',
    x: 340,
    y: 700,
    width: 490,
    height: 650,
    zIndex: 40,
    status: 'candidate',
  },
  pileUnderlay: {
    key: 'pile-underlay',
    src: 'set/v4/pile-underlay-v1.svg',
    source: 'design/assets/v4/source/pile-underlay-v1.svg',
    anchor: 'bottom-center',
    x: 650,
    y: 700,
    width: 300,
    height: 100,
    zIndex: 50,
    status: 'candidate',
  },
} satisfies Record<string, RoomAssetSpec>;

/**
 * Room-space baselines for real user books. Book sprites render at z-index 30,
 * between bookcaseBack and bookcaseFront.
 */
export const BOOKCASE_ROWS: readonly ShelfRowSpec[] = [
  { id: 'row-1', left: 152, right: 516, baseline: 189, maxBookHeight: 66, capacity: 15 },
  { id: 'row-2', left: 152, right: 516, baseline: 273, maxBookHeight: 64, capacity: 15, decor: { kind: 'globe', start: 7, span: 3 } },
  { id: 'row-3', left: 152, right: 516, baseline: 351, maxBookHeight: 62, capacity: 15 },
  { id: 'row-4', left: 152, right: 516, baseline: 437, maxBookHeight: 64, capacity: 15, decor: { kind: 'plant', start: 0, span: 3 } },
  { id: 'row-5', left: 152, right: 516, baseline: 518, maxBookHeight: 62, capacity: 15 },
  { id: 'row-6', left: 152, right: 516, baseline: 598, maxBookHeight: 60, capacity: 15, decor: { kind: 'model', start: 12, span: 3 } },
] as const;
