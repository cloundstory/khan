import Dexie, { type Table } from 'dexie';

/** ตำแหน่งในเล่ม: หน้า หรือ เปอร์เซ็นต์ — เก็บเป็น integer เสมอ */
export type Unit = 'page' | 'percent';
export type BookStatus = 'pile' | 'desk' | 'shelf';
export type CardType = 'quote' | 'note' | 'character' | 'idea';
/** 0 = ตึง, 1 = ปกติ, 2 = หย่อน — ความมั่นใจในการเชื่อมโยง */
export type Tension = 0 | 1 | 2;

export interface Book {
  id: string;
  title: string;
  author?: string;
  color: string;
  unit: Unit;
  total?: number;
  current: number;
  status: BookStatus;
  /** "อยากรู้อะไรจากเล่มนี้" — ถามตอนเพิ่มเล่ม */
  intent?: string;
  /** กระดาษปิดตอนขึ้นชั้น */
  closingNote?: string;
  addedAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface Session {
  id: string;
  bookId: string;
  startedAt: number;
  endedAt: number;
  plannedMinutes?: number;
  startPos: number;
  endPos: number;
  /** กระดาษสรุป — หัวใจของ context recovery */
  note?: string;
}

export interface Card {
  id: string;
  bookId: string;
  type: CardType;
  content: string;
  pos?: number;
  x: number;
  y: number;
  fromSessionId?: string;
  createdAt: number;
}

export interface Thread {
  id: string;
  bookId: string;
  fromCardId: string;
  toCardId: string;
  tension: Tension;
}

export interface Settings {
  id: 'settings';
  defaultMinutes?: number;
  schemaVersion: number;
}

export const SCHEMA_VERSION = 1;

class RawangDB extends Dexie {
  books!: Table<Book, string>;
  sessions!: Table<Session, string>;
  cards!: Table<Card, string>;
  threads!: Table<Thread, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('khan');
    this.version(1).stores({
      books: 'id, status, addedAt, finishedAt',
      sessions: 'id, bookId, endedAt',
      cards: 'id, bookId, createdAt',
      threads: 'id, bookId',
      settings: 'id',
    });
  }
}

export const db = new RawangDB();

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** สีปกให้เลือก — โทนหม่นเข้ากับห้อง ไม่ใช่สีสด */
export const COVER_COLORS = [
  '#b07156', '#6b8f71', '#7b6b8d', '#5a7fa5',
  '#c4956a', '#5c7e6b', '#a06060', '#7a8b6f',
];
