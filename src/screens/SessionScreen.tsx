import { useEffect, useState } from 'react';
import { useApp } from '../store/useApp';
import { clockLabel } from '../lib/format';
import { pausedTotal } from '../lib/stats';

/**
 * Stopwatch เดินเงียบ ๆ เป็น default
 * countdown เป็น option — และถึงหมดเวลาก็ไม่บังคับหยุด แค่บอกว่าถึงแล้ว
 * พักได้ด้วยการแตะที่นาฬิกา — เวลาอ่านหยุดเดิน ปุ่มจริงยังมีปุ่มเดียวคือหยุด
 */
export default function SessionScreen({ bookId }: { bookId: string }) {
  const { books, active, go, pauseSession, resumeSession } = useApp();
  const book = books.find((b) => b.id === bookId);
  const [now, setNow] = useState(Date.now());
  const paused = Boolean(active?.pausedAt);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // กันหน้าจอดับระหว่างอ่าน ถ้าเบราว์เซอร์รองรับ
    // ตอนพักปล่อยให้จอดับได้ตามปกติ — ไม่มีใครอ่านอยู่
    if (paused) return;
    let lock: WakeLockSentinel | undefined;
    const nav = navigator as Navigator & { wakeLock?: WakeLock };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, [paused]);

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
  );
}
