/**
 * Cosmetic cats share the 941 × 1672 room-artboard coordinate space.
 * Their transparent PNGs are deliberately framed over the rug, so a selected
 * cat stays put while the surrounding SVG crops on narrow mobile screens.
 */
export type SceneCatId = 'tuxedo' | 'orange-tabby' | 'gray-tabby';

export interface SceneCatFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneCatDefinition {
  id: SceneCatId;
  label: string;
  /** Path relative to Vite's public base URL. */
  src: string;
  frame: SceneCatFrame;
}

/**
 * The source art has intentional transparent breathing room around each cat.
 * These matching frames place the visible silhouette at the centre of the rug
 * without re-scaling or moving it when the user switches coat colour.
 */
const RUG_CAT_FRAME: SceneCatFrame = {
  // A resting cat should be a small resident of the rug, not fill it.
  // Keep the bottom edge fixed so every coat colour still touches the weave.
  x: 310,
  y: 1275,
  width: 230,
  height: 153,
};

export const DEFAULT_SCENE_CAT_ID: SceneCatId = 'tuxedo';

export const SCENE_CATS: Record<SceneCatId, SceneCatDefinition> = {
  tuxedo: {
    id: 'tuxedo',
    label: 'แมวทักซิโด้',
    src: 'scene/cats/cat-tuxedo-01.png',
    frame: RUG_CAT_FRAME,
  },
  'orange-tabby': {
    id: 'orange-tabby',
    label: 'แมวส้มลาย',
    src: 'scene/cats/cat-orange-tabby-01.png',
    frame: RUG_CAT_FRAME,
  },
  'gray-tabby': {
    id: 'gray-tabby',
    label: 'แมวเทาลาย',
    src: 'scene/cats/cat-gray-tabby-01.png',
    frame: RUG_CAT_FRAME,
  },
};

export function getSceneCat(id: SceneCatId = DEFAULT_SCENE_CAT_ID): SceneCatDefinition {
  return SCENE_CATS[id];
}
