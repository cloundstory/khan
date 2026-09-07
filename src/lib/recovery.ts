import type { Book, Session } from '../db/schema';

export type RecoveryDepth = 'fresh' | 'recent' | 'trail' | 'deep';

export interface Recovery {
  depth: RecoveryDepth;
  daysAway: number;
  /** session ล่าสุด — ไม่มีถ้ายังไม่เคยอ่าน */
  last?: Session;
  /** ร่องรอยความคิด เรียงจากเก่าไปใหม่ (เฉพาะที่มี note) */
  trail: Session[];
  /** แสดง intent ไหม — เฉพาะตอนหายไปนาน */
  showIntent: boolean;
}

export const DAY = 86_400_000;

/**
 * ยิ่งหายไปนาน ยิ่งต้องขุดลึก
 *   < 7 วัน   : note ล่าสุดพอ
 *   7–30 วัน  : trail 3–5 note
 *   > 30 วัน  : trail + intent ตอนซื้อ
 */
export function buildRecovery(
  book: Book,
  sessions: Session[],
  now: number = Date.now()
): Recovery {
  const sorted = [...sessions].sort((a, b) => a.endedAt - b.endedAt);
  const last = sorted[sorted.length - 1];

  if (!last) {
    return { depth: 'fresh', daysAway: 0, trail: [], showIntent: Boolean(book.intent) };
  }

  const daysAway = Math.max(0, Math.floor((now - last.endedAt) / DAY));
  const withNotes = sorted.filter((s) => s.note);

  if (daysAway < 7) {
    return {
      depth: 'recent',
      daysAway,
      last,
      trail: withNotes.slice(-1),
      showIntent: false,
    };
  }

  if (daysAway <= 30) {
    return {
      depth: 'trail',
      daysAway,
      last,
      trail: withNotes.slice(-5),
      showIntent: false,
    };
  }

  return {
    depth: 'deep',
    daysAway,
    last,
    trail: withNotes.slice(-5),
    showIntent: Boolean(book.intent),
  };
}

/** ข้อความหัวการ์ด — ภาษาคน ไม่ใช่ timestamp */
export function daysAwayLabel(days: number): string {
  if (days === 0) return 'วันนี้';
  if (days === 1) return 'เมื่อวาน';
  if (days < 7) return `${days} วันที่แล้ว`;
  if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`;
  if (days < 365) return `${Math.floor(days / 30)} เดือนที่แล้ว`;
  return `${Math.floor(days / 365)} ปีที่แล้ว`;
}
