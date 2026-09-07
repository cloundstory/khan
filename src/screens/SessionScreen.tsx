import { useEffect, useState } from 'react';
import { useApp } from '../store/useApp';
import { clockLabel } from '../lib/format';

/**
 * Stopwatch เดินเงียบ ๆ เป็น default
 * countdown เป็น option — และถึงหมดเวลาก็ไม่บังคับหยุด แค่บอกว่าถึงแล้ว
 */
export default function SessionScreen({ bookId }: { bookId: string }) {
  const { books, active, go } = useApp();
  const book = books.find((b) => b.id === bookId);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // กันหน้าจอดับระหว่างอ่าน ถ้าเบราว์เซอร์รองรับ
    let lock: WakeLockSentinel | undefined;
    const nav = navigator as Navigator & { wakeLock?: WakeLock };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, []);

  if (!active || !book) {
    return (
      <div className="reading">
        <p className="reading-book">ไม่พบรอบการอ่านนี้</p>
        <button className="reading-stop" onClick={() => go({ name: 'room' })}>กลับห้อง</button>
      </div>
    );
  }

  const elapsed = now - active.startedAt;
  const target = active.plannedMinutes ? active.plannedMinutes * 60_000 : null;
  const reached = target != null && elapsed >= target;

  return (
    <div className="reading">
      <div className="reading-book">{book.title}</div>
      <div className="reading-clock">{clockLabel(elapsed)}</div>
      {target != null && (
        <div className="reading-target">
          {reached ? 'ถึงเวลาที่ตั้งไว้แล้ว — อ่านต่อได้ตามสบาย' : `ตั้งไว้ ${active.plannedMinutes} นาที`}
        </div>
      )}
      <button className="reading-stop" onClick={() => go({ name: 'capture', bookId })}>
        หยุดอ่าน
      </button>
    </div>
  );
}
