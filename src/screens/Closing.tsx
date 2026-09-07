import { useState } from 'react';
import { useApp } from '../store/useApp';
import { toShelf } from '../db/books';

/** พิธีปิด — คู่กับ intent ตอนเพิ่มเล่ม */
export default function Closing({ bookId }: { bookId: string }) {
  const { books, go, refresh, say } = useApp();
  const book = books.find((b) => b.id === bookId);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!book) return null;

  async function finish() {
    setSaving(true);
    await toShelf(bookId, note);
    await refresh();
    go({ name: 'room' });
    say('ขึ้นชั้นแล้ว');
  }

  return (
    <div className="page">
      <button className="back" onClick={() => go({ name: 'book', bookId })}>← ยังไม่จบ</button>

      <div className="topline">
        <span className="wordmark">{book.title}</span>
      </div>

      {book.intent && (
        <div className="paper">
          <div className="paper-when">ตอนหยิบเล่มนี้มา อยากรู้ว่า</div>
          <div className="paper-thought">{book.intent}</div>
        </div>
      )}

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="closing">อ่านจบแล้ว รู้สึกยังไง</label>
        <textarea
          id="closing"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เขียนหรือไม่เขียนก็ได้"
        />
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={finish} disabled={saving}>
          วางขึ้นชั้น
        </button>
      </div>
    </div>
  );
}
