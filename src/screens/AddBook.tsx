import { useState } from 'react';
import { useApp } from '../store/useApp';
import { addBook } from '../db/books';
import { COVER_COLORS, type Unit } from '../db/schema';
import { lookupIsbn, normalizeIsbn, isValidIsbn13, LookupError } from '../lib/isbn';
import BarcodeScanner from '../components/BarcodeScanner';

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'found' }
  | { state: 'notfound' }
  | { state: 'error'; msg: string };

export default function AddBook() {
  const { go, refresh, say } = useApp();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [unit, setUnit] = useState<Unit>('page');
  const [total, setTotal] = useState('');
  const [intent, setIntent] = useState('');
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const [isbn, setIsbn] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const [scanning, setScanning] = useState(false);

  const ready = title.trim().length > 0;

  async function runLookup(raw: string) {
    const code = normalizeIsbn(raw);
    setIsbn(code);
    if (!isValidIsbn13(code)) {
      setLookup({ state: 'error', msg: 'เลข ISBN ไม่ถูกต้อง ต้องเป็นตัวเลข 13 หลัก' });
      return;
    }
    setLookup({ state: 'loading' });
    try {
      const info = await lookupIsbn(code);
      if (!info) {
        setLookup({ state: 'notfound' });
        return;
      }
      setTitle(info.title);
      if (info.author) setAuthor(info.author);
      if (info.pages) {
        setUnit('page');
        setTotal(String(info.pages));
      }
      setCoverUrl(info.coverUrl);
      setLookup({ state: 'found' });
    } catch (e) {
      setLookup({
        state: 'error',
        msg: e instanceof LookupError ? e.message : 'ค้นข้อมูลไม่สำเร็จ',
      });
    }
  }

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
      isbn: isbn || undefined,
      coverUrl,
    });
    await refresh();
    go({ name: 'room' });
    say('วางลงกองแล้ว');
  }

  if (scanning) {
    return (
      <BarcodeScanner
        onClose={() => setScanning(false)}
        onFound={(code) => {
          setScanning(false);
          runLookup(code);
        }}
      />
    );
  }

  return (
    <div className="page">
      <button className="back" onClick={() => go({ name: 'room' })}>← กลับห้อง</button>

      <div className="topline">
        <span className="wordmark">เพิ่มหนังสือ</span>
      </div>

      {/* หาจาก ISBN — ช่วยกรอกให้ ไม่ใช่ขั้นตอนบังคับ ข้ามไปกรอกเองได้เลย */}
      <div className="lookup">
        <div className="lookup-row">
          <input
            aria-label="เลข ISBN"
            inputMode="numeric"
            placeholder="เลข ISBN 13 หลัก"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
          <button
            className="btn-quiet lookup-go"
            onClick={() => runLookup(isbn)}
            disabled={lookup.state === 'loading' || isbn.trim().length === 0}
          >
            ค้น
          </button>
        </div>
        <button className="btn btn-quiet" onClick={() => setScanning(true)}>
          สแกนบาร์โค้ดหลังปก
        </button>

        {lookup.state === 'loading' && <p className="lookup-msg">กำลังค้น…</p>}
        {lookup.state === 'found' && <p className="lookup-msg ok">เติมข้อมูลให้แล้ว ตรวจดูอีกทีก่อนบันทึก</p>}
        {lookup.state === 'notfound' && (
          <p className="lookup-msg">
            ไม่พบเล่มนี้ในฐานข้อมูล — หนังสือที่พิมพ์ในไทยส่วนใหญ่จะไม่มี กรอกเองด้านล่างได้เลย
          </p>
        )}
        {lookup.state === 'error' && <p className="lookup-msg warn">{lookup.msg}</p>}
      </div>

      {coverUrl && (
        <div className="cover-found">
          <img src={coverUrl} alt="" />
          <div>
            <div className="cover-found-label">ปกจริงจาก Open Library</div>
            <button className="btn-bare cover-drop" onClick={() => setCoverUrl(undefined)}>
              ไม่ใช้ปกนี้
            </button>
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="title">ชื่อเล่ม</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
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
        <label>สีปก{coverUrl ? ' (ใช้กับสันหนังสือ)' : ''}</label>
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
