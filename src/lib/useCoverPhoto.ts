import { useEffect, useState } from 'react';
import { getCoverPhoto } from '../db/covers';

/**
 * หยิบรูปปกที่ถ่ายเองมาแสดง — โหลดเมื่อมีคนขอเท่านั้น
 *
 * ไม่โหลดรูปทั้งหมดพร้อม allBooks() เพราะหน้าห้อง refresh บ่อยมาก
 * (ทุกครั้งที่เพิ่มเล่ม จบ session วางกลับกอง) และส่วนใหญ่ของหน้านั้นใช้แค่ชื่อกับสี
 *
 * object URL เก็บไว้ใช้ซ้ำ ไม่ revoke ตอน unmount เพราะคอมโพเนนต์อื่นอาจใช้ URL เดียวกันอยู่
 */
const cache = new Map<string, string>();

export function forgetCoverPhoto(bookId: string): void {
  const url = cache.get(bookId);
  if (url) {
    URL.revokeObjectURL(url);
    cache.delete(bookId);
  }
}

export function useCoverPhoto(bookId: string, has: boolean | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (has ? cache.get(bookId) ?? null : null));

  useEffect(() => {
    if (!has) {
      setUrl(null);
      return;
    }
    const hit = cache.get(bookId);
    if (hit) {
      setUrl(hit);
      return;
    }
    let alive = true;
    getCoverPhoto(bookId).then((row) => {
      if (!alive || !row) return;
      const made = URL.createObjectURL(row.blob);
      cache.set(bookId, made);
      setUrl(made);
    });
    return () => {
      alive = false;
    };
  }, [bookId, has]);

  return url;
}
