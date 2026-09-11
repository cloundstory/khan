import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CanvasTexture, OrthographicCamera } from 'three';
import type { Book } from '../db/schema';
import { bookShape } from './study';
import { roomDimensions, roomLayout, type ShelfFacing, type Placement } from './roomLayout';
import { backCanvas, coverCanvas, pageCanvas, spineCanvas, textureOf } from './bookTextures';
import { useStudyCover } from './useStudyCover';

interface Props {
  books: Book[]; selectedId: string; onSelect: (id: string) => void; angle: number;
  mobile: boolean; onUnavailable: () => void; facing?: ShelfFacing;
  inspect?: boolean; toned?: boolean;
}

export default function BookStudy(props: Props) {
  return <WebGLBoundary onUnavailable={props.onUnavailable}>
    <Canvas aria-label={props.inspect ? 'หมุนดูหนังสือที่เลือก' : 'หนังสือสามมิติในห้อง เลือกด้วยเมาส์หรือรายการด้านล่าง'}
      orthographic frameloop="demand" dpr={[1, 1.75]} camera={{ position: [0, 0, 20], zoom: 65, near: 0.1, far: 50 }}
      gl={{ alpha: true, antialias: true }} fallback={<p>ใช้รายการด้านล่างเพื่อเลือกเล่ม หรือเลือกดูแบบภาพแบน</p>}>
      <CameraLayout mobile={props.mobile} inspect={Boolean(props.inspect)} />
      <Scene {...props} />
    </Canvas>
  </WebGLBoundary>;
}

class WebGLBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? <p>เปิดภาพสามมิติไม่ได้ ใช้มุมมองภาพแบนแทน</p> : this.props.children; }
}

function CameraLayout({ mobile, inspect }: { mobile: boolean; inspect: boolean }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    const dimensions = roomDimensions(mobile);
    cam.zoom = inspect ? Math.min(size.width / 1.6, size.height / 1.5) : size.width / dimensions.width;
    cam.position.set(0, 0, 20); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); invalidate();
  }, [camera, size, mobile, inspect, invalidate]);
  return null;
}

function Scene({ books, selectedId, onSelect, angle, mobile, facing = 'spine', inspect = false, toned = true }: Props) {
  const placements: Placement[] = inspect
    ? books.slice(0, 1).map(book => ({ book, position: [0, 0, 1], rotation: [-0.12, angle * Math.PI / 180, -0.025], scale: 1 }))
    : roomLayout(books, mobile, facing);
  return <group>{placements.map(p => <Volume key={p.book.id} {...p} selected={p.book.id === selectedId} onSelect={onSelect} toned={toned} inspect={inspect} />)}</group>;
}

function BoxEdges({ size }: { size: [number, number, number] }) {
  const points = useMemo(() => {
    const [x, y, z] = size.map(v => v / 2);
    const vertices = [[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    const out: number[] = [];
    edges.forEach(([a, b], edge) => {
      const start = vertices[a], end = vertices[b];
      const at = (t: number) => start.map((v, axis) => v + (end[axis] - v) * t + Math.sin(t * Math.PI) * Math.sin(t * 13 + edge + axis) * 0.002);
      for (let i = 0; i < 5; i++) out.push(...at(i / 5), ...at((i + 1) / 5));
    });
    return new Float32Array(out);
  }, [size[0], size[1], size[2]]);
  return <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry><lineBasicMaterial color="#39342b" transparent opacity={0.85} /></lineSegments>;
}

interface Maps { cover: CanvasTexture; spine: CanvasTexture; pages: CanvasTexture; back: CanvasTexture }

export function Volume({ book, position, rotation, scale, selected, onSelect, toned, inspect }: Placement & { selected: boolean; onSelect: (id: string) => void; toned: boolean; inspect: boolean }) {
  const url = useStudyCover(book);
  const [maps, setMaps] = useState<Maps | null>(null);
  const { invalidate } = useThree();
  const { width: w, height: h, depth: d } = bookShape(book.id);
  useEffect(() => {
    let alive = true;
    const canvas = coverCanvas(book);
    const next = { cover: textureOf(canvas), spine: textureOf(spineCanvas(book, toned)), pages: textureOf(pageCanvas()), back: textureOf(backCanvas()) };
    setMaps(next); invalidate();
    if (url) {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!alive || img.naturalWidth < 2) return;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#f4efe3'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
        const iw = img.width * ratio, ih = img.height * ratio;
        ctx.drawImage(img, (canvas.width - iw) / 2, (canvas.height - ih) / 2, iw, ih);
        next.cover.needsUpdate = true; invalidate();
      };
      img.onerror = () => { /* Keep title fallback; never draw another book's cover. */ };
      img.src = url;
    }
    void document.fonts.ready.then(() => {
      if (!alive) return;
      next.spine.image = spineCanvas(book, toned); next.spine.needsUpdate = true; invalidate();
    });
    return () => { alive = false; Object.values(next).forEach(map => map.dispose()); };
  }, [url, book.title, book.author, book.color, toned, invalidate]);

  return <group position={position} rotation={rotation} scale={scale} onClick={e => { e.stopPropagation(); onSelect(book.id); }}>
    <mesh><boxGeometry args={[w - 0.02, h - 0.02, d]} /><meshBasicMaterial color="#e8e0ce" /></mesh>
    {[1,-1].map(sign => <mesh key={sign} position={[0, sign * (h / 2 - 0.008), 0]} rotation={[-sign * Math.PI / 2, 0, 0]}><planeGeometry args={[w - 0.02, d]} /><meshBasicMaterial key={maps?.pages.uuid ?? 'pages'} map={maps?.pages} color={maps ? '#ffffff' : '#e8e0ce'} toneMapped={false} /></mesh>)}
    <mesh position={[-w / 2 - 0.008, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[d + 0.02, h + 0.02]} /><meshBasicMaterial key={maps?.spine.uuid ?? 'spine'} map={maps?.spine} color={maps ? '#ffffff' : '#eee7d8'} toneMapped={false} /></mesh>
    <mesh position={[0, 0, -d / 2 - 0.012]} rotation={[0, Math.PI, 0]}><planeGeometry args={[w, h]} /><meshBasicMaterial key={maps?.back.uuid ?? 'back'} map={maps?.back} color={maps ? '#ffffff' : '#e7e0d1'} toneMapped={false} /></mesh>
    <mesh position={[0, 0, d / 2 + 0.012]}><planeGeometry args={[w, h]} /><meshBasicMaterial key={maps?.cover.uuid ?? 'cover'} map={maps?.cover} color={maps ? '#ffffff' : '#eee8db'} toneMapped={false} /></mesh>
    {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[w / 2 - 0.008, 0, -d / 2 + (i + 1) * d / 8]}><boxGeometry args={[0.002, h - 0.035, 0.0015]} /><meshBasicMaterial color="#827663" transparent opacity={0.55} /></mesh>)}
    <BoxEdges size={[w, h, d + 0.025]} />
    {selected && <group><mesh position={[-w / 2 - 0.009, h / 2 + 0.075, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.055, 0.16]} /><meshBasicMaterial color="#536a77" /></mesh>{inspect && <mesh position={[w * 0.3, h / 2 + 0.04, d / 2 + 0.015]}><planeGeometry args={[0.055, 0.14]} /><meshBasicMaterial color="#536a77" /></mesh>}</group>}
  </group>;
}

