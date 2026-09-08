import { db, uid, type Book, type BookStatus, type Unit, type BookFormat } from './schema';

/** ทุก write ต้องผ่านที่นี่ — component ห้ามเรียก Dexie ตรง */

export function allBooks(): Promise<Book[]> {
  return db.books.toArray();
}

export function getBook(id: string): Promise<Book | undefined> {
  return db.books.get(id);
}

export async function addBook(input: {
  title: string;
  author?: string;
  color: string;
  unit: Unit;
  total?: number;
  intent?: string;
  isbn?: string;
  coverUrl?: string;
  format?: BookFormat;
}): Promise<Book> {
  const book: Book = {
    id: uid(),
    title: input.title.trim(),
    author: input.author?.trim() || undefined,
    color: input.color,
    unit: input.unit,
    total: input.total ? Math.round(input.total) : undefined,
    isbn: input.isbn || undefined,
    coverUrl: input.coverUrl || undefined,
    format: input.format ?? 'physical',
    current: 0,
    status: 'pile',
    intent: input.intent?.trim() || undefined,
    addedAt: Date.now(),
  };
  await db.books.add(book);
  return book;
}

/** กอง → โต๊ะ */
export async function toDesk(id: string): Promise<void> {
  const book = await db.books.get(id);
  if (!book) return;
  await db.books.update(id, {
    status: 'desk' as BookStatus,
    startedAt: book.startedAt ?? Date.now(),
  });
}

/**
 * โต๊ะ → กอง. ไม่มี confirm ไม่มีคำถาม
 * sessions และตำแหน่งที่อ่านถึงยังอยู่ครบ
 */
export async function toPile(id: string): Promise<void> {
  await db.books.update(id, { status: 'pile' as BookStatus });
}

/** โต๊ะ → ชั้น พร้อมกระดาษปิด (ว่างได้) */
export async function toShelf(id: string, closingNote?: string): Promise<void> {
  await db.books.update(id, {
    status: 'shelf' as BookStatus,
    finishedAt: Date.now(),
    closingNote: closingNote?.trim() || undefined,
  });
}

/** ชั้น → โต๊ะ (อ่านซ้ำ) — ไม่ reset finishedAt */
export async function reread(id: string): Promise<void> {
  await db.books.update(id, { status: 'desk' as BookStatus });
}

export async function updateBook(id: string, patch: Partial<Book>): Promise<void> {
  await db.books.update(id, patch);
}

export async function deleteBook(id: string): Promise<void> {
  await db.transaction('rw', [db.books, db.sessions, db.cards, db.threads, db.cardPhotos, db.covers], async () => {
    const cardIds = await db.cards.where('bookId').equals(id).primaryKeys();
    await db.cardPhotos.bulkDelete(cardIds);
    await db.sessions.where('bookId').equals(id).delete();
    await db.cards.where('bookId').equals(id).delete();
    await db.threads.where('bookId').equals(id).delete();
    await db.covers.delete(id);
    await db.books.delete(id);
  });
}
