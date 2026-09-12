# คั่น — Interactive room roadmap v4

วันที่ 10 กันยายน 2026

## เป้าหมาย

ทำให้หน้า Home เป็นห้องอ่านหนังสือที่วาดมือและมีชีวิตตามเวลาจริง โดย interaction ทุกชิ้นต้องเชื่อมกับการอ่าน: เวลาบนผนังตรงกับเครื่องผู้ใช้, แสงจากหน้าต่างเปลี่ยนตามช่วงวัน, โคมไฟเปิด–ปิดได้, หนังสือจริงเดินทางระหว่างกอง โต๊ะ และชั้น และหยิบขึ้นมาดูแบบ 3D ได้โดยยังรักษาภาพรวม 2D

ใช้ทั้งหมด **6 เฟสจากจุดปัจจุบัน** ภาพ concept art ถือว่าล็อกพอสำหรับเริ่ม production แล้ว

## เฟส 1 — Asset workshop และ room assembly

`home-v5.png` เป็น master reference เท่านั้น ไม่ใช้เป็นภาพฉาก production แบบแบนทั้งภาพ เราจะสร้าง asset ใหม่ทั้งชุดทีละชิ้น ตรวจแต่ละชิ้น แล้วประกอบในโค้ด

- เริ่มจากฉากเปล่า: ผนัง พื้น บัวผนัง และ paper texture
- ล็อก shallow three-quarter perspective ตาม `PERSPECTIVE_LAYOUT_SPEC.md` ก่อนผลิต asset ชิ้นแรก
- สร้างพรม ชั้นหนังสือเปล่า และพื้นที่รองรับกองหนังสือก่อน เพราะสามชิ้นนี้กำหนดสเกลและตำแหน่งหนังสือจริง
- แยกชั้นหนังสือเป็น back/frame และ front trim เพื่อให้หนังสือจากข้อมูลจริงถูกประกบอยู่ภายในชั้น
- แยกพื้นที่กองเป็น underlay/contact shadow แล้วให้โค้ดวางหนังสือจริงเหนือชิ้นนี้
- ทำเก้าอี้ โต๊ะข้าง โคมไฟ หน้าต่าง นาฬิกา และ evidence board เป็นคนละ asset
- หน้าต่างมี frame แยกจาก sky layer; นาฬิกามี face แยกจากเข็ม; โคมมีตัวโคมแยกจาก glow
- board แยก base, กระดาษ และด้ายแดง เพื่อรองรับข้อมูลจริงและ animation
- ต้นไม้และแมวแยกเฉพาะส่วนที่จะขยับ เช่น ใบ หาง หรือลำตัว
- ทุกชิ้นใช้ PNG โปร่งใสเป็น source และ export WebP สำหรับ runtime
- ใช้ manifest กำหนดตำแหน่ง ขนาด anchor, pivot, z-index และ hit area
- ทำ desktop composition ให้ผ่านก่อน แล้วค่อยสร้าง mobile room shell และตำแหน่งชุดที่สองโดยใช้ asset ร่วมกัน

ลำดับผลิตและเกณฑ์ตรวจแต่ละชิ้นอยู่ใน `ASSET_WORKSHOP_PHASE_1.md` ต้องผ่าน style, alpha edge, perspective, scale และ assembly test ก่อนเริ่มชิ้นถัดไป

เสร็จเมื่อ: สามารถประกอบห้องให้ใกล้ `home-v5.png` จาก asset แยกทั้งหมด โดยซ่อน/สลับแต่ละชิ้นได้ และพื้นที่ชั้น กอง หน้าต่าง นาฬิกา โคมและ board พร้อมรับ code layer

เครื่องมือ: built-in ImageGen ทีละ asset, image inspection, PNG/WebP optimization, React, TypeScript, CSS/SVG และ asset manifest

## เฟส 2 — Real time, window และ lamp

สร้างระบบเวลาเดียว แล้วให้หน้าต่าง แสงห้อง นาฬิกา และโคมไฟอ่านค่าจากระบบนี้

### นาฬิกา

- ใช้เวลาท้องถิ่นจาก `Date`
- วาดเข็มชั่วโมง นาที และวินาทีด้วย SVG เหนือหน้าปัดที่ไม่มีเข็ม
- เข็มวินาทีเดินแบบ step ทุกหนึ่งวินาทีเพื่อคงความรู้สึกของนาฬิกาจริง
- จับเวลาให้ตรงต้นวินาที และ sync ใหม่เมื่อกลับมาเปิดแท็บ
- หยุด timer เมื่อ document ถูกซ่อน เพื่อลดแบตเตอรี่
- ไม่ rerender ห้องทั้งฉากทุกวินาที; อัปเดต transform ของเข็มหรือ CSS variables เฉพาะส่วน

### ช่วงเวลาของห้อง

เริ่มด้วยช่วงเวลาคงที่ตามเวลาท้องถิ่น ไม่ขอ location และไม่ต้องเรียก API ภายนอก

| ช่วง | เวลาเริ่มต้น | หน้าต่าง | แสงห้อง |
| --- | --- | --- | --- |
| รุ่งเช้า | 05:30–07:00 | ฟ้าเทาอ่อนกับขอบสีพีช | เย็นและค่อย ๆ อุ่นขึ้น |
| กลางวัน | 07:00–16:30 | ฟ้าอ่อนบนกระดาษ มีเมฆช้ามาก | สว่าง นุ่ม สีเป็นกลาง |
| เย็น | 16:30–18:15 | ส้มหม่นตรงขอบฟ้า | เงายาวและทองอ่อน |
| กลางคืน | 18:15–05:30 | น้ำเงินหม่น พระจันทร์ และดาวไม่กี่ดวง | ลดความสว่างและเพิ่มน้ำเงินเทา |

หน้าต่างใช้ SVG ที่ clip อยู่ภายในช่องกระจกของภาพ `home-v5.png` สีท้องฟ้า ดวงอาทิตย์/ดวงจันทร์ และเมฆเป็น code layer ทั้งหมด จึงปรับเวลาได้โดยไม่ต้องสร้าง room plate สี่ภาพ

ค่า `roomPhase` อัปเดตทุกหนึ่งนาที ส่วนตำแหน่งดวงอาทิตย์ เงาบนพรม และอุณหภูมิสีคำนวณจากนาทีของวัน ไม่ใช้ animation loop ต่อเนื่อง

### โคมไฟ

- แตะโป๊ะหรือเชือกเพื่อเปิด–ปิด
- เมื่อเปิด: โป๊ะสว่างขึ้น, มี radial glow โปร่งใส, พื้นกับเก้าอี้รับแสงอุ่นเล็กน้อย และเชือกแกว่งครั้งเดียวประมาณ `220ms`
- เมื่อปิด: glow จางลงประมาณ `350ms` แต่ไม่ทำให้ทั้งห้องมืดทันที
- ค่าเริ่มต้นครั้งแรก: เปิดอัตโนมัติในช่วงกลางคืนและปิดในช่วงกลางวัน
- หลังผู้ใช้สั่งเอง ให้จำค่าบนอุปกรณ์และเคารพการเลือกนั้น
- ใน Settings มีคำสั่ง “ให้โคมไฟเปิดตามเวลา” เพื่อกลับสู่ auto mode

เสร็จเมื่อ: เปลี่ยนเวลาจำลองใน test แล้วเข็ม หน้าต่าง แสงห้อง และค่าเริ่มต้นของโคมเปลี่ยนถูกต้อง; ผู้ใช้เปิด–ปิดโคมได้ด้วย pointer และ keyboard

เครื่องมือ: React hooks, native `Date`, SVG, CSS custom properties/gradients, local persistence, Vitest

## เฟส 3 — หนังสือจริงและการหยิบดูแบบ 3D

- เปลี่ยนกอง โต๊ะ และชั้นให้วาดจาก `Book[]` และใช้ `Book.id` จริงทุกเล่ม
- ปกจริงอยู่บนเล่มที่หยิบดู ส่วนสันหนังสือดึงโทนสีจากปก
- เพิ่มเล่มแล้วเล่มใหม่เลื่อนลงบนกองและกระดอนเบา ๆ หนึ่งครั้ง
- ย้ายไปอ่านแล้วเล่มเดินจากกองไปโต๊ะ
- อ่านจบแล้วเล่มเดินขึ้นชั้น ก่อนข้อมูล refresh จาก Dexie
- ใช้ motion reference ใน `BOOK_PICKUP_MOTION_REFERENCE.md`: เล่มเริ่มจาก hotspot, เคลื่อนเป็น arc เข้ากลางภาพราว `900ms`, ขยายและหมุนเข้ามุมสามส่วนสี่
- หลังถึงกลางจอจึงเปิด drag-to-rotate; ปิดแล้ว animate กลับ anchor เดิมก่อน unmount
- โหลด React Three Fiber เฉพาะเมื่อเลือกเล่ม

เสร็จเมื่อ: หนังสือหนึ่ง `Book.id` เดินทางครบกอง → โต๊ะ → ชั้น และหยิบดู/วางคืนจากตำแหน่งจริงได้โดยไม่สร้างข้อมูลสำเนา

เครื่องมือ: React Three Fiber/Three.js เฉพาะ viewer, React DOM hotspots, Dexie, Zustand, cover texture pipeline, Vitest

## เฟส 4 — Reading ritual และ evidence board

- แตะเก้าอี้หรือโต๊ะเพื่อเริ่ม/กลับสู่ session ของหนังสือที่กำลังอ่าน
- timer, pause/resume และ closing flow ใช้ข้อมูลเดิมที่มีอยู่
- เมื่อเพิ่ม evidence card ให้กระดาษใบใหม่ปรากฏบน board และด้ายแดงวาดตามเส้นครั้งเดียว
- แตะ board เปิดรายละเอียดแบบ drawer/panel โดยหยุด input ของฉากข้างหลัง
- จบ session แล้วให้ห้องตอบสนองสั้น ๆ เช่น แสงโคมอุ่นขึ้นหรือกระดาษบน board ขยับ ไม่เพิ่ม confetti หรือ streak

เสร็จเมื่อ: เพิ่มหนังสือ → หยิบอ่าน → เริ่ม timer → จดเบาะแส → ปิด session → อ่านต่อได้ใน flow เดียว

เครื่องมือ: React, Dexie/Zustand, SVG thread paths, CSS transitions, existing Board/Session components

## เฟส 5 — Ambient life และ interaction polish

เพิ่มเฉพาะ motion ที่ทำให้ห้องรู้สึกมีชีวิต โดยการเคลื่อนไหวถาวรพร้อมกันไม่เกินสองอย่างนอกจากเข็มนาฬิกา

ลำดับความสำคัญ:

1. แมวหายใจช้า ๆ และสะบัดหางเป็นครั้งคราว ไม่วนถี่
2. ใบไม้ใกล้หน้าต่างไหวเบามาก ความแรงต่างกันตามช่วงวัน
3. เงาหน้าต่างเคลื่อนบนพรมตามเวลาจริง โดยอัปเดตเป็นช่วง ไม่ใช้เฟรมต่อเฟรม
4. หนังสือบนกอง settle สั้น ๆ เมื่อเพิ่มหรือเปลี่ยนสถานะ
5. กระดาษ board ยกมุมเล็กน้อยเมื่อมีบัตรใหม่
6. ฝุ่นในลำแสงโคม เฉพาะตอนกลางคืนและโคมเปิด จำนวนอนุภาคน้อย

เสียงเป็น optional และปิดไว้ก่อน: เสียงสวิตช์โคม, กระดาษ, วางหนังสือ และ tick เบามาก เปิดได้หลัง user gesture เท่านั้น

ทุก motion ต้องรองรับ `prefers-reduced-motion`, หยุดเมื่อแท็บไม่แสดง และไม่ทำให้ปุ่มหรือข้อความเคลื่อนตาม

เสร็จเมื่อ: ห้องดูมีชีวิตเมื่อเฝ้ามอง แต่ไม่มี animation ใดแย่งสมาธิจากหนังสือหรือ timer

เครื่องมือ: CSS keyframes, SVG transforms, requestAnimationFrame เฉพาะ interaction, sprite pipeline เฉพาะกรณีแมวต้องใช้หลายเฟรม

## เฟส 6 — Mobile, PWA, accessibility และ release QA

- ตรวจฉากที่ประมาณ 390px และ desktop หลายอัตราส่วน
- ทดสอบเวลาใกล้จุดเปลี่ยน phase, timezone และกลับจาก sleep
- ทดสอบ lamp auto/manual และ persistence
- ทดสอบห้องว่าง, หนังสือ 1, 6, 36 และจำนวนมาก
- ตรวจ cover loading/offline fallback และ 3D lazy loading
- ตรวจ Escape, keyboard focus, touch target 44–48px และ screen reader labels
- ตรวจ reduced motion, hidden-tab behavior, battery/CPU และ WebGL fallback
- ทำ screenshot baseline สำหรับรุ่งเช้า กลางวัน เย็น กลางคืน lamp on/off และ mobile

เสร็จเมื่อ: flow หลักทำงาน offline, เวลา sync ถูกหลังกลับเข้าแอป, ภาพไม่ล้นมือถือ และห้อง idle ใช้ CPU ต่ำ

เครื่องมือ: Vitest, browser playtest, responsive screenshots, Lighthouse/DevTools, Vite PWA/Workbox

## โครงสร้าง state ที่แนะนำ

```ts
type RoomPhase = 'dawn' | 'day' | 'golden' | 'night';
type LampMode = 'auto' | 'on' | 'off';

type RoomEnvironment = {
  now: Date;
  phase: RoomPhase;
  dayProgress: number;
  lampMode: LampMode;
  lampOn: boolean;
  motionAllowed: boolean;
  pageVisible: boolean;
};
```

`RoomEnvironment` เป็น state เชิงความหมาย ส่วน renderer แปลงมันเป็นสี opacity ตำแหน่งเข็ม และ animation เท่านั้น เวลาและสถานะหนังสือห้ามเก็บอยู่ใน SVG หรือ Three object

## Tool stack

| เครื่องมือ | ใช้กับงาน |
| --- | --- |
| React + TypeScript | state, components, accessibility และ interaction orchestration |
| CSS + SVG | นาฬิกา หน้าต่าง แสงโคม เงา และ ambient motion |
| React Three Fiber + Three.js | หนังสือ 3D ที่เลือกเพียงเล่มเดียว |
| Dexie + Zustand | หนังสือ session evidence และ state ที่ต้องบันทึก |
| ImageGen | room plate และ cutout asset ที่ต้องรักษาสไตล์วาดมือ |
| Vitest | phase ตามเวลา, clock math, lamp mode และ book transitions |
| Browser playtest | ตรวจภาพจริง interaction, mobile และ regression screenshots |
| Vite PWA + Workbox | offline, caching และ lazy-loaded viewer |

ยังไม่ต้องใช้ Meshy หรือ Blender สำหรับเฟสเหล่านี้ หนังสือเป็น geometry เรียบง่ายที่สร้างด้วย Three.js ได้ และ room หลักเป็น 2D illustration หากภายหลังต้องการเปิดหน้ากระดาษจริง มีสันโค้ง หรือวัตถุ 3D อื่นในห้องจึงค่อยประเมิน Blender อีกครั้ง

## ลำดับตัดสินใจ

เริ่มเฟส 1 แล้วต่อเฟส 2 ทันที เพราะนาฬิกา หน้าต่าง และโคมไฟเป็นตัวพิสูจน์ว่า room plate แบบใหม่รองรับ interaction จริง จากนั้นทำเฟส 3 ซึ่งเป็นแกนสำคัญของผลิตภัณฑ์ ส่วน motion บรรยากาศในเฟส 5 ต้องเข้าหลัง flow หนังสือและการอ่านเสถียรแล้ว
