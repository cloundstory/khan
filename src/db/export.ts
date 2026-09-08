import { db, SCHEMA_VERSION, type Book, type Session, type Card, type Thread } from './schema';
import { blobToDataUrl, dataUrlToBlob } from '../lib/photo';

export interface Backup {
  app: 'khan';
  schemaVersion: number;
  exportedAt: string;
  books: Book[];
  sessions: Session[];
  cards: Card[];
  threads: Thread[];
  /**
   * รูปปกที่ถ่ายเอง เก็บเป็น data URL
   * ทำให้ไฟล์โตขึ้นราว 50-80 KB ต่อรูป แต่ backup ที่กู้คืนได้ไม่ครบก็ไม่ใช่ backup
   */
  coverPhotos?: Array<{ bookId: string; dataUrl: string }>;
  /** รูปที่แนบบนการ์ดบอร์ด เก็บเป็น data URL เช่นเดียวกับปก */
  cardPhotos?: Array<{ cardId: string; dataUrl: string }>;
}

export async function buildBackup(): Promise<Backup> {
  const [books, sessions, cards, threads, covers, cardPics] = await Promise.all([
    db.books.toArray(),
    db.sessions.toArray(),
    db.cards.toArray(),
    db.threads.toArray(),
    db.covers.toArray(),
    db.cardPhotos.toArray(),
  ]);

  const coverPhotos = await Promise.all(
    covers.map(async (c) => ({ bookId: c.bookId, dataUrl: await blobToDataUrl(c.blob) }))
  );
  const cardPhotos = await Promise.all(
    cardPics.map(async (c) => ({ cardId: c.cardId, dataUrl: await blobToDataUrl(c.blob) }))
  );

  return {
    app: 'khan',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    books,
    sessions,
    cards,
    threads,
    coverPhotos,
    cardPhotos,
  };
}

/** คืนขนาดไฟล์เป็นไบต์ เพื่อให้บอกผู้ใช้ได้ว่าไฟล์กำลังโตขึ้นแค่ไหน */
export async function downloadBackup(): Promise<number> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `khan-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return blob.size;
}

export interface ImportResult {
  added: { books: number; sessions: number; cards: number; threads: number; photos: number };
  skipped: number;
}

/**
 * นำเข้าแบบ merge — ของเดิมไม่หาย
 * id ที่ซ้ำจะถูกข้าม ไม่ทับ
 */
export async function importBackup(json: unknown): Promise<ImportResult> {
  const data = json as Partial<Backup>;
  if (!data || !Array.isArray(data.books)) {
    throw new Error('ไฟล์นี้ไม่ใช่ข้อมูลของคั่น');
  }

  const result: ImportResult = {
    added: { books: 0, sessions: 0, cards: 0, threads: 0, photos: 0 },
    skipped: 0,
  };

  await db.transaction('rw', db.books, db.sessions, db.cards, db.threads, async () => {
    for (const b of data.books ?? []) {
      if (await db.books.get(b.id)) { result.skipped++; continue; }
      await db.books.add(b);
      result.added.books++;
    }
    for (const s of data.sessions ?? []) {
      if (await db.sessions.get(s.id)) { result.skipped++; continue; }
      await db.sessions.add(s);
      result.added.sessions++;
    }
    for (const c of data.cards ?? []) {
      if (await db.cards.get(c.id)) { result.skipped++; continue; }
      await db.cards.add(c);
      result.added.cards++;
    }
    for (const t of data.threads ?? []) {
      if (await db.threads.get(t.id)) { result.skipped++; continue; }
      await db.threads.add(t);
      result.added.threads++;
    }
  });

  // รูปปกแปลงกลับเป็น Blob นอก transaction เพราะ fetch(dataUrl) เป็น async ที่ Dexie คุมไม่ได้
  for (const p of data.coverPhotos ?? []) {
    if (await db.covers.get(p.bookId)) { result.skipped++; continue; }
    try {
      const blob = await dataUrlToBlob(p.dataUrl);
      await db.covers.put({ bookId: p.bookId, blob, addedAt: Date.now() });
      await db.books.update(p.bookId, { hasCoverPhoto: true });
      result.added.photos++;
    } catch {
      result.skipped++;
    }
  }

  // รูปการ์ดกู้คืนแบบเดียวกับปก — ข้ามถ้ามีอยู่แล้ว
  for (const p of data.cardPhotos ?? []) {
    if (await db.cardPhotos.get(p.cardId)) { result.skipped++; continue; }
    try {
      const blob = await dataUrlToBlob(p.dataUrl);
      await db.cardPhotos.put({ cardId: p.cardId, blob, addedAt: Date.now() });
      await db.cards.update(p.cardId, { hasPhoto: true });
      result.added.photos++;
    } catch {
      result.skipped++;
    }
  }

  return result;
}
