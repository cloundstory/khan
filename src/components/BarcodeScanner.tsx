import { useEffect, useRef, useState } from 'react';
import { getBarcodeDetector, openCamera, stopCamera } from '../lib/scanner';
import { normalizeIsbn, looksLikeBook } from '../lib/isbn';

/**
 * ส่องบาร์โค้ดหลังปกหนังสือ
 *
 * ตรวจทุก ~220ms ไม่ใช่ทุกเฟรม — การถอดรหัสด้วย WASM กินแรงเครื่อง
 * ถ้าไล่ตาม 60fps มือถือจะร้อนและแบตหมดเร็วโดยไม่ได้อ่านแม่นขึ้นเลย
 */
export default function BarcodeScanner(props: {
  onFound: (isbn: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const foundRef = useRef(props.onFound);
  foundRef.current = props.onFound;

  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;

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
          if (video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              for (const c of codes) {
                const isbn = normalizeIsbn(c.rawValue);
                if (looksLikeBook(isbn)) {
                  foundRef.current(isbn);
                  return;
                }
              }
            } catch {
              /* เฟรมนี้อ่านไม่ออก ลองเฟรมถัดไป */
            }
          }
          await new Promise((r) => setTimeout(r, 220));
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
      <div className="scanner-frame" />

      <div className="scanner-msg">
        {status === 'starting' && 'กำลังเปิดกล้อง…'}
        {status === 'scanning' && 'เล็งบาร์โค้ดหลังปกให้อยู่ในกรอบ'}
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
