/**
 * Character art lives in the same 941 × 1672 coordinate space as the mobile
 * room plate. Keeping the frame data here means a character can stay aligned
 * when the SVG is cropped with `preserveAspectRatio="xMidYMid slice"`.
 */
export const ROOM_ARTBOARD = { width: 941, height: 1672 } as const;

export type ScenePoseId = 'reading' | 'window';

export interface SceneArtboardFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The owner is intentionally repeated on every pose. It prevents a future
 * asset from being put in a different character's bundle by accident.
 */
export interface SceneCharacterPose<CharacterId extends string = string> {
  /** Stable asset identifier. More variants can be appended to the same pose. */
  id: string;
  /** The selectable character this illustration belongs to. */
  characterId: CharacterId;
  pose: ScenePoseId;
  /** Path relative to Vite's public base URL. */
  src: string;
  frame: SceneArtboardFrame;
  /** A subtle contact shadow keeps a standing cutout tied to the painted floor. */
  groundShadow?: {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
  };
}

/** A character bundle must be complete before it can be offered in Settings. */
export type SceneCharacterPoseSet<CharacterId extends string = string> = Record<
  ScenePoseId,
  readonly [SceneCharacterPose<CharacterId>, ...SceneCharacterPose<CharacterId>[]]
>;

export interface SceneCharacterDefinition<CharacterId extends string = string> {
  /** Must match the key that makes this character selectable. */
  id: CharacterId;
  /** User-facing name, used only once there is more than one approved bundle. */
  label: string;
  /**
   * Each bundle contains whole, matched character illustrations. Clothing is
   * not composited over a person in code: a new outfit supplies every pose it
   * needs so line weight, pose, and room perspective remain coherent.
   */
  poses: SceneCharacterPoseSet<CharacterId>;
}

function defineSceneCharacter<const CharacterId extends string>(
  id: CharacterId,
  character: Omit<SceneCharacterDefinition<CharacterId>, 'id'>,
): SceneCharacterDefinition<CharacterId> {
  return { id, ...character };
}

const readerPoses: SceneCharacterPoseSet<'reader-01'> = {
  reading: [
    {
      id: 'reader-01--reading-05',
      characterId: 'reader-01',
      pose: 'reading',
      src: 'scene/characters/reader-01--reading-05-alpha.png',
      // User-approved crossed-leg illustration. It sits farther right on the
      // armchair and preserves the paper-and-ink character of the source art.
      // Slightly smaller and farther right so the crossed legs stay inside
      // the illustrated seat instead of eating into its outer cushion edge.
      frame: { x: 244, y: 745, width: 360, height: 540 },
    },
  ],
  window: [
    {
      id: 'reader-01--window-01',
      characterId: 'reader-01',
      pose: 'window',
      src: 'scene/characters/reader-01--window-01.png',
      // Dropped onto the perspective floor line rather than the window sill.
      frame: { x: 615, y: 680, width: 350, height: 525 },
      groundShadow: { cx: 790, cy: 1206, rx: 88, ry: 9 },
    },
  ],
};

/**
 * Add a future cosmetic only after its complete, reviewed pose bundle is
 * available. `SceneCharacterId` is inferred from these keys, so persistence,
 * pose selection, and Settings cannot drift from a separate id union.
 */
export const SCENE_CHARACTERS = {
  'reader-01': defineSceneCharacter('reader-01', {
    label: 'นักอ่าน 01',
    poses: readerPoses,
  }),
} as const;

export type SceneCharacterId = keyof typeof SCENE_CHARACTERS;

/** Only complete manifest entries are selectable; this is currently one item. */
export const SCENE_CHARACTER_IDS: readonly SceneCharacterId[] = Object.freeze(
  Object.keys(SCENE_CHARACTERS) as SceneCharacterId[],
);

export const DEFAULT_SCENE_CHARACTER_ID: SceneCharacterId = 'reader-01';

export function isSceneCharacterId(value: unknown): value is SceneCharacterId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SCENE_CHARACTERS, value);
}

export function getSceneCharacter<CharacterId extends SceneCharacterId>(
  id: CharacterId = DEFAULT_SCENE_CHARACTER_ID as CharacterId,
): (typeof SCENE_CHARACTERS)[CharacterId] {
  return SCENE_CHARACTERS[id];
}

/**
 * A discriminated selection makes the pose and its selected identity travel as
 * one value. Consumers such as RoomCharacter cannot receive a pose from one
 * cosmetic together with another cosmetic's id.
 */
export type ScenePoseSelection = {
  [CharacterId in SceneCharacterId]: {
    characterId: CharacterId;
    pose: (typeof SCENE_CHARACTERS)[CharacterId]['poses'][ScenePoseId][number];
  }
}[SceneCharacterId];

/**
 * Resolve a pose only through the selected character's manifest bundle.
 * The runtime assertion also protects the invariant if a plain JavaScript
 * consumer or a hand-edited manifest bypasses TypeScript.
 */
export function selectScenePose(
  characterId: SceneCharacterId,
  poseId: ScenePoseId,
  variantSeed = 0,
): ScenePoseSelection {
  const character = getSceneCharacter(characterId);
  const variants = character.poses[poseId];
  const pose = variants[Math.abs(variantSeed) % variants.length];

  if (pose.characterId !== characterId) {
    throw new Error(`Scene pose ${pose.id} belongs to ${pose.characterId}, not ${characterId}`);
  }

  return { characterId, pose } as ScenePoseSelection;
}
