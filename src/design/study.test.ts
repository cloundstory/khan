import { describe, expect, it } from 'vitest';
import { sampleBooks, studyPage, PAGE_SIZE } from './study';

describe('art-study library paging', () => {
  it('shows an empty collection without decorative books', () => {
    expect(studyPage([], 20)).toEqual({ books: [], index: 0, pages: 1 });
  });
  it('keeps every identity accessible exactly once beyond scene capacity', () => {
    const books = sampleBooks(101);
    const pages = studyPage(books, 0).pages;
    const ids = Array.from({ length: pages }, (_, page) => {
      const result = studyPage(books, page);
      expect(result.books.length).toBeLessThanOrEqual(PAGE_SIZE);
      return result.books.map(b => b.id);
    }).flat();
    expect(ids).toEqual(books.map(b => b.id));
    expect(new Set(ids).size).toBe(101);
  });
  it('clamps an obsolete page after switching to a smaller collection', () => {
    const books = sampleBooks(6);
    expect(studyPage(books, 5)).toEqual({ books, index: 0, pages: 1 });
  });
});
