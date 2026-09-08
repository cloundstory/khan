import { db, uid, type Card, type CardType, type Thread, type Tension } from './schema';

/** Phase 3 จะใช้เต็ม — Phase 1 ใช้แค่ปักจาก session note */

export function cardsOf(bookId: string): Promise<Card[]> {
  return db.cards.where('bookId').equals(bookId).toArray();
}

export function threadsOf(bookId: string): Promise<Thread[]> {
  return db.threads.where('bookId').equals(bookId).toArray();
}

export async function addCard(input: {
  bookId: string;
  type: CardType;
  content: string;
  pos?: number;
  x?: number;
  y?: number;
  fromSessionId?: string;
}): Promise<Card> {
  const card: Card = {
    id: uid(),
    bookId: input.bookId,
    type: input.type,
    content: input.content.trim(),
    pos: input.pos != null ? Math.round(input.pos) : undefined,
    x: input.x ?? Math.round((Math.random() - 0.5) * 200),
    y: input.y ?? Math.round((Math.random() - 0.5) * 200),
    fromSessionId: input.fromSessionId,
    createdAt: Date.now(),
  };
  await db.cards.add(card);
  return card;
}

export async function moveCard(id: string, x: number, y: number): Promise<void> {
  await db.cards.update(id, { x: Math.round(x), y: Math.round(y) });
}

export async function deleteCard(id: string): Promise<void> {
  await db.transaction('rw', db.cards, db.threads, db.cardPhotos, async () => {
    await db.threads.where('fromCardId').equals(id).delete();
    await db.threads.where('toCardId').equals(id).delete();
    await db.cardPhotos.delete(id);
    await db.cards.delete(id);
  });
}

export async function addThread(
  bookId: string,
  fromCardId: string,
  toCardId: string
): Promise<Thread> {
  const thread: Thread = { id: uid(), bookId, fromCardId, toCardId, tension: 1 };
  await db.threads.add(thread);
  return thread;
}

export async function setTension(id: string, tension: Tension): Promise<void> {
  await db.threads.update(id, { tension });
}

/** แก้ข้อความบนการ์ด — ไม่แตะ session note เดิม เพราะการ์ดเป็นสำเนาแล้ว */
export async function editCard(id: string, content: string): Promise<void> {
  await db.cards.update(id, { content: content.trim() });
}

/**
 * วางการ์ดใหม่เป็นวงก้นหอย (phyllotaxis) รอบจุดกลางบอร์ด
 * แทนการสุ่ม x/y เดิมที่ทำให้การ์ดทับกันมั่ว — ใบแรก (index 0) อยู่กลางพอดี
 */
export function spiralXY(index: number): { x: number; y: number } {
  const golden = 2.399963; // ~137.5° เป็นเรเดียน
  const a = index * golden;
  const r = 82 * Math.sqrt(index);
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
}
