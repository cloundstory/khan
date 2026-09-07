import { create } from 'zustand';
import type { Book, Session } from '../db/schema';
import { allBooks } from '../db/books';
import { allSessions } from '../db/sessions';

export type Screen =
  | { name: 'room' }
  | { name: 'book'; bookId: string }
  | { name: 'add' }
  | { name: 'session'; bookId: string }
  | { name: 'capture'; bookId: string }
  | { name: 'closing'; bookId: string }
  | { name: 'settings' };

/** session ที่กำลังเดิน — เก็บใน localStorage กัน refresh แล้วหาย */
export interface ActiveSession {
  bookId: string;
  startedAt: number;
  startPos: number;
  plannedMinutes?: number;
}

const ACTIVE_KEY = 'khan:active-session';

function loadActive(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

function saveActive(a: ActiveSession | null) {
  try {
    if (a) localStorage.setItem(ACTIVE_KEY, JSON.stringify(a));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ — ไม่เป็นไร */
  }
}

interface AppState {
  books: Book[];
  sessions: Session[];
  loading: boolean;
  screen: Screen;
  active: ActiveSession | null;
  toast: string | null;

  refresh: () => Promise<void>;
  go: (screen: Screen) => void;
  startSession: (a: ActiveSession) => void;
  clearSession: () => void;
  say: (msg: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useApp = create<AppState>((set) => ({
  books: [],
  sessions: [],
  loading: true,
  screen: { name: 'room' },
  active: loadActive(),
  toast: null,

  refresh: async () => {
    const [books, sessions] = await Promise.all([allBooks(), allSessions()]);
    set({ books, sessions, loading: false });
  },

  go: (screen) => set({ screen }),

  startSession: (a) => {
    saveActive(a);
    set({ active: a, screen: { name: 'session', bookId: a.bookId } });
  },

  clearSession: () => {
    saveActive(null);
    set({ active: null });
  },

  say: (msg) => {
    set({ toast: msg });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
}));
