import { describe, it, expect } from 'vitest';
import { statsFor, readingMs, pausedTotal, openBookId, daysInPile } from './stats';
import type { Book, Session } from '../db/schema';

const MIN = 60_000;
const DAY = 86_400_000;
const NOW = 1_000 * DAY;

function book(over: Partial<Book> = {}): Book {
  return {
    id: 'b1', title: 'ทดสอบ', color: '#000', unit: 'page',
    current: 0, status: 'desk', addedAt: 0, ...over,
  };
}

function session(over: Partial<Session> = {}): Session {
  return {
    id: 's1', bookId: 'b1',
    startedAt: NOW - 30 * MIN, endedAt: NOW,
    startPos: 0, endPos: 30, ...over,
  };
}

describe('readingMs', () => {
  it('ไม่มี pausedMs → เท่าเวลานาฬิกาแขวนผนัง (session เก่าต้องได้ค่าเดิม)', () => {
    expect(readingMs(session())).toBe(30 * MIN);
  });

  it('หักเวลาพักออกจากเวลาอ่าน', () => {
    expect(readingMs(session({ pausedMs: 10 * MIN }))).toBe(20 * MIN);
  });

  it('พักนานกว่าเวลาทั้งรอบ → ไม่ติดลบ', () => {
    expect(readingMs(session({ pausedMs: 99 * MIN }))).toBe(0);
  });
});

describe('pausedTotal', () => {
  it('ยังไม่เคยพัก → 0', () => {
    expect(pausedTotal({}, NOW)).toBe(0);
  });

  it('พักจบไปแล้ว → เท่ากับที่สะสมไว้', () => {
    expect(pausedTotal({ pausedMs: 5 * MIN }, NOW)).toBe(5 * MIN);
  });

  it('กำลังพักค้างอยู่ → รวมช่วงที่ยังไม่ปิดด้วย', () => {
    expect(pausedTotal({ pausedMs: 5 * MIN, pausedAt: NOW - 2 * MIN }, NOW)).toBe(7 * MIN);
  });

  it('pausedAt อยู่ในอนาคต (นาฬิกาเครื่องเพี้ยน) → ไม่หักย้อนกลับ', () => {
    expect(pausedTotal({ pausedMs: 5 * MIN, pausedAt: NOW + 3 * MIN }, NOW)).toBe(5 * MIN);
  });
});

describe('statsFor', () => {
  it('ยังไม่มี session', () => {
    expect(statsFor([])).toEqual({
      sessionCount: 0, totalMinutes: 0, progressed: 0, perHour: null,
    });
  });

  it('รวมเวลาและความคืบหน้าจากหลาย session', () => {
    const s = statsFor([
      session({ id: 'a', startedAt: NOW - DAY - 30 * MIN, endedAt: NOW - DAY, startPos: 0, endPos: 30 }),
      session({ id: 'b', startedAt: NOW - 30 * MIN, endedAt: NOW, startPos: 30, endPos: 50 }),
    ]);
    expect(s.sessionCount).toBe(2);
    expect(s.totalMinutes).toBe(60);
    expect(s.progressed).toBe(50);
    expect(s.perHour).toBe(50);
    expect(s.firstReadAt).toBe(NOW - DAY);
    expect(s.lastReadAt).toBe(NOW);
  });

  it('★ perHour ต้องหักเวลาพัก ไม่งั้นตัวเลขต่ำกว่าจริง', () => {
    const s = statsFor([
      session({ startedAt: NOW - 60 * MIN, endedAt: NOW, pausedMs: 20 * MIN, startPos: 0, endPos: 40 }),
    ]);
    // อ่านจริง 40 นาที ได้ 40 หน้า → 60 หน้า/ชั่วโมง (ถ้าไม่หักพักจะได้ 40)
    expect(s.totalMinutes).toBe(40);
    expect(s.perHour).toBe(60);
  });

  it('อ่านถอยหลัง (endPos < startPos) ไม่หักความคืบหน้าที่สะสมไว้', () => {
    const s = statsFor([
      session({ id: 'a', startPos: 0, endPos: 30 }),
      session({ id: 'b', startPos: 30, endPos: 10 }),
    ]);
    expect(s.progressed).toBe(30);
  });

  it('เวลาอ่านเป็นศูนย์ → perHour เป็น null ไม่ใช่ Infinity', () => {
    const s = statsFor([session({ startedAt: NOW, endedAt: NOW, startPos: 0, endPos: 5 })]);
    expect(s.perHour).toBeNull();
  });
});

describe('openBookId', () => {
  it('ไม่มีเล่มบนโต๊ะ → null', () => {
    expect(openBookId([], [session()])).toBeNull();
  });

  it('เลือกเล่มที่มี session ล่าสุด', () => {
    const books = [book({ id: 'b1' }), book({ id: 'b2' })];
    const sessions = [
      session({ id: 'a', bookId: 'b1', endedAt: NOW - DAY }),
      session({ id: 'b', bookId: 'b2', endedAt: NOW }),
    ];
    expect(openBookId(books, sessions)).toBe('b2');
  });

  it('มีเล่มบนโต๊ะแต่ยังไม่เคยอ่านเลย → คืนเล่มแรก', () => {
    const books = [book({ id: 'b1' }), book({ id: 'b2' })];
    expect(openBookId(books, [])).toBe('b1');
  });

  it('ไม่สนใจ session ของเล่มที่ไม่ได้อยู่บนโต๊ะ', () => {
    const books = [book({ id: 'b1' })];
    const sessions = [session({ id: 'x', bookId: 'b9', endedAt: NOW })];
    expect(openBookId(books, sessions)).toBe('b1');
  });
});

describe('daysInPile', () => {
  it('นับจากวันที่เพิ่มเล่ม', () => {
    expect(daysInPile(book({ addedAt: NOW - 3 * DAY }), NOW)).toBe(3);
    expect(daysInPile(book({ addedAt: NOW }), NOW)).toBe(0);
  });
});
