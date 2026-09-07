import { useApp } from '../store/useApp';
import { openBookId, daysInPile } from '../lib/stats';
import { posLabel, progressRatio } from '../lib/format';
import type { Book } from '../db/schema';

export default function Room() {
  const { books, sessions, go } = useApp();

  const pile = books.filter((b) => b.status === 'pile').sort((a, b) => a.addedAt - b.addedAt);
  const desk = books.filter((b) => b.status === 'desk');
  const shelf = books
    .filter((b) => b.status === 'shelf')
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));

  const openId = openBookId(desk, sessions);
  const deskSorted = [...desk].sort((a, b) => (a.id === openId ? -1 : b.id === openId ? 1 : 0));

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

      <Zone name="โต๊ะ" count={desk.length} note={desk.length > 3 ? 'โต๊ะเริ่มแน่น' : undefined}>
        {deskSorted.length === 0 ? (
          <p className="zone-empty">ยังไม่มีเล่มไหนอยู่บนโต๊ะ</p>
        ) : (
          deskSorted.map((b) => (
            <Spine key={b.id} book={b} open={b.id === openId} onClick={() => go({ name: 'book', bookId: b.id })} />
          ))
        )}
      </Zone>

      <Zone name="กอง" count={pile.length}>
        {pile.length === 0 ? (
          <p className="zone-empty">กองว่าง</p>
        ) : (
          pile.map((b) => (
            <Spine key={b.id} book={b} pile onClick={() => go({ name: 'book', bookId: b.id })} />
          ))
        )}
      </Zone>

      <Zone name="ชั้น" count={shelf.length}>
        {shelf.length === 0 ? (
          <p className="zone-empty">ยังไม่มีเล่มไหนขึ้นชั้น</p>
        ) : (
          shelf.map((b) => (
            <Spine key={b.id} book={b} onClick={() => go({ name: 'book', bookId: b.id })} />
          ))
        )}
      </Zone>

      <button className="fab" onClick={() => go({ name: 'add' })} aria-label="เพิ่มหนังสือ">
        +
      </button>
    </div>
  );
}

function Zone(props: { name: string; count: number; note?: string; children: React.ReactNode }) {
  return (
    <section className="zone">
      <div className="zone-head">
        <span className="zone-name">{props.name}</span>
        <span className="zone-count">{props.count}</span>
        {props.note && <span className="zone-note">{props.note}</span>}
      </div>
      {props.children}
    </section>
  );
}

function Spine(props: { book: Book; open?: boolean; pile?: boolean; onClick: () => void }) {
  const { book } = props;
  const days = daysInPile(book);
  const ratio = progressRatio(book);
  // ฝุ่นคือความจริง ไม่ใช่การลงโทษ — เล่มที่กองนานกว่า 90 วันจะซีดลงนิดหนึ่ง
  const dusty = props.pile && days > 90;

  return (
    <button
      className={`spine${props.open ? ' open' : ''}${dusty ? ' dusty' : ''}`}
      onClick={props.onClick}
    >
      <span className="spine-edge" style={{ background: book.color }} />
      <span className="spine-body">
        <span className="spine-title">{book.title}</span>
        <span className="spine-meta">
          {book.author ? book.author : 'ไม่ระบุผู้เขียน'}
          {props.pile && ` · อยู่ในกอง ${days} วัน`}
          {!props.pile && book.current > 0 && ` · ${posLabel(book, book.current)}`}
        </span>
        {!props.pile && ratio != null && ratio > 0 && (
          <span className="progress">
            <i style={{ width: `${Math.round(ratio * 100)}%` }} />
          </span>
        )}
      </span>
      {props.open && <span className="spine-right">เปิดอยู่</span>}
    </button>
  );
}
