import type { Book, Session } from '../db/schema';

export interface BookStats {
  sessionCount: number;
  totalMinutes: number;
  progressed: number;
  /** ตำแหน่งต่อชั่วโมง — null ถ้ายังไม่พอคำนวณ */
  perHour: number | null;
  firstReadAt?: number;
  lastReadAt?: number;
}

export function statsFor(sessions: Session[]): BookStats {
  if (sessions.length === 0) {
    return { sessionCount: 0, totalMinutes: 0, progressed: 0, perHour: null };
  }
  const sorted = [...sessions].sort((a, b) => a.endedAt - b.endedAt);
  const totalMs = sorted.reduce((sum, s) => sum + Math.max(0, s.endedAt - s.startedAt), 0);
  const totalMinutes = Math.round(totalMs / 60_000);
  const progressed = sorted.reduce((sum, s) => sum + Math.max(0, s.endPos - s.startPos), 0);
  return {
    sessionCount: sorted.length,
    totalMinutes,
    progressed,
    perHour: totalMs > 0 ? Math.round((progressed / totalMs) * 3_600_000) : null,
    firstReadAt: sorted[0].endedAt,
    lastReadAt: sorted[sorted.length - 1].endedAt,
  };
}

/** เล่มที่ "เปิดอยู่" บนโต๊ะ = เล่มที่มี session ล่าสุด */
export function openBookId(deskBooks: Book[], sessions: Session[]): string | null {
  if (deskBooks.length === 0) return null;
  const deskIds = new Set(deskBooks.map((b) => b.id));
  let bestId: string | null = null;
  let bestAt = -1;
  for (const s of sessions) {
    if (deskIds.has(s.bookId) && s.endedAt > bestAt) {
      bestAt = s.endedAt;
      bestId = s.bookId;
    }
  }
  return bestId ?? deskBooks[0].id;
}

export function daysInPile(book: Book, now: number = Date.now()): number {
  return Math.floor((now - book.addedAt) / 86_400_000);
}
