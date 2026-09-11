import type { Book } from '../db/schema';
import { bookShape } from './study';

export type ShelfFacing = 'spine' | 'cover';
export interface Placement {
  book: Book;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

// One world unit = 100 pixels in the art master. Keep camera and image registered.
export function roomDimensions(mobile: boolean) {
  return mobile ? { width: 10.24, height: 15.36 } : { width: 15.36, height: 10.24 };
}

export function roomLayout(books: Book[], mobile: boolean, facing: ShelfFacing): Placement[] {
  const { width, height } = roomDimensions(mobile);
  const at = (x: number, y: number, z = 1): [number, number, number] => [x - width / 2, height / 2 - y, z];
  const shelf = books.filter(b => b.status === 'shelf');
  const pile = books.filter(b => b.status === 'pile');
  const desk = books.filter(b => b.status === 'desk');
  const perShelf = Math.max(1, Math.ceil(shelf.length / 2));
  const shelfStart = mobile ? 1.45 : 9.05;
  const shelfLength = mobile ? 6.35 : 3.55;
  const out: Placement[] = [];

  shelf.forEach((book, i) => {
    const row = Math.floor(i / perShelf); const column = i % perShelf;
    const { width: bw, height: bh, depth } = bookShape(book.id);
    const scale = facing === 'cover' ? Math.min(1.05, shelfLength / perShelf / 0.78) : 1.05;
    const step = facing === 'cover' ? Math.min(0.8, shelfLength / perShelf) : 0.265;
    const base = mobile ? (row === 0 ? 2.02 : 3.75) : (row === 0 ? 1.66 : 3.19);
    out.push({ book, position: at(shelfStart + column * step + (facing === 'cover' ? bw : depth) * scale / 2, base - bh * scale / 2),
      rotation: [0, facing === 'spine' ? 1.45 : 0.12, 0], scale });
  });

  const pileRows = Math.max(1, Math.ceil(pile.length / 2));
  pile.forEach((book, i) => {
    const column = Math.floor(i / pileRows); const row = i % pileRows;
    const scale = mobile ? 1.2 : 1.6;
    const beneath = pile.slice(column * pileRows, column * pileRows + row).reduce((n, b) => n + bookShape(b.id).depth * scale + 0.025, 0);
    const depth = bookShape(book.id).depth * scale;
    out.push({ book, position: at((mobile ? 1.15 : 1.85) + column * (mobile ? 1.5 : 2.05) + (row % 3 - 1) * 0.07,
      (mobile ? 13.5 : 8.45) - beneath - depth / 2, 1.4 + row * 0.01),
      rotation: [-1.25, 0, Math.PI / 2 + (row % 3 - 1) * 0.035], scale });
  });

  // A single active reading surface: additional desk books form a modest stack.
  // Show only a bounded window (caller pages the library) rather than shrink identities.
  desk.forEach((book, i) => {
    const scale = mobile ? 1.05 : 1.0;
    const row = i % 6; const column = Math.floor(i / 6);
    const beneath = desk.slice(column * 6, column * 6 + row).reduce((n, b) => n + bookShape(b.id).depth * scale + 0.02, 0);
    out.push({ book, position: at((mobile ? 8.3 : 12.85) + column * 0.3, (mobile ? 10.23 : 6.48) - beneath, 2 + row * 0.01),
      rotation: [-1.05, 0, Math.PI / 2 - 0.12], scale });
  });
  return out;
}
