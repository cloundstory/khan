import type { Book } from '../db/schema';

/**
 * ปกหนังสือสำหรับเอาไปแปะบนเล่ม 3D
 *
 * มีสองทาง — ปกจริงจากการสแกน กับปกที่วาดเอง
 * ปกที่วาดเองไม่ใช่กรณียกเว้น เพราะหนังสือไทยส่วนใหญ่สแกนไม่เจอ
 * มันจึงต้องดูเหมือนปกเรียบที่ตั้งใจออกแบบ ไม่ใช่รูปโหลดไม่ขึ้น
 */

const W = 512;
const H = 768;

/**
 * ตัดบรรทัดภาษาไทยด้วย Intl.Segmenter
 * ภาษาไทยไม่มีช่องว่างระหว่างคำ ถ้าตัดตามช่องว่างจะได้บรรทัดเดียวยาวเลยขอบ
 * และถ้าตัดตามตัวอักษรดิบ ๆ สระกับวรรณยุกต์จะหลุดจากพยัญชนะ
 */
function pieces(text: string): string[] {
  try {
    const seg = new Intl.Segmenter('th', { granularity: 'word' });
    return [...seg.segment(text)].map((s) => s.segment);
  } catch {
    return Array.from(text);
  }
}

/** ตัดทีละกลุ่มอักษร ไม่ใช่ทีละ code unit — สระกับวรรณยุกต์จะได้ไม่หลุดจากพยัญชนะ */
function graphemes(text: string): string[] {
  try {
    const seg = new Intl.Segmenter('th', { granularity: 'grapheme' });
    return [...seg.segment(text)].map((s) => s.segment);
  } catch {
    return Array.from(text);
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';

  const flushOverflow = () => {
    // คำเดียวยาวเกินหนึ่งบรรทัด (ชื่อไทยยาว ๆ ที่ไม่มีจุดตัด) — ต้องตัดกลางคำ
    while (ctx.measureText(line).width > maxWidth) {
      const gs = graphemes(line);
      if (gs.length <= 1) return;
      let cut = gs.length - 1;
      while (cut > 1 && ctx.measureText(gs.slice(0, cut).join('')).width > maxWidth) cut--;
      lines.push(gs.slice(0, cut).join(''));
      line = gs.slice(cut).join('');
    }
  };

  for (const p of pieces(text)) {
    const next = line + p;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line.trimEnd());
      line = p.trimStart();
    } else {
      line = next;
    }
    flushOverflow();
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/**
 * รอฟอนต์ก่อนวาด ไม่งั้นจะได้ฟอนต์สำรองแล้ววัดความกว้างผิด
 * ต้องสั่งโหลดตัวอักษรที่จะใช้จริงด้วย เพราะ Google Fonts แบ่ง subset
 * ชุดอักษรไทยจะถูกโหลดต่อเมื่อมีการใช้จริงเท่านั้น
 */
export async function fontsReady(sample = 'ก'): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`500 46px "Noto Serif Thai"`, sample),
      document.fonts.load(`400 26px "IBM Plex Sans Thai"`, sample),
    ]);
    await document.fonts.ready;
  } catch {
    /* เบราว์เซอร์เก่าไม่มี document.fonts — วาดไปเลย */
  }
}

/**
 * หาขนาดตัวอักษรที่ใหญ่ที่สุดที่ยังใส่ลงกรอบได้พอดี
 * ชื่อหนังสือไทยยาวกว่าอังกฤษมาก ถ้าใช้ขนาดตายตัวจะล้นออกนอกปก
 */
function fitLines(
  g: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  weight: string,
  family: string,
  from: number,
  to: number
): { lines: string[]; size: number; lineH: number } {
  let best = { lines: [text], size: to, lineH: to * 1.3 };
  for (let size = from; size >= to; size -= 2) {
    g.font = `${weight} ${size}px ${family}`;
    const lines = wrap(g, text, maxWidth);
    const lineH = size * 1.3;
    const fits =
      lines.length * lineH <= maxHeight &&
      lines.every((l) => g.measureText(l).width <= maxWidth);
    best = { lines, size, lineH };
    if (fits) return best;
  }
  return best;
}

export function drawGeneratedCover(book: Book): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;

  g.fillStyle = book.color;
  g.fillRect(0, 0, W, H);

  // ไล่เฉดบาง ๆ ให้ไม่แบนสนิท
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, 'rgba(255,255,255,0.09)');
  grad.addColorStop(1, 'rgba(0,0,0,0.16)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  const ink = 'rgba(246, 242, 233, 0.95)';
  const inkSoft = 'rgba(246, 242, 233, 0.6)';
  const pad = 54;

  // กรอบในแบบหนังสือชุด
  g.strokeStyle = 'rgba(246, 242, 233, 0.28)';
  g.lineWidth = 2;
  g.strokeRect(pad * 0.62, pad * 0.62, W - pad * 1.24, H - pad * 1.24);

  g.textAlign = 'center';
  g.fillStyle = ink;

  // ย่อขนาดตัวอักษรจนกว่าชื่อจะพอดีเล่ม — ชื่อไทยยาวกว่าอังกฤษมาก
  const serif = '"Noto Serif Thai", Georgia, serif';
  const fit = fitLines(g, book.title, W - pad * 2.6, H * 0.44, '500', serif, 46, 22);
  g.font = `500 ${fit.size}px ${serif}`;

  let y = H * 0.4 - ((fit.lines.length - 1) * fit.lineH) / 2;
  for (const l of fit.lines) {
    g.fillText(l, W / 2, y);
    y += fit.lineH;
  }

  if (book.author) {
    const ruleY = y + 18;
    g.strokeStyle = 'rgba(246, 242, 233, 0.4)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(W / 2 - 52, ruleY);
    g.lineTo(W / 2 + 52, ruleY);
    g.stroke();

    g.fillStyle = inkSoft;
    g.font = '400 26px "IBM Plex Sans Thai", sans-serif';
    const a = wrap(g, book.author, W - pad * 3).slice(0, 2);
    let ay = ruleY + 44;
    for (const l of a) {
      g.fillText(l, W / 2, ay);
      ay += 34;
    }
  }

  return cv;
}

/** สันหนังสือ — วาดตะแคงแล้วค่อยหมุน เพื่อให้อ่านจากบนลงล่างเหมือนสันจริง */
export function drawSpine(book: Book): HTMLCanvasElement {
  const sw = 128;
  const sh = 768;
  const cv = document.createElement('canvas');
  cv.width = sw;
  cv.height = sh;
  const g = cv.getContext('2d')!;

  g.fillStyle = book.color;
  g.fillRect(0, 0, sw, sh);
  const grad = g.createLinearGradient(0, 0, sw, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.32)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.1)');
  grad.addColorStop(1, 'rgba(0,0,0,0.26)');
  g.fillStyle = grad;
  g.fillRect(0, 0, sw, sh);

  g.save();
  g.translate(sw / 2, sh / 2);
  g.rotate(Math.PI / 2);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(246, 242, 233, 0.94)';

  // สันมีที่ให้บรรทัดเดียว — ย่อจนพอดีก่อน ถ้ายังไม่พอค่อยตัดท้าย
  const serif = '"Noto Serif Thai", Georgia, serif';
  const fit = fitLines(g, book.title, sh - 120, 1, '500', serif, 44, 22);
  g.font = `500 ${fit.size}px ${serif}`;
  const text = fit.lines.length > 1 ? fit.lines[0].trimEnd() + '…' : fit.lines[0];
  g.fillText(text, 0, 0);
  g.restore();

  return cv;
}

/** ขอบกระดาษ — เส้นบาง ๆ ให้เห็นว่าเป็นปึกหน้ากระดาษ ไม่ใช่กล่องทึบ */
export function drawPageEdge(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#e8e0cf';
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 2) {
    g.strokeStyle = `rgba(120, 106, 84, ${0.05 + Math.random() * 0.09})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, 256);
    g.stroke();
  }
  return cv;
}

/**
 * ดึงสีเด่นจากปกจริง เอาไปใช้เป็นสีสัน
 *
 * หนังสือจริงสันมักเป็นสีเดียวกับปก การเดาสีจากปกจึงตรงกว่าให้คนเลือกเอง
 * และทำให้ไม่ต้องบังคับให้ตัดสินใจตอนเพิ่มเล่ม
 *
 * บีบ saturation กับ lightness ให้อยู่ในช่วงเดียวกับ COVER_COLORS
 * ไม่งั้นปกที่สีจัดจะได้สันสีสดจนหลุดจากโทนห้อง
 */
export function dominantColor(cover: HTMLCanvasElement): string | null {
  const s = 24;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = Math.round(s * 1.5);
  const g = cv.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(cover, 0, 0, cv.width, cv.height);

  let data: Uint8ClampedArray;
  try {
    data = g.getImageData(0, 0, cv.width, cv.height).data;
  } catch {
    return null;
  }

  let r = 0, gr = 0, b = 0, weight = 0;
  let ar = 0, ag = 0, ab = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i], pg = data[i + 1], pb = data[i + 2];
    ar += pr; ag += pg; ab += pb; n++;

    const max = Math.max(pr, pg, pb) / 255;
    const min = Math.min(pr, pg, pb) / 255;
    const l = (max + min) / 2;
    const sat = max === min ? 0 : (max - min) / (l > 0.5 ? 2 - max - min : max + min);
    // ปกภาพถ่ายกลางคืนมืดและสีจืดเกือบทั้งใบ กรองแรงเกินจะไม่เหลือพิกเซลเลย
    if (l > 0.96 || l < 0.04 || sat < 0.07) continue;
    r += pr * sat; gr += pg * sat; b += pb * sat; weight += sat;
  }
  if (n === 0) return null;

  // ปกขาวดำล้วนจะไม่มีพิกเซลไหนผ่านเกณฑ์ — ใช้ค่าเฉลี่ยทั้งใบแทน ดีกว่าไม่ให้สีเลย
  if (weight < 0.5) return clampToRoomTone(ar / n, ag / n, ab / n);
  return clampToRoomTone(r / weight, gr / weight, b / weight);
}

function clampToRoomTone(r: number, g: number, b: number): string {
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, Math.min(0.42, Math.max(0.16, s)), Math.min(0.56, Math.max(0.34, l)));
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${hex(nr)}${hex(ng)}${hex(nb)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/**
 * โหลดปกจริง — ใช้ fetch แทน Image.src เพราะ fetch บอกได้ชัดว่าพังตรงไหน
 * และ Open Library ส่ง CORS header มาให้อยู่แล้ว (ตรวจแล้ว 7 ก.ย. 2026)
 *
 * คืนเป็น canvas ไม่ใช่ ImageBitmap เพราะ three ไม่ได้ใช้ค่า flipY กับ ImageBitmap
 * เหมือนที่ใช้กับ canvas ปกจะกลับหัว — วาดลง canvas ก่อนแล้วเหลือเส้นทางเดียว
 */
export async function loadCoverImage(url: string): Promise<HTMLCanvasElement | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const bmp = await createImageBitmap(await res.blob());
    const cv = document.createElement('canvas');
    cv.width = bmp.width;
    cv.height = bmp.height;
    cv.getContext('2d')!.drawImage(bmp, 0, 0);
    bmp.close();
    return cv;
  } catch {
    return null;
  }
}
