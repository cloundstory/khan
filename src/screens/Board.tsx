import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../store/useApp';
import { cardsOf, moveCard, addCard, deleteCard, editCard, spiralXY } from '../db/cards';
import type { Card } from '../db/schema';

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
  | { type: 'pinch'; startDist: number; startZoom: number; fx: number; fy: number };

export default function Board({ bookId }: { bookId: string }) {
  const { books, go } = useApp();
  const book = books.find((b) => b.id === bookId);

  const [cards, setCards] = useState<Card[]>([]);
  const [editing, setEditing] = useState<Card | null>(null);
  const [text, setText] = useState('');

  const surfaceRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const view = useRef({ panX: 0, panY: 0, zoom: 1 });
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  const load = useCallback(async () => {
    setCards(await cardsOf(bookId));
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  function applyView() {
    const w = worldRef.current;
    if (!w) return;
    const { panX, panY, zoom } = view.current;
    w.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
  useEffect(applyView, [cards]);

  // wheel ต้อง preventDefault เอง (React ผูก wheel แบบ passive) — bind ตรงกับ element
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

  function rectMid() {
    return surfaceRef.current!.getBoundingClientRect();
  }

  function beginPinch() {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const r = rectMid();
    const mx = (pts[0].x + pts[1].x) / 2 - r.left;
    const my = (pts[0].y + pts[1].y) / 2 - r.top;
    const { panX, panY, zoom } = view.current;
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
      const r = rectMid();
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
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;

    if (g && g.type === 'card' && pointers.current.size === 0) {
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
      // นิ้วเหลือหนึ่ง (เพิ่งปล่อยจาก pinch) → กลับไปโหมดเลื่อนบอร์ด
      const [pt] = [...pointers.current.values()];
      gesture.current = { type: 'pan', sx: pt.x, sy: pt.y, px: view.current.panX, py: view.current.panY };
    }
  }

  async function newCard() {
    const { x, y } = spiralXY(cards.length);
    const c = await addCard({ bookId, type: 'note', content: '', x, y });
    await load();
    setEditing(c);
    setText('');
  }

  async function saveEdit() {
    if (!editing) return;
    const t = text.trim();
    if (!t) await deleteCard(editing.id);
    else await editCard(editing.id, t);
    setEditing(null);
    setText('');
    await load();
  }

  async function removeCard() {
    if (!editing) return;
    await deleteCard(editing.id);
    setEditing(null);
    setText('');
    await load();
  }

  // ปิดแผ่นโดยไม่บันทึก — การ์ดที่ยังว่างเปล่าถือว่ายกเลิก ลบทิ้ง
  async function closeEdit() {
    if (editing && !editing.content.trim() && !text.trim()) {
      await deleteCard(editing.id);
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
        <button className="board-add" onClick={newCard} aria-label="เพิ่มการ์ด">
          ＋
        </button>
      </div>

      <div
        className="board-surface"
        ref={surfaceRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="board-world" ref={worldRef}>
          {cards.map((c) => (
            <div
              key={c.id}
              className="bcard"
              data-card={c.id}
              style={{ ['--x' as string]: c.x + 'px', ['--y' as string]: c.y + 'px' } as React.CSSProperties}
            >
              <span className="bcard-pin" />
              {c.content ? (
                <div className="bcard-text">{c.content}</div>
              ) : (
                <div className="bcard-text empty">แตะเพื่อเขียน</div>
              )}
              {c.pos != null && (
                <span className="bcard-page">
                  {book?.unit === 'percent' ? `${c.pos}%` : `หน้า ${c.pos}`}
                </span>
              )}
            </div>
          ))}
        </div>

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
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="เขียนเบาะแส…"
            />
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
