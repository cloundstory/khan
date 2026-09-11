import { useMemo, useState, type CSSProperties } from 'react';
import { BOOKCASE_ROWS, ROOM_ASSETS, ROOM_CANVAS, type RoomAssetSpec } from '../scene/assetManifest';
import { bookShape, sampleBooks } from './study';
import './asset-lab.css';

const shelfBooks = sampleBooks(100);
const pileBooks = sampleBooks(6);
const pileLayout = [
  { left: 2, bottom: 0, width: 90, rotate: -2.2 },
  { left: 8, bottom: 12, width: 83, rotate: 1.4 },
  { left: 0, bottom: 25, width: 91, rotate: -0.8 },
  { left: 11, bottom: 39, width: 79, rotate: 2.3 },
  { left: 4, bottom: 54, width: 87, rotate: -1.5 },
  { left: 14, bottom: 70, width: 75, rotate: 0.9 },
] as const;

function url(path: string) {
  return `${import.meta.env.BASE_URL}${path}`;
}

function assetStyle(asset: RoomAssetSpec): CSSProperties {
  const left = `${(asset.x / ROOM_CANVAS.width) * 100}%`;
  const top = `${(asset.y / ROOM_CANVAS.height) * 100}%`;
  const width = `${(asset.width / ROOM_CANVAS.width) * 100}%`;
  const height = `${(asset.height / ROOM_CANVAS.height) * 100}%`;
  const transform = asset.anchor === 'bottom-center'
    ? 'translate(-50%, -100%)'
    : asset.anchor === 'top-center'
      ? 'translateX(-50%)'
      : asset.anchor === 'center'
        ? 'translate(-50%, -50%)'
        : undefined;
  return { left, top, width, height, zIndex: asset.zIndex, transform };
}

export default function AssetLab() {
  const [showBooks, setShowBooks] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const shelfItems = useMemo(() => {
    let bookIndex = 0;
    return BOOKCASE_ROWS.flatMap((row, rowIndex) => {
      const slotWidth = (row.right - row.left) / row.capacity;
      return Array.from({ length: row.capacity }, (_, slot) => {
        const reserved = row.decor && slot >= row.decor.start && slot < row.decor.start + row.decor.span;
        if (reserved) return null;
        const book = shelfBooks[bookIndex++];
        const height = row.maxBookHeight - ((rowIndex * 7 + slot * 5) % 14);
        const width = slotWidth * (0.62 + ((rowIndex + slot * 3) % 4) * 0.07);
        const left = row.left + slot * slotWidth + (slotWidth - width) / 2;
        const tilt = (-1.2 + ((rowIndex * 3 + slot * 5) % 7) * 0.35).toFixed(1);
        return {
          book,
          style: {
            left: `${(left / ROOM_CANVAS.width) * 100}%`,
            top: `${((row.baseline - height) / ROOM_CANVAS.height) * 100}%`,
            width: `${(width / ROOM_CANVAS.width) * 100}%`,
            height: `${(height / ROOM_CANVAS.height) * 100}%`,
            '--book-color': book.color,
            '--book-tilt': `${tilt}deg`,
          } as CSSProperties,
        };
      }).filter((item): item is NonNullable<typeof item> => item !== null);
    });
  }, []);
  const shelfDecor = useMemo(() => BOOKCASE_ROWS.flatMap((row) => {
    if (!row.decor) return [];
    const slotWidth = (row.right - row.left) / row.capacity;
    const width = slotWidth * row.decor.span;
    return [{
      id: `${row.id}-${row.decor.kind}`,
      kind: row.decor.kind,
      style: {
        left: `${((row.left + row.decor.start * slotWidth) / ROOM_CANVAS.width) * 100}%`,
        top: `${((row.baseline - row.maxBookHeight) / ROOM_CANVAS.height) * 100}%`,
        width: `${(width / ROOM_CANVAS.width) * 100}%`,
        height: `${(row.maxBookHeight / ROOM_CANVAS.height) * 100}%`,
      } as CSSProperties,
    }];
  }), []);

  return (
    <main className="asset-lab">
      <header className="asset-lab__header">
        <div>
          <p>คั่น · phase 1 · gate A</p>
          <h1>ห้องเปล่าและพื้นที่ของหนังสือจริง</h1>
          <span>room shell · rug · bookcase back/front · pile underlay</span>
        </div>
        <div className="asset-lab__controls">
          <button type="button" className={showBooks ? 'is-active' : ''} onClick={() => setShowBooks((value) => !value)}>หนังสือจริง</button>
          <button type="button" className={showGuides ? 'is-active' : ''} onClick={() => setShowGuides((value) => !value)}>เส้นประกอบ</button>
        </div>
      </header>

      <section className="asset-lab__frame" aria-label="ภาพประกอบทดสอบ Gate A">
        <div className={`asset-lab__stage${showGuides ? ' has-guides' : ''}`}>
          <img className="asset-lab__piece" src={url(ROOM_ASSETS.roomShellDesktop.src)} style={assetStyle(ROOM_ASSETS.roomShellDesktop)} alt="" />
          <img className="asset-lab__piece" src={url(ROOM_ASSETS.rug.src)} style={assetStyle(ROOM_ASSETS.rug)} alt="" />
          <span className="asset-lab__bookcase-shadow" aria-hidden="true" />
          <img className="asset-lab__piece" src={url(ROOM_ASSETS.bookcaseBack.src)} style={assetStyle(ROOM_ASSETS.bookcaseBack)} alt="" />

          {showBooks && <div className="asset-lab__shelf-books">
            {shelfItems.map(({ book, style }) => (
              <figure key={book.id} className="asset-lab__shelf-book" style={style} title={book.title}>
                <img src={book.coverUrl} alt={book.title} />
                <span className="asset-lab__spine-title" aria-hidden="true">{book.title}</span>
                <i aria-hidden="true" />
              </figure>
            ))}
            {shelfDecor.map((decor) => (
              <span key={decor.id} className={`asset-lab__shelf-decor decor-${decor.kind}`} style={decor.style} aria-label={`พื้นที่สำหรับ ${decor.kind}`}><i /><b /></span>
            ))}
          </div>}

          <img className="asset-lab__piece" src={url(ROOM_ASSETS.bookcaseFront.src)} style={assetStyle(ROOM_ASSETS.bookcaseFront)} alt="" />
          <img className="asset-lab__piece" src={url(ROOM_ASSETS.pileUnderlay.src)} style={assetStyle(ROOM_ASSETS.pileUnderlay)} alt="" />

          {showBooks && <div className="asset-lab__pile" aria-label="ตัวอย่างกองหนังสือจากปกจริง">
            {pileBooks.map((book, index) => {
              const shape = bookShape(book.id);
              const position = pileLayout[index];
              return <figure
                key={book.id}
                className="asset-lab__pile-book"
                title={book.title}
                style={{
                  left: `${position.left}%`,
                  bottom: `${position.bottom}%`,
                  width: `${position.width}%`,
                  height: `${13 + shape.depth * 45}%`,
                  zIndex: index + 1,
                  '--pile-color': book.color,
                  '--pile-rotation': `${position.rotate}deg`,
                } as CSSProperties}
              >
                <span className="asset-lab__pile-cover" style={{ backgroundImage: `url(${book.coverUrl})` }} aria-hidden="true" />
                <span className="asset-lab__pile-spine">{book.title}</span>
                <i className="asset-lab__pile-pages" aria-hidden="true" />
              </figure>
            })}
          </div>}

          {showGuides && <>
            <span className="asset-lab__horizon" aria-hidden="true" />
            <span className="asset-lab__pile-zone" aria-hidden="true">PILE</span>
            <span className="asset-lab__sofa-zone" aria-hidden="true">SOFA · LAMP · TABLE</span>
            <span className="asset-lab__interaction-zone" aria-hidden="true">WINDOW · WIND · DAY/NIGHT</span>
          </>}
        </div>
      </section>

      <footer className="asset-lab__footer">
        <span><i className="swatch shell" /> room shell</span>
        <span><i className="swatch rug" /> rug</span>
        <span><i className="swatch shelf" /> back → real spines → front</span>
        <span><i className="swatch pile" /> pile landing zone</span>
      </footer>
    </main>
  );
}
