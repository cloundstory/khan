import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/useApp';
import { openBookId } from '../lib/stats';

/**
 * หน้าโฮม — ฉากห้องอ่านวาดมือ (line-art + halftone) ไม่มีคน
 * กองหนังสือโตจริงตามจำนวนเล่มในกอง · นาฬิกาเดินจริง
 * กองหนังสือ → เพิ่มเล่ม · โซฟา → อ่าน/timer · ชั้น → ดูหนังสือทั้งหมด
 */
export default function HomeScene() {
  const { books, sessions, active, go, startSession } = useApp();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pile = books.filter((b) => b.status === 'pile');
  const desk = books.filter((b) => b.status === 'desk');
  const shelf = books.filter((b) => b.status === 'shelf');
  const openId = openBookId(desk, sessions);
  const openBook = desk.find((b) => b.id === openId) ?? desk[0];

  // นาฬิกาเดินจริง
  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours();
  const secA = s * 6;
  const minA = m * 6 + s * 0.1;
  const hourA = (h % 12) * 30 + m * 0.5;

  // กองหนังสือตามจำนวนจริง — เติมทีละคอลัมน์ ขึ้นบน
  const stack = useMemo(() => buildPile(pile.length), [pile.length]);

  function toRead() {
    if (active) return go({ name: 'session', bookId: active.bookId });
    if (openBook) return go({ name: 'book', bookId: openBook.id });
    if (pile[0]) return go({ name: 'book', bookId: pile[0].id });
    go({ name: 'add' });
  }

  // จุดที่ vite ต้องรู้ว่า startSession ยังใช้ (ไว้ต่อยอด: กดโซฟาแล้วเริ่มเลย) — เก็บ ref ไว้
  void startSession;

  return (
    <div className="scene-wrap">
      <button className="scene-gear" onClick={() => go({ name: 'settings' })} aria-label="ตั้งค่า">
        ⚙
      </button>

      <svg className="scene" viewBox="0 0 1000 720" preserveAspectRatio="xMidYMax meet" role="img"
        aria-label="ห้องอ่านหนังสือ">
        <defs>
          {/* เส้นวาดมือ — สั่นเบา ๆ */}
          <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="ink2" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="19" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* จุดฮาล์ฟโทน */}
          <pattern id="halftone" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
            <circle cx="2" cy="2" r="1.15" fill="var(--ink)" opacity="0.5" />
          </pattern>
          <radialGradient id="lampglow" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stop-color="#ffe7ad" stop-opacity="0.85" />
            <stop offset="55%" stop-color="#ffe0a0" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#ffe0a0" stop-opacity="0" />
          </radialGradient>
        </defs>

        {/* แสงโคมไฟกองบนพื้น */}
        <ellipse cx="500" cy="430" rx="360" ry="210" fill="url(#lampglow)" />

        {/* เส้นแบ่งผนัง/พื้น */}
        <g filter="url(#ink2)" stroke="var(--ink)" fill="none" stroke-width="1.6" stroke-linecap="round">
          <path d="M40 372 H960" opacity="0.55" />
        </g>

        {/* พรมจุดฮาล์ฟโทน */}
        <ellipse cx="520" cy="600" rx="430" ry="96" fill="url(#halftone)" opacity="0.5" />
        <g filter="url(#ink2)" stroke="var(--ink)" fill="none" stroke-width="1.4">
          <ellipse cx="520" cy="600" rx="430" ry="96" opacity="0.5" />
        </g>

        {/* ===== ผนัง: นาฬิกา + ชั้นหนังสือ + ต้นไม้แขวน ===== */}
        {/* นาฬิกาเดินจริง */}
        <g filter="url(#ink)" transform="translate(196 150)">
          <circle r="46" fill="var(--paper-hi)" stroke="var(--ink)" stroke-width="2.4" />
          <circle r="46" fill="none" stroke="var(--ink)" stroke-width="0.8" opacity="0.4" transform="scale(0.86)" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <line key={i} x1="0" y1="-38" x2="0" y2={i % 3 === 0 ? '-31' : '-34'} stroke="var(--ink)"
              stroke-width={i % 3 === 0 ? 2.2 : 1.2} transform={`rotate(${i * 30})`} />
          ))}
          <line x1="0" y1="6" x2="0" y2="-24" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"
            transform={`rotate(${hourA})`} />
          <line x1="0" y1="8" x2="0" y2="-34" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"
            transform={`rotate(${minA})`} />
          <line x1="0" y1="10" x2="0" y2="-36" stroke="#a5312a" stroke-width="1.1" stroke-linecap="round"
            transform={`rotate(${secA})`} />
          <circle r="2.6" fill="var(--ink)" />
        </g>

        {/* ชั้นหนังสือบนผนัง — กดดูหนังสือทั้งหมด */}
        <g className="hot" onClick={() => go({ name: 'browse' })} role="button" tabIndex={0} aria-label="ดูหนังสือทั้งหมด">
          <rect x="620" y="120" width="300" height="150" fill="transparent" />
          <g filter="url(#ink)" stroke="var(--ink)" fill="none" stroke-width="2" stroke-linecap="round">
            <path d="M636 232 H900" stroke-width="3" />
            <path d="M636 232 l-6 10 M900 232 l6 10" />
            {/* สันหนังสือบนชั้น */}
            {shelfSpines(shelf.length).map((sp, i) => (
              <g key={i} transform={`translate(${648 + sp.x} 232) rotate(${sp.lean})`}>
                <rect x="0" y={-sp.h} width={sp.w} height={sp.h} rx="1.5" fill="var(--paper-hi)" />
                <line x1={sp.w / 2} y1={-sp.h + 6} x2={sp.w / 2} y2="-6" stroke-width="1" opacity="0.5" />
              </g>
            ))}
          </g>
        </g>

        {/* ต้นไม้แขวน */}
        <g filter="url(#ink)" stroke="var(--ink)" fill="none" stroke-width="1.6" stroke-linecap="round">
          <path d="M792 60 v58 M846 60 v58" opacity="0.7" />
          <g transform="translate(792 118)">
            <path d="M-22 0 h44 l-6 16 h-32 Z" fill="var(--paper-hi)" />
            <path d="M-14 0 c-4 22 -12 34 -20 44 M0 0 c0 26 0 40 0 56 M14 0 c4 22 12 34 20 44" stroke="var(--sage)" />
          </g>
          <g transform="translate(846 118)">
            <path d="M-20 0 h40 l-5 15 h-30 Z" fill="var(--paper-hi)" />
            <path d="M-12 0 c-3 20 -9 30 -16 40 M2 0 c1 24 1 36 2 50 M14 0 c3 18 9 28 16 36" stroke="var(--sage)" />
          </g>
        </g>

        {/* ===== โคมไฟตั้งพื้น ===== */}
        <g filter="url(#ink)" stroke="var(--ink)" fill="none" stroke-width="2" stroke-linecap="round">
          <path d="M486 232 L456 300 H544 L514 232 Z" fill="var(--paper-hi)" />
          <path d="M456 300 H544" />
          <path d="M500 300 V560" stroke-width="2.4" />
          <path d="M470 560 H530 M500 560 v6" />
          <path d="M492 246 h16 M486 262 h28 M480 280 h40" opacity="0.4" stroke-width="1.2" />
        </g>

        {/* ===== เก้าอี้อ่านหนังสือ (โซฟา) — กดไปหน้าอ่าน ===== */}
        <g className="hot" onClick={toRead} role="button" tabIndex={0} aria-label="ไปหน้าอ่าน">
          <rect x="640" y="380" width="300" height="240" fill="transparent" />
          <g filter="url(#ink)" stroke="var(--ink)" fill="var(--paper-hi)" stroke-width="2.2" stroke-linejoin="round">
            <path d="M690 470 q-4 -70 26 -74 q120 -10 190 0 q28 4 26 74 l6 120 q2 20 -18 20 h-224 q-20 0 -18 -20 Z" />
            <path d="M712 470 q-2 -44 20 -48 q88 -8 158 0 q22 4 20 48 q2 30 -6 58 h-186 q-8 -28 -6 -58 Z" fill="var(--paper-low)" />
            {/* แขนเก้าอี้ */}
            <path d="M690 500 q-30 2 -30 44 v56 q0 14 16 14 h20 v-100 Z" />
            <path d="M910 500 q30 2 30 44 v56 q0 14 -16 14 h-20 v-100 Z" />
            <path d="M726 604 v40 M876 604 v40" />
            <path d="M760 528 q40 -14 82 0" fill="none" stroke-width="1.4" opacity="0.45" />
          </g>
        </g>

        {/* ===== ต้นไม้กระถาง + terrarium ข้างเก้าอี้ ===== */}
        <g filter="url(#ink)" transform="translate(612 512)">
          <g stroke="var(--ink)" fill="var(--paper-hi)" stroke-width="1.8">
            <path d="M-16 40 h32 l-5 40 h-22 Z" />
            <rect x="-19" y="32" width="38" height="10" rx="2" />
          </g>
          <path d="M-8 32 c-6 -30 -4 -52 -2 -70 M2 32 c2 -26 4 -50 6 -66 M-2 32 c0 -34 -6 -58 -10 -74"
            fill="none" stroke="var(--sage)" stroke-width="1.8" stroke-linecap="round" />
        </g>

        {/* ===== กองหนังสือ — โตตามจำนวนจริง · กดเพื่อเพิ่มเล่ม ===== */}
        <g className="hot" onClick={() => go({ name: 'add' })} role="button" tabIndex={0} aria-label="เพิ่มหนังสือ">
          <rect x="70" y={Math.min(560 - stack.top - 40, 300)} width="360" height={720 - Math.min(560 - stack.top - 40, 300)} fill="transparent" />
          <g filter="url(#ink)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round">
            {stack.books.map((b, i) => (
              <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.rot})`}>
                <rect x={-b.w / 2} y={-b.h} width={b.w} height={b.h} rx="2" fill={b.fill} />
                <line x1={-b.w / 2 + 4} y1={-b.h + b.h / 2} x2={b.w / 2 - 4} y2={-b.h + b.h / 2}
                  stroke-width="1" opacity="0.4" />
                <line x1={b.w / 2} y1={-b.h + 3} x2={b.w / 2} y2="-3" stroke-width="1.2" opacity="0.5" />
              </g>
            ))}
            {/* กระดาษหล่นข้างกอง */}
            <g stroke-width="1.4" fill="var(--paper-hi)" opacity="0.9">
              <path d="M250 590 l70 -10 8 26 -70 10 Z" />
              <path d="M262 596 h44 M260 606 h40" stroke-width="1" opacity="0.4" fill="none" />
            </g>
          </g>
          {/* ปุ่มบวก */}
          <g transform={`translate(${stack.plusX} ${560 - stack.top - 22})`}>
            <circle r="17" fill="var(--sage)" stroke="var(--paper-hi)" stroke-width="2" />
            <path d="M-7 0 H7 M0 -7 V7" stroke="var(--paper-hi)" stroke-width="2.4" stroke-linecap="round" />
          </g>
        </g>

        {/* ===== แมวหลับบนพรม ===== */}
        <g filter="url(#ink2)" transform="translate(408 540)" stroke="var(--ink)" fill="var(--paper-low)"
          stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">
          <path d="M-58 10 q-10 -40 40 -44 q52 -4 76 16 q18 16 4 30 q-56 20 -120 -2 Z" />
          <path d="M-56 8 q-20 6 -40 -2 q-14 -8 -2 -18 q10 -6 22 2" fill="none" stroke-width="1.7" />
          <path d="M48 -10 q22 -4 28 12 q4 16 -14 22 q-20 4 -26 -12 q-4 -16 12 -22 Z" fill="var(--paper-hi)" />
          <path d="M52 -22 l1 -13 11 8 M74 -16 l13 -9 1 14" fill="var(--paper-hi)" stroke-width="1.6" />
          <path d="M50 4 q6 4 13 1 M66 8 l3 4" fill="none" stroke-width="1.4" opacity="0.75" />
          <path d="M-20 -20 q4 8 0 16 M6 -22 q4 8 0 16 M-46 -8 q4 6 0 12" fill="none" stroke-width="1.2" opacity="0.4" />
        </g>
      </svg>

      {books.length === 0 && (
        <div className="scene-hint">แตะกองหนังสือเพื่อเพิ่มเล่มแรก</div>
      )}
    </div>
  );
}

type PBook = { x: number; y: number; w: number; h: number; rot: number; fill: string };
const TINTS = ['var(--paper-hi)', '#e8e0cd', '#dfe3d5', '#e6dccb', '#dce0e6', '#e9ddd6', '#e4dccb'];

/** กองหนังสือโตตามจำนวนจริง — สองกองซ้อนสูง + เล่มวางราบข้างหน้า (ยิ่งเยอะยิ่งสูง) */
function buildPile(count: number): { books: PBook[]; top: number; plusX: number } {
  const books: PBook[] = [];
  const floor = 556;
  const shown = Math.min(count, 28);
  const mainN = Math.ceil(shown * 0.6);
  const sideN = shown - mainN;

  const put = (cx: number, n: number, base: number) => {
    for (let r = 0; r < n; r++) {
      const i = books.length;
      const bh = 18 + ((i * 11) % 5);
      const w = 116 + ((i * 37) % 52) - 12;
      const seed = ((i * 53) % 15) - 7;
      books.push({
        x: cx + seed * 1.3,
        y: base - r * (bh + 2),
        w,
        h: bh,
        rot: (seed % 5) * 0.7,
        fill: TINTS[i % TINTS.length],
      });
    }
  };
  put(196, mainN, floor);
  put(312, sideN, floor + 10);

  // เล่มวางราบ/เอียงข้างหน้ากอง (ให้ดูรก ๆ แบบในภาพ)
  if (shown >= 1) books.push({ x: 150, y: floor + 20, w: 150, h: 16, rot: -4, fill: TINTS[2] });
  if (shown >= 4) books.push({ x: 300, y: floor + 24, w: 128, h: 15, rot: 5, fill: TINTS[4] });

  const rows = Math.max(mainN, sideN + 1);
  const top = rows * 20 + 10;
  return { books, top, plusX: 210 };
}

function shelfSpines(count: number): { x: number; w: number; h: number; lean: number }[] {
  const n = Math.max(3, Math.min(count, 10));
  const out = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    const w = 10 + ((i * 29) % 12);
    out.push({ x, w, h: 46 + ((i * 17) % 22), lean: ((i * 41) % 7) - 3 });
    x += w + 6;
  }
  return out;
}
