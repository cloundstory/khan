import { useMemo, useState } from 'react';
import { useApp } from '../store/useApp';
import { buildRecovery, daysAwayLabel } from '../lib/recovery';
import { statsFor, daysInPile, readingMs } from '../lib/stats';
import { posLabel, dateLabel, durationLabel } from '../lib/format';
import { toDesk, toPile, reread } from '../db/books';
import { addCard } from '../db/cards';
import Book3D from '../components/Book3D';
import type { Book, Session } from '../db/schema';

export default function BookSheet({ bookId }: { bookId: string }) {
  const { books, sessions, go, refresh, startSession, say } = useApp();
  const book = books.find((b) => b.id === bookId);

  const mine = useMemo(
    () => sessions.filter((s) => s.bookId === bookId).sort((a, b) => b.endedAt - a.endedAt),
    [sessions, bookId]
  );

  if (!book) {
    return (
      <div className="page">
        <button className="back" onClick={() => go({ name: 'room' })}>← กลับห้อง</button>
        <p className="zone-empty">ไม่พบเล่มนี้แล้ว</p>
      </div>
    );
  }

  const recovery = buildRecovery(book, mine);
  const stats = statsFor(mine);

  async function pickUp() {
    await toDesk(bookId);
    await refresh();
    say('วางบนโต๊ะแล้ว');
  }

  async function putBack() {
    await toPile(bookId);
    await refresh();
    go({ name: 'room' });
    say('วางกลับกองแล้ว บันทึกยังอยู่ครบ');
  }

  async function readAgain() {
    await reread(bookId);
    await refresh();
    say('กลับมาอยู่บนโต๊ะแล้ว');
  }

  function beginSession() {
    startSession({ bookId, startedAt: Date.now(), startPos: book!.current });
  }

  return (
    <div className="page">
      <button className="back" onClick={() => go({ name: 'room' })}>← กลับห้อง</button>

      <Book3D book={book} />

      <div className="book-head">
        <div className="wordmark" style={{ fontSize: 19 }}>{book.title}</div>
        <div className="spine-meta">{book.author ?? 'ไม่ระบุผู้เขียน'}</div>
      </div>

      {book.status === 'pile' && <PileView book={book} onPickUp={pickUp} />}

      {book.status === 'desk' && (
        <>
          {recovery.depth === 'fresh' ? (
            <div className="paper">
              <div className="paper-when">ยังไม่ได้เริ่มอ่าน</div>
              {book.intent && (
                <div className="paper-thought">อยากรู้ว่า {book.intent}</div>
              )}
            </div>
          ) : (
            <RecoveryCard book={book} recovery={recovery} />
          )}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={beginSession}>
              {recovery.depth === 'fresh' ? 'เริ่มอ่าน' : 'อ่านต่อ'}
            </button>
            <button className="btn btn-quiet" onClick={() => go({ name: 'closing', bookId })}>
              อ่านจบแล้ว
            </button>
            <button className="btn btn-bare" onClick={putBack}>
              วางกลับกอง
            </button>
          </div>
        </>
      )}

      {book.status === 'shelf' && (
        <ShelfView book={book} onReadAgain={readAgain} />
      )}

      {mine.length > 0 && (
        <>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-num">{stats.sessionCount}</div>
              <div className="stat-label">ครั้งที่อ่าน</div>
            </div>
            <div className="stat">
              <div className="stat-num">{stats.totalMinutes}</div>
              <div className="stat-label">นาทีรวม</div>
            </div>
            <div className="stat">
              <div className="stat-num">{stats.progressed}</div>
              <div className="stat-label">{book.unit === 'percent' ? '% ที่อ่าน' : 'หน้าที่อ่าน'}</div>
            </div>
          </div>

          <div className="section-label">บันทึกที่ผ่านมา</div>
          {mine.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              book={book}
              onPin={async () => {
                if (!s.note) return;
                await addCard({
                  bookId,
                  type: 'idea',
                  content: s.note,
                  pos: s.endPos,
                  fromSessionId: s.id,
                });
                say('ปักขึ้นบอร์ดแล้ว');
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

function PileView({ book, onPickUp }: { book: Book; onPickUp: () => void }) {
  const days = daysInPile(book);
  return (
    <>
      {book.intent && (
        <div className="paper">
          <div className="paper-when">ตอนเพิ่มเล่มนี้ อยากรู้ว่า</div>
          <div className="paper-thought">{book.intent}</div>
        </div>
      )}
      <p className="zone-empty" style={{ paddingLeft: 0 }}>
        อยู่ในกองมา {days} วัน
      </p>
      <div className="btn-row">
        <button className="btn btn-primary" onClick={onPickUp}>
          ลองเปิดดู
        </button>
      </div>
    </>
  );
}

function RecoveryCard({
  book,
  recovery,
}: {
  book: Book;
  recovery: ReturnType<typeof buildRecovery>;
}) {
  const last = recovery.last!;
  const older = recovery.trail.filter((s) => s.id !== last.id);

  return (
    <div className="paper">
      <div className="paper-when">
        อ่านครั้งล่าสุด {daysAwayLabel(recovery.daysAway)} · ค้างไว้ที่{' '}
        <span className="paper-where">{posLabel(book, last.endPos)}</span>
      </div>

      {last.note ? (
        <div className="paper-thought">{last.note}</div>
      ) : (
        <div className="paper-thought blank">ครั้งนั้นไม่ได้จดอะไรไว้</div>
      )}

      {older.length > 0 && (
        <div className="trail">
          {older.map((s) => (
            <div className="trail-item" key={s.id}>
              <span className="trail-pos">{posLabel(book, s.endPos)}</span>
              <span className="trail-text">{s.note}</span>
            </div>
          ))}
        </div>
      )}

      {recovery.showIntent && book.intent && (
        <div className="intent-line">
          ตอนหยิบเล่มนี้มา อยากรู้ว่า <em>{book.intent}</em>
        </div>
      )}
    </div>
  );
}

function ShelfView({ book, onReadAgain }: { book: Book; onReadAgain: () => void }) {
  return (
    <>
      {(book.intent || book.closingNote) && (
        <div className="paper">
          {book.intent && (
            <>
              <div className="paper-when">ตอนเริ่ม</div>
              <div className="paper-thought">{book.intent}</div>
            </>
          )}
          {book.closingNote && (
            <div className="intent-line">
              <div className="paper-when" style={{ marginBottom: 5 }}>
                อ่านจบแล้ว
              </div>
              <em>{book.closingNote}</em>
            </div>
          )}
        </div>
      )}
      {book.finishedAt && (
        <p className="zone-empty" style={{ paddingLeft: 0 }}>
          ขึ้นชั้นเมื่อ {dateLabel(book.finishedAt)}
        </p>
      )}
      <div className="btn-row">
        <button className="btn btn-quiet" onClick={onReadAgain}>
          อ่านซ้ำ
        </button>
      </div>
    </>
  );
}

function SessionRow({
  session,
  book,
  onPin,
}: {
  session: Session;
  book: Book;
  onPin: () => void;
}) {
  const [pinned, setPinned] = useState(false);
  return (
    <div className="session-row">
      <div className="session-top">
        <span>{dateLabel(session.endedAt)} · {durationLabel(readingMs(session))}</span>
        <span>{posLabel(book, session.startPos)} → {posLabel(book, session.endPos)}</span>
      </div>
      {session.note ? (
        <>
          <div className="session-note">{session.note}</div>
          <button
            className="pin-btn"
            disabled={pinned}
            onClick={() => { onPin(); setPinned(true); }}
          >
            {pinned ? '✓ อยู่บนบอร์ดแล้ว' : 'ปักขึ้นบอร์ด'}
          </button>
        </>
      ) : (
        <div className="session-note blank">ไม่ได้จดอะไรไว้</div>
      )}
    </div>
  );
}
