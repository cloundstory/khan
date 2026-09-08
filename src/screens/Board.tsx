import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../store/useApp';
import {
  cardsOf,
  moveCard,
  addCard,
  deleteCard,
  editCard,
  spiralXY,
  threadsOf,
  addThread,
  deleteThread,
} from '../db/cards';
import { getCardPhoto, putCardPhoto, deleteCardPhoto } from '../db/cardPhotos';
import { useCardPhoto, forgetCardPhoto } from '../lib/useCardPhoto';
import { shrinkToCover } from '../lib/photo';
import type { Card, Thread } from '../db/schema';

const MIN_Z = 0.45;
const MAX_Z = 2.4;
const TAP_SLOP = 5; // px รวม — ต่ำกว่านี้ถือว่าแตะ ไม่ใช่ลาก

// พารามิเตอร์เชือก verlet
// SLACK = ความยาวเชือกเทียบระยะหมุด (แยกจากฟิสิกส์) — 1.03 = ตึงเกือบสุด เหลือหย่อนบาง ๆ
// แต่ verlet ยังทำงานเต็ม เชือกจึงสะบัด/แกว่งตามการ์ดจริง แค่ดึงกลับเข้าตึงเร็ว
const ROPE_N = 16; // จำนวนปม
const SLACK = 1.03; // เชือกยาวกว่าระยะหมุด — ให้ sim มีที่แกว่งเป็นธรรมชาติ
const GRAVITY = 0.5;
const DAMP = 0.97;
const ITER = 8; // รอบ constraint ต่อเฟรม
// ดึงภาพเชือกเข้าหาเส้นตรงตอนวาด (แยกจาก sim) — 0 = หย่อนเต็มฟิสิกส์, 1 = ตรงเป๊ะ
// วิธีนี้คุมความตึงที่ "ภาพ" โดยไม่ฆ่าการแกว่งของฟิสิกส์ (sim ยังหย่อน+สะบัดเต็ม)
const TAUT = 0.72;
const ENERGY_EPS = 0.5; // ต่ำกว่านี้ = นิ่งแล้ว หยุด loop

type Anchor = { x: number; y: number };
type RopePt = { x: number; y: number; px: number; py: number };
type Rope = { pts: RopePt[]; key: string };

type Gesture =
  | { type: 'pan'; sx: number; sy: number; px: number; py: number }
  | {
      type: 'card';
      id: string;
      el: HTMLElement;
      sx: number;
      sy: number;
      startX: number;
      startY: number;
      moved: number;
      lastX: number;
      lastY: number;
    }
  | { type: 'wire'; fromId: string; fromX: number; fromY: number }
  | { type: 'pinch'; startDist: number; startZoom: number; fx: number; fy: number };

/** เส้นด้ายชั่วคราวตอนกำลังลาก (ยังไม่ผูก) — bezier หย่อนธรรมดา ไม่ต้อง physics */
function wirePath(ax: number, ay: number, bx: number, by: number): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dist = Math.hypot(bx - ax, by - ay);
  const cy = my + Math.max(4, dist * 0.05); // หย่อนบาง ๆ ให้เข้าชุดกับเชือกที่ผูกแล้ว (ตึง)
  return `M${ax},${ay} Q${mx},${cy} ${bx},${by}`;
}

/**
 * เส้นเรียบผ่านปมของเชือก — แต่ดึงแต่ละปมเข้าหาเส้นตรง A→B ตามค่า TAUT ก่อนวาด
 * ทำให้ "ภาพ" ตึงได้ตามใจ โดย sim (pts) ยังหย่อน/สะบัดเต็มที่ (ปลายสองข้างไม่ขยับเพราะตรงกับ a,b อยู่แล้ว)
 */
function ropeD(pts: RopePt[], a: Anchor, b: Anchor): string {
  const n = pts.length;
  const bx = (i: number) => {
    const t = i / (n - 1);
    const sx = a.x + (b.x - a.x) * t;
    const sy = a.y + (b.y - a.y) * t;
    return { x: pts[i].x + (sx - pts[i].x) * TAUT, y: pts[i].y + (sy - pts[i].y) * TAUT };
  };
  const p0 = bx(0);
  let d = `M${p0.x.toFixed(1)},${p0.y.toFixed(1)}`;
  for (let i = 1; i < n - 1; i++) {
    const pi = bx(i);
    const pn = bx(i + 1);
    const xc = (pi.x + pn.x) / 2;
    const yc = (pi.y + pn.y) / 2;
    d += ` Q${pi.x.toFixed(1)},${pi.y.toFixed(1)} ${xc.toFixed(1)},${yc.toFixed(1)}`;
  }
  const pl = bx(n - 1);
  d += ` L${pl.x.toFixed(1)},${pl.y.toFixed(1)}`;
  return d;
}

function BoardCard({ card, unit }: { card: Card; unit?: string }) {
  const photo = useCardPhoto(card.id, card.hasPhoto);
  return (
    <div
      className="bcard"
      data-card={card.id}
      style={{ ['--x' as string]: card.x + 'px', ['--y' as string]: card.y + 'px' } as React.CSSProperties}
    >
      <span className="bcard-pin" />
      {photo && <img className="bcard-photo" src={photo} alt="" draggable={false} />}
      {card.content ? (
        <div className="bcard-text">{card.content}</div>
      ) : (
        !photo && <div className="bcard-text empty">แตะเพื่อเขียน</div>
      )}
      {card.pos != null && (
        <span className="bcard-page">{unit === 'percent' ? `${card.pos}%` : `หน้า ${card.pos}`}</span>
      )}
    </div>
  );
}

export default function Board({
  bookId,
  fromSession,
  resumeOnBack,
}: {
  bookId: string;
  fromSession?: boolean;
  resumeOnBack?: boolean;
}) {
  const { books, go, say, resumeSession } = useApp();
  const book = books.find((b) => b.id === bookId);

  // กลับจากบอร์ด — ถ้ามาจากหน้าอ่าน ให้เดินนาฬิกาต่อ (ถ้าตอนออกมากำลังอ่านอยู่)
  function goBack() {
    if (fromSession) {
      if (resumeOnBack) resumeSession();
      go({ name: 'session', bookId });
    } else {
      go({ name: 'book', bookId });
    }
  }

  // แถบปัดกลับที่ขอบซ้าย (เฉพาะตอนมาจากหน้าอ่าน) — แยกโซนจากการลากบอร์ด
  const edgeSwipe = useRef<{ x: number; y: number } | null>(null);
  function edgeDown(e: React.PointerEvent) {
    edgeSwipe.current = { x: e.clientX, y: e.clientY };
  }
  function edgeUp(e: React.PointerEvent) {
    const s = edgeSwipe.current;
    edgeSwipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (dx > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) goBack();
  }

  const [cards, setCards] = useState<Card[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [connect, setConnect] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [text, setText] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const wireRef = useRef<SVGPathElement>(null);
  const view = useRef({ panX: 0, panY: 0, zoom: 1 });
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  // ระบบเชือก physics
  const ropes = useRef<Map<string, Rope>>(new Map());
  const lineEls = useRef<Map<string, SVGPathElement>>(new Map());
  const hitEls = useRef<Map<string, SVGPathElement>>(new Map());
  const threadsRef = useRef<Thread[]>([]);
  const rafRef = useRef(0);

  const load = useCallback(async () => {
    const [cs, ts] = await Promise.all([cardsOf(bookId), threadsOf(bookId)]);
    setCards(cs);
    setThreads(ts);
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  // เคารพ prefers-reduced-motion — ปิดการแกว่งของเชือก (เส้นยังตามการ์ดถูกต้องผ่าน layout effect)
  const reduceMotion = useRef(false);
  useEffect(() => {
    try {
      reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      /* เบราว์เซอร์เก่าไม่มี matchMedia — ถือว่าไม่ลดการเคลื่อนไหว */
    }
  }, []);

  function applyView() {
    const w = worldRef.current;
    if (!w) return;
    const { panX, panY, zoom } = view.current;
    w.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
  useEffect(applyView, [cards]);

  // ---------- เชือก verlet ----------
  // จุดผูก = หมุดของการ์ด (ขอบบนกลาง) อ่านตำแหน่งสด ๆ จาก DOM (--x/--y + ความสูงจริง)
  // offsetHeight ไม่ถูก transform scale กระทบ จึงได้ความสูง layout จริงเสมอ
  function cardAnchor(id: string): Anchor | null {
    const w = worldRef.current;
    if (!w) return null;
    const el = w.querySelector(`[data-card="${CSS.escape(id)}"]`) as HTMLElement | null;
    if (!el) return null;
    const x = parseFloat(el.style.getPropertyValue('--x')) || 0;
    const y = parseFloat(el.style.getPropertyValue('--y')) || 0;
    return { x, y: y - el.offsetHeight / 2 - 6 };
  }

  function stepRope(rope: Rope, a: Anchor, b: Anchor): number {
    const p = rope.pts;
    const n = p.length;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const seg = (dist * SLACK) / (n - 1);
    let energy = 0;
    for (let i = 1; i < n - 1; i++) {
      const nd = p[i];
      const vx = (nd.x - nd.px) * DAMP;
      const vy = (nd.y - nd.py) * DAMP;
      nd.px = nd.x;
      nd.py = nd.y;
      nd.x += vx;
      nd.y += vy + GRAVITY;
      energy += Math.abs(vx) + Math.abs(vy);
    }
    p[0].x = a.x;
    p[0].y = a.y;
    p[n - 1].x = b.x;
    p[n - 1].y = b.y;
    for (let k = 0; k < ITER; k++) {
      for (let i = 0; i < n - 1; i++) {
        const A = p[i];
        const B = p[i + 1];
        let dx = B.x - A.x;
        let dy = B.y - A.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = ((d - seg) / d) * 0.5;
        const ox = dx * diff;
        const oy = dy * diff;
        if (i !== 0) {
          A.x += ox;
          A.y += oy;
        }
        if (i + 1 !== n - 1) {
          B.x -= ox;
          B.y -= oy;
        }
      }
      p[0].x = a.x;
      p[0].y = a.y;
      p[n - 1].x = b.x;
      p[n - 1].y = b.y;
    }
    return energy;
  }

  function buildRope(a: Anchor, b: Anchor): Rope {
    const pts: RopePt[] = [];
    for (let i = 0; i < ROPE_N; i++) {
      const t = i / (ROPE_N - 1);
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      pts.push({ x, y, px: x, py: y });
    }
    const rope: Rope = { pts, key: '' };
    for (let s = 0; s < 80; s++) stepRope(rope, a, b); // presettle ให้หย่อนก่อนวาดเฟรมแรก
    return rope;
  }

  // ผูกเฉพาะ path element เข้ากับ thread id — ไม่ยุ่งกับ rope
  // (ref ของลูกยิงก่อน worldRef ของพ่อ จึงห้ามคำนวณ anchor ตรงนี้ — ให้ loop สร้าง rope เอง)
  function attach(t: Thread, which: 'line' | 'hit', el: SVGPathElement | null) {
    const map = which === 'line' ? lineEls.current : hitEls.current;
    if (el) map.set(t.id, el);
    else map.delete(t.id);
  }

  // threads เปลี่ยน → ทิ้งของที่ไม่มีแล้ว
  useEffect(() => {
    threadsRef.current = threads;
    const ids = new Set(threads.map((t) => t.id));
    for (const id of [...ropes.current.keys()])
      if (!ids.has(id)) {
        ropes.current.delete(id);
        lineEls.current.delete(id);
        hitEls.current.delete(id);
      }
  }, [threads]);

  // วาดเชือกครั้งเดียวแบบ synchronous ทุกครั้งที่ card/thread เปลี่ยน
  // เพื่อให้เชือกถูกต้องตั้งแต่เฟรมแรก แม้ RAF จะถูกเบราว์เซอร์พักตอนแท็บไม่แสดง
  // (RAF ด้านล่างคือส่วน physics เคลื่อนไหว+ตามการ์ดสด เมื่อหน้าแสดงผลอยู่)
  useLayoutEffect(() => {
    for (const t of threads) {
      const a = cardAnchor(t.fromCardId);
      const b = cardAnchor(t.toCardId);
      if (!a || !b) continue;
      let rope = ropes.current.get(t.id);
      if (!rope) {
        rope = buildRope(a, b); // presettle 80 รอบในตัว
        ropes.current.set(t.id, rope);
      } else {
        // การ์ดขยับ → ผูกปลายที่หมุดใหม่แล้ว settle ให้เชือกตามถูกต้อง แม้ RAF จะถูกพัก
        for (let s = 0; s < 24; s++) stepRope(rope, a, b);
      }
      rope.key = `${a.x},${a.y},${b.x},${b.y}`;
      const d = ropeD(rope.pts, a, b);
      lineEls.current.get(t.id)?.setAttribute('d', d);
      hitEls.current.get(t.id)?.setAttribute('d', d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, cards]);

  // loop physics — เดินเฉพาะตอนมีการโต้ตอบหรือเชือกยังแกว่ง แล้วหยุดเองเมื่อนิ่ง
  // (ตอนนิ่งใช้ผลจาก useLayoutEffect ที่วาดไว้แล้ว — ไม่กิน CPU/แบตเปล่า)
  const step = () => {
    let energy = 0;
    for (const t of threadsRef.current) {
      const a = cardAnchor(t.fromCardId);
      const b = cardAnchor(t.toCardId);
      if (!a || !b) continue;
      let rope = ropes.current.get(t.id);
      if (!rope) {
        rope = buildRope(a, b);
        ropes.current.set(t.id, rope);
      }
      const key = `${a.x},${a.y},${b.x},${b.y}`;
      const moved = rope.key !== key;
      rope.key = key;
      const e = stepRope(rope, a, b);
      energy += e;
      if (moved || e > ENERGY_EPS) {
        const d = ropeD(rope.pts, a, b);
        lineEls.current.get(t.id)?.setAttribute('d', d);
        hitEls.current.get(t.id)?.setAttribute('d', d);
      }
    }
    // เดินต่อระหว่างยังแตะอยู่ (ลากการ์ด) หรือเชือกยังมีแรงแกว่ง
    rafRef.current = pointers.current.size > 0 || energy > ENERGY_EPS ? requestAnimationFrame(step) : 0;
  };
  function startLoop() {
    if (reduceMotion.current) return; // ไม่แกว่ง — layout effect วาดตำแหน่งถูกต้องให้อยู่แล้ว
    if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
  }
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // wheel ต้อง preventDefault เอง (React ผูก wheel แบบ passive)
  useEffect(() => {
    const surf = surfaceRef.current;
    if (!surf) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const r = surf!.getBoundingClientRect();
      const fx = e.clientX - r.left;
      const fy = e.clientY - r.top;
      const { panX, panY, zoom } = view.current;
      const wx = (fx - panX) / zoom;
      const wy = (fy - panY) / zoom;
      let nz = zoom * (e.deltaY < 0 ? 1.1 : 0.9);
      nz = Math.max(MIN_Z, Math.min(MAX_Z, nz));
      view.current.zoom = nz;
      view.current.panX = fx - wx * nz;
      view.current.panY = fy - wy * nz;
      applyView();
    }
    surf.addEventListener('wheel', onWheel, { passive: false });
    return () => surf.removeEventListener('wheel', onWheel);
  }, []);

  // โหลดรูปของการ์ดที่กำลังแก้เข้าแผ่นล่าง
  useEffect(() => {
    if (!editing || !editing.hasPhoto) {
      setEditPhoto(null);
      return;
    }
    let alive = true;
    let url: string | null = null;
    getCardPhoto(editing.id).then((row) => {
      if (!alive || !row) return;
      url = URL.createObjectURL(row.blob);
      setEditPhoto(url);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [editing]);

  function surfRect() {
    return surfaceRef.current!.getBoundingClientRect();
  }

  // แปลงพิกัดนิ้ว/เมาส์ → พิกัดในโลกของบอร์ด
  // world origin อยู่ที่ left:50%/top:50% ของพื้นบอร์ด แล้วค่อย translate(pan) scale(zoom)
  function toWorld(clientX: number, clientY: number) {
    const r = surfRect();
    return {
      x: (clientX - r.left - r.width / 2 - view.current.panX) / view.current.zoom,
      y: (clientY - r.top - r.height / 2 - view.current.panY) / view.current.zoom,
    };
  }

  function beginPinch() {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const r = surfRect();
    const mx = (pts[0].x + pts[1].x) / 2 - r.left;
    const my = (pts[0].y + pts[1].y) / 2 - r.top;
    const { panX, panY, zoom } = view.current;
    if (wireRef.current) wireRef.current.style.display = 'none';
    gesture.current = {
      type: 'pinch',
      startDist: dist,
      startZoom: zoom,
      fx: (mx - panX) / zoom,
      fy: (my - panY) / zoom,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    const surf = surfaceRef.current!;
    surf.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startLoop(); // ปลุก physics ระหว่างโต้ตอบ เชือกจะแกว่งตามการ์ดสด

    if (pointers.current.size === 2) {
      beginPinch();
      return;
    }

    const cardEl = (e.target as HTMLElement).closest('[data-card]') as HTMLElement | null;
    if (cardEl) {
      const id = cardEl.dataset.card!;
      const c = cards.find((k) => k.id === id);
      if (!c) return;
      if (connect) {
        const a = cardAnchor(id) ?? { x: c.x, y: c.y };
        gesture.current = { type: 'wire', fromId: id, fromX: a.x, fromY: a.y };
        const wp = wireRef.current;
        if (wp) {
          wp.setAttribute('d', wirePath(a.x, a.y, a.x, a.y));
          wp.style.display = '';
        }
      } else {
        gesture.current = {
          type: 'card',
          id,
          el: cardEl,
          sx: e.clientX,
          sy: e.clientY,
          startX: c.x,
          startY: c.y,
          moved: 0,
          lastX: c.x,
          lastY: c.y,
        };
      }
    } else {
      gesture.current = {
        type: 'pan',
        sx: e.clientX,
        sy: e.clientY,
        px: view.current.panX,
        py: view.current.panY,
      };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;

    if (g.type === 'pinch') {
      const pts = [...pointers.current.values()];
      if (pts.length < 2) return;
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const r = surfRect();
      const mx = (pts[0].x + pts[1].x) / 2 - r.left;
      const my = (pts[0].y + pts[1].y) / 2 - r.top;
      let nz = g.startZoom * (dist / g.startDist);
      nz = Math.max(MIN_Z, Math.min(MAX_Z, nz));
      view.current.zoom = nz;
      view.current.panX = mx - g.fx * nz;
      view.current.panY = my - g.fy * nz;
      applyView();
    } else if (g.type === 'pan') {
      view.current.panX = g.px + (e.clientX - g.sx);
      view.current.panY = g.py + (e.clientY - g.sy);
      applyView();
    } else if (g.type === 'card') {
      const dx = e.clientX - g.sx;
      const dy = e.clientY - g.sy;
      g.moved = Math.max(g.moved, Math.abs(dx) + Math.abs(dy));
      g.lastX = Math.round(g.startX + dx / view.current.zoom);
      g.lastY = Math.round(g.startY + dy / view.current.zoom);
      g.el.style.setProperty('--x', g.lastX + 'px');
      g.el.style.setProperty('--y', g.lastY + 'px');
    } else if (g.type === 'wire') {
      const w = toWorld(e.clientX, e.clientY);
      const wp = wireRef.current;
      if (wp) wp.setAttribute('d', wirePath(g.fromX, g.fromY, w.x, w.y));
    }
  }

  async function finishWire(fromId: string, clientX: number, clientY: number) {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const toId = el?.closest('[data-card]')?.getAttribute('data-card');
    if (!toId || toId === fromId) return;
    const dup = threads.some(
      (t) =>
        (t.fromCardId === fromId && t.toCardId === toId) ||
        (t.fromCardId === toId && t.toCardId === fromId)
    );
    if (dup) {
      say('สองใบนี้โยงกันอยู่แล้ว');
      return;
    }
    await addThread(bookId, fromId, toId);
    setThreads(await threadsOf(bookId));
    say('ขึงด้ายแล้ว');
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;

    if (g && g.type === 'wire' && pointers.current.size === 0) {
      if (wireRef.current) wireRef.current.style.display = 'none';
      finishWire(g.fromId, e.clientX, e.clientY);
    } else if (g && g.type === 'card' && pointers.current.size === 0) {
      if (g.moved < TAP_SLOP) {
        const c = cards.find((k) => k.id === g.id);
        if (c) {
          setEditing(c);
          setText(c.content);
        }
      } else {
        moveCard(g.id, g.lastX, g.lastY);
        setCards((cs) => cs.map((k) => (k.id === g.id ? { ...k, x: g.lastX, y: g.lastY } : k)));
      }
    }

    if (pointers.current.size === 0) {
      gesture.current = null;
    } else if (pointers.current.size === 1) {
      const [pt] = [...pointers.current.values()];
      gesture.current = { type: 'pan', sx: pt.x, sy: pt.y, px: view.current.panX, py: view.current.panY };
    }
  }

  async function removeThread(id: string) {
    await deleteThread(id);
    ropes.current.delete(id);
    setThreads(await threadsOf(bookId));
    say('ปลดด้ายแล้ว');
  }

  async function newCard() {
    const { x, y } = spiralXY(cards.length);
    const c = await addCard({ bookId, type: 'note', content: '', x, y });
    await load();
    setEditing(c);
    setText('');
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editing) return;
    try {
      const blob = await shrinkToCover(file, 720, 0.72);
      await putCardPhoto(editing.id, blob);
      forgetCardPhoto(editing.id);
      setEditPhoto((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setEditing({ ...editing, hasPhoto: true });
      setCards((cs) => cs.map((k) => (k.id === editing.id ? { ...k, hasPhoto: true } : k)));

    } catch {
      say('ใส่รูปไม่สำเร็จ');
    }
  }

  async function removePhoto() {
    if (!editing) return;
    await deleteCardPhoto(editing.id);
    forgetCardPhoto(editing.id);
    setEditPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setEditing({ ...editing, hasPhoto: false });
    setCards((cs) => cs.map((k) => (k.id === editing.id ? { ...k, hasPhoto: false } : k)));
  }

  async function saveEdit() {
    if (!editing) return;
    const t = text.trim();
    if (!t && !editing.hasPhoto) {
      await deleteCard(editing.id);
      forgetCardPhoto(editing.id);
    } else {
      await editCard(editing.id, t);
    }
    setEditing(null);
    setText('');
    await load();
  }

  async function removeCard() {
    if (!editing) return;
    await deleteCard(editing.id);
    forgetCardPhoto(editing.id);
    setEditing(null);
    setText('');
    await load();
  }

  async function closeEdit() {
    if (editing && !editing.content.trim() && !text.trim() && !editing.hasPhoto) {
      await deleteCard(editing.id);
      forgetCardPhoto(editing.id);
      await load();
    }
    setEditing(null);
    setText('');
  }

  return (
    <div className="board-page">
      {fromSession && (
        <div className="board-edge-back" onPointerDown={edgeDown} onPointerUp={edgeUp} aria-hidden="true" />
      )}
      <div className="board-bar">
        <button className="back" style={{ margin: 0 }} onClick={goBack}>
          {fromSession ? '← อ่านต่อ' : '← กลับ'}
        </button>
        <div className="board-title">{book?.title ?? 'บอร์ด'}</div>
        <button
          className={'board-connect' + (connect ? ' on' : '')}
          aria-pressed={connect}
          onClick={() => setConnect((v) => !v)}
        >
          ขึงด้าย
        </button>
        <button className="board-add" onClick={newCard} aria-label="เพิ่มการ์ด">
          ＋
        </button>
      </div>

      <div
        className={'board-surface' + (connect ? ' connect' : '')}
        ref={surfaceRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="board-world" ref={worldRef}>
          {cards.map((c) => (
            <BoardCard key={c.id} card={c} unit={book?.unit} />
          ))}

          {/* ด้ายอยู่ชั้นบนสุด — พาดทับกระดาษเหมือน evidence board จริง */}
          <svg className={'board-threads' + (connect ? ' connect' : '')}>
            {threads.map((t) => (
              <g key={t.id}>
                <path className="thread-line" ref={(el) => attach(t, 'line', el)} />
                <path
                  className="thread-hit"
                  data-thread={t.id}
                  ref={(el) => attach(t, 'hit', el)}
                  onPointerDown={connect ? (e) => e.stopPropagation() : undefined}
                  onClick={connect ? () => removeThread(t.id) : undefined}
                />
              </g>
            ))}
            <path ref={wireRef} className="thread-line wire-live" style={{ display: 'none' }} />
          </svg>
        </div>

        {connect && <div className="board-hint">ลากจากการ์ดหนึ่งไปอีกใบเพื่อขึงด้าย · แตะเส้นเพื่อปลด</div>}

        {cards.length === 0 && (
          <div className="board-empty">
            ยังไม่มีเบาะแสบนบอร์ด
            <br />
            แตะ ＋ เพื่อเริ่ม
          </div>
        )}
      </div>

      {editing && (
        <div className="sheet-scrim" onClick={closeEdit}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {editPhoto && (
              <div className="sheet-photo">
                <img src={editPhoto} alt="" />
                <button className="sheet-photo-rm" onClick={removePhoto}>
                  ลบรูป
                </button>
              </div>
            )}

            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="เขียนเบาะแส…"
            />

            <div className="sheet-addphoto">
              <label className="photo-btn">
                ถ่ายรูป
                <input type="file" accept="image/*" capture="environment" hidden onChange={onPickFile} />
              </label>
              <label className="photo-btn">
                เลือกรูป
                <input type="file" accept="image/*" hidden onChange={onPickFile} />
              </label>
            </div>

            <div className="sheet-actions">
              <button className="btn-bare danger" style={{ padding: '10px 0' }} onClick={removeCard}>
                ลบการ์ด
              </button>
              <span className="grow" />
              <button className="btn-bare" style={{ padding: '10px 0' }} onClick={closeEdit}>
                ยกเลิก
              </button>
              <button
                className="btn btn-primary"
                style={{ width: 'auto', padding: '10px 22px' }}
                onClick={saveEdit}
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
