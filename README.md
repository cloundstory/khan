# คั่น (Khan) — Phase 1

> ชั้นหนังสือที่จำได้ว่าคุณคิดอะไรอยู่

Phase 1 คือการพิสูจน์ core loop: **จับเวลาอ่าน → จดสิ่งที่คิด → กลับมาแล้วจำบริบทได้**
ยังไม่มี 3D (Phase 2) ยังไม่มี evidence board เต็มรูปแบบ (Phase 3)

## เริ่มใช้

```bash
npm install
npm run dev      # เปิด http://localhost:5173
npm test         # ทดสอบ logic ของ recovery
npm run build    # build + PWA service worker
```

ทดสอบบนมือถือจริง: `npm run dev -- --host` แล้วเปิด IP ของเครื่องจากมือถือในวง LAN เดียวกัน

## โครงไฟล์

```
src/
  db/
    schema.ts      Dexie + type ทั้ง 5 ตาราง (books, sessions, cards, threads, settings)
    books.ts       repository — ทุก write ผ่านที่นี่เท่านั้น
    sessions.ts    บันทึก session + อัปเดต book.current ใน transaction เดียว
    cards.ts       เตรียมไว้ให้ Phase 3 — Phase 1 ใช้แค่ "ปักขึ้นบอร์ด"
    export.ts      export/import JSON แบบ merge (ของเดิมไม่หาย)
  lib/
    recovery.ts    ★ หัวใจ — pure function คำนวณว่าจะขุดความจำลึกแค่ไหน
    recovery.test.ts
    stats.ts       derive สถิติจาก sessions, หาเล่มที่ "เปิดอยู่"
    format.ts      แปลงตัวเลขเป็นภาษาคน
  store/useApp.ts  Zustand — books, sessions, screen, active session
  screens/         Room · BookSheet · SessionScreen · Capture · Closing · AddBook · Settings
```

ชื่อทางเทคนิคที่ใช้ `khan`: package name, IndexedDB database, localStorage key (`khan:active-session`),
ไฟล์ export (`khan-YYYY-MM-DD.json`) และ field `app` ในไฟล์ backup

## สิ่งที่ทำได้แล้ว

- เพิ่มหนังสือพร้อม **intent** ("อยากรู้อะไรจากเล่มนี้") → ลงกอง
- **ลองเปิดดู** (กอง → โต๊ะ) — คำว่า "ลอง" ตั้งใจ ไม่ใช่คำสัญญา
- **Stopwatch** เดินเงียบ ๆ ไม่มี countdown บังคับ กันจอดับด้วย Wake Lock
- **กระดาษสรุป** หลังหยุดอ่าน — ปล่อยว่างได้ บันทึกแค่ตำแหน่งก็พอ
- **Recovery card 3 ระดับ** ตามเวลาที่หายไป: < 7 วัน / 7–30 วัน / > 30 วัน
- **วางกลับกอง** — ปุ่มเดียว ไม่มี confirm บันทึกยังอยู่ครบ
- **พิธีปิด** ตอนขึ้นชั้น — คู่กับ intent เป็น arc ของเล่ม
- **ปักขึ้นบอร์ด** — เปลี่ยน session note เป็นการ์ด idea (รอ Phase 3 มาแสดงผล)
- Export / Import JSON, ลบเล่ม
- Session ค้างอยู่แม้ปิดแท็บ (localStorage) — เปิดมาใหม่กลับเข้าหน้าอ่านเอง

## ที่ยังไม่มีโดยตั้งใจ

ไม่มี streak · ไม่มี notification · ไม่มี badge · ไม่มีปุ่ม "ปล่อยไป"
เหตุผลอยู่ใน ARCHITECTURE.md §0 — ห้องนี้ต้องซื่อสัตย์เท่าห้องจริง

## Done-when ของ Phase นี้

ก่อนขึ้น Phase 2 (3D) ต้องผ่านทั้งสามข้อ:

1. อ่านจริงอย่างน้อย 1 เล่ม ครบ 5 session
2. **วางกลับกองอย่างน้อย 1 เล่มแล้วไม่รู้สึกแย่**
3. Recovery card ช่วยให้กลับเข้าเรื่องได้จริง ไม่ใช่แค่สวย

ถ้าข้อ 3 ไม่ผ่าน — 3D ช่วยไม่ได้ ต้องกลับมาแก้ตรงนี้ก่อน
