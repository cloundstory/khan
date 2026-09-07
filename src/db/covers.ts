import { db, type CoverPhoto } from './schema';

/** รูปปกที่ถ่ายเอง — ทุก write ผ่านที่นี่เหมือน repository อื่น */

export function getCoverPhoto(bookId: string): Promise<CoverPhoto | undefined> {
  return db.covers.get(bookId);
}

export function allCoverPhotos(): Promise<CoverPhoto[]> {
  return db.covers.toArray();
}

export async function putCoverPhoto(bookId: string, blob: Blob): Promise<void> {
  await db.transaction('rw', db.covers, db.books, async () => {
    await db.covers.put({ bookId, blob, addedAt: Date.now() });
    await db.books.update(bookId, { hasCoverPhoto: true });
  });
}

export async function deleteCoverPhoto(bookId: string): Promise<void> {
  await db.transaction('rw', db.covers, db.books, async () => {
    await db.covers.delete(bookId);
    await db.books.update(bookId, { hasCoverPhoto: false });
  });
}
