/**
 * ย่อรูปปกที่ถ่ายเองก่อนเก็บ
 *
 * รูปจากกล้องมือถือใบหนึ่งราว 2-4 MB ซึ่งใหญ่เกินความจำเป็นหลายเท่า
 * ปกถูกใช้ใหญ่สุดเป็น texture ของเล่ม 3D ที่แสดงสูงราว 250px
 * ที่ 512px กว้าง คุณภาพ 0.75 ได้ไฟล์ราว 50-80 KB ซึ่งคมพอและไม่ทำให้ backup บวม
 *
 * ทิ้งไฟล์ต้นฉบับ ไม่เก็บ — เก็บไว้ก็ไม่ได้ใช้ แต่กินที่จริง
 */
export async function shrinkToCover(file: Blob, maxWidth = 512, quality = 0.75): Promise<Blob> {
  const src = await createImageBitmap(file);
  try {
    const w = Math.min(maxWidth, src.width);
    const h = Math.round((src.height / src.width) * w);

    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    if (!g) throw new Error('วาดรูปไม่ได้');
    g.drawImage(src, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/jpeg', quality));
    if (!blob) throw new Error('ย่อรูปไม่สำเร็จ');
    return blob;
  } finally {
    src.close();
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
