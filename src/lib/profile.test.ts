import { describe, expect, it } from 'vitest';
import type { Session } from '../db/schema';
import { formatReadingTime, readingMonth, readingStreak } from './profile';

function session(day: number, durationMinutes = 30): Session {
  const endedAt = new Date(2026, 6, day, 20, 0).getTime();
  return {
    id: String(day),
    bookId: 'book-1',
    startedAt: endedAt - durationMinutes * 60_000,
    endedAt,
    startPos: 0,
    endPos: 0,
  };
}

describe('profile reading rhythm', () => {
  it('keeps a streak through yesterday before today has a session', () => {
    const now = new Date(2026, 6, 12, 9, 0);
    expect(readingStreak([session(9), session(10), session(11)], now)).toBe(3);
  });

  it('stops a streak at the first missing day', () => {
    const now = new Date(2026, 6, 12, 20, 0);
    expect(readingStreak([session(8), session(10), session(11), session(12)], now)).toBe(3);
  });

  it('marks only recorded calendar days as read', () => {
    const month = readingMonth([session(2), session(6)], new Date(2026, 6, 7, 12));
    expect(month.label).toBe('July 2026');
    expect(month.days[1]?.read).toBe(true);
    expect(month.days[5]?.read).toBe(true);
    expect(month.days[2]?.read).toBe(false);
  });

  it('formats accumulated reading time without adding paused time', () => {
    const paused: Session = { ...session(2, 90), pausedMs: 30 * 60_000 };
    expect(formatReadingTime([paused, session(3, 30)])).toBe('1h 30m');
  });
});
