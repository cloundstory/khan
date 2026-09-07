import type { Book } from '../db/schema';

export function posLabel(book: Book, pos: number): string {
  return book.unit === 'percent' ? `${pos}%` : `หน้า ${pos}`;
}

export function progressRatio(book: Book): number | null {
  if (book.unit === 'percent') return Math.min(1, book.current / 100);
  if (!book.total) return null;
  return Math.min(1, book.current / book.total);
}

export function durationLabel(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin} นาที`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} ชั่วโมง` : `${h} ชม. ${m} นาที`;
}

export function clockLabel(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** บอกขนาดไฟล์ backup ให้เห็น จะได้รู้ตัวว่ามันโตขึ้นเรื่อย ๆ ตามรูปปกที่ถ่ายเก็บไว้ */
export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} ไบต์`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
  });
}
