import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Book, BookStatus } from '../db/schema';
import { db } from '../db/schema';
import { useCoverPhoto } from '../lib/useCoverPhoto';
import { SAMPLE_EDITIONS, sampleBooks, studyPage } from './study';

import './art-lab.css';

const BookStudy = lazy(() => import('./Diorama'));
const STATUS: Record<BookStatus, string> = { pile: 'กองหนังสือ', desk: 'มุมอ่าน', shelf: 'อ่านจบแล้ว' };

export default function ArtLab() {
  const [books, setBooks] = useState<Book[]>(() => sampleBooks(6));
  const [source, setSource] = useState('6');
  const [selectedId, setSelectedId] = useState('study-0');
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const [page, setPage] = useState(0);
  const [angle, setAngle] = useState(-22);
  const [notice, setNotice] = useState('');
  const [flat, setFlat] = useState(false);
  const urls = useRef<string[]>([]);
  const request = useRef(0);
  const selected = books.find(b => b.id === selectedId);
  const visible = studyPage(books, page);

  useEffect(() => () => { urls.current.forEach(URL.revokeObjectURL); }, []);

  async function chooseSource(value: string) {
    const token = ++request.current;
    setSource(value); setNotice(''); setPage(0);
    try {
      const next = value === 'mine' ? await db.books.toArray() : sampleBooks(Number(value));
      if (request.current !== token) return;
      setBooks(next); setSelectedId(next[0]?.id ?? '');
      if (value === 'mine') setNotice('อ่านสำเนาจากคลังบนเบราว์เซอร์นี้ การย้ายเล่มในหน้านี้ไม่บันทึกกลับ');
    } catch {
      if (request.current !== token) return;
      setBooks([]); setSelectedId(''); setNotice('เปิดคลังไม่ได้ เลือกชุดตัวอย่างเพื่อทดลองต่อได้');
    }
  }

  function move(status: BookStatus) {
    setBooks(current => current.map(b => b.id === selectedId ? { ...b, status } : b));
    setNotice(`ทดลองย้ายเล่ม: ${STATUS[status]} — ยังไม่บันทึกลงคลังจริง`);
  }

  function changePage(next: number) {
    const result = studyPage(books, next);
    setPage(result.index); setSelectedId(result.books[0]?.id ?? '');
  }

  function upload(file: File | undefined) {
    if (!file || !selected) return;
    if (!file.type.startsWith('image/')) { setNotice('เลือกไฟล์ภาพปกครับ'); return; }
    const url = URL.createObjectURL(file); urls.current.push(url);
    setBooks(current => current.map(b => b.id === selectedId ? { ...b, coverUrl: url, hasCoverPhoto: false } : b));
    setNotice('ใช้ภาพนี้เฉพาะการทดลองในแท็บนี้ ไม่อัปโหลดหรือเปลี่ยนปกในคลัง');
  }

  return <main className="art-lab">
    <header className="lab-header"><a href={import.meta.env.BASE_URL} className="lab-brand">คั่น<span>ห้องเล็ก ๆ ของคนอ่าน</span></a><span className="lab-edition">สมุดทดลองภาพ · เฟส 01</span></header>
    <section className="room-intro"><p className="lab-eyebrow">ห้องอ่านหนังสือ · แบบร่างสามมิติ 01</p><h1>วางเรื่องวุ่น ๆ แล้วหยิบสักเล่ม</h1><p>แสงอุ่น ผิวผ้า และมุมเล็ก ๆ ที่ค่อย ๆ เติบโตไปกับการอ่านของคุณ</p></section>
    <section className="lab-experiment" aria-labelledby="study-heading">
      <div className="lab-section-title"><div><p className="lab-eyebrow">02 / วัสดุและการจัดวาง</p><h2 id="study-heading">มุมอ่านของคุณ</h2></div><p>แบบร่างองค์ประกอบและแสง<br />ยังไม่ใช่หน้า Home ฉบับเสร็จ</p></div>
      <div className="lab-toolbar">
        <label>ชุดหนังสือ<select value={source} onChange={e => void chooseSource(e.target.value)}><option value="0">ห้องว่าง</option><option value="6">ตัวอย่าง 6 เล่ม</option><option value="36">ทดสอบ 36 เล่ม</option><option value="mine">สำเนาคลังของฉัน</option></select></label>
        <div className="lab-segment" aria-label="การจัดวาง"><button aria-pressed={!mobile} onClick={() => setMobile(false)}>PC</button><button aria-pressed={mobile} onClick={() => setMobile(true)}>มือถือ</button></div>
        <label className="lab-check"><input type="checkbox" checked={flat} onChange={e => setFlat(e.target.checked)} />ดูแบบภาพแบน</label>
        <span className="lab-total">{books.length} เล่มทั้งหมด · {books.filter(b => b.status === 'shelf').length} อ่านจบ</span>
      </div>
      <div className={`lab-workspace ${mobile ? 'lab-mobile-preview' : ''}`}>
        <div className="lab-scene-column">
          <div className="lab-scene" aria-label="พื้นที่ทดลองหนังสือ">
            {flat ? <div className="lab-flat">{visible.books.map(b => <button key={b.id} onClick={() => setSelectedId(b.id)}><Cover book={b} /><span>{b.title}</span></button>)}</div> : <Suspense fallback={<p className="lab-loading">กำลังเตรียมหนังสือ…</p>}><BookStudy books={visible.books} selectedId={selectedId} onSelect={setSelectedId} angle={angle} mobile={mobile} onUnavailable={() => setFlat(true)} /></Suspense>}
            {!books.length && <p className="lab-empty">ชั้นว่างรอเรื่องราวของคุณ<br /><small>ไม่มีหนังสือตกแต่งเติมแทนข้อมูล</small></p>}
          </div>
          <div className="lab-pagination"><span>ส่วนที่ {visible.index + 1} / {visible.pages} · แสดง {visible.books.length} จาก {books.length} เล่ม</span><div><button disabled={visible.index === 0} onClick={() => changePage(visible.index - 1)} aria-label="ส่วนก่อนหน้า">←</button><button disabled={visible.index + 1 === visible.pages} onClick={() => changePage(visible.index + 1)} aria-label="ส่วนถัดไป">→</button></div></div>
          <p className="lab-caption">ชั้นสามระดับ · กองหนังสือด้านหน้า · โต๊ะข้างเก้าอี้ · แตะเล่มเพื่อเลือก</p>
        </div>
        <aside className="lab-detail">
          <p className="lab-eyebrow">หนังสือที่เลือก</p>
          {selected ? <><div className="lab-cover-preview"><Cover key={`${selected.id}-${selected.coverUrl}`} book={selected} /></div><h3>{selected.title}</h3><p>{selected.author}</p><span className="lab-status">{STATUS[selected.status]}</span>
            <label className="lab-angle">มุมมองของห้อง <input type="range" min="-65" max="65" value={angle} onChange={e => setAngle(Number(e.target.value))} /></label>
            <div className="lab-move">{(Object.keys(STATUS) as BookStatus[]).map(status => <button key={status} disabled={selected.status === status} onClick={() => move(status)}>{status === 'pile' ? 'วางกลับกอง' : status === 'desk' ? 'หยิบอ่าน' : 'ขึ้นชั้น'}</button>)}</div>
            <label className="lab-upload">ลองภาพปกจากเครื่อง<input type="file" accept="image/*" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} /></label>
          </> : <p>เลือกชุดหนังสือเพื่อเริ่มทดลอง</p>}
          <p className="lab-note">สันและความหนาเป็นรูปแบบทดลอง ไม่ใช่ภาพสันจริงหรือขนาดที่วัดจากเล่ม</p>
        </aside>
      </div>
      <p className="lab-notice" role="status">{notice || 'ข้อมูลตัวอย่างแยกจากคลังจริง · ปกเต็มคงสีต้นฉบับ · โหมด 36 เล่มใช้ปกตัวอย่างซ้ำเพื่อทดสอบความหนาแน่น'}</p>
      <details className="lab-list"><summary>เลือกเล่มจากรายการ ({books.length})</summary><div>{books.map((b, i) => <button key={b.id} aria-pressed={selectedId === b.id} onClick={() => { setSelectedId(b.id); setPage(Math.floor(i / 18)); }}>{i + 1}. {b.title}<span>{STATUS[b.status]}</span></button>)}</div></details>
    </section>
    <section className="lab-principles"><article><span>01</span><h3>สีอยู่ที่เรื่องราว</h3><p>ปกจริงคงสี ส่วนห้องใช้ผิวด้านกับสีอุ่น ให้หนังสือเป็นจุดสีของห้อง</p></article><article><span>02</span><h3>หนึ่งเล่ม หนึ่งตำแหน่ง</h3><p>ย้ายเล่มแล้วตำแหน่งเปลี่ยน จำนวนรวมเท่าเดิม ทุกเล่มเข้าถึงได้แม้เกินพื้นที่ฉาก</p></article><article><span>03</span><h3>พื้นที่ว่างมีความหมาย</h3><p>ชั้นยังว่างได้ มุมอ่านมีพื้นที่ให้เล่มที่เราเลือก และไม่เร่งให้เติมห้องให้เต็ม</p></article></section>
    <footer className="lab-footer"><span>ปกตัวอย่างจาก Open Library · โหลดผ่านอินเทอร์เน็ต หากโหลดไม่ได้จะแสดงชื่อแทน</span><div>{SAMPLE_EDITIONS.map(e => <a key={e.isbn} href={e.source} target="_blank" rel="noreferrer">{e.title}</a>)}</div></footer>
  </main>;
}

function Cover({ book }: { book: Book }) {
  const photo = useCoverPhoto(book.id, book.hasCoverPhoto);
  const [failed, setFailed] = useState(false);
  const url = photo ?? book.coverUrl;
  useEffect(() => setFailed(false), [url]);
  return url && !failed ? <img src={url} alt={`ปก ${book.title}`} onError={() => setFailed(true)} /> : <div className="lab-cover-fallback">{book.title}<small>ยังไม่มีภาพปก</small></div>;
}

