import { useRef, useState } from 'react';
import { useApp } from '../store/useApp';
import { downloadBackup, importBackup } from '../db/export';
import { deleteBook } from '../db/books';
import { fileSizeLabel } from '../lib/format';
import { SCENE_CATS, type SceneCatId } from '../scene/catManifest';
import {
  SCENE_CHARACTER_IDS,
  SCENE_CHARACTERS,
  type SceneCharacterId,
} from '../scene/characterManifest';
import type { LampMode } from '../scene/roomEnvironment';

const LAMP_OPTIONS: ReadonlyArray<{ id: LampMode; label: string }> = [
  { id: 'auto', label: 'ตามเวลา' },
  { id: 'on', label: 'เปิดเสมอ' },
  { id: 'off', label: 'ปิดเสมอ' },
];

export default function Settings() {
  const { books, go, refresh, say, sceneCosmetics, saveSceneCosmetics } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const result = await importBackup(json);
      await refresh();
      const n = result.added.books;
      say(n > 0 ? `นำเข้า ${n} เล่ม` : 'ข้อมูลนี้มีอยู่แล้วทั้งหมด');
    } catch (err) {
      say(err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ');
    }
    e.target.value = '';
  }

  async function remove(id: string) {
    await deleteBook(id);
    await refresh();
    setConfirmId(null);
    say('ลบแล้ว');
  }

  async function selectCat(catId: SceneCatId) {
    if (catId === sceneCosmetics.catId) return;
    await saveSceneCosmetics({ catId });
    say('แมวประจำห้องเปลี่ยนแล้ว');
  }

  async function selectCharacter(characterId: SceneCharacterId) {
    if (characterId === sceneCosmetics.characterId) return;
    await saveSceneCosmetics({ characterId });
    say('ตัวละครประจำห้องเปลี่ยนแล้ว');
  }

  async function selectLampMode(lampMode: LampMode) {
    if (lampMode === sceneCosmetics.lampMode) return;
    await saveSceneCosmetics({ lampMode });
    say(lampMode === 'auto' ? 'โคมไฟจะทำงานตามเวลา' : lampMode === 'on' ? 'เปิดโคมไฟแล้ว' : 'ปิดโคมไฟแล้ว');
  }

  return (
    <div className="page">
      <button className="back" onClick={() => go({ name: 'room' })}>← กลับห้อง</button>

      <div className="topline">
        <span className="wordmark">ตั้งค่า</span>
      </div>

      <div className="section-label">เพื่อนร่วมอ่าน</div>
      <p className="field-hint cosmetic-hint">แมวจะนอนอยู่บนพรม และหายใจเบา ๆ ไปพร้อมกับห้อง</p>
      <div className="cosmetic-grid" role="group" aria-label="เลือกแมวประจำห้อง">
        {Object.values(SCENE_CATS).map((cat) => {
          const selected = sceneCosmetics.catId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={'cosmetic-option' + (selected ? ' is-selected' : '')}
              aria-pressed={selected}
              onClick={() => void selectCat(cat.id)}
            >
              <img src={import.meta.env.BASE_URL + cat.src} alt="" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {SCENE_CHARACTER_IDS.length > 1 && (
        <>
          <div className="section-label">ตัวละคร</div>
          <p className="field-hint cosmetic-hint">แต่ละชุดมีท่ากำลังอ่านและมองวิวที่วาดเข้ากับห้องเดียวกัน</p>
          <div className="cosmetic-grid" role="group" aria-label="เลือกตัวละครประจำห้อง">
            {SCENE_CHARACTER_IDS.map((characterId) => {
              const character = SCENE_CHARACTERS[characterId];
              const selected = sceneCosmetics.characterId === characterId;
              const preview = character.poses.reading[0];
              return (
                <button
                  key={characterId}
                  type="button"
                  className={'cosmetic-option cosmetic-option--character' + (selected ? ' is-selected' : '')}
                  aria-pressed={selected}
                  onClick={() => void selectCharacter(characterId)}
                >
                  <img src={import.meta.env.BASE_URL + preview.src} alt="" />
                  <span>{character.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="section-label">แสงในห้อง</div>
      <p className="field-hint cosmetic-hint">แตะโคมในห้องเพื่อเปิดหรือปิดทันที หรือกลับมาใช้เวลาจริงได้ที่นี่</p>
      <div className="lamp-mode-options" role="group" aria-label="ตั้งค่าโคมไฟ">
        {LAMP_OPTIONS.map((option) => {
          const selected = sceneCosmetics.lampMode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={'lamp-mode-option' + (selected ? ' is-selected' : '')}
              aria-pressed={selected}
              onClick={() => void selectLampMode(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="section-label">ข้อมูล</div>
      <div className="btn-row" style={{ marginTop: 0 }}>
        <button
          className="btn btn-quiet"
          onClick={() => downloadBackup().then((bytes) => say(`ส่งออกแล้ว · ${fileSizeLabel(bytes)}`))}
        >
          ส่งออกเป็นไฟล์ JSON
        </button>
        <button className="btn btn-quiet" onClick={() => fileRef.current?.click()}>
          นำเข้าจากไฟล์
        </button>
      </div>
      <div className="field-hint" style={{ marginTop: 8 }}>
        นำเข้าแบบรวมกับของเดิม — เล่มที่มีอยู่แล้วจะไม่ถูกทับ
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />

      {books.length > 0 && (
        <>
          <div className="section-label">ลบหนังสือ</div>
          {books.map((b) => (
            <div className="session-row" key={b.id}>
              <div className="session-top">
                <span style={{ color: 'var(--ink)' }}>{b.title}</span>
                {confirmId === b.id ? (
                  <span>
                    <button className="pin-btn danger" onClick={() => remove(b.id)}>ลบจริง</button>
                    {' · '}
                    <button className="pin-btn" onClick={() => setConfirmId(null)}>ยกเลิก</button>
                  </span>
                ) : (
                  <button className="pin-btn danger" onClick={() => setConfirmId(b.id)}>ลบ</button>
                )}
              </div>
            </div>
          ))}
          <div className="field-hint" style={{ marginTop: 10 }}>
            ลบเล่มจะลบบันทึกและการ์ดของเล่มนั้นทั้งหมด ส่งออกไฟล์เก็บไว้ก่อนเสมอ
          </div>
        </>
      )}
    </div>
  );
}
