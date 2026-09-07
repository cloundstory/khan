import { useState } from 'react';
import { useApp } from '../store/useApp';
import { addBook } from '../db/books';
import { COVER_COLORS, type Unit } from '../db/schema';
import { lookupIsbn, normalizeIsbn, isValidIsbn13, LookupError } from '../lib/isbn';
import { loadCoverImage, dominantColor } from '../lib/cover';
import BarcodeScanner from '../components/BarcodeScanner';

type Step = 'choose' | 'scan' | 'form';

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'found' }
  | { state: 'notfound' }
  | { state: 'duplicate'; bookId: string; title: string }
  | { state: 'error'; msg: string };

export default function AddBook() {
  const { books, go, refresh, say } = useApp();

  const [step, setStep] = useState<Step>('choose');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [unit, setUnit] = useState<Unit>('page');
  const [total, setTotal] = useState('');
  const [intent, setIntent] = useState('');
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const [isbn, setIsbn] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [coverColor, setCoverColor] = useState<string | undefined>();
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const [detailsOpen, setDetailsOpen] = useState(false);
  /** สิ่งที่การค้นครั้งก่อนเขียนลงฟอร์ม — ใช้แยกว่าอันไหนของระบบ อันไหนคนพิมพ์เอง */
  const [filled, setFilled] = useState<{ title: string; author: string; total: string } | null>(null);

  const ready = title.trim().length > 0;

  async function runLookup(raw: string) {
    const code = normalizeIsbn(raw);
    setIsbn(code);

    if (!isValidIsbn13(code)) {
      setLookup({ state: 'error', msg: 'เลข ISBN ไม่ถูกต้อง ต้องเป็นตัวเลข 13 หลัก' });
      return;
    }

    // เคยเพิ่มเล่มนี้ไปแล้วหรือยัง — กันไม่ให้มีสองเล่มเดียวกันในห้องเงียบ ๆ
    const already = books.find((b) => b.isbn === code);
    if (already) {
      setLookup({ state: 'duplicate', bookId: already.id, title: already.title });
      return;
    }

    // ล้างผลของการค้นครั้งก่อนทิ้งก่อนเสมอ
    // ไม่งั้นถ้าครั้งนี้ไม่เจอ ข้อมูลของเล่มก่อนหน้าจะค้างแล้วติดไปกับเล่มใหม่
    setCoverUrl(undefined);
    setCoverColor(undefined);
    // ล้างเฉพาะช่องที่การค้นครั้งก่อนเขียนไว้และยังไม่มีใครแก้ — ของที่คนพิมพ์เองต้องไม่หาย
    if (filled) {
      if (title === filled.title) setTitle('');
      if (author === filled.author) setAuthor('');
      if (total === filled.total) setTotal('');
      setFilled(null);
    }
    setLookup({ state: 'loading' });

    try {
      const info = await lookupIsbn(code);
      if (!info) {
        setLookup({ state: 'notfound' });
        return;
      }
      const pages = info.pages ? String(info.pages) : '';
      setTitle(info.title);
      setAuthor(info.author ?? '');
      if (pages) {
        setUnit('page');
        setTotal(pages);
      }
      setFilled({ title: info.title, author: info.author ?? '', total: pages });
      setCoverUrl(info.coverUrl);
      setLookup({ state: 'found' });

      // เดาสีสันจากปกให้เลย จะได้ไม่ต้องบังคับให้เลือกสีตอนเพิ่มเล่ม
      if (info.coverUrl) {
        const canvas = await loadCoverImage(info.coverUrl);
        const picked = canvas && dominantColor(canvas);
        if (picked) {
          setCoverColor(picked);
          setColor(picked);
        }
      }
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

  // ---------- เลือกทาง ----------
  if (step === 'choose') {
    return (
      <div className="page">
        <button className="back" onClick={() => go({ name: 'room' })}>← กลับห้อง</button>
        <div className="topline">
          <span className="wordmark">เพิ่มหนังสือ</span>
        </div>

        <div className="choice">
          <button className="choice-card" onClick={() => setStep('scan')}>
            <span className="choice-icon">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
                <path d="M7 8v8M10 8v8M13.5 8v8M17 8v8" />
              </svg>
            </span>
            <span className="choice-text">
              <b>สแกนบาร์โค้ด</b>
              <span>ส่องบาร์โค้ดหลังปก แล้วเติมข้อมูลให้อัตโนมัติ</span>
            </span>
            <span className="chev">›</span>
          </button>

          <button
            className="choice-card"
            onClick={() => {
              setStep('form');
              setLookup({ state: 'idle' });
            }}
          >
            <span className="choice-icon">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            </span>
            <span className="choice-text">
              <b>กรอกเอง</b>
              <span>หนังสือที่พิมพ์ในไทยส่วนใหญ่ต้องใช้ทางนี้</span>
            </span>
            <span className="chev">›</span>
          </button>
        </div>
      </div>
    );
  }

  // ---------- กล้อง ----------
  if (step === 'scan') {
    return (
      <BarcodeScanner
        onClose={() => setStep('choose')}
        onManual={() => {
          setStep('form');
          setDetailsOpen(true);
        }}
        onFound={(code) => {
          setStep('form');
          runLookup(code);
        }}
      />
    );
  }

  // ---------- ฟอร์ม ----------
  return (
    <div className="page">
      <button className="back" onClick={() => setStep('choose')}>← เลือกวิธีอื่น</button>

      <div className="topline">
        <span className="wordmark">เพิ่มหนังสือ</span>
      </div>

      {lookup.state === 'loading' && <p className="lookup-msg">กำลังค้นจากเลข ISBN…</p>}
      {lookup.state === 'found' && (
        <p className="lookup-msg ok">เติมข้อมูลให้แล้ว ตรวจดูอีกทีก่อนบันทึก</p>
      )}
      {lookup.state === 'notfound' && (
        <p className="lookup-msg">
          ไม่พบเล่มนี้ในฐานข้อมูล — หนังสือที่พิมพ์ในไทยส่วนใหญ่จะไม่มี กรอกเองได้เลย
        </p>
      )}
      {lookup.state === 'error' && <p className="lookup-msg warn">{lookup.msg}</p>}
      {lookup.state === 'duplicate' && (
        <div className="dup">
          <span>“{lookup.title}” อยู่ในห้องแล้ว</span>
          <button className="btn-quiet dup-go" onClick={() => go({ name: 'book', bookId: lookup.bookId })}>
            เปิดเล่มนั้น
          </button>
        </div>
      )}

      {coverUrl && (
        <div className="cover-found">
          <img src={coverUrl} alt="" crossOrigin="anonymous" />
          <div>
            <div className="cover-found-label">ปกจริงจาก Open Library</div>
            <button className="cover-drop" onClick={() => setCoverUrl(undefined)}>
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

      {/* คำถามเดียวที่แอปอื่นไม่ถาม — ไม่พับไว้ ไม่งั้นเท่ากับบอกว่าเป็นของแถม */}
      <div className="field intent-field">
        <label htmlFor="intent">อยากรู้อะไรจากเล่มนี้</label>
        <textarea
          id="intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="ประโยคเดียวก็พอ"
        />
        <div className="field-hint">
          อีกหกเดือนถ้าเล่มนี้ยังอยู่ในกอง บรรทัดนี้จะเป็นสิ่งที่บอกได้ว่าทำไมถึงอยากอ่าน
        </div>
      </div>

      <details className="more" open={detailsOpen}>
        <summary>รายละเอียดเพิ่มเติม</summary>

        <div className="field">
          <label htmlFor="isbn">เลข ISBN</label>
          <div className="lookup-row">
            <input
              id="isbn"
              inputMode="numeric"
              placeholder="13 หลักหลังปก"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
            />
            <button
              className="lookup-go"
              onClick={() => runLookup(isbn)}
              disabled={lookup.state === 'loading' || isbn.trim().length === 0}
            >
              ค้น
            </button>
          </div>
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
          <label>{coverUrl ? 'สีสัน' : 'สีปก'}</label>
          <div className="field-hint" style={{ marginTop: 0, marginBottom: 9 }}>
            {coverColor
              ? 'เลือกสีจากปกให้แล้ว ใช้กับสันบนชั้นและแถบในกอง ซึ่งเป็นด้านที่มองไม่เห็นปก'
              : 'ใช้กับสันบนชั้นและแถบในกอง'}
          </div>
          <div className="swatches">
            {(coverColor ? [coverColor, ...COVER_COLORS] : COVER_COLORS).map((c, i) => (
              <button
                key={`${c}-${i}`}
                className={`swatch${coverColor && i === 0 ? ' from-cover' : ''}`}
                style={{ background: c }}
                aria-pressed={color === c}
                aria-label={coverColor && i === 0 ? `สีจากปก ${c}` : `สี ${c}`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
      </details>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={save} disabled={!ready || saving}>
          วางลงกอง
        </button>
      </div>
    </div>
  );
}
