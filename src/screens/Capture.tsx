import { useState } from 'react';
import { useApp } from '../store/useApp';
import { saveSession } from '../db/sessions';
import { posLabel, durationLabel } from '../lib/format';

/** กระดาษสรุป — เด้งขึ้นทุกครั้ง แต่ปล่อยว่างได้ */
export default function Capture({ bookId }: { bookId: string }) {
  const { books, active, go, refresh, clearSession, say } = useApp();
  const book = books.find((b) => b.id === bookId);
  const [pos, setPos] = useState(String(book?.current ?? 0));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!book || !active) {
    return (
      <div className="page">
        <p className="zone-empty">ไม่พบรอบการอ่านนี้</p>
        <button className="btn btn-quiet" onClick={() => go({ name: 'room' })}>กลับห้อง</button>
      </div>
    );
  }

  const endedAt = Date.now();
  const elapsed = endedAt - active.startedAt;

  async function save() {
    setSaving(true);
    const parsed = parseInt(pos, 10);
    const endPos = Number.isFinite(parsed) ? Math.max(0, parsed) : active!.startPos;
    await saveSession({
      bookId,
      startedAt: active!.startedAt,
      endedAt,
      plannedMinutes: active!.plannedMinutes,
      startPos: active!.startPos,
      endPos,
      note,
    });
    clearSession();
    await refresh();
    go({ name: 'book', bookId });
    say(note.trim() ? 'บันทึกไว้แล้ว' : 'บันทึกตำแหน่งแล้ว');
  }

  return (
    <div className="page">
      <div className="topline">
        <span className="wordmark">วางหนังสือลง</span>
      </div>

      <p className="zone-empty" style={{ paddingLeft: 0, paddingTop: 0 }}>
        อ่านไป {durationLabel(elapsed)} · เริ่มจาก {posLabel(book, active.startPos)}
      </p>

      <div className="field">
        <label htmlFor="pos">อ่านถึงไหน</label>
        <input
          id="pos"
          type="number"
          inputMode="numeric"
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          placeholder={book.unit === 'percent' ? 'เปอร์เซ็นต์' : 'เลขหน้า'}
        />
      </div>

      <div className="field">
        <label htmlFor="note">ตอนนี้คิดอะไรอยู่</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ประโยคเดียวก็พอ"
        />
        <div className="field-hint">
          ว่างไว้ก็ได้ — แต่บรรทัดนี้คือสิ่งที่จะพากลับเข้าเรื่องได้เร็วที่สุดในครั้งหน้า
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          วางหนังสือลง
        </button>
      </div>
    </div>
  );
}
