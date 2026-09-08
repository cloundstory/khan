import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/useApp';
import { clockLabel } from '../lib/format';
import { pausedTotal } from '../lib/stats';
import Board from './Board';

const SPLIT = 0.62; // สัดส่วนความกว้างบอร์ดตอน "แบ่งครึ่ง"
const TAP_SLOP = 6;

/**
 * Stopwatch เดินเงียบ ๆ เป็น default — แตะนาฬิกาเพื่อพัก
 * บอร์ดเป็นพาเนลเลื่อนเข้ามาจากขวา (ไม่เปลี่ยนหน้า):
 *   ปิด/แบ่งครึ่ง → นาฬิกาเดิน (จดพร้อมอ่าน)  ·  เต็มจอ → พักอัตโนมัติ (§0)
 */
export default function SessionScreen({ bookId }: { bookId: string }) {
  const { books, active, go, pauseSession, resumeSession } = useApp();
  const book = books.find((b) => b.id === bookId);
  const [now, setNow] = useState(Date.now());
  const paused = Boolean(active?.pausedAt);

  const [panelW, setPanelW] = useState(0); // px กว้างของพาเนลบอร์ด
  const drag = useRef<{ x: number; w: number; moved: number } | null>(null);
  const isFull = useRef(false);
  const wasReading = useRef(false); // ก่อนเปิดเต็ม กำลังอ่านอยู่ไหม (ไว้ resume ตอนหุบ)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // กันจอดับระหว่างอ่าน — ตอนพักปล่อยให้ดับได้
    if (paused) return;
    let lock: WakeLockSentinel | undefined;
    const nav = navigator as Navigator & { wakeLock?: WakeLock };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, [paused]);

  const fullW = () => window.innerWidth;
  const splitW = () => Math.round(window.innerWidth * SPLIT);

  // เต็มจอ = พัก · หุบออกจากเต็ม = เดินต่อ (ถ้าตอนเปิดเต็มกำลังอ่านอยู่)
  function applyPause(w: number) {
    const nowFull = w >= fullW() - 2;
    if (nowFull && !isFull.current) {
      isFull.current = true;
      wasReading.current = !Boolean(active?.pausedAt);
      if (wasReading.current) pauseSession();
    } else if (!nowFull && isFull.current) {
      isFull.current = false;
      if (wasReading.current) resumeSession();
    }
  }

  function snap(w: number) {
    const cands = [0, splitW(), fullW()];
    let best = cands[0];
    for (const c of cands) if (Math.abs(w - c) < Math.abs(w - best)) best = c;
    setPanelW(best);
    applyPause(best);
  }

  function hDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: panelW, moved: 0 };
  }
  function hMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    const w = Math.max(0, Math.min(fullW(), d.w - dx)); // ลากซ้าย (dx<0) = กว้างขึ้น
    setPanelW(w);
  }
  function hUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved < TAP_SLOP) snap(panelW > 0 ? 0 : splitW()); // แตะ = สลับ ปิด/แบ่งครึ่ง
    else snap(panelW);
  }

  if (!active || !book) {
    return (
      <div className="reading">
        <p className="reading-book">ไม่พบรอบการอ่านนี้</p>
        <button className="reading-stop" onClick={() => go({ name: 'room' })}>กลับห้อง</button>
      </div>
    );
  }

  const elapsed = Math.max(0, now - active.startedAt - pausedTotal(active, now));
  const target = active.plannedMinutes ? active.plannedMinutes * 60_000 : null;
  const reached = target != null && elapsed >= target;

  return (
    <div className={paused ? 'reading is-paused' : 'reading'}>
      {/* content จัดกลางเฉพาะพื้นที่ซ้ายที่เหลือ (หดตามความกว้างพาเนล) จะได้ไม่โดนบอร์ดทับ */}
      <div className="reading-center" style={{ right: panelW }}>
        <div className="reading-book">{book.title}</div>

        <button
          className="reading-clock"
          onClick={() => (paused ? resumeSession() : pauseSession())}
          aria-label={paused ? 'อ่านต่อ' : 'พัก'}
        >
          {clockLabel(elapsed)}
        </button>

        {target != null && !paused && (
          <div className="reading-target">
            {reached ? 'ถึงเวลาที่ตั้งไว้แล้ว — อ่านต่อได้ตามสบาย' : `ตั้งไว้ ${active.plannedMinutes} นาที`}
          </div>
        )}

        <div className="reading-hint">
          {paused ? 'พักอยู่ — แตะนาฬิกาเพื่ออ่านต่อ' : 'แตะนาฬิกาเพื่อพัก'}
        </div>

        <button className="reading-stop" onClick={() => go({ name: 'capture', bookId })}>
          หยุดอ่าน
        </button>
      </div>

      {/* หูจับลูกศร — ลากซ้ายเพื่อดึงบอร์ดเข้ามา แตะเพื่อสลับ ปิด/แบ่งครึ่ง
          clamp ไม่ให้เลื่อนหลุดจอตอนเต็ม จะได้ยังจับลากกลับได้ */}
      <button
        className="board-handle"
        style={{ right: Math.min(panelW, window.innerWidth - 32) }}
        onPointerDown={hDown}
        onPointerMove={hMove}
        onPointerUp={hUp}
        onPointerCancel={hUp}
        aria-label="เปิด/ปิดบอร์ด"
      >
        {panelW > 4 ? '›' : '‹'}
      </button>

      {/* พาเนลบอร์ด — เลื่อนเข้ามาทับ timer โดยไม่เปลี่ยนหน้า */}
      {panelW > 0 && (
        <div className="board-panel" style={{ width: panelW }}>
          <Board bookId={bookId} panel />
        </div>
      )}
    </div>
  );
}
