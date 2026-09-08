import { db, type CardPhoto } from './schema';

/** รูปที่แนบบนการ์ด — ทุก write ผ่านที่นี่เหมือน repository อื่น ลอกแบบ covers.ts */

export function getCardPhoto(cardId: string): Promise<CardPhoto | undefined> {
  return db.cardPhotos.get(cardId);
}

export function allCardPhotos(): Promise<CardPhoto[]> {
  return db.cardPhotos.toArray();
}

export async function putCardPhoto(cardId: string, blob: Blob): Promise<void> {
  await db.transaction('rw', db.cardPhotos, db.cards, async () => {
    await db.cardPhotos.put({ cardId, blob, addedAt: Date.now() });
    await db.cards.update(cardId, { hasPhoto: true });
  });
}

export async function deleteCardPhoto(cardId: string): Promise<void> {
  await db.transaction('rw', db.cardPhotos, db.cards, async () => {
    await db.cardPhotos.delete(cardId);
    await db.cards.update(cardId, { hasPhoto: false });
  });
}
