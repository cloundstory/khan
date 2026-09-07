import { useEffect, useRef, useState } from 'react';
import type { Book } from '../db/schema';
import {
  drawGeneratedCover,
  drawSpine,
  drawPageEdge,
  loadCoverImage,
  fontsReady,
} from '../lib/cover';

/**
 * เล่มหนึ่งเล่มแบบ 3D — "หยิบขึ้นมาดู"
 *
 * three.js โหลดแบบ dynamic ตอนเปิดหน้าเล่มเท่านั้น หน้าห้องที่มีหนังสือเป็นสิบเล่ม
 * ยังใช้ CSS 3D เหมือนเดิม เพราะที่นั่นต้องเบาและข้อความไทยต้องคมทุกเล่ม
 *
 * ระหว่างที่ three ยังโหลดไม่เสร็จจะโชว์ปกแบบแบนไปก่อน แล้วค่อยสลับ
 * ไม่มี spinner ไม่มีจอกระพริบ
 */
export default function Book3D({ book }: { book: Book }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;

      await fontsReady();

      const [THREE, realCover] = await Promise.all([
        import('three'),
        book.coverUrl ? loadCoverImage(book.coverUrl) : Promise.resolve(null),
      ]);
      if (disposed) return;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      } catch {
        return; // ไม่มี WebGL — ปกแบนที่แสดงอยู่ก็ใช้ได้อยู่แล้ว
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0, 5.2);

      const tex = (source: TexImageSource) => {
        const t = new THREE.Texture(source as HTMLCanvasElement);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        t.needsUpdate = true;
        return t;
      };

      const coverTex = tex(realCover ?? drawGeneratedCover(book));
      const spineTex = tex(drawSpine(book));
      const pageTex = tex(drawPageEdge());

      const back = new THREE.Color(book.color).multiplyScalar(0.72);
      const paper = { map: pageTex, roughness: 0.95, metalness: 0 };

      // ลำดับหน้าของ BoxGeometry: +x, -x, +y, -y, +z, -z
      const materials = [
        new THREE.MeshStandardMaterial(paper), // ขอบกระดาษด้านขวา
        new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.78, metalness: 0 }),
        new THREE.MeshStandardMaterial(paper), // บน
        new THREE.MeshStandardMaterial(paper), // ล่าง
        new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.7, metalness: 0 }),
        new THREE.MeshStandardMaterial({ color: back, roughness: 0.8, metalness: 0 }),
      ];

      // ความหนามาจากจำนวนหน้าจริง — เล่มหนาต้องดูหนา
      const pages = book.unit === 'percent' ? undefined : book.total;
      const depth = Math.max(0.07, Math.min(0.44, (pages ?? 280) / 1400));
      const geo = new THREE.BoxGeometry(1.36, 2.0, depth);
      const mesh = new THREE.Mesh(geo, materials);
      scene.add(mesh);

      scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6b6155, 1.5));
      const key = new THREE.DirectionalLight(0xfff1dd, 2.1);
      key.position.set(-2.6, 3.0, 4.2);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xd8e2e6, 0.75);
      fill.position.set(3.2, -1.4, 2.0);
      scene.add(fill);

      const baseY = -0.44;
      const baseX = 0.1;
      let ry = baseY;
      let rx = baseX;
      let dragging = false;
      let last = { x: 0, y: 0 };
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function resize() {
        const w = wrap!.clientWidth;
        const h = wrap!.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }

      const onDown = (e: PointerEvent) => {
        dragging = true;
        last = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        ry += (e.clientX - last.x) * 0.009;
        rx += (e.clientY - last.y) * 0.006;
        rx = Math.max(-0.85, Math.min(0.85, rx));
        last = { x: e.clientX, y: e.clientY };
      };
      const onUp = () => { dragging = false; };

      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);

      const ro = new ResizeObserver(resize);
      ro.observe(wrap);
      resize();

      let raf = 0;
      const start = performance.now();
      const tick = () => {
        // ไม่หมุนรอบตัวเอง แค่ไหวช้า ๆ ให้รู้ว่าเป็นของสามมิติ — ห้องนี้ต้องเงียบ
        const sway = calm || dragging ? 0 : Math.sin((performance.now() - start) / 2600) * 0.085;
        mesh.rotation.y = ry + sway;
        mesh.rotation.x = rx;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      setLive(true);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
        geo.dispose();
        materials.forEach((m) => m.dispose());
        [coverTex, spineTex, pageTex].forEach((t) => t.dispose());
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [book]);

  return (
    <div className="book3d" ref={wrapRef}>
      {!live && (
        <div className="book3d-flat" style={{ background: book.color }} aria-hidden="true">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt="" />
          ) : (
            <span className="book3d-flat-title">{book.title}</span>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="book3d-canvas"
        style={{ opacity: live ? 1 : 0 }}
        aria-label={`ปกของ ${book.title} — ลากเพื่อหมุน`}
      />
    </div>
  );
}
