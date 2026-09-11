import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CanvasTexture, type Group } from 'three';
import type { Book } from '../db/schema';
import { coverCanvas, textureOf } from './bookTextures';
import { sampleBooks } from './study';
import './concept-lab.css';

const books = sampleBooks(6);
const hotspots = [
  { id: 'study-0', label: 'กองหนังสือ', x: 84, y: 78 },
  { id: 'study-1', label: 'ชั้นหนังสือ', x: 63, y: 48 },
  { id: 'study-5', label: 'เล่มบนโต๊ะ', x: 11, y: 67 },
];

export default function ConceptLab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spin, setSpin] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>('day');
  const selected = books.find((book) => book.id === selectedId) ?? null;

  return (
    <main className="concept-lab">
      <header className="concept-header">
        <div>
          <p className="concept-kicker">คั่น · visual prototype 01</p>
          <h1>ห้องที่หนังสือของคุณมีที่อยู่</h1>
          <p>ภาพ 2D เป็นห้องหลัก ส่วนหนังสือที่แตะจะเปิดเป็นวัตถุ 3D ในชั้น overlay</p>
        </div>
        <span className="concept-status">2D room + 3D book</span>
      </header>

      <section className={`concept-stage${timeOfDay === 'night' ? ' is-night' : ''}`} aria-label="ห้องอ่านหนังสือแบบภาพประกอบ">
        <img src={`${import.meta.env.BASE_URL}concept/home-v5.png`} alt="ห้องอ่านหนังสือวาดมือ มีบอร์ดเบาะแสและหน้าต่างที่เว้นว่าง" />
        <button
          className="concept-window"
          type="button"
          aria-pressed={timeOfDay === 'night'}
          aria-label={`เปลี่ยนเป็น${timeOfDay === 'day' ? 'กลางคืน' : 'กลางวัน'}`}
          onClick={() => setTimeOfDay((value) => value === 'day' ? 'night' : 'day')}
        >
          <span className="concept-window-sky"><i /></span>
          <span className="concept-window-label">{timeOfDay === 'day' ? 'กลางวัน' : 'กลางคืน'}</span>
        </button>
        <button
          className="concept-time-toggle"
          type="button"
          aria-pressed={timeOfDay === 'night'}
          onClick={() => setTimeOfDay((value) => value === 'day' ? 'night' : 'day')}
        >
          <span aria-hidden="true">{timeOfDay === 'day' ? '☼' : '☾'}</span>
          {timeOfDay === 'day' ? 'เปลี่ยนเป็นกลางคืน' : 'เปลี่ยนเป็นกลางวัน'}
        </button>
        <div className="concept-hotspots">
          {hotspots.map((spot) => {
            const book = books.find((item) => item.id === spot.id)!;
            return (
              <button
                key={spot.id}
                className={`concept-hotspot${selectedId === spot.id ? ' is-selected' : ''}`}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                onClick={() => setSelectedId(spot.id)}
                aria-label={`เปิดดู ${book.title} แบบสามมิติ จาก${spot.label}`}
              >
                <span>{spot.label}</span>
                <i aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <div className="concept-legend" aria-hidden="true">
          <span><i className="dot dot-pile" /> กองอยู่</span>
          <span><i className="dot dot-desk" /> กำลังอ่าน</span>
          <span><i className="dot dot-shelf" /> อ่านจบแล้ว</span>
        </div>
      </section>

      <section className="concept-notes">
        <div><span>01</span><strong>ฉาก 2D คงความเป็นงานวาดมือ</strong><p>ภาพห้องทำหน้าที่เป็นพื้นหลังที่สงบและเบา ปรับตำแหน่งแยกสำหรับ desktop กับ mobile ได้</p></div>
        <div><span>02</span><strong>หนังสือยังเป็นข้อมูลจริง</strong><p>จุดแตะผูกกับ Book.id เดียวกัน และใช้ปกจริงใน viewer เมื่อมีข้อมูล</p></div>
        <div><span>03</span><strong>3D เปิดเมื่อจำเป็น</strong><p>โหลด Canvas เฉพาะตอนเลือกเล่ม ลดน้ำหนักหน้า Home และไม่ทำให้ภาพหลักกลายเป็นฉาก 3D</p></div>
      </section>

      {selected && (
        <div className="concept-scrim" role="presentation" onClick={() => setSelectedId(null)}>
          <section className="concept-book-sheet" role="dialog" aria-modal="true" aria-label={`รายละเอียด ${selected.title}`} onClick={(event) => event.stopPropagation()}>
            <button className="concept-close" onClick={() => setSelectedId(null)} aria-label="ปิดรายละเอียด">×</button>
            <div className="concept-book-viewer">
              <Canvas orthographic dpr={[1, 1.5]} camera={{ position: [0, 0, 6], zoom: 175 }} gl={{ antialias: true, alpha: true }}>
                <ambientLight intensity={1.8} />
                <directionalLight position={[-3, 4, 5]} intensity={2.4} />
                <BookModel book={selected} spin={spin} />
              </Canvas>
            </div>
            <div className="concept-book-caption">
              <p className="concept-kicker">หนังสือที่เลือก · {selected.status === 'pile' ? 'กองอยู่' : selected.status === 'desk' ? 'กำลังอ่าน' : 'อ่านจบแล้ว'}</p>
              <h2>{selected.title}</h2>
              <p>{selected.author}</p>
              <div className="concept-book-actions">
                <button className="concept-spin" aria-pressed={spin} onClick={() => setSpin((value) => !value)}>{spin ? 'พักการหมุน' : 'หมุนหนังสือ'}</button>
                <button className="concept-open">เปิดหน้าหนังสือ</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function BookModel({ book, spin }: { book: Book; spin: boolean }) {
  const group = useRef<Group>(null);
  const [map, setMap] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    let alive = true;
    const canvas = coverCanvas(book);
    const texture = textureOf(canvas);
    texture.needsUpdate = true;
    setMap(texture);
    if (book.coverUrl) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        // Keep the drawn title fallback when a cover endpoint returns a blank placeholder.
        if (!alive || image.naturalWidth < 10 || image.naturalHeight < 10) return;
        const context = canvas.getContext('2d')!;
        context.fillStyle = '#f4efe3'; context.fillRect(0, 0, canvas.width, canvas.height);
        const ratio = Math.min(canvas.width / image.width, canvas.height / image.height);
        const width = image.width * ratio; const height = image.height * ratio;
        context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        texture.needsUpdate = true;
      };
      image.onerror = () => undefined;
      image.src = book.coverUrl;
    }
    return () => { alive = false; texture.dispose(); };
  }, [book]);

  useFrame((_, delta) => {
    if (group.current && spin) group.current.rotation.y += delta * 0.45;
  });

  return (
    <group ref={group} rotation={[0.12, -0.55, -0.04]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.18, 1.66, 0.2]} />
        <meshStandardMaterial color="#efe6d5" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.106]}>
        <planeGeometry args={[1.13, 1.61]} />
        <meshBasicMaterial map={map ?? undefined} color={map ? '#fff' : book.color} toneMapped={false} />
      </mesh>
      <mesh position={[-0.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.2, 1.66]} />
        <meshStandardMaterial color={book.color} roughness={1} />
      </mesh>
      <mesh position={[0, 0, -0.106]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.13, 1.61]} />
        <meshStandardMaterial color="#d6c8ae" roughness={1} />
      </mesh>
    </group>
  );
}
