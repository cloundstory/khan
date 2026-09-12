# คั่น — Phase 1 asset workshop

## หลักการ

ภาพ `public/concept/home-v5.png` เป็น master reference สำหรับสไตล์และองค์ประกอบ ไม่ใช่ runtime background เราจะเพิ่มความลึกตาม `PERSPECTIVE_LAYOUT_SPEC.md` สร้างทุกชิ้นใหม่บนพื้นหลังโปร่งใส แล้วประกอบด้วย React/CSS/SVG

ทำ **ทีละ asset** ด้วย built-in ImageGen หนึ่ง call ต่อหนึ่งชิ้น เก็บเฉพาะตัวเลือกที่ผ่านเกณฑ์เป็นไฟล์ versioned ห้ามเขียนทับงานที่อนุมัติแล้ว

## โครง layer

เรียงจากหลังมาหน้า:

1. `room-shell` — ผนัง พื้น บัว และ paper texture
2. `window-sky` — วาดด้วย SVG/CSS ตามเวลาจริง
3. `window-frame` — กรอบโปร่งใสวางทับ sky
4. `room-light` — color wash และเงาตามเวลา
5. `rug`
6. `bookcase-back`
7. หนังสือสถานะ `shelf` จากข้อมูลจริง
8. `bookcase-front` — ขอบเสาและปากชั้นสำหรับบังขอบหนังสือ
9. `pile-underlay`
10. หนังสือสถานะ `pile` จากข้อมูลจริง
11. เก้าอี้ โต๊ะ โคม ต้นไม้ แมว และของประกอบ
12. lamp glow, clock hands, board thread และ interaction feedback ที่วาดด้วยโค้ด

โครงนี้ทำให้หนังสือดูอยู่ “ในชั้น” แทนการแปะทับภาพ และทำให้หน้าต่างกับโคมตอบสนองได้โดยไม่ต้องเปลี่ยนภาพห้องทั้งใบ

## Asset contract

ทุกชิ้นต้องรักษาข้อตกลงเดียวกัน:

- สไตล์: ภาพหนังสือเด็กยุโรปแบบวาดมือ เส้นหมึกไม่สม่ำเสมอเล็กน้อย สีเขียวหม่น น้ำตาลไม้ กรมท่า และดินเผาบนกระดาษครีม
- มุมมอง: shallow three-quarter ตาม camera lock ใน `PERSPECTIVE_LAYOUT_SPEC.md`; หลีกเลี่ยง perspective และ wide-angle distortion ที่รุนแรง
- แสงในภาพ: diffuse และเป็นกลาง ไม่มีแสงกลางวัน/กลางคืน baked ลง asset
- เงา: ไม่มี cast shadow ยกเว้น asset ที่ระบุว่าเป็น shadow-only
- พื้นหลัง: alpha โปร่งใสจริง ไม่มีสี่เหลี่ยมสีครีมหรือ halo สีขาว
- ขอบ: crop ชิดวัตถุโดยเหลือ safe margin 4–8px
- ความละเอียด source: PNG อย่างน้อย 2 เท่าของขนาดแสดงจริง
- runtime: WebP พร้อม alpha; เก็บ PNG source แยกไว้
- ห้ามมีข้อความอ่านได้ โลโก้ ลายน้ำ หนังสือปลอม หรือวัตถุที่ไม่ได้ระบุ
- anchor เริ่มต้นเป็น `bottom-center`; ของแขวนใช้ `top-center`; นาฬิกาและ board ใช้ `center`

## ลำดับสร้างทีละชิ้น

### Gate A — ล็อกโครงและสเกล

1. `room-shell-desktop` — ผนังและพื้นห้องเปล่า ไม่มีเฟอร์นิเจอร์
2. `rug` — พรมวงรีกำหนดพื้นที่กิจกรรมกลางห้อง
3. `bookcase-back` — ตู้หนังสือเปล่า 6 ชั้น มีด้านในและผนังหลังชั้น
4. `bookcase-front` — เสา ขอบ และปากชั้นที่ประกบกับ back ได้พอดี
5. `pile-underlay` — contact shadow และกระดาษหลวมเล็กน้อย ไม่มีหนังสือ

ผ่าน Gate A เมื่อวางห้าชิ้นเข้าด้วยกันแล้วได้สัดส่วนห้องและมีพื้นที่ว่างสำหรับกอง/ชั้นจริงโดยไม่มีรอยต่อเด่น

### Gate B — จุดประกอบพิธีการอ่าน

6. `chair`
7. `side-table`
8. `lamp-body`
9. `lamp-cord`
10. `window-frame`
11. `window-curtain`
12. `clock-face`
13. `board-base`

ผ่าน Gate B เมื่อ hotspot ของเก้าอี้ โต๊ะ โคม หน้าต่าง นาฬิกา และ board ไม่ทับกัน และสามารถวาง code layer ใต้/เหนือ asset ได้ตามลำดับ

### Gate C — ชิ้นที่มีชีวิต

14. `plant-bookcase-left`
15. `plant-bookcase-right`
16. `plant-floor`
17. `plant-window`
18. `cat-body`
19. `cat-tail`

ผ่าน Gate C เมื่อใบไม้และหางมี pivot ชัด ขยับเล็กน้อยโดยไม่เกิดช่องว่างหรือขอบฉีก

### Gate D — ระบบหนังสือและ board

20. `book-flat-a`
21. `book-flat-b`
22. `book-spine-a`
23. `book-spine-b`
24. `board-note-a`
25. `board-note-b`
26. `board-note-c`

book assets เป็นโครงหมึก/หน้า/สันที่ code tint และวางปกจริงทับได้ ไม่มีชื่อหรือสีเฉพาะเล่ม ส่วนหมุดกับด้ายแดงวาดด้วย SVG เพื่อผูกกับข้อมูล evidence จริง

### Gate E — Mobile shell

27. `room-shell-mobile`

ใช้ asset ชิ้นเดิมจาก Gate A–D แต่มี manifest ตำแหน่งสำหรับ mobile แยก ห้ามย่อ desktop composition ทั้งห้องลงจอแนวตั้ง

## ชิ้นที่โค้ดสร้าง ไม่ใช้ ImageGen

- เข็มนาฬิกาและจุดบอกเวลา
- ท้องฟ้า ดวงอาทิตย์ ดวงจันทร์ ดาวและเมฆในหน้าต่าง
- lamp glow และ room color wash
- หนังสือจริง ปกจริง และจำนวนหนังสือ
- ด้ายแดงและหมุดที่สัมพันธ์กับ evidence จริง
- hit area, focus ring, tooltip และ UI text
- contact shadow ของหนังสือ 3D ที่กำลังหยิบ

## ขนาดแสดงจริงโดยประมาณบน desktop

| Asset | ขนาดโดยประมาณ |
| --- | --- |
| room shell | `1536×1024` หรืออัตราส่วน `3:2` |
| rug | `1080×300px` |
| bookcase back/front | `480×610px` |
| pile underlay | `300×100px` |
| chair | `430×430px` |
| side table | `170×260px` |
| lamp body | `170×520px` |
| window frame | `230×330px` |
| clock face | `120×120px` |
| board base | `390×270px` |
| cat body | `250×120px` |

ขนาดนี้เป็น target สำหรับ composition 1536×1024 และต้องปรับจากการประกอบจริง ไม่ใช้เป็นขนาด export source

## QA ของทุก asset

ก่อนรับ asset เข้า set ให้ตรวจ:

1. silhouette และส่วนสำคัญไม่ขาด
2. line weight, texture และ palette เข้ากับ asset ที่อนุมัติก่อนหน้า
3. perspective และสเกลเข้ากับ room assembly
4. alpha edge สะอาดเมื่อวางบนครีม น้ำเงินเทา และพื้นมืด
5. ไม่มีเงาหรือแสงที่ขัดกับระบบกลางวัน/กลางคืน
6. anchor/pivot ตรงและบันทึกใน manifest
7. ขนาด WebP อยู่ใน budget และไม่เสียรายละเอียดเส้น
8. ตรวจที่ 390px และ desktop ก่อนผ่านไปชิ้นถัดไป

## ที่เก็บไฟล์

```text
design/assets/v4/source/      PNG ที่ผ่านการเลือก
design/assets/v4/review/      contact sheet หรือภาพประกอบตรวจ
public/set/v4/                WebP runtime
src/scene/assetManifest.ts    ตำแหน่ง ขนาด anchor pivot z-index และ hit area
```

## จุดเริ่มต้น

เริ่มที่ wireframe perspective ตาม `PERSPECTIVE_LAYOUT_SPEC.md` แล้วจึงสร้าง `room-shell-desktop` เพราะเป็นตัวล็อกมุมมอง เส้นผนัง/พื้น และพื้นที่ว่างทั้งหมด จากนั้นทำ `rug`, `bookcase-back`, `bookcase-front` และ `pile-underlay` ตามลำดับ หากห้าชิ้นนี้ประกอบไม่ผ่าน จะยังไม่ผลิตเฟอร์นิเจอร์หรือชิ้น animation ต่อ

## Progress

| ลำดับ | Asset | สถานะ | ไฟล์ |
| --- | --- | --- | --- |
| Layout | perspective wireframe | candidate v1 | `design/assets/v4/review/perspective-wireframe-v1.png` |
| 1 | room-shell-desktop | candidate v2 · handmade pass | `design/assets/v4/source/room-shell-desktop-v2.png` → `public/set/v4/room-shell-desktop-v2.webp` |
| 2 | rug | candidate v2 · handmade pass | `design/assets/v4/source/rug-v2.png` → `public/set/v4/rug-v2.webp` |
| 3 | bookcase master | candidate v6 · handmade pass | `design/assets/v4/source/bookcase-master-v6.png` |
| 3a | bookcase-back | candidate v3 | `design/assets/v4/source/bookcase-back-v3.png` → `public/set/v4/bookcase-back-v3.webp` |
| 4 | bookcase-front | candidate v3 | `design/assets/v4/source/bookcase-front-v3.png` → `public/set/v4/bookcase-front-v3.webp` |
| 5 | pile-underlay | candidate v1 | `design/assets/v4/source/pile-underlay-v1.svg` → `public/set/v4/pile-underlay-v1.svg` |

ชุด v1 ถูกเก็บไว้เป็น comparison และถูกแทนใน Asset Lab ด้วย handmade pass v2/v3 ตาม `ASSET_PROMPT_SCOPE_V2.md` ชุดใหม่ยังไม่ผูกเข้า production Home จนกว่าจะผ่าน visual review ของ Gate A

## Layout lock หลัง visual review

- ตู้หนังสืออยู่ชิดผนังฝั่งซ้าย วางบน floor line และอยู่นอกขอบพรม เพื่อเหลือพื้นที่กึ่งกลางสำหรับโซฟา โคมไฟ และโต๊ะตั้งหนังสือ
- กองหนังสืออยู่ติดด้านขวาของตู้ เป็นกองแนวนอนที่วางบนพื้นก่อนถึงพรม หนังสือแต่ละเล่มมีสัน ปก ขอบกระดาษ และความหนาต่างกัน
- พรมอยู่ช่วงหน้ากลางห้อง ทำหน้าที่กำหนดพื้นที่นั่งอ่าน แต่ไม่ลอดใต้ตู้หรือเฟอร์นิเจอร์หลัก
- ฝั่งขวาของห้องสงวนให้หน้าต่าง ม่าน ใบไม้ และระบบกลางวัน/กลางคืน เพื่อให้ animation ของลมและแสงมีพื้นที่หายใจ
- ตำแหน่งจริงเก็บใน `src/scene/assetManifest.ts`; guide zones ใน `?asset-lab` ใช้ตรวจพื้นที่ซ้าย/กลาง/ขวาก่อนสร้าง asset ชิ้นถัดไป

## Shelf slot contract

แต่ละแถวมีความจุเชิงตรรกะ 15 ช่อง หนังสือจริงกินพื้นที่ตามความหนาและแสดงสันออกด้านหน้า ส่วนของตกแต่งต้องเป็น asset แยกและจองช่องต่อเนื่อง ห้าม bake รวมกับภาพตู้

- แถว 1: หนังสือเต็ม 15 ช่อง
- แถว 2: หนังสือ 7 ช่อง + ลูกโลก 3 ช่อง + หนังสือ 5 ช่อง
- แถว 3: หนังสือเต็ม 15 ช่อง
- แถว 4: ต้นไม้เล็ก 3 ช่อง + หนังสือ 12 ช่อง
- แถว 5: หนังสือเต็ม 15 ช่อง
- แถว 6: หนังสือ 12 ช่อง + โมเดลเล็ก 3 ช่อง

ใน Asset Lab ตอนนี้ใช้ `Book` ตัวอย่างเพื่อทดสอบ layout และใช้ปกจริงของ record นั้นเป็น texture บนสัน ส่วนการเชื่อมข้อมูล production/IndexedDB จะทำหลัง Gate A ผ่านการอนุมัติ

ไฟล์ ImageGen ของพรมส่งออกมาเป็น RGB พร้อม checkerboard ที่ถูกวาดติดมา จึงใช้ `tools/extract_checkerboard_alpha.py` แยก silhouette และตรวจขอบบนพื้นสว่าง/มืดที่ `design/assets/v4/review/rug-v1-alpha-check.png` ก่อน export เป็น WebP alpha จริง

ตู้ใช้ master เดียวกันเพื่อให้ `bookcase-back` และ `bookcase-front` ตรงกันทุกพิกเซล จากนั้นใช้ `tools/split_bookcase_master.py --preset v2` แยกเสา ขอบบน และปากชั้นเป็น front overlay ผลทดสอบสันหนังสือจำลองอยู่ที่ `design/assets/v4/review/bookcase-layer-test-v3.jpg` และ baseline สำหรับหนังสือจริงทั้ง 6 แถวอยู่ใน `src/scene/assetManifest.ts`

`pile-underlay-v1.svg` วาดเป็น SVG แทน raster เพราะต้องคุมความทึบและความเบาของเส้นดินสอให้ไม่แข่งกับปกจริง หน้า review ที่ `?asset-lab` ประกอบ Gate A ตามพิกัดใน manifest และเปิด/ปิดปกจริงกับเส้น guide ได้

กองหนังสือใน Asset Lab เป็น CSS 2.5D prototype จำนวน 6 เล่ม วางซ้อนจากค่าความหนาของ `bookShape` และแสดง cover/spine/page block แยกกัน เพื่อยืนยันรูปทรงก่อนผูก animation หยิบหนังสือและ 3D overlay
