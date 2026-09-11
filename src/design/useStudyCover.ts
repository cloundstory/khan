import { useEffect, useState } from 'react';
import type { Book } from '../db/schema';
import { getCoverPhoto } from '../db/covers';

// This study owns and revokes its photo URLs; never show the previous selection's photo.
export function useStudyCover(book: Book): string | undefined {
  const key = `${book.id}:${Boolean(book.hasCoverPhoto)}`;
  const [photo, setPhoto] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!book.hasCoverPhoto) return;
    let alive = true; let owned: string | undefined;
    getCoverPhoto(book.id).then(row => {
      if (!alive || !row) return;
      owned = URL.createObjectURL(row.blob); setPhoto({ key, url: owned });
    }).catch(() => { /* Remote cover/title remains available if the local photo cannot be read. */ });
    return () => { alive = false; if (owned) URL.revokeObjectURL(owned); };
  }, [key, book.id, book.hasCoverPhoto]);
  return book.hasCoverPhoto && photo?.key === key ? photo.url : book.coverUrl;
}
