import { useEffect, useState } from 'react';
import { getCardPhoto } from '../db/cardPhotos';

/**
 * หยิบรูปที่แนบบนการ์ดมาแสดง — โหลดเมื่อการ์ดนั้นมีรูปเท่านั้น
 * ลอกแนวจาก useCoverPhoto: cache object URL ไว้ใช้ซ้ำ ไม่ revoke ตอน unmount
 * เพราะการ์ดใบเดิมอาจถูกวาดซ้ำหลายรอบระหว่างเลื่อน/ซูมบอร์ด
 */
const cache = new Map<string, string>();

export function forgetCardPhoto(cardId: string): void {
  const url = cache.get(cardId);
  if (url) {
    URL.revokeObjectURL(url);
    cache.delete(cardId);
  }
}

export function useCardPhoto(cardId: string, has: boolean | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (has ? cache.get(cardId) ?? null : null));

  useEffect(() => {
    if (!has) {
      setUrl(null);
      return;
    }
    const hit = cache.get(cardId);
    if (hit) {
      setUrl(hit);
      return;
    }
    let alive = true;
    getCardPhoto(cardId).then((row) => {
      if (!alive || !row) return;
      const made = URL.createObjectURL(row.blob);
      cache.set(cardId, made);
      setUrl(made);
    });
    return () => {
      alive = false;
    };
  }, [cardId, has]);

  return url;
}
