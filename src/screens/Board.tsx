import { useCallback, useEffect, useRef, useState } from 'react';
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

/** เส้นด้ายหย่อนเล็กน้อย — bezier จุดควบคุมหย่อนลงตามระยะห่าง ไม่จำลอง Verlet */
function wirePath(ax: number, ay: number, bx: number, by: number): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dist = Math.hypot(bx - ax, by - ay);
  const cy = my + Math.max(6, dist * 0.16);
  return `M${ax},${ay} Q${mx},${cy} ${bx},${by}`;
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

export default function Board({ bookId }: { bookId: string }) {
  const { books, go, say } = useApp();
  const book = books.find((b) => b.id === bookId);

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

  const load = useCallback(async () => {
    const [cs, ts] = await Promise.all([cardsOf(bookId), threadsOf(bookId)]);
    setCards(cs);
    setThreads(ts);
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  const cardMap: Record<string, Card> = {};
  for (const c of cards) cardMap[c.id] = c;

  function applyView() {
    const w = worldRef.current;
    if (!w) return;
    const { panX, panY, zoom } = view.current;
    w.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
  useEffect(applyView, [cards]);

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

  function surfRect() {
    return surfaceRef.current!.getBoundingClientRect();
  }

  // แปลงพิกัดนิ้ว/เมาส์ → พิกัดในโลกของบอร์ด (หักพื้นเลื่อนและซูมออก)
  function toWorld(clientX: number, clientY: number) {
    const r = surfRect();
    return {
      x: (clientX - r.left - view.current.panX) / view.current.zoom,
      y: (clientY - r.top - view.current.panY) / view.current.zoom,
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
        gesture.current = { type: 'wire', fromId: id, fromX: c.x, fromY: c.y };
        const wp = wireRef.current;
        if (wp) {
          wp.setAttribute('d', wirePath(c.x, c.y, c.x, c.y));
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
      <div className="board-bar">
        <button className="back" style={{ margin: 0 }} onClick={() => go({ name: 'book', bookId })}>
          ← กลับ
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
          <svg className={'board-threads' + (connect ? ' connect' : '')}>
            {threads.map((t) => {
              const a = cardMap[t.fromCardId];
              const b = cardMap[t.toCardId];
              if (!a || !b) return null;
              const d = wirePath(a.x, a.y, b.x, b.y);
              return (
                <g key={t.id}>
                  <path className="thread-line" d={d} />
                  <path
                    className="thread-hit"
                    d={d}
                    data-thread={t.id}
                    onPointerDown={connect ? (e) => e.stopPropagation() : undefined}
                    onClick={connect ? () => removeThread(t.id) : undefined}
                  />
                </g>
              );
            })}
            <path ref={wireRef} className="thread-line wire-live" style={{ display: 'none' }} />
          </svg>

          {cards.map((c) => (
            <BoardCard key={c.id} card={c} unit={book?.unit} />
          ))}
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
