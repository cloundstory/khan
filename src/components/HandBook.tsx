import { useCoverPhoto } from '../lib/useCoverPhoto';
import type { Book } from '../db/schema';

/**
 * หนังสือวาดมือที่ใช้ "ปกจริง" — กรอบ/สัน/หน้ากระดาษเป็นเส้นหมึก (filter #hand)
 * ส่วนหน้าปกโชว์รูปปกจริง (ถ่ายเอง > coverUrl) ถ้าไม่มีปกใช้ปก typographic
 * แทน Book3D (Three.js) เพื่อให้เข้าธีมฉากวาดมือ
 */
export default function HandBook({ book }: { book: Book }) {
  const photo = useCoverPhoto(book.id, book.hasCoverPhoto);
  const cover = photo ?? book.coverUrl;
  const cid = `hb-${book.id}`;

  const fx = 64;
  const fy = 28;
  const fw = 130;
  const fh = 248;

  return (
    <div className="handbook-wrap">
      <svg className="handbook" viewBox="0 0 260 320" role="img" aria-label={`ปกของ ${book.title}`}>
        <defs>
          <clipPath id={cid}>
            <rect x={fx} y={fy} width={fw} height={fh} rx="3" />
          </clipPath>
        </defs>

        <ellipse className="hand-line" cx="130" cy="298" rx="90" ry="11" fill="var(--ink)" opacity="0.12" />

        <g transform="rotate(-3 130 158)">
          {/* หน้ากระดาษขวา + สันซ้าย (อยู่หลังปก) */}
          <g className="hand-line" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round">
            <path d={`M${fx + fw} ${fy} l15 10 v${fh - 6} l-15 10 Z`} fill="var(--paper-hi)" />
            <path
              d={`M${fx + fw + 4} ${fy + 16} v${fh - 26} M${fx + fw + 8} ${fy + 20} v${fh - 32} M${fx + fw + 12} ${fy + 24} v${fh - 40}`}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="1"
              opacity="0.45"
            />
            <path d={`M${fx} ${fy} l-15 10 v${fh} l15 10 Z`} fill={book.color} />
          </g>

          {/* ปกจริง (คมชัด ไม่ผ่าน filter) */}
          {cover ? (
            <image
              href={cover}
              x={fx}
              y={fy}
              width={fw}
              height={fh}
              clipPath={`url(#${cid})`}
              preserveAspectRatio="xMidYMid slice"
              crossOrigin={photo ? undefined : 'anonymous'}
            />
          ) : (
            <>
              <rect x={fx} y={fy} width={fw} height={fh} rx="3" fill={book.color} />
              <foreignObject x={fx} y={fy} width={fw} height={fh}>
                <div
                  // @ts-expect-error foreignObject xhtml
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px',
                    textAlign: 'center',
                    fontFamily: 'var(--serif)',
                    fontSize: '15px',
                    lineHeight: 1.5,
                    color: 'rgba(255,255,255,0.95)',
                  }}
                >
                  {book.title}
                </div>
              </foreignObject>
            </>
          )}

          {/* กรอบปก + เส้นสันบนปก วาดทับด้วยเส้นหมึก */}
          <g className="hand-line" stroke="var(--ink)" fill="none" strokeWidth="2.4" strokeLinejoin="round">
            <rect x={fx} y={fy} width={fw} height={fh} rx="3" />
            <path d={`M${fx + 11} ${fy + 8} v${fh - 16}`} strokeWidth="1" opacity="0.3" />
          </g>
        </g>
      </svg>
    </div>
  );
}
