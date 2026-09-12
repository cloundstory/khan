import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/useApp';
import { openBookId } from '../lib/stats';
import { CatLayer } from '../scene/CatLayer';
import { RoomCharacter } from '../scene/RoomCharacter';
import { useScenePose } from '../scene/useScenePose';
import type { ScenePoseId } from '../scene/characterManifest';
import type { SceneCatId } from '../scene/catManifest';
import {
  clockAngles,
  lampIsOn,
  nextSceneMode,
  sceneModeForTime,
  type SceneMode,
} from '../scene/roomEnvironment';

const SCENE_IMAGES: Record<SceneMode, string> = {
  master: import.meta.env.BASE_URL + 'scene/catless/room-master-catless-v1.png',
  morning: import.meta.env.BASE_URL + 'scene/catless/room-morning-catless-v1.png',
  night: import.meta.env.BASE_URL + 'scene/catless/room-night-catless-v1.png',
};

function developmentPosePreview(): ScenePoseId | undefined {
  if (!import.meta.env.DEV) return undefined;
  const value = new URLSearchParams(window.location.search).get('scene-preview');
  return value === 'reading' || value === 'window' ? value : undefined;
}

function developmentCatPreview(): SceneCatId | undefined {
  if (!import.meta.env.DEV) return undefined;
  const value = new URLSearchParams(window.location.search).get('scene-cat');
  return value === 'orange-tabby' || value === 'gray-tabby' || value === 'tuxedo'
    ? value
    : undefined;
}

/** The room plate only needs to know when its time-band changes, not every second. */
function useAutoSceneMode(): SceneMode {
  const [mode, setMode] = useState<SceneMode>(() => sceneModeForTime(new Date()));

  useEffect(() => {
    let timer: number | undefined;
    const sync = () => {
      setMode(sceneModeForTime(new Date()));
      if (timer) window.clearTimeout(timer);
      if (!document.hidden) {
        // Wake shortly after the next minute rather than continually rerendering the plate.
        timer = window.setTimeout(sync, 60_050 - (Date.now() % 60_000));
      }
    };
    const onVisibility = () => sync();
    document.addEventListener('visibilitychange', onVisibility);
    sync();
    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return mode;
}

/** Lives inside the SVG so only the three clock hands rerender each second. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: number | undefined;
    const sync = () => {
      setNow(new Date());
      if (timer) window.clearTimeout(timer);
      if (!document.hidden) {
        timer = window.setTimeout(sync, 1_010 - (Date.now() % 1_000));
      }
    };
    const onVisibility = () => sync();
    document.addEventListener('visibilitychange', onVisibility);
    sync();
    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const angles = clockAngles(now);
  return (
    <g className="scene-clock-ink" transform="translate(494 360)" aria-hidden="true">
      <line x1="0" y1="4" x2="0" y2="-37" transform={'rotate(' + angles.hour + ')'} />
      <line x1="0" y1="5" x2="0" y2="-52" transform={'rotate(' + angles.minute + ')'} />
      <line className="scene-clock-ink__second" x1="0" y1="7" x2="0" y2="-58" transform={'rotate(' + angles.second + ')'} />
      <circle cx="0" cy="0" r="3" />
    </g>
  );
}

/**
 * หน้า Home ใช้ภาพห้องวาดมือเป็นผืนเดียว แล้ววาง hotspot แบบโปร่งใสทับลงไป
 * หนังสือจริงจะแสดงใน list/detail เมื่อแตะกองหรือชั้น เพื่อให้ภาพห้องคงความเป็นภาพประกอบเดียวกัน
 */
export default function HomeScene() {
  const { books, sessions, active, sceneCosmetics, go, saveSceneCosmetics } = useApp();
  const [modeOverride, setModeOverride] = useState<SceneMode | null>(null);
  const autoMode = useAutoSceneMode();
  const mode = modeOverride ?? autoMode;
  const lampOn = lampIsOn(mode, sceneCosmetics.lampMode);
  const pile = useMemo(() => books.filter((book) => book.status === 'pile'), [books]);
  const desk = useMemo(() => books.filter((book) => book.status === 'desk'), [books]);
  const shelf = useMemo(() => books.filter((book) => book.status === 'shelf'), [books]);
  const openId = openBookId(desk, sessions);
  // ถ้ายังมี session ค้างอยู่ เล่มนั้นต้องเป็นเล่มหลักของโต๊ะเสมอ
  // แม้ประวัติ session เก่าของอีกเล่มจะใหม่กว่า
  const openBook = desk.find((book) => book.id === active?.bookId)
    ?? desk.find((book) => book.id === openId)
    ?? desk[0];
  const scenePose = useScenePose({
    characterId: sceneCosmetics.characterId,
    hasActiveSession: Boolean(active),
    hasDeskBook: Boolean(openBook),
    preferredPose: developmentPosePreview(),
  });
  const sceneCat = developmentCatPreview() ?? sceneCosmetics.catId;

  function openPile() {
    go({ name: 'browse', focus: 'pile' });
  }

  function openShelf() {
    go({ name: 'browse', focus: 'shelf' });
  }

  function openDesk() {
    if (openBook) return go({ name: 'book', bookId: openBook.id });
    go({ name: 'browse', focus: 'desk' });
  }

  function openSofa() {
    if (active) return go({ name: 'session', bookId: active.bookId });
    if (openBook) return go({ name: 'book', bookId: openBook.id });
    // ยังไม่มีเล่มบนโต๊ะ: ให้เลือกจากกองก่อนเสมอ
    // เพื่อให้ "กอง" เป็นทางเดียวสำหรับทั้งการเลือกเล่มและเพิ่มเล่มใหม่
    go({ name: 'browse', focus: 'pile' });
  }

  function cycleWindow() {
    setModeOverride((current) => {
      const next = nextSceneMode(current ?? autoMode);
      // Returning to the matching plate means returning to the real clock.
      return next === autoMode ? null : next;
    });
  }

  function toggleLamp() {
    void saveSceneCosmetics({ lampMode: lampOn ? 'off' : 'on' });
  }

  function openProfile() {
    go({ name: 'profile' });
  }

  return (
    <div className={'scene-wrap scene-wrap--plate scene-mode-' + mode}>
      <div className="scene-canvas" data-lamp={lampOn ? 'on' : 'off'}>
        <svg
          className="scene-plate"
          viewBox="0 0 941 1672"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="ห้องอ่านหนังสือวาดมือ"
        >
          <image href={SCENE_IMAGES[mode]} x="0" y="0" width="941" height="1672" preserveAspectRatio="none" />
          <RoomCharacter selection={scenePose} />
          <CatLayer selectedId={sceneCat} />
          {/* เข็มอยู่ใน coordinate system เดียวกับภาพ จึงไม่เหลื่อมเมื่อภาพถูก crop ตามจอ */}
          <LiveClock />
        </svg>

        <div className="scene-brand" aria-hidden="true">
          <strong>คั่น</strong>
          <span>A LIBRARY<br />FOR A SLOWER YOU</span>
        </div>

        <div className="scene-lamp-glow" aria-hidden="true" />

        <button className="scene-hotspot scene-hotspot--pile" type="button" onClick={openPile} aria-label={'เปิดกองหนังสือ ' + pile.length + ' เล่ม'}>
          <span>กองหนังสือ</span>
        </button>
        <button className="scene-hotspot scene-hotspot--shelf" type="button" onClick={openShelf} aria-label={'เปิดชั้นหนังสือ ' + shelf.length + ' เล่ม'}>
          <span>ชั้นหนังสือ</span>
        </button>
        <button className="scene-hotspot scene-hotspot--desk" type="button" onClick={openDesk} aria-label={openBook ? 'ดูความคืบหน้า ' + openBook.title : 'เปิดโต๊ะอ่านหนังสือ'}>
          <span>โต๊ะอ่าน</span>
        </button>
        <button className="scene-hotspot scene-hotspot--sofa" type="button" onClick={openSofa} aria-label="เปิดเวลาการอ่านที่โซฟา">
          <span>โซฟา</span>
        </button>
        <button
          className={'scene-hotspot scene-hotspot--character scene-hotspot--character-' + scenePose.pose}
          type="button"
          onClick={openProfile}
          aria-label="เปิดโปรไฟล์นักอ่าน"
        >
          <span>โปรไฟล์</span>
        </button>
        <button className="scene-hotspot scene-hotspot--board" type="button" onClick={() => openBook ? go({ name: 'board', bookId: openBook.id }) : go({ name: 'browse' })} aria-label="เปิด evidence board">
          <span>evidence board</span>
        </button>
        <button className="scene-hotspot scene-hotspot--window" type="button" onClick={cycleWindow} aria-label={'เปลี่ยนบรรยากาศหน้าต่างเป็น' + (nextSceneMode(mode) === 'night' ? 'กลางคืน' : nextSceneMode(mode) === 'morning' ? 'ช่วงเช้า' : 'ช่วงกลางวัน')}>
          <span>หน้าต่าง</span>
        </button>
        <button className="scene-hotspot scene-hotspot--lamp" type="button" onClick={toggleLamp} aria-label={lampOn ? 'ปิดโคมไฟ' : 'เปิดโคมไฟ'}>
          <span>โคมไฟ</span>
        </button>
        <button className="scene-hotspot scene-hotspot--cat" type="button" onClick={() => go({ name: 'settings' })} aria-label="ตั้งค่าแมวและบรรยากาศ">
          <span>แมว</span>
        </button>
      </div>

      <button className="scene-gear scene-gear--plate" onClick={() => go({ name: 'settings' })} aria-label="ตั้งค่า">
        ⚙
      </button>

    </div>
  );
}
