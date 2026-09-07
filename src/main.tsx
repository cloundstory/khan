import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * ขอให้เบราว์เซอร์ไม่ล้าง IndexedDB ทิ้งเองตอนพื้นที่ใกล้เต็ม
 * ข้อมูลการอ่านสร้างใหม่ไม่ได้ — เบราว์เซอร์ที่ไม่รองรับก็ปล่อยผ่าน
 */
try {
  navigator.storage?.persist?.()?.catch(() => {});
} catch {
  /* ไม่รองรับ — ไม่เป็นไร */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
