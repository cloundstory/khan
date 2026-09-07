import { useState } from 'react';
import { useApp } from '../store/useApp';
import { addBook } from '../db/books';
import { COVER_COLORS, type Unit } from '../db/schema';

export default function AddBook() {
  const { go, refresh, say } = useApp();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [unit, setUnit] = useState<Unit>('page');
  const [total, setTotal] = useState('');
  const [intent, setIntent] = useState('');
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const ready = title.trim().length > 0;

  async function save() {
    setSaving(true);
    const parsed = parseInt(total, 10);
    await addBook({
      title,
      author,
      color,
      unit,
      total: Number.isFinite(parsed) ? parsed : undefined,
      intent,
    });
    await refresh();
    go({ name: 'room' });
    say('วางลงกองแล้ว');
  }

  return (
    <div className="page">
      <button className="back" onClick={() => go({ name: 'room' })}>← กลับห้อง</button>

      <div className="topline">
        <span className="wordmark">เพิ่มหนังสือ</span>
      </div>

      <div className="field">
        <label htmlFor="title">ชื่อเล่ม</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>

      <div className="field">
        <label htmlFor="author">ผู้เขียน</label>
        <input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="unit">นับความคืบหน้าเป็น</label>
          <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            <option value="page">หน้า</option>
            <option value="percent">เปอร์เซ็นต์</option>
          </select>
        </div>
        {unit === 'page' && (
          <div className="field">
            <label htmlFor="total">จำนวนหน้า</label>
            <input
              id="total"
              type="number"
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="intent">อยากรู้อะไรจากเล่มนี้</label>
        <textarea
          id="intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="ประโยคเดียว"
          style={{ minHeight: 70 }}
        />
        <div className="field-hint">
          อีกหกเดือนถ้าเล่มนี้ยังอยู่ในกอง บรรทัดนี้จะเป็นสิ่งที่บอกได้ว่าทำไมถึงอยากอ่าน
        </div>
      </div>

      <div className="field">
        <label>สีปก</label>
        <div className="swatches">
          {COVER_COLORS.map((c) => (
            <button
              key={c}
              className="swatch"
              style={{ background: c }}
              aria-pressed={color === c}
              aria-label={`สี ${c}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={save} disabled={!ready || saving}>
          วางลงกอง
        </button>
      </div>
    </div>
  );
}
