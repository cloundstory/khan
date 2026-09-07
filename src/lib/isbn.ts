/**
 * ค้นข้อมูลหนังสือจาก ISBN ผ่าน Open Library
 *
 * ทดสอบจริงแล้ว 7 ก.ย. 2026: ฟรี ไม่ต้องมี API key และ CORS ผ่าน
 * (Google Books ใช้ไม่ได้ — ไม่มี key จะโดน 429 เพราะโควตารวมของทุกคนหมด)
 *
 * ข้อจำกัดที่รู้ตัว: หนังสือที่พิมพ์ในไทยแทบไม่มีในฐานข้อมูลนี้
 * ISBN ขึ้นต้น 978-616 / 978-974 ส่วนใหญ่จะไม่พบ → ต้องกรอกเองแล้วใช้ปกที่ระบบสร้าง
 */

export interface BookInfo {
  isbn: string;
  title: string;
  author?: string;
  pages?: number;
  coverUrl?: string;
}

/** บาร์โค้ดหลังปกหนังสือคือ EAN-13 ซึ่งก็คือ ISBN-13 — เหลือแต่ตัวเลข */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

/**
 * ตรวจ checksum ของ ISBN-13 — กันเลขที่สแกนเพี้ยนไม่ให้ยิง network เปล่า ๆ
 * หลักที่ 13 คือ check digit ของผลรวมถ่วงน้ำหนัก 1,3,1,3,...
 */
export function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(value[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(value[12]);
}

/** หนังสือใช้ช่วง 978 กับ 979 ของ EAN — เลขอื่นคือสินค้าทั่วไป ไม่ใช่หนังสือ */
export function looksLikeBook(value: string): boolean {
  return /^97[89]\d{10}$/.test(value);
}

export class LookupError extends Error {}

/** คืน null เมื่อค้นแล้วไม่พบ — ต่างจากการ throw ซึ่งแปลว่าเน็ตหรือเซิร์ฟเวอร์มีปัญหา */
export async function lookupIsbn(isbn: string, signal?: AbortSignal): Promise<BookInfo | null> {
  const key = `ISBN:${isbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`;

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new LookupError('ต่อเน็ตไม่ได้');
  }
  if (!res.ok) throw new LookupError(`ค้นข้อมูลไม่สำเร็จ (${res.status})`);

  const json = (await res.json()) as Record<string, RawBook | undefined>;
  const raw = json[key];
  if (!raw || typeof raw.title !== 'string') return null;

  return {
    isbn,
    title: raw.title,
    author: raw.authors?.[0]?.name,
    pages: typeof raw.number_of_pages === 'number' ? raw.number_of_pages : undefined,
    // เอาขนาดใหญ่ก่อน เพราะปกถูกเอาไปแปะเป็น texture ของเล่ม 3D ขนาด medium จะเบลอ
    coverUrl: raw.cover?.large ?? raw.cover?.medium ?? raw.cover?.small,
  };
}

interface RawBook {
  title?: string;
  authors?: Array<{ name?: string }>;
  number_of_pages?: number;
  cover?: { small?: string; medium?: string; large?: string };
}
