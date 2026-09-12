# คั่น — Roadmap v3 หลังพัก 3D

> แผนปัจจุบันหลังล็อก concept art และนำ 3D book overlay กลับมาเฉพาะตอนเลือกเล่ม อยู่ที่ `ROADMAP_INTERACTIVE_ROOM_V4.md`

วันที่ 10 กันยายน 2026

## ข้อสรุป

ใช้ React + TypeScript + Vite + PWA + Dexie ต่อเหมือนเดิม แล้วเปลี่ยน visual runtime หลักจาก 3D เป็น 2D layered illustration ตาม `ART_DIRECTION_V3.md` และ reference ใน `art direction/`.

ระบบข้อมูลและ reading ritual เดิมยังใช้ต่อได้ เพราะไม่ได้ผูกกับโมเดล 3D:

- `src/db/schema.ts` มี `Book`, `Session`, `Card`, `Thread`, รูปปก และรูปการ์ด
- `src/store/useApp.ts` มี router, active session, pause/resume และ refresh
- `src/screens/AddBook.tsx` มีเพิ่มเล่มและ barcode/photo flow
- `src/screens/BookSheet.tsx` มีสถานะ pile/desk/shelf, recovery card, อ่านต่อ, วางกลับกอง, อ่านซ้ำ และอ่านจบ
- `src/screens/SessionScreen.tsx` มี stopwatch และเปิด board แบบ panel
- `src/screens/Capture.tsx`, `Closing.tsx`, `Board.tsx`, `Settings.tsx` มี flow ต่อเนื่องอยู่แล้ว
- `src/screens/Room.tsx` มีตัวอย่างการวาดหนังสือจาก `Book.id` จริงและเป็นฐานสำหรับ view แบบรายการ/ห้องสำรอง

สิ่งที่ยังเป็นภาพทดลองหรือขัดกับทิศทางใหม่:

- `src/screens/HomeScene.tsx` ยังวาดห้องด้วย SVG placeholder และกอง/ชั้นใช้รูปทรงแทนจำนวนจริงบางส่วน
- `src/scene/pieces.ts` เตรียมจุดสำหรับรูป `public/set/*.webp` แต่ยังไม่มีชุดภาพใหม่ครบ
- `src/design/ArtLab.tsx`, `Diorama.tsx`, `BookStudy.tsx`, `roomLayout.ts` และ `design/3d/` เป็น exploration branch ของ 3D ไม่ใช่ runtime หลัก
- `design/ART_DIRECTION.md` และ `ARCHITECTURE.md` ยังมีข้อความจากยุค 3D ต้องอ้างอิง v3 เป็นเอกสารหลักในการทำงานต่อ

## จำนวนเฟส

ใช้ 6 เฟส โดยแต่ละเฟสต้องเปิดแอปและใช้งาน flow ที่เกี่ยวข้องได้ก่อนขึ้นเฟสถัดไป

### เฟส 0 — ล็อกทิศทางและทำความสะอาดฐาน

สถานะ: เกือบเสร็จ

งาน:

- ยืนยัน `ART_DIRECTION_V3.md` เป็น source of truth
- แยก exploration 3D ออกจาก visual runtime โดยไม่ลบไฟล์ Blender/GLB
- ตรวจ Home route, browse route และ fallback ให้ใช้คำเรียกสถานะเดียวกัน
- แก้ accessibility เบื้องต้นของ hotspot ใน `HomeScene.tsx` ให้ Enter/Space ใช้ได้
- เพิ่ม asset manifest กลาง แทนการอ้างชื่อไฟล์กระจัดกระจาย

เส้นแบ่งที่สำคัญ: state อยู่ใน Dexie/Zustand, renderer อยู่ใน Home illustration, ปุ่มและข้อความอยู่ใน DOM/React

เสร็จเมื่อ: เปลี่ยน artwork ได้โดยไม่แตะฐานข้อมูลหรือ reading flow และมีรายชื่อ asset ที่ชัดเจน

### เฟส 1 — สร้างภาษาภาพ 2D และ Home shell

สถานะ: ยังไม่เริ่มจริง

งาน:

- ผลิตชุดภาพ desktop/mobile จาก reference: ผนัง พื้น พรม ชั้น เก้าอี้ โต๊ะ โคม แมว และต้นไม้
- แยกชิ้นที่ต้องขยับ เช่น หางแมว ใบไม้ glow ของโคม และกระดาษบน board
- ทำ palette, paper texture, ink texture และ line treatment ใน CSS/SVG/PNG ให้เป็นชุดเดียว
- เปลี่ยน `HomeScene.tsx` จาก placeholder-heavy SVG เป็น layered scene component
- ทำ layout desktop กับ mobile แยกกัน ไม่ย่อภาพ desktop ลงมา
- ให้ label, hit area, ปุ่มเพิ่ม และ navigation เป็น React/HTML จริง

เสร็จเมื่อ: ห้องว่างและห้องที่มีวัตถุตกแต่งอ่านเป็นภาพเดียวกับ reference ได้ โดยยังไม่มีหนังสือจริงก็ได้

### เฟส 2 — ผูกหนังสือจริงกับภาพ

สถานะ: logic มีบางส่วนแล้วใน `Room.tsx`, Home ยังต้องแก้

งาน:

- เปลี่ยน `buildPile(pile.length)` และ `shelfSpines(shelf.length)` ใน `HomeScene.tsx` ให้รับ `Book[]`
- ทุกเล่มที่เห็นต้องมี `key={book.id}` และกดเปิด `BookSheet` ของเล่มนั้นได้
- `pile` แสดงเฉพาะเล่มสถานะ `pile`, `desk` เฉพาะเล่มที่กำลังอ่าน, `shelf` เฉพาะเล่มที่อ่านจบ
- ใช้ปกจริงในเล่มที่เลือก/โต๊ะ และใช้สันสีจากปกจริงในกอง/ชั้น
- เมื่อเกินพื้นที่ฉาก ให้แสดงจำนวนรวมและเปิดรายการต่อได้ ไม่สร้างเล่มตกแต่งเพื่อเติมฉาก
- รองรับไม่มีปก, ปกโหลดช้า, รูปถ่ายเอง และ offline fallback
- ย้ายหนังสือแล้วต้องเห็นผลใน scene หลัง `refresh()` โดยไม่สร้าง state สำเนาที่ขัดกับ Dexie

เสร็จเมื่อ: เพิ่มหนังสือจริง 1 เล่มแล้วเห็นเล่มเดียวกันในกอง; ย้ายไป desk แล้วหายจากกอง; จบแล้วไป shelf; refresh แล้วยังถูกต้อง

### เฟส 3 — เชื่อม reading ritual ให้เป็นภาพเดียวกัน

สถานะ: ฟังก์ชันหลักมีแล้ว ต้องปรับภาพและจังหวะ

งาน:

- ปรับ `BookSheet`, `SessionScreen`, `Capture`, `Closing` ให้ใช้ paper/card/ink language เดียวกับ Home
- รักษา stopwatch, pause/resume และ active session ที่มีอยู่
- ให้ evidence board ใช้ texture กระดาษ เข็มหมุด และเส้นด้ายจาก art direction ใหม่
- ทำ recovery card ให้เด่นเมื่อกลับมาอ่าน โดยไม่เพิ่มระบบ streak หรือ notification
- สร้าง transition เชิงความหมาย: ลองเปิด, หยิบอ่าน, วางกลับกอง, อ่านจบขึ้นชั้น
- คงการเขียนข้อมูลผ่าน repository/DB ไม่ให้ animation เป็น source of truth

เสร็จเมื่อ: ผู้ใช้ทำ flow เพิ่ม → หยิบอ่าน → จด → กลับมาอ่าน → อ่านจบได้ โดยภาพและคำเรียกไม่หลุดจากโลกเดียวกัน

### เฟส 4 — Motion และ interaction polish

สถานะ: ยังไม่เริ่ม; prototype 3D ไม่ใช่ motion ที่จะใช้ต่อ

งาน:

- ใช้ CSS/SVG layer motion เป็นหลัก: แมวหายใจ, หางขยับ, ใบไม้ไหว, โคมค่อย ๆ สว่าง
- ทำ movement หนังสือสั้น ๆ ตอนเปลี่ยนสถานะ แล้วหยุด
- ใช้ parallax เบา ๆ ระหว่างผนัง พื้น และวัตถุหน้า หากไม่ทำให้หน้าหนัก
- เคารพ `prefers-reduced-motion`, หยุด animation เมื่อแท็บไม่แสดง และไม่ทำให้ text/button สั่น
- เพิ่ม focus ring, keyboard interaction และ label ที่สื่อสถานะเดียวกับภาพ

เสร็จเมื่อ: motion ช่วยให้ห้องมีชีวิตและพิธีกรรมชัดขึ้น แต่ไม่ดึงความสนใจออกจากการอ่านหรือทำให้มือถือช้า

### เฟส 5 — Mobile, PWA, performance และ release QA

สถานะ: PWA และ responsive บางส่วนมีแล้ว ต้องตรวจด้วยชุดภาพใหม่

งาน:

- ตรวจ mobile layout จริงที่ประมาณ 390px และจอ desktop หลายอัตราส่วน
- จำกัดขนาด asset และ lazy-load ฉาก/ภาพที่ไม่อยู่ในหน้าแรก
- ตรวจ service worker, offline shell, ปกที่แคชไม่ได้ และ installability
- ทดสอบ keyboard, screen reader labels, touch target 44–48px และ reduced motion
- ทดสอบห้องว่าง, 1, 6, 36 และจำนวนมาก; หนังสือไม่มีปก; ปกจริง; ข้อมูล refresh หลังย้ายสถานะ
- ทำ visual regression screenshot สำหรับ desktop/mobile ก่อนปล่อย
- เก็บ 3D branch แยกจาก production bundle หรือไม่ให้ถูก import ในหน้าหลัก

เสร็จเมื่อ: PWA เปิดได้ offline, flow หลักไม่เสีย, ภาพไม่ล้นมือถือ, และทุกเล่มที่เพิ่มเข้าถึงได้แม้ฉากรองรับการวาดพร้อมกันจำกัด

## ลำดับที่ควรทำจริงตอนนี้

เริ่มจากเฟส 0 ต่อด้วยเฟส 1 และ 2 เป็นชุดเดียว เพราะต้องเห็นภาพใหม่พร้อมหนังสือจริงถึงจะตัดสิน art ได้ จากนั้นค่อยเก็บเฟส 3–5 โดยไม่แตะ schema ใหม่ถ้ายังไม่มี requirement ใหม่

## Skills ที่ใช้

### ใช้แน่นอน

- `game-studio:web-game-foundations` — แยก state, renderer, input, asset manifest, save และ performance boundary
- `game-studio:game-ui-frontend` — วาง hierarchy ของ Home, DOM overlay, responsive UI, typography และ motion tone
- `imagegen` — สร้างหรือแก้ asset ภาพประกอบจาก reference เมื่อจำเป็น
- `game-studio:game-playtest` — ตรวจ browser flow, screenshot, mobile layout, interaction และ visual regressions

### ใช้เฉพาะเมื่อถึงงาน animation

- `game-studio:sprite-pipeline` — ใช้เมื่อแมวหรือวัตถุต้องเป็น frame strip ที่ต้องรักษา anchor และสัดส่วน หาก animation ทำด้วย CSS/SVG layer อย่างเดียวไม่ต้องใช้

### ยังไม่ต้องใช้ในทิศทางนี้

- `react-three-fiber-game`, `three-webgl-game`, `web-3d-asset-pipeline`, `build-3d-game-rooms`
- `meshy-3d-generation` และ Blender สำหรับ runtime หลัก

Meshy/Blender ยังเก็บไว้สำหรับอนาคตหรือ asset ทดลองได้ แต่ไม่ใช่ dependency ของเฟส 1–5 ชุดใหม่นี้ และยังไม่จำเป็นต้องติดตั้ง plugin เพิ่มครับ

## Definition of done ของ v3

แอปต้องรู้สึกเหมือนห้องอ่านหนังสือที่วาดมือ ไม่ใช่หน้าจอเกมหรือฉาก 3D ที่มี UI แปะอยู่ด้านบน ผู้ใช้เพิ่มหนังสือจริงแล้วเห็นหนังสือของตัวเองเดินทางผ่านกอง → มุมอ่าน → ชั้น พร้อม timer และ evidence board เดิม โดยภาพ responsive และ motion ยังคงภาษาเดียวกัน
