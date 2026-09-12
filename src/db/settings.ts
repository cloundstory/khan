import {
  db,
  SCHEMA_VERSION,
  type ReaderProfile,
  type SceneCosmetics,
} from './schema';
import {
  DEFAULT_SCENE_CAT_ID,
  SCENE_CATS,
  type SceneCatId,
} from '../scene/catManifest';
import {
  DEFAULT_SCENE_CHARACTER_ID,
  isSceneCharacterId,
} from '../scene/characterManifest';
import { type LampMode } from '../scene/roomEnvironment';

/**
 * ค่าตั้งต้นอ้างอิง manifest โดยตรง เพื่อเพิ่ม asset ใหม่ได้โดยไม่ต้อง
 * กระจาย string id ซ้ำไปตามหน้าจอต่าง ๆ
 */
export const DEFAULT_SCENE_COSMETICS: SceneCosmetics = {
  catId: DEFAULT_SCENE_CAT_ID,
  characterId: DEFAULT_SCENE_CHARACTER_ID,
  lampMode: 'auto',
};

export const DEFAULT_READER_PROFILE: ReaderProfile = {
  about: '',
};

function isSceneCatId(value: unknown): value is SceneCatId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SCENE_CATS, value);
}

function isLampMode(value: unknown): value is LampMode {
  return value === 'auto' || value === 'on' || value === 'off';
}

/**
 * ข้อมูล settings เก่าอาจยังไม่มี field นี้ หรืออาจอ้าง asset ที่ถูกเอาออก
 * จึงคืนค่าที่ใช้งานได้เสมอโดยไม่ต้องทำ Dexie migration.
 */
export function normalizeSceneCosmetics(value?: Partial<SceneCosmetics>): SceneCosmetics {
  return {
    catId: isSceneCatId(value?.catId) ? value.catId : DEFAULT_SCENE_COSMETICS.catId,
    characterId: isSceneCharacterId(value?.characterId)
      ? value.characterId
      : DEFAULT_SCENE_COSMETICS.characterId,
    lampMode: isLampMode(value?.lampMode) ? value.lampMode : DEFAULT_SCENE_COSMETICS.lampMode,
  };
}

/** Keep unindexed profile copy inside the existing settings record. */
export function normalizeReaderProfile(value?: Partial<ReaderProfile>): ReaderProfile {
  return {
    // The UI exposes the same limit. Keeping it here makes imported settings safe too.
    about: typeof value?.about === 'string' ? value.about.slice(0, 360) : DEFAULT_READER_PROFILE.about,
  };
}

export async function getSceneCosmetics(): Promise<SceneCosmetics> {
  const settings = await db.settings.get('settings');
  return normalizeSceneCosmetics(settings?.scene);
}

export async function getReaderProfile(): Promise<ReaderProfile> {
  const settings = await db.settings.get('settings');
  return normalizeReaderProfile(settings?.profile);
}

/**
 * เก็บใน settings record เดิม; `scene` ไม่มี index จึงไม่ต้องเปลี่ยน schema ของ Dexie.
 * Merge patch ภายใน transaction เพื่อไม่ให้การเลือกแมวและตัวละครต่อเนื่องกัน
 * เขียนทับกันด้วย state เก่าจากหน้าจอ.
 */
export async function saveSceneCosmetics(patch: Partial<SceneCosmetics>): Promise<SceneCosmetics> {
  return db.transaction('rw', db.settings, async () => {
    const current = await db.settings.get('settings');
    const scene = normalizeSceneCosmetics({
      ...current?.scene,
      ...patch,
    });

    await db.settings.put({
      ...current,
      id: 'settings',
      schemaVersion: current?.schemaVersion ?? SCHEMA_VERSION,
      scene,
    });

    return scene;
  });
}

/**
 * About me is deliberately saved on-device with the same backup record as the
 * room cosmetics. It does not need a schema migration because `settings` has
 * no indexed subfields.
 */
export async function saveReaderProfile(patch: Partial<ReaderProfile>): Promise<ReaderProfile> {
  return db.transaction('rw', db.settings, async () => {
    const current = await db.settings.get('settings');
    const profile = normalizeReaderProfile({
      ...current?.profile,
      ...patch,
    });

    await db.settings.put({
      ...current,
      id: 'settings',
      schemaVersion: current?.schemaVersion ?? SCHEMA_VERSION,
      profile,
    });

    return profile;
  });
}
