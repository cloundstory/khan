/**
 * ตำแหน่ง/ขนาดของ set piece แต่ละชิ้นในฉากห้อง (พิกัด viewBox 1000×720 ของ HomeScene)
 * พอมีไฟล์จริงที่ public/set/<name>.webp โค้ดจะสลับจาก placeholder SVG → รูปให้อัตโนมัติ
 * (ดู design/IMAGE_PROMPTS.md — กล่องนี้จูนละเอียดตอนได้รูปจริงมาแต่ละชิ้น)
 */
export interface Piece {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SET_PIECES: Record<string, Piece> = {
  rug: { name: 'rug', x: 90, y: 504, w: 860, h: 192 },
  clock: { name: 'clock', x: 150, y: 104, w: 92, h: 92 },
  board: { name: 'board', x: 300, y: 90, w: 172, h: 126 },
  'plant-hang-a': { name: 'plant-hang-a', x: 764, y: 58, w: 88, h: 122 },
  'plant-hang-b': { name: 'plant-hang-b', x: 820, y: 58, w: 84, h: 112 },
  shelf: { name: 'shelf', x: 620, y: 190, w: 300, h: 48 },
  lamp: { name: 'lamp', x: 448, y: 230, w: 104, h: 336 },
  chair: { name: 'chair', x: 636, y: 372, w: 320, h: 264 },
  'plant-shelf': { name: 'plant-shelf', x: 588, y: 498, w: 66, h: 92 },
  cat: { name: 'cat', x: 346, y: 494, w: 132, h: 66 },
};
