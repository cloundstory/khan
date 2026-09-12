import { describe, expect, it } from 'vitest';
import {
  SCENE_CHARACTER_IDS,
  getSceneCharacter,
  selectScenePose,
  type ScenePoseId,
} from './characterManifest';

const POSE_IDS: readonly ScenePoseId[] = ['reading', 'window'];

describe('selectable scene characters', () => {
  it('keeps every pose inside the identity of the character that exposes it', () => {
    for (const characterId of SCENE_CHARACTER_IDS) {
      const character = getSceneCharacter(characterId);
      expect(character.id).toBe(characterId);

      for (const poseId of POSE_IDS) {
        for (const pose of character.poses[poseId]) {
          expect(pose.characterId).toBe(characterId);
          expect(pose.pose).toBe(poseId);
        }
      }
    }
  });

  it('resolves every rendered selection from the selected character bundle', () => {
    for (const characterId of SCENE_CHARACTER_IDS) {
      for (const poseId of POSE_IDS) {
        const selection = selectScenePose(characterId, poseId, 999);
        expect(selection.characterId).toBe(characterId);
        expect(selection.pose.characterId).toBe(characterId);
        expect(selection.pose.pose).toBe(poseId);
      }
    }
  });
});
