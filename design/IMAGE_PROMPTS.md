# คั่น — ชุด Prompt สร้างภาพประกอบ (ฉบับเกลาโดยคนเขียนโค้ด)

> เป้าหมาย: ได้ set pieces ลายเส้นหมึกสไตล์เดียวกันทั้งชุด **เป็นไฟล์ราสเตอร์โปร่งใส (PNG→WebP)**
> แล้ววางซ้อนในฉาก โดยของที่ "มีชีวิต" (กองหนังสือ, เข็มนาฬิกา, วงแสง, เชือกบอร์ด) **โค้ดวาดทับ**
>
> **เปลี่ยนจากฉบับแรก (สำคัญ):**
> - ❌ ไม่ trace เป็น SVG ทุกชิ้น → ✅ เก็บเป็น **PNG/WebP โปร่งใส** (เหตุผล §5)
> - ✅ พื้นหลังทุกชิ้น **โปร่งใส** ไม่เอาครีมติดมา
> - ✅ เพิ่ม **เล่มหนังสือ tile** ให้โค้ดซ้อนเป็นกอง (§2.11)
> - ✅ เพิ่ม **evidence board บนผนัง** (§3.0)
> - ✅ แอนิเมชัน = ขยับทั้งชิ้นด้วย CSS ไม่ต้องแยก group ในไฟล์

---

## 0. อ่านก่อนเริ่ม

**สไตล์:** อย่าใส่ชื่อนักวาดจริง — บรรยาย *เทคนิค* แทน (สม่ำเสมอกว่า + ไม่ลอกลายมือใคร)

**ความสม่ำเสมอ = โจทย์ที่ยากที่สุด:** ทุกชิ้นต้องเหมือนวาดด้วยปากกาด้ามเดียวกัน → ทำ **sprite sheet ล็อกสไตล์ก่อน** (§4) แล้วค่อยแยกชิ้น

**ความจริง (ประเมิน):** คาดว่าต้อง gen 3–8 รอบต่อชิ้น และทุกชิ้นต้องลบพื้นหลัง + crop หลัง gen — ไม่มีทางได้ไฟล์พร้อมใช้ตรงจากเครื่อง

**สิ่งที่โค้ดวาดเอง — ห้าม gen:** เข็มนาฬิกา · กองหนังสือ (ซ้อนจาก tile §2.11) · วงแสงโคม (SVG gradient) · เชือกบนบอร์ด (Verlet)

---

## 1. STYLE BLOCK — ก๊อปวางต้นทุก prompt

```
Black ink pen line drawing. Mid-20th-century European children's picture
book illustration technique. Confident single-weight contour lines with
slight wobble, lines slightly overshooting at corners. Shading built ONLY
from hand-stippled dots of varying density — no grey tones, no gradients,
no crosshatching, no washes. Flat orthographic view, no perspective
distortion, no vanishing point. Single isolated object, centred, on a plain
solid off-white background (easy to key out later). Cozy, quiet, handmade.
```

### NEGATIVE PROMPT
```
color, colored, watercolor, gradient, drop shadow, cast shadow on ground,
grey fill, crosshatching, 3d render, digital vector, glossy, photo,
photorealistic, text, letters, words, numbers, watermark, signature,
frame, border, multiple objects, background scene, room, floor, wall,
perspective, outline glow, anime, cartoon mascot, cute face, sparkles
```

### ค่าที่แนะนำ
- gen อัตราส่วน **1:1** ทุกชิ้น (วัตถุอยู่กลาง มีขอบว่างช่วยให้ AI จัดองค์ประกอบ)
- ความละเอียดสูงสุด (2048px+)
- ล็อก **seed เดียวกันทั้งชุด** ถ้าเครื่องมือมี
- **พื้นหลัง solid off-white** (อย่าให้มี texture/ลายกระดาษในรูป) — จะได้ key ออกเป็นโปร่งใสง่าย

### หลัง gen ทุกชิ้น (ทดแทน §5 เดิม)
1. **ลบพื้นหลังเป็นโปร่งใส** (remove.bg / เครื่องมือ key สีขาว)
2. **crop ชิดวัตถุ** ไม่เหลือขอบว่าง (โค้ดจัดตำแหน่งเอง)
3. export **PNG โปร่งใส @2x** ของขนาดแสดงจริง (ตาราง §2 บอกขนาด) แล้วบีบเป็น **WebP**
4. เก็บลง `public/set/` (§6)

> ไม่มี potrace ไม่มี SVG trace — เว้นแต่ชิ้นเส้นล้วนล้วน ๆ (ชั้น/พรม) ถ้าอยากได้ vector ค่อยว่ากัน

---

## 2. SET PIECES — ของในห้อง

ทุก prompt ต่อท้าย STYLE BLOCK · คอลัมน์ "แสดงจริง" คือขนาดโดยประมาณในฉาก (กว้าง×สูง px, viewBox 1000×720) — export @2x

| ไฟล์ | แสดงจริง | หมายเหตุ |
|---|---|---|
| chair.webp | 320×240 | ชิ้นตัดสินสไตล์ |
| lamp.webp | 120×340 | วงแสงทับด้วยโค้ด |
| clock.webp | 96×96 | ไม่มีเข็ม |
| plant-hang-a/b.webp | 90×130 | #whole แกว่งด้วย CSS |
| plant-shelf.webp | 70×90 | |
| shelf.webp | 300×40 | ว่าง |
| rug.webp | 860×190 | ใต้ทุกอย่าง |
| cat.webp | 150×70 | #whole หายใจด้วย CSS |
| book-a…d.webp | 150×26 | tile ซ้อนเป็นกอง (§2.11) |
| board.webp | 220×160 | evidence board (§3.0) |

### 2.1 เก้าอี้นวม (สำคัญที่สุด — คือ "โต๊ะ" ของแอป)
```
A single empty overstuffed armchair, three-quarter front view, rounded
puffy arms and high back, short wooden legs, one loose seat cushion.
Nobody sitting in it. Stipple shading under the seat and along the inner
arm. Soft and well-used.
```
> **ต้องว่างเปล่า** — เก้าอี้ว่างคือ "ที่ของผู้ใช้"

### 2.2 โคมไฟตั้งพื้น
```
A single floor lamp: wide conical fabric shade with a gently scalloped
lower edge, thin straight pole, small round weighted base. Lamp is ON —
show only with a few short radiating ink ticks at the shade's rim, no glow,
no color. Stipple on the inside lower rim of the shade.
```
> วงแสงจริง = SVG gradient ในโค้ด · อย่าให้ AI วาดแสง

### 2.3 นาฬิกาแขวน — **ไม่มีเข็ม**
```
A single round wall clock, plain rim, blank face with no numbers and NO
HANDS. Small hanging loop at top. Light stipple along the bottom-right rim.
```
> เข็มวาดด้วยโค้ด (เดินตามเวลาจริง)

### 2.4 ต้นไม้แขวน (2 แบบ)
```
A single hanging planter: a small pot on three thin macramé cords meeting
at a hook above. Five to seven long drooping leaves spilling over the rim.
Cords as simple thin lines.
```
แบบสอง: `...a rounder pot with short upright spiky leaves fanning upward instead of trailing.`

### 2.5 ต้นไม้เล็กบนหิ้ง
```
A single small potted houseplant in a simple tapered pot, upright, four to
six broad leaves. Light stipple on the pot's lower half.
```

### 2.6 ชั้นหนังสือติดผนัง — ว่าง
```
A single empty wall-mounted shelf plank, straight and simple, seen
straight-on, with two small L-brackets underneath. Completely EMPTY.
```
> หนังสือบนชั้นวาดด้วยโค้ด (จากข้อมูลจริง)

### 2.7 พรม
```
A single oval rug seen from a low angle, lying flat. Texture entirely from
short parallel ink dashes in one direction, denser toward the edges. Plain
border line. No pattern, no motif.
```

### 2.8 แมว
```
A single cat curled asleep in a loaf, side view, eyes closed as two small
curved lines, ears folded slightly back, tail wrapped around the body.
Calm and still. Stipple under the belly and along the back.
```

### 2.11 เล่มหนังสือ tile (ใหม่ — สำหรับกอง) · gen 4 แบบ
```
A single closed book seen from the side (spine edge facing viewer), lying
flat and horizontal, showing the stacked pages as fine horizontal ink lines
along the front edge and a plain spine. Slightly imperfect rectangle.
Stipple shading only along the bottom edge.
```
> gen 4 เล่ม รูปทรงต่างกันนิด (หนา/บาง/ยาว/สั้น) · **โทนหมึกล้วน** — โค้ดจะ tint เป็นสีเล่มจริงด้วย CSS/blend ทีหลัง ถ้าอยากได้สีตรงข้อมูล · โค้ดซ้อน N เล่มตาม `pile.length`

---

## 3. EVIDENCE BOARD

### 3.0 บอร์ดบนผนัง (ใหม่ — ของตกแต่งในฉากโฮม) · **board.webp**
```
A single cork pinboard hanging on the wall, rectangular with a plain thin
frame, seen straight-on. On it: three or four small blank index cards
pinned at slight angles, and two thin taut threads running between pins.
Cards and cork drawn in the same ink line style, stipple shading only in
the corners. Blank cards, no writing.
```
> ในฉากโฮมเป็น**ของตกแต่ง + hotspot** (กดแล้วเปิดฟีเจอร์บอร์ด) · เชือกในรูปนี้วาดติดมาได้ (นิ่ง) — ต่างจากบอร์ดจริงในแอปที่เชือกเป็น physics
> จัดวาง: บนผนังเหนือเก้าอี้ ราว 220×160

### 3.1–3.8 ชิ้นส่วนบอร์ดจริง (หมุด/การ์ด/เทป/คลิป ฯลฯ)
> ชุดนี้ใช้ใน**ฟีเจอร์บอร์ด** ไม่ใช่ฉากโฮม — เก็บ prompt เดิมจากฉบับแรกไว้ได้ (ดี) แต่**ยังไม่เร่ง** ทำหลังฉากโฮมลงตัว
> ย้ำ: **เชือกในบอร์ดจริงวาดด้วยโค้ด (Verlet) ห้าม gen** · หมุด/การ์ด/เทป gen ได้ตามเดิม

*(prompt §3.1–3.8 เดิมยกมาทั้งหมดตอนถึงเฟสบอร์ด — ไม่ซ้ำที่นี่เพื่อไม่ให้ยาว)*

---

## 4. ทำให้ทุกชิ้นเข้าชุด — สำคัญสุด (คงไว้จากฉบับแรก)

**อย่า gen ทีละชิ้นตั้งแต่แรก:**

### ขั้น 1 — ล็อกสไตล์ด้วย sprite sheet
```
[STYLE BLOCK]

A single sheet showing six separate objects arranged in a grid on plain
off-white, all drawn by the same hand with the same pen in one sitting:
an empty armchair, a floor lamp, a round wall clock with no hands, a
hanging planter, a sleeping curled cat, and a side-view closed book.
Each object isolated with clear empty space around it. No connecting
scene, no background, no ground line.
```
gen จนได้แผ่นที่ชอบ → **แผ่นนี้คือมาตรฐานโปรเจกต์** (เก็บ `design/sprite-sheet.png`)

### ขั้น 2 — แยกชิ้นด้วย img2img
เอาแผ่นขั้น 1 เป็น reference (img2img strength ต่ำ ~0.35) แล้ว gen ทีละชิ้น (prompt §2–3) เติมท้าย:
```
Match the exact line weight, stipple density, and pen character of the
reference image.
```

### ขั้น 3 — เช็คก่อนใช้ (5 ข้อ)
1. เส้นหนาเท่าชิ้นอื่น 2. เงาเป็น**จุด**ไม่ใช่เทา 3. พื้นหลัง key ออกสะอาด ไม่มีเงาตกพื้น 4. ไม่มีตัวหนังสือ/ลายเซ็นหลุด 5. ไม่มีสี (ยกเว้นกระถางดินเผาถ้าตั้งใจ)

---

## 5. ทำไม raster ไม่ trace SVG (เหตุผลจากฝั่งโค้ด)

| | trace เป็น SVG | **เก็บ raster (เลือกอันนี้)** |
|---|---|---|
| stipple หลายพันจุด | กลายเป็นพาธเป็นพัน ไฟล์อ้วน สกปรก | เก็บครบ เบา (WebP ~30–80KB/ชิ้น) |
| ลายมือ/เนื้อหมึก | เพี้ยน/หายตอน threshold | **เป๊ะ** |
| clean up ต่อชิ้น | หนักมาก (ลบ noise, simplify) | แค่ลบพื้น+crop |
| เปลี่ยนสี | ได้ (แต่ชิ้นห้องเป็นหมึกล้วน ไม่ต้อง) | tint ด้วย CSS ถ้าจำเป็น (เล่มหนังสือ) |
| ขยับบางส่วน | แยก group ในไฟล์ได้ | **ขยับทั้งชิ้นด้วย CSS** (พอสำหรับ แกว่ง/หายใจ) |

**แอนิเมชันด้วย CSS ทั้งชิ้น** (ไม่ต้องแยก group):
- ต้นไม้แขวน → `transform: rotate` แกว่งเบา ๆ ที่จุดแขวน
- แมว → `transform: scaleY` หายใจช้า ๆ
- โคม → วงแสง (SVG) `opacity` หายใจ
- ทั้งหมดเคารพ `prefers-reduced-motion`

---

## 6. ที่เก็บไฟล์ (อัปเดต)

```
public/set/
  chair.webp  lamp.webp  clock.webp
  plant-hang-a.webp  plant-hang-b.webp  plant-shelf.webp
  shelf.webp  rug.webp  cat.webp
  book-a.webp book-b.webp book-c.webp book-d.webp   ← tile กอง
  board.webp                                        ← evidence board ผนัง
public/set/board/            ← เฟสบอร์ด (ทีหลัง)
  pin-front.webp card-1..4.webp tape.webp ...
public/
  bookmark.webp   ← ตัวเลือกทำ app icon
design/
  sprite-sheet.png   ← แผ่นมาตรฐาน
```

> ผมจะทำ **manifest ในโค้ด** (`src/scene/pieces.ts`) บอกตำแหน่ง/ขนาดแต่ละชิ้น พอมีไฟล์จริงใน `public/set/` โค้ดจะสลับจาก placeholder SVG → รูปให้อัตโนมัติ

---

## 7. ลำดับที่ควรทำ

ทำ 3 ชิ้นนี้ก่อน เอามาต่อ mockup ทดสอบว่าเข้ากับกอง/เข็มที่โค้ดวาด:
1. **เก้าอี้** — ตัดสินสไตล์ทั้งห้อง
2. **โคมไฟ** — ทดสอบวงแสง SVG ทับแล้วเข้ากันไหม
3. **เล่มหนังสือ tile 1 แบบ** — ทดสอบว่ากองที่ซ้อนจาก tile ดูดีไหม (แทน "หมุดหน้าตรง" เดิม — เพราะกองคือหัวใจของหน้าโฮม)

ผ่าน 3 ชิ้นนี้ = สไตล์ล็อก ที่เหลือทำซ้ำ
