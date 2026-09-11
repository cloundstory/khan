import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Opt-in visual study: keep the normal reading flow and its data untouched.
const ArtLab = lazy(() => import('./design/ArtLab'));
const ConceptLab = lazy(() => import('./design/ConceptLab'));
const AssetLab = lazy(() => import('./design/AssetLab'));
const UxLab = lazy(() => import('./design/UxLab'));
const MobileFlowLab = lazy(() => import('./design/MobileFlowLab'));
const isArtLab = new URLSearchParams(location.search).has('art-lab');
const isConceptLab = new URLSearchParams(location.search).has('concept-lab');
const isAssetLab = new URLSearchParams(location.search).has('asset-lab');
const isUxLab = new URLSearchParams(location.search).has('ux-lab');
const isMobileFlowLab = new URLSearchParams(location.search).has('mobile-flow');

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
    {isMobileFlowLab ? <Suspense fallback={<p className="page">กำลังเปิด mobile flow…</p>}><MobileFlowLab /></Suspense> : isUxLab ? <Suspense fallback={<p className="page">กำลังเปิด UX/UI mockup…</p>}><UxLab /></Suspense> : isAssetLab ? <Suspense fallback={<p className="page">กำลังประกอบ asset…</p>}><AssetLab /></Suspense> : isConceptLab ? <Suspense fallback={<p className="page">กำลังเปิด concept lab…</p>}><ConceptLab /></Suspense> : isArtLab ? <Suspense fallback={<p className="page">กำลังเปิดสมุดทดลอง…</p>}><ArtLab /></Suspense> : <App />}
  </StrictMode>
);
