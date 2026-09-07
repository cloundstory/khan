import { describe, it, expect } from 'vitest';
import { buildRecovery, DAY, daysAwayLabel } from './recovery';
import type { Book, Session } from '../db/schema';

const book: Book = {
  id: 'b1', title: 'ทดสอบ', color: '#000', unit: 'page',
  current: 100, status: 'desk', intent: 'อยากรู้ว่าจบยังไง', addedAt: 0,
};

const NOW = 1_000 * DAY;

function s(daysAgo: number, note?: string): Session {
  return {
    id: `s${daysAgo}`, bookId: 'b1',
    startedAt: NOW - daysAgo * DAY - 1800_000,
    endedAt: NOW - daysAgo * DAY,
    startPos: 0, endPos: 100, note,
  };
}

describe('buildRecovery', () => {
  it('ยังไม่เคยอ่าน → fresh', () => {
    const r = buildRecovery(book, [], NOW);
    expect(r.depth).toBe('fresh');
    expect(r.last).toBeUndefined();
    expect(r.showIntent).toBe(true);
  });

  it('อ่านเมื่อ 2 วันก่อน → recent, note ล่าสุดใบเดียว', () => {
    const r = buildRecovery(book, [s(10, 'เก่า'), s(2, 'ล่าสุด')], NOW);
    expect(r.depth).toBe('recent');
    expect(r.daysAway).toBe(2);
    expect(r.trail).toHaveLength(1);
    expect(r.trail[0].note).toBe('ล่าสุด');
    expect(r.showIntent).toBe(false);
  });

  it('หายไป 14 วัน → trail สูงสุด 5 ใบ', () => {
    const sessions = [s(60, 'a'), s(50, 'b'), s(40, 'c'), s(30, 'd'), s(20, 'e'), s(14, 'f')];
    const r = buildRecovery(book, sessions, NOW);
    expect(r.depth).toBe('trail');
    expect(r.trail).toHaveLength(5);
    expect(r.trail[4].note).toBe('f');
    expect(r.showIntent).toBe(false);
  });

  it('หายไป 90 วัน → deep + intent', () => {
    const r = buildRecovery(book, [s(90, 'นานแล้ว')], NOW);
    expect(r.depth).toBe('deep');
    expect(r.showIntent).toBe(true);
  });

  it('ขอบเขต 7 วันพอดี → trail ไม่ใช่ recent', () => {
    expect(buildRecovery(book, [s(6)], NOW).depth).toBe('recent');
    expect(buildRecovery(book, [s(7)], NOW).depth).toBe('trail');
    expect(buildRecovery(book, [s(30)], NOW).depth).toBe('trail');
    expect(buildRecovery(book, [s(31)], NOW).depth).toBe('deep');
  });

  it('session ที่ไม่มี note ไม่ติดมาใน trail', () => {
    const r = buildRecovery(book, [s(20, 'มี'), s(15), s(10, 'มีอีก')], NOW);
    expect(r.trail.every((x) => x.note)).toBe(true);
    expect(r.last?.id).toBe('s10');
  });
});

describe('daysAwayLabel', () => {
  it('พูดเป็นภาษาคน', () => {
    expect(daysAwayLabel(0)).toBe('วันนี้');
    expect(daysAwayLabel(1)).toBe('เมื่อวาน');
    expect(daysAwayLabel(3)).toBe('3 วันที่แล้ว');
    expect(daysAwayLabel(14)).toBe('2 สัปดาห์ที่แล้ว');
    expect(daysAwayLabel(60)).toBe('2 เดือนที่แล้ว');
  });
});
