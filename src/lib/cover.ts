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

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const p of pieces(text)) {
    const next = line + p;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line.trimEnd());
      line = p.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/** รอฟอนต์ก่อนวาด ไม่งั้นจะได้ฟอนต์สำรองแล้ววัดความกว้างผิด */
export async function fontsReady(): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    /* เบราว์เซอร์เก่าไม่มี document.fonts — วาดไปเลย */
  }
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
  g.font = '500 46px "Noto Serif Thai", Georgia, serif';

  const lines = wrap(g, book.title, W - pad * 2.6).slice(0, 5);
  const lineH = 60;
  let y = H * 0.4 - ((lines.length - 1) * lineH) / 2;
  for (const l of lines) {
    g.fillText(l, W / 2, y);
    y += lineH;
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
  g.font = '500 44px "Noto Serif Thai", Georgia, serif';
  const t = wrap(g, book.title, sh - 120)[0] ?? book.title;
  g.fillText(t, 0, 0);
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
