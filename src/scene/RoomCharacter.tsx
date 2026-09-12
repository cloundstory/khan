import type { ScenePoseSelection } from './useScenePose';

export interface RoomCharacterProps {
  selection: ScenePoseSelection | null;
  className?: string;
}

function resolvePublicAsset(src: string): string {
  return `${import.meta.env.BASE_URL}${src}`;
}

/**
 * SVG layer for a cosmetic character. It intentionally cannot receive pointer
 * events: the existing room hotspots remain the only interactive layer.
 */
export function RoomCharacter({ selection, className }: RoomCharacterProps) {
  if (!selection) return null;

  const { pose } = selection;
  const classes = ['scene-character', `scene-character--${pose.pose}`, className].filter(Boolean).join(' ');

  return (
    <g className={classes} data-character={selection.characterId} data-pose={pose.pose} pointerEvents="none" aria-hidden="true">
      {pose.groundShadow && (
        <ellipse
          className="scene-character__ground-shadow"
          cx={pose.groundShadow.cx}
          cy={pose.groundShadow.cy}
          rx={pose.groundShadow.rx}
          ry={pose.groundShadow.ry}
        />
      )}
      <image
        className="scene-character__image"
        href={resolvePublicAsset(pose.src)}
        x={pose.frame.x}
        y={pose.frame.y}
        width={pose.frame.width}
        height={pose.frame.height}
        preserveAspectRatio="xMidYMax meet"
        pointerEvents="none"
      />
    </g>
  );
}
