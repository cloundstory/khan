import { create } from 'zustand';
import type { Book, Session } from '../db/schema';
import { allBooks } from '../db/books';
import { allSessions } from '../db/sessions';

export type Screen =
  | { name: 'room' }
  | { name: 'browse' }
  | { name: 'book'; bookId: string }
  | { name: 'add' }
  | { name: 'session'; bookId: string }
  | { name: 'capture'; bookId: string }
  | { name: 'closing'; bookId: string }
  | { name: 'board'; bookId: string }
  | { name: 'settings' };

/** session ที่กำลังเดิน — เก็บใน localStorage กัน refresh แล้วหาย */
export interface ActiveSession {
  bookId: string;
  startedAt: number;
  startPos: number;
  plannedMinutes?: number;
  /** เวลาพักสะสม (ms) */
  pausedMs?: number;
  /** เวลาที่เริ่มพักรอบปัจจุบัน — ไม่มี = กำลังอ่านอยู่ */
  pausedAt?: number;
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
  pauseSession: () => void;
  resumeSession: () => void;
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
    const fresh: ActiveSession = { ...a, pausedMs: 0, pausedAt: undefined };
    saveActive(fresh);
    set({ active: fresh, screen: { name: 'session', bookId: a.bookId } });
  },

  /** พักสายตา/ลุกไปเข้าห้องน้ำ — เวลาอ่านหยุดเดิน แต่ session ยังอยู่ */
  pauseSession: () =>
    set((s) => {
      if (!s.active || s.active.pausedAt) return {};
      const next: ActiveSession = { ...s.active, pausedAt: Date.now() };
      saveActive(next);
      return { active: next };
    }),

  resumeSession: () =>
    set((s) => {
      if (!s.active?.pausedAt) return {};
      const next: ActiveSession = {
        ...s.active,
        pausedMs: (s.active.pausedMs ?? 0) + Math.max(0, Date.now() - s.active.pausedAt),
        pausedAt: undefined,
      };
      saveActive(next);
      return { active: next };
    }),

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
