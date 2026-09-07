import { describe, it, expect } from 'vitest';
import { normalizeIsbn, isValidIsbn13, looksLikeBook } from './isbn';

describe('normalizeIsbn', () => {
  it('ตัดขีดและช่องว่างออก', () => {
    expect(normalizeIsbn('978-0-06-231609-7')).toBe('9780062316097');
    expect(normalizeIsbn(' 9780062316097 ')).toBe('9780062316097');
  });

  it('เก็บ X ท้ายของ ISBN-10 ไว้ และทำเป็นตัวใหญ่', () => {
    expect(normalizeIsbn('043942089x')).toBe('043942089X');
  });
});

describe('isValidIsbn13', () => {
  it('ISBN จริงผ่าน checksum', () => {
    expect(isValidIsbn13('9780062316097')).toBe(true); // Sapiens
    expect(isValidIsbn13('9780143127741')).toBe(true); // The Body Keeps the Score
  });

  it('หลักสุดท้ายผิดหนึ่งตัวก็ต้องไม่ผ่าน — นี่คือจุดประสงค์ทั้งหมดของ checksum', () => {
    expect(isValidIsbn13('9780062316098')).toBe(false);
  });

  it('ความยาวไม่ใช่ 13 หรือมีตัวอักษร → ไม่ผ่าน', () => {
    expect(isValidIsbn13('978006231609')).toBe(false);
    expect(isValidIsbn13('97800623160977')).toBe(false);
    expect(isValidIsbn13('978006231609X')).toBe(false);
    expect(isValidIsbn13('')).toBe(false);
  });
});

describe('looksLikeBook', () => {
  it('ช่วง 978 กับ 979 คือหนังสือ', () => {
    expect(looksLikeBook('9780062316097')).toBe(true);
    expect(looksLikeBook('9791234567896')).toBe(true);
  });

  it('บาร์โค้ดสินค้าทั่วไปไม่ใช่หนังสือ', () => {
    expect(looksLikeBook('4901234567894')).toBe(false);
    expect(looksLikeBook('8850001234567')).toBe(false);
  });

  it('สั้นหรือยาวเกินไม่นับ', () => {
    expect(looksLikeBook('978006231609')).toBe(false);
  });
});
