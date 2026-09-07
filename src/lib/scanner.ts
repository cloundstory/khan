/**
 * หา BarcodeDetector มาใช้
 *
 * ทดสอบจริงแล้ว 7 ก.ย. 2026: Chrome 148 บน Windows **ไม่มี** BarcodeDetector
 * และ iOS Safari ก็ไม่เคยมี — มีแต่ Android เท่านั้นที่ได้ของเนทีฟ
 * เพราะฉะนั้นพึ่งของเนทีฟอย่างเดียวไม่ได้ ต้องมี polyfill สำรองเสมอ
 *
 * polyfill ใช้ WASM ซึ่งหนัก จึง import แบบ dynamic ตอนเปิดกล้องเท่านั้น
 * คนที่ไม่เคยกดสแกนจะไม่ต้องโหลดมันเลยแม้แต่ไบต์เดียว
 */

export interface DetectedCode {
  rawValue: string;
}

export interface Detector {
  detect(source: CanvasImageSource): Promise<DetectedCode[]>;
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a'];

type NativeCtor = {
  new (opts: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
};

let cached: Detector | null = null;

export async function getBarcodeDetector(): Promise<Detector> {
  if (cached) return cached;

  const native = (globalThis as unknown as { BarcodeDetector?: NativeCtor }).BarcodeDetector;
  if (native) {
    try {
      const supported = await native.getSupportedFormats();
      if (supported.includes('ean_13')) {
        cached = new native({ formats: FORMATS.filter((f) => supported.includes(f)) });
        return cached;
      }
    } catch {
      /* เนทีฟมีแต่ใช้ไม่ได้ — ตกไปใช้ polyfill */
    }
  }

  const [{ BarcodeDetector, setZXingModuleOverrides }, wasm] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);

  // ดีฟอลต์ของไลบรารีคือไปดึง .wasm จาก fastly.jsdelivr.net
  // บังคับให้ใช้ไฟล์ที่ build มากับแอปแทน — ไม่พึ่ง CDN ภายนอก และ service worker แคชได้
  setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? wasm.default : prefix + path,
  });

  cached = new BarcodeDetector({ formats: FORMATS as never }) as Detector;
  return cached;
}

/** กล้องหลังคือกล้องที่ใช้ส่องปกหนังสือ ไม่ใช่กล้องหน้า */
export function openCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  });
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
