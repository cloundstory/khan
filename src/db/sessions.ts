import { db, uid, type Session } from './schema';

export function sessionsOf(bookId: string): Promise<Session[]> {
  return db.sessions.where('bookId').equals(bookId).sortBy('endedAt');
}

export function allSessions(): Promise<Session[]> {
  return db.sessions.toArray();
}

/** บันทึก session และอัปเดตตำแหน่งล่าสุดของเล่มในคราวเดียว */
export async function saveSession(input: {
  bookId: string;
  startedAt: number;
  endedAt: number;
  plannedMinutes?: number;
  startPos: number;
  endPos: number;
  note?: string;
}): Promise<Session> {
  const session: Session = {
    id: uid(),
    bookId: input.bookId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    plannedMinutes: input.plannedMinutes,
    startPos: Math.round(input.startPos),
    endPos: Math.round(input.endPos),
    note: input.note?.trim() || undefined,
  };
  await db.transaction('rw', db.sessions, db.books, async () => {
    await db.sessions.add(session);
    await db.books.update(input.bookId, { current: session.endPos });
  });
  return session;
}

export async function updateSessionNote(id: string, note: string): Promise<void> {
  await db.sessions.update(id, { note: note.trim() || undefined });
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}
