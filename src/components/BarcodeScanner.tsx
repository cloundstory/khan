import { useEffect, useRef, useState } from 'react';
import { getBarcodeDetector, openCamera, stopCamera } from '../lib/scanner';
import { normalizeIsbn, looksLikeBook } from '../lib/isbn';

/**
 * ส่องบาร์โค้ดหลังปกหนังสือ
 *
 * ถอดรหัสเฉพาะภาพในกรอบ ไม่ใช่ทั้งเฟรม
 * กล้องหลังมือถือให้ภาพ 1920x1080 การถอดรหัสภาพขนาดนั้นด้วย WASM ช้ามาก
 * ครอปเหลือเฉพาะในกรอบแล้วย่อลง ทำให้เร็วขึ้นหลายเท่าและแม่นขึ้นด้วย
 * เพราะไม่มีอะไรรอบข้างมากวน — กรอบบนจอจึงมีความหมายจริง ไม่ใช่ของประดับ
 */
export default function BarcodeScanner(props: {
  onFound: (isbn: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const foundRef = useRef(props.onFound);
  foundRef.current = props.onFound;

  const [status, setStatus] = useState<'starting' | 'scanning' | 'found' | 'error'>('starting');
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    const work = document.createElement('canvas');
    const wctx = work.getContext('2d', { willReadFrequently: true });

    /** แปลงกรอบบนจอเป็นพิกัดในภาพวิดีโอ โดยคิดผลของ object-fit: cover ด้วย */
    function crop(video: HTMLVideoElement, frame: HTMLElement) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh || !wctx) return null;

      const vr = video.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const scale = Math.max(vr.width / vw, vr.height / vh);
      const ox = (vw - vr.width / scale) / 2;
      const oy = (vh - vr.height / scale) / 2;

      const pad = 0.1;
      let sw = (fr.width / scale) * (1 + pad * 2);
      let sh = (fr.height / scale) * (1 + pad * 2);
      let sx = ox + (fr.left - vr.left) / scale - (fr.width / scale) * pad;
      let sy = oy + (fr.top - vr.top) / scale - (fr.height / scale) * pad;

      sx = Math.max(0, Math.min(sx, vw - 1));
      sy = Math.max(0, Math.min(sy, vh - 1));
      sw = Math.max(1, Math.min(sw, vw - sx));
      sh = Math.max(1, Math.min(sh, vh - sy));

      const target = Math.min(800, sw);
      work.width = Math.round(target);
      work.height = Math.max(1, Math.round((sh / sw) * target));
      wctx.drawImage(video, sx, sy, sw, sh, 0, 0, work.width, work.height);
      return work;
    }

    async function run() {
      try {
        // ขอกล้องก่อน แล้วค่อยโหลดตัวถอดรหัส 1 MB
        // ถ้าทำคู่ขนาน คนที่กดไม่อนุญาตจะเสียเน็ต 1 MB ฟรี ๆ
        const s = await openCamera();
        if (stopped) {
          stopCamera(s);
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        await video.play();

        const detector = await getBarcodeDetector();
        if (stopped) return;
        setStatus('scanning');

        while (!stopped) {
          const frame = frameRef.current;
          if (video.readyState >= 2 && frame) {
            const image = crop(video, frame);
            if (image) {
              try {
                const codes = await detector.detect(image);
                for (const c of codes) {
                  const isbn = normalizeIsbn(c.rawValue);
                  if (looksLikeBook(isbn)) {
                    setStatus('found');
                    navigator.vibrate?.(40);
                    await new Promise((r) => setTimeout(r, 260));
                    foundRef.current(isbn);
                    return;
                  }
                }
              } catch {
                /* เฟรมนี้อ่านไม่ออก ลองเฟรมถัดไป */
              }
            }
          }
          await new Promise((r) => setTimeout(r, 90));
        }
      } catch (e) {
        if (stopped) return;
        setError(describe(e as Error));
        setStatus('error');
      }
    }

    run();
    return () => {
      stopped = true;
      stopCamera(stream);
    };
  }, []);

  return (
    <div className="scanner">
      <video ref={videoRef} className="scanner-video" playsInline muted autoPlay />

      <div className={`scanner-frame${status === 'found' ? ' is-found' : ''}`} ref={frameRef} />

      <div className="scanner-msg">
        {status === 'starting' && 'กำลังเปิดกล้อง…'}
        {status === 'scanning' && 'วางบาร์โค้ดหลังปกให้เต็มความกว้างของกรอบ'}
        {status === 'found' && 'เจอแล้ว'}
        {status === 'error' && error}
      </div>

      <button className="scanner-close" onClick={props.onClose}>
        ปิดกล้อง
      </button>
    </div>
  );
}

function describe(e: Error): string {
  if (e.name === 'NotAllowedError') {
    return 'ยังไม่ได้อนุญาตให้ใช้กล้อง — เปิดสิทธิ์กล้องให้เว็บนี้ในตั้งค่าเบราว์เซอร์ แล้วลองใหม่';
  }
  if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') {
    return 'ไม่พบกล้องหลังบนเครื่องนี้';
  }
  if (e.name === 'NotReadableError') {
    return 'กล้องถูกแอปอื่นใช้อยู่ ปิดแอปนั้นก่อนแล้วลองใหม่';
  }
  return e.message || 'เปิดกล้องไม่สำเร็จ';
}
