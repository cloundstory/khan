import { useApp } from '../store/useApp';
import { openBookId, daysInPile } from '../lib/stats';
import { buildRecovery, daysAwayLabel } from '../lib/recovery';
import { posLabel, progressRatio } from '../lib/format';
import { useCoverPhoto } from '../lib/useCoverPhoto';
import type { Book, Session } from '../db/schema';

export default function Room() {
  const { books, sessions, go } = useApp();

  const pile = books.filter((b) => b.status === 'pile').sort((a, b) => a.addedAt - b.addedAt);
  const desk = books.filter((b) => b.status === 'desk');
  const shelf = books
    .filter((b) => b.status === 'shelf')
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));

  const openId = openBookId(desk, sessions);
  const open = desk.find((b) => b.id === openId);
  const closed = desk.filter((b) => b.id !== openId);

  if (books.length === 0) {
    return (
      <div className="page">
        <div className="topline">
          <span className="wordmark">คั่น</span>
          <button className="icon-btn" onClick={() => go({ name: 'settings' })} aria-label="ตั้งค่า">
            ⚙
          </button>
        </div>
        <div className="empty-room">
          <div className="lamp">◐</div>
          <p>
            ห้องยังว่าง มีแค่โคมไฟบนโต๊ะ
            <br />
            เพิ่มเล่มแรกเพื่อเริ่มกอง
          </p>
        </div>
        <button className="fab" onClick={() => go({ name: 'add' })} aria-label="เพิ่มหนังสือ">
          +
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topline">
        <span className="wordmark">คั่น</span>
        <button className="icon-btn" onClick={() => go({ name: 'settings' })} aria-label="ตั้งค่า">
          ⚙
        </button>
      </div>

      {/* เรียงตามความสูงจริงของห้อง: ชั้นบนผนัง → โต๊ะ → กองบนพื้น
          และกองต้องอยู่ล่างสุดเพราะเป็นโซนเดียวที่โตไม่มีเพดาน */}
      <Zone name="ชั้น" tone="wall" count={shelf.length}>
        {shelf.length === 0 ? (
          <p className="zone-empty">ยังไม่มีเล่มไหนขึ้นชั้น</p>
        ) : (
          <>
            <div className="shelf">
              {shelf.map((b) => (
                <Spine key={b.id} book={b} onClick={() => go({ name: 'book', bookId: b.id })} />
              ))}
            </div>
            <div className="plank" />
          </>
        )}
      </Zone>

      <Zone name="โต๊ะ" tone="desk" count={desk.length} note={desk.length > 3 ? 'โต๊ะเริ่มแน่น' : undefined}>
        {!open ? (
          <p className="zone-empty">ยังไม่มีเล่มไหนอยู่บนโต๊ะ</p>
        ) : (
          <>
            <OpenBook
              book={open}
              sessions={sessions.filter((s) => s.bookId === open.id)}
              onClick={() => go({ name: 'book', bookId: open.id })}
            />
            {closed.length > 0 && (
              <div className="lying">
                {closed.map((b) => (
                  <LyingBook key={b.id} book={b} onClick={() => go({ name: 'book', bookId: b.id })} />
                ))}
              </div>
            )}
          </>
        )}
      </Zone>

      <Zone name="กอง" tone="floor" count={pile.length}>
        {pile.length === 0 ? (
          <p className="zone-empty">กองว่าง</p>
        ) : (
          /* column-reverse ใน CSS — เล่มแรกของอาร์เรย์ (เก่าสุด) จึงไปอยู่ก้นกอง */
          <div className="pile">
            {pile.map((b, i) => (
              <PileBook
                key={b.id}
                book={b}
                index={i}
                onClick={() => go({ name: 'book', bookId: b.id })}
              />
            ))}
          </div>
        )}
      </Zone>

      <button className="fab" onClick={() => go({ name: 'add' })} aria-label="เพิ่มหนังสือ">
        +
      </button>
    </div>
  );
}

/**
 * ขนาดสันมาจากจำนวนหน้าจริง — เล่มหนาต้องดูหนา เล่มใหญ่ต้องดูใหญ่
 * เล่มที่ไม่ได้บอกจำนวนหน้า (หรือคิดเป็น %) ใช้ขนาดกลาง
 */
function spineSize(book: Book): { sw: number; h: number } {
  if (book.unit === 'percent' || !book.total) return { sw: 22, h: 124 };
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  return {
    sw: Math.round(clamp(15 + book.total / 26, 15, 40)),
    h: Math.round(clamp(104 + book.total / 11, 96, 165)),
  };
}

/** ปกจริงขนาดเล็ก — ที่ถ่ายเองมาก่อนของจากฐานข้อมูลเสมอ */
function MiniCover({ book }: { book: Book }) {
  const photo = useCoverPhoto(book.id, book.hasCoverPhoto);
  const src = photo ?? book.coverUrl;
  if (!src) return null;
  return (
    <img
      className="mini-cover"
      src={src}
      alt=""
      // รูปจากโดเมนอื่นต้องขอแบบ cors ให้ตรงกับที่ Book3D ใช้ fetch
      // ไม่งั้น service worker จะเก็บ opaque response แล้วทำให้ 3D โหลดปกไม่ได้
      crossOrigin={photo ? undefined : 'anonymous'}
    />
  );
}

function Spine({ book, onClick }: { book: Book; onClick: () => void }) {
  const photo = useCoverPhoto(book.id, book.hasCoverPhoto);
  const cover = photo ?? book.coverUrl;
  const d = spineSize(book);
  return (
    <button
      className="vol"
      style={
        {
          '--c': book.color,
          '--sw': `${d.sw}px`,
          '--h': `${d.h}px`,
          '--cw': '30px',
        } as React.CSSProperties
      }
      aria-label={`${book.title}${book.author ? ` โดย ${book.author}` : ''}`}
      onClick={onClick}
    >
      <span className="vol-spine">
        <span className="vol-title">{book.title}</span>
      </span>
      {/* แผ่นปกที่พับลึกเข้าไป — ถ้ามีปกจริงก็เห็นเสี้ยวหนึ่งของมันตรงนี้ */}
      <span
        className="vol-cover"
        style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
      />
    </button>
  );
}

function LyingBook({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <button
      className="lying-bk"
      style={{ '--c': book.color } as React.CSSProperties}
      onClick={onClick}
    >
      <MiniCover book={book} />
      <span className="t">{book.title}</span>
      {book.current > 0 && <span className="m">{posLabel(book, book.current)}</span>}
    </button>
  );
}

function PileBook({ book, index, onClick }: { book: Book; index: number; onClick: () => void }) {
  const days = daysInPile(book);
  const sign = index % 2 ? 1 : -1;
  return (
    <button
      className={`pile-bk${days > 90 ? ' dusty' : ''}`}
      style={
        {
          '--c': book.color,
          '--dx': `${sign * (2 + (index % 3) * 2)}px`,
          '--rot': `${(sign * (0.3 + (index % 3) * 0.22)).toFixed(2)}deg`,
        } as React.CSSProperties
      }
      onClick={onClick}
    >
      <MiniCover book={book} />
      <span className="t">{book.title}</span>
      <span className="d">{days} วัน</span>
    </button>
  );
}

function OpenBook(props: { book: Book; sessions: Session[]; onClick: () => void }) {
  const { book, sessions } = props;
  const recovery = buildRecovery(book, sessions);
  const ratio = progressRatio(book);

  return (
    <button className="spread" onClick={props.onClick}>
      <span className="pg">
        <span className="spread-title">{book.title}</span>
        <span className="spread-author">{book.author ?? 'ไม่ระบุผู้เขียน'}</span>
        {ratio != null && ratio > 0 && (
          <span className="progress">
            <i style={{ width: `${Math.round(ratio * 100)}%` }} />
          </span>
        )}
      </span>

      <span className="pg">
        {recovery.depth === 'fresh' ? (
          <>
            <span className="spread-when">ยังไม่ได้เริ่มอ่าน</span>
            {book.intent && <span className="spread-note">อยากรู้ว่า {book.intent}</span>}
          </>
        ) : (
          <>
            <span className="spread-when">{daysAwayLabel(recovery.daysAway)}</span>
            <span className="spread-pos">ค้างไว้ที่ {posLabel(book, book.current)}</span>
            {recovery.last?.note ? (
              <span className="spread-note">{recovery.last.note}</span>
            ) : (
              <span className="spread-note blank">ครั้งนั้นไม่ได้จดอะไรไว้</span>
            )}
          </>
        )}
      </span>

      <span className="ribbon" />
    </button>
  );
}

/**
 * ไม่มีหัวข้อให้เห็นแล้ว — ภาพของแต่ละโซนบอกตัวเองอยู่แล้ว
 * แต่ยังใส่ aria-label ไว้ เพราะ screen reader ไม่ได้เห็นภาพนั้น
 */
function Zone(props: {
  name: string;
  tone: 'wall' | 'desk' | 'floor';
  count: number;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`zone zone--${props.tone}`} aria-label={props.name}>
      <div className="zone-head">
        {props.note && <span className="zone-note">{props.note}</span>}
        {props.count > 0 && <span className="zone-count">{props.count}</span>}
      </div>
      {props.children}
    </section>
  );
}
