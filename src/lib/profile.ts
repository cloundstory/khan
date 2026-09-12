import type { Session } from '../db/schema';
import { readingMs } from './stats';

export interface ReadingMonthDay {
  day: number;
  key: string;
  read: boolean;
  today: boolean;
  future: boolean;
}

export interface ReadingMonth {
  label: string;
  leadingBlanks: number;
  days: ReadingMonthDay[];
}

/** A local calendar key, so a late-night session lands on the reader's own day. */
export function localDayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function readingDayKeys(sessions: Session[]): Set<string> {
  return new Set(sessions.map((session) => localDayKey(new Date(session.endedAt))));
}

/**
 * A rhythm can still be shown before today's first session: if today is blank,
 * count the uninterrupted sequence ending yesterday rather than flashing zero
 * each morning.
 */
export function readingStreak(sessions: Session[], now: Date = new Date()): number {
  const keys = readingDayKeys(sessions);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!keys.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (keys.has(localDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Monday-first month grid, matching the quiet reading-calendar treatment. */
export function readingMonth(sessions: Session[], now: Date = new Date()): ReadingMonth {
  const readKeys = readingDayKeys(sessions);
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7;
  const todayKey = localDayKey(now);

  return {
    label: new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(first),
    leadingBlanks,
    days: Array.from({ length: lastDay }, (_, index) => {
      const date = new Date(year, month, index + 1);
      const key = localDayKey(date);
      return {
        day: index + 1,
        key,
        read: readKeys.has(key),
        today: key === todayKey,
        future: date.getTime() > new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
      };
    }),
  };
}

export function formatReadingTime(sessions: Session[]): string {
  const minutes = Math.floor(sessions.reduce((total, session) => total + readingMs(session), 0) / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
