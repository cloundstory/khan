import { useMemo } from 'react';
import {
  DEFAULT_SCENE_CHARACTER_ID,
  selectScenePose,
  type SceneCharacterId,
  type ScenePoseSelection,
  type ScenePoseId,
} from './characterManifest';

export type { ScenePoseSelection } from './characterManifest';

export interface UseScenePoseOptions {
  /** The selected cosmetic. This is ready to come from Settings later. */
  characterId?: SceneCharacterId;
  /** A live session or a book left on the desk puts the reader in the chair. */
  hasActiveSession?: boolean;
  hasDeskBook?: boolean;
  /** Useful for a development preview or a later explicit user choice. */
  preferredPose?: ScenePoseId;
  /**
   * A user id can be supplied once accounts exist. It keeps per-user cosmetic
   * variants stable while still allowing a new variation on a new day.
   */
  stableKey?: string;
  now?: Date;
}

function localDayKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function preferredPoseFor({ hasActiveSession, hasDeskBook, preferredPose }: UseScenePoseOptions): ScenePoseId {
  if (preferredPose) return preferredPose;
  return hasActiveSession || hasDeskBook ? 'reading' : 'window';
}

/**
 * Resolves one character asset without `Math.random()` in render. If more than
 * one variant is supplied for a pose, the chosen variant stays fixed for the
 * same character, user key and calendar day across Home re-renders.
 */
export function useScenePose(options: UseScenePoseOptions = {}): ScenePoseSelection {
  const {
    characterId = DEFAULT_SCENE_CHARACTER_ID,
    hasActiveSession = false,
    hasDeskBook = false,
    preferredPose,
    stableKey = 'local-reader',
    now,
  } = options;
  const dayKey = localDayKey(now ?? new Date());
  const poseId = preferredPoseFor({ hasActiveSession, hasDeskBook, preferredPose });

  return useMemo(() => {
    const seed = `${characterId}:${poseId}:${stableKey}:${dayKey}`;
    return selectScenePose(characterId, poseId, stableHash(seed));
  }, [characterId, dayKey, poseId, stableKey]);
}
