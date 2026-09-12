import { DEFAULT_SCENE_CAT_ID, getSceneCat, type SceneCatId } from './catManifest';

export interface CatLayerProps {
  /** The saved cosmetic selection. Tuxedo is used until the setting exists. */
  selectedId?: SceneCatId;
  className?: string;
}

function resolvePublicAsset(src: string): string {
  return `${import.meta.env.BASE_URL}${src}`;
}

/**
 * A non-interactive SVG layer for the room's cosmetic cat. Room hotspots sit
 * above it, so changing a cat can never block the pile, sofa, or shelf.
 */
export function CatLayer({ selectedId = DEFAULT_SCENE_CAT_ID, className }: CatLayerProps) {
  const cat = getSceneCat(selectedId);
  const classes = ['scene-cat', `scene-cat--${cat.id}`, className].filter(Boolean).join(' ');

  return (
    <g className={classes} data-cat={cat.id} pointerEvents="none" aria-hidden="true">
      <image
        className="scene-cat__image"
        href={resolvePublicAsset(cat.src)}
        x={cat.frame.x}
        y={cat.frame.y}
        width={cat.frame.width}
        height={cat.frame.height}
        preserveAspectRatio="xMidYMid meet"
        pointerEvents="none"
      />
    </g>
  );
}
