import { db, SCHEMA_VERSION, type Book, type Session, type Card, type Thread } from './schema';

export interface Backup {
  app: 'khan';
  schemaVersion: number;
  exportedAt: string;
  books: Book[];
  sessions: Session[];
  cards: Card[];
  threads: Thread[];
}

export async function buildBackup(): Promise<Backup> {
  const [books, sessions, cards, threads] = await Promise.all([
    db.books.toArray(),
    db.sessions.toArray(),
    db.cards.toArray(),
    db.threads.toArray(),
  ]);
  return {
    app: 'khan',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    books,
    sessions,
    cards,
    threads,
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `khan-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  added: { books: number; sessions: number; cards: number; threads: number };
  skipped: number;
}

/**
 * นำเข้าแบบ merge — ของเดิมไม่หาย
 * id ที่ซ้ำจะถูกข้าม ไม่ทับ
 */
export async function importBackup(json: unknown): Promise<ImportResult> {
  const data = json as Partial<Backup>;
  if (!data || !Array.isArray(data.books)) {
    throw new Error('ไฟล์นี้ไม่ใช่ข้อมูลของคั่น');
  }

  const result: ImportResult = {
    added: { books: 0, sessions: 0, cards: 0, threads: 0 },
    skipped: 0,
  };

  await db.transaction('rw', db.books, db.sessions, db.cards, db.threads, async () => {
    for (const b of data.books ?? []) {
      if (await db.books.get(b.id)) { result.skipped++; continue; }
      await db.books.add(b);
      result.added.books++;
    }
    for (const s of data.sessions ?? []) {
      if (await db.sessions.get(s.id)) { result.skipped++; continue; }
      await db.sessions.add(s);
      result.added.sessions++;
    }
    for (const c of data.cards ?? []) {
      if (await db.cards.get(c.id)) { result.skipped++; continue; }
      await db.cards.add(c);
      result.added.cards++;
    }
    for (const t of data.threads ?? []) {
      if (await db.threads.get(t.id)) { result.skipped++; continue; }
      await db.threads.add(t);
      result.added.threads++;
    }
  });

  return result;
}
