import type { Book, BookStatus } from '../db/schema';

export const SAMPLE_EDITIONS = [
  { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', color: '#77756a', source: 'https://openlibrary.org/books/OL3700132M/Pride_and_Prejudice' },
  { title: '1984', author: 'George Orwell', isbn: '9780451524935', color: '#82736c', source: 'https://openlibrary.org/books/OL18197720M/1984' },
  { title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292', color: '#b2a692', source: 'https://openlibrary.org/books/OL32336498M/Atomic_Habits' },
];

export function sampleBooks(count: number): Book[] {
  return Array.from({ length: count }, (_, i) => {
    const edition = SAMPLE_EDITIONS[i % SAMPLE_EDITIONS.length];
    return { ...edition, id: `study-${i}`, coverUrl: `https://covers.openlibrary.org/b/isbn/${edition.isbn}-M.jpg?default=false`,
      status: (i % 6 < 3 ? 'pile' : i % 6 < 5 ? 'shelf' : 'desk') as BookStatus,
      unit: 'page', current: 0, addedAt: i };
  });
}

export const PAGE_SIZE = 18;
export function studyPage(books: Book[], page: number) {
  const pages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const index = Math.min(Math.max(0, page), pages - 1);
  return { books: books.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE), index, pages };
}

// Identity survives moving between areas; dimensions are illustrative, not measured.
export function bookShape(id: string) {
  const seed = Array.from(id).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  return { width: 0.57 + (seed % 4) * 0.025, height: 0.86 + (seed % 5) * 0.035, depth: 0.12 + (seed % 3) * 0.03 };
}
