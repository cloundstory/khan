import { useRef, useState } from 'react';
import { useApp } from '../store/useApp';
import { downloadBackup, importBackup } from '../db/export';
import { deleteBook } from '../db/books';

export default function Settings() {
  const { books, go, refresh, say } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const result = await importBackup(json);
      await refresh();
      const n = result.added.books;
      say(n > 0 ? `นำเข้า ${n} เล่ม` : 'ข้อมูลนี้มีอยู่แล้วทั้งหมด');
    } catch (err) {
      say(err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ');
    }
    e.target.value = '';
  }

  async function remove(id: string) {
    await deleteBook(id);
    await refresh();
    setConfirmId(null);
    say('ลบแล้ว');
  }

  return (
    <div className="page">
      <button className="back" onClick={() => go({ name: 'room' })}>← กลับห้อง</button>

      <div className="topline">
        <span className="wordmark">ตั้งค่า</span>
      </div>

      <div className="section-label">ข้อมูล</div>
      <div className="btn-row" style={{ marginTop: 0 }}>
        <button className="btn btn-quiet" onClick={() => downloadBackup().then(() => say('ส่งออกแล้ว'))}>
          ส่งออกเป็นไฟล์ JSON
        </button>
        <button className="btn btn-quiet" onClick={() => fileRef.current?.click()}>
          นำเข้าจากไฟล์
        </button>
      </div>
      <div className="field-hint" style={{ marginTop: 8 }}>
        นำเข้าแบบรวมกับของเดิม — เล่มที่มีอยู่แล้วจะไม่ถูกทับ
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />

      {books.length > 0 && (
        <>
          <div className="section-label">ลบหนังสือ</div>
          {books.map((b) => (
            <div className="session-row" key={b.id}>
              <div className="session-top">
                <span style={{ color: 'var(--paper)' }}>{b.title}</span>
                {confirmId === b.id ? (
                  <span>
                    <button className="pin-btn danger" onClick={() => remove(b.id)}>ลบจริง</button>
                    {' · '}
                    <button className="pin-btn" onClick={() => setConfirmId(null)}>ยกเลิก</button>
                  </span>
                ) : (
                  <button className="pin-btn danger" onClick={() => setConfirmId(b.id)}>ลบ</button>
                )}
              </div>
            </div>
          ))}
          <div className="field-hint" style={{ marginTop: 10 }}>
            ลบเล่มจะลบบันทึกและการ์ดของเล่มนั้นทั้งหมด ส่งออกไฟล์เก็บไว้ก่อนเสมอ
          </div>
        </>
      )}
    </div>
  );
}
