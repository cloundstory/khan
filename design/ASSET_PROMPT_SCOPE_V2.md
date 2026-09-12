# คั่น — Asset prompt scope v2

เอกสารนี้เป็น style lock สำหรับ asset ใหม่ทุกชิ้นในห้อง ห้ามใช้คำว่า “cozy illustration” เพียงอย่างเดียว เพราะกว้างเกินไปและทำให้แต่ละภาพมีลายเส้นคนละชุด

## Reference priority

1. `C:/Users/User/Downloads/2ae27d1c-547f-4fc6-bf08-b1e4e53c81b9.png` — น้ำหนักเส้น รอย hatch ผิวไม้ และความไม่สมมาตรของชั้น
2. `C:/Users/User/Downloads/cb4fc349-f3a9-47ad-a7ca-1011d05480f4.png` — การจัดเก็บหนังสือแบบเห็นสัน ความหนา และ palette ของห้อง
3. `C:/Users/User/Downloads/9a2d74f7-6e8b-44a8-96e6-bd23a796a3bf.png` — ความโปร่งบน mobile และสัดส่วนระหว่างห้องกับ navigation

## Line grammar ที่ต้องมีทุกชิ้น

- เส้นหมึก charcoal/sepia แบบ dry pen มีขาด มีสะดุด และน้ำหนักเปลี่ยนในเส้นเดียว
- contour หลักหนากว่าเส้น texture แต่ห้ามหนาเท่ากันรอบวัตถุ
- ใช้ broken cross-hatching, scratch marks และจุดหมึกเล็ก ๆ เพื่อบอกผิว
- แนวไม้และขอบวัตถุคลาดจากเส้นตรงเล็กน้อย แต่โครงยังใช้งานได้จริง
- ลายไม้ รอยสึก และจุดเข้มต้องไม่ mirror ซ้าย–ขวา และไม่ทำซ้ำเป็น pattern สม่ำเสมอ
- สีเป็น matte gouache บาง เห็นเนื้อกระดาษภายในสี ไม่มี gradient เงาแบบ 3D render
- palette หลัก: cream paper, charcoal, walnut, burnt orange, muted forest green, dusty navy, ochre
- จำกัดสีของ asset หนึ่งชิ้นไว้ประมาณ 3–5 สี และใช้ neutral diffuse light

## Controlled imperfection

- ความกว้างของเสา/ขอบต่างกันเล็กน้อยประมาณ 2–5%
- ระยะชั้นไม่ต้องเท่ากันทุกช่อง แต่ต่างได้ไม่เกิน 4%
- เส้นชั้นลอยขึ้นลงได้เล็กน้อยไม่เกิน 1% ของความกว้าง
- ขอบหรือมุมหนึ่งจุดอาจสึก/บิ่นเล็กน้อย
- ห้ามบิดจนหนังสือวางไม่ได้ ห้าม vertical เอียง และห้าม perspective แบบ wide-angle

## Perspective และตำแหน่ง

- ห้องใช้ shallow three-quarter perspective และพื้นเป็นตัวสร้างความลึก
- ตู้หนังสือเกือบหน้าตรง `0–2° yaw` เพื่อให้วางหนังสือแนวตั้งได้ง่าย
- ตู้ต้องมีเท้า/ฐานแตะ floor line มี contact shadow แยกต่างหาก ห้ามดูเหมือนแขวนผนัง
- shelf baseline ทุกชั้นต้องอ่านค่าได้และถูกบันทึกใน `src/scene/assetManifest.ts`
- จัด composition เป็นสามพื้นที่: ตู้และกองหนังสือฝั่งซ้าย, โซฟา/โคม/โต๊ะตั้งหนังสือตรงกลาง, หน้าต่างและ interaction แสง/ลมฝั่งขวา
- ตู้ กองหนังสือ และเฟอร์นิเจอร์หลักต้องจบก่อนขอบพรม ห้ามมี silhouette ลอดหรือทับพรมโดยไม่ตั้งใจ

## ระบบหนังสือจริง

### บนชั้น

- แสดงด้านสันแบบจัดเก็บ ไม่ใช่ปกหันออกเพื่อโชว์
- ความสูง ความกว้าง ความหนา และสีสัมพันธ์กับข้อมูลแต่ละเล่ม
- ส่วนใหญ่ตั้งตรง แทรกเอียงเล็กน้อยเป็นบางเล่ม และมีกองแนวนอนสั้นได้เฉพาะจุด
- ปากชั้นและเสาหน้าต้องวางทับหนังสือเพื่อให้รู้สึกอยู่ในตู้
- หนึ่งแถวแบ่งเป็น 15 logical slots; จุดตกแต่งใช้พื้นที่ 3 ช่องต่อเนื่องได้ เช่น `[หนังสือ 7][ลูกโลก 3][หนังสือ 5]`
- ลูกโลก ต้นไม้ และโมเดลเป็น asset โปร่งใสแยกชิ้น ห้าม generate ติดมากับ `bookcase-back` หรือ `bookcase-front`

### กองอยู่

- หนังสือซ้อนแนวนอนเป็นกองที่รับน้ำหนักได้ ไม่กระจายเป็นไพ่
- เห็นสัน ปก ขอบกระดาษ และความหนาของแต่ละเล่ม
- แต่ละชั้นเหลื่อมและหมุนเล็กน้อย โดยจุดศูนย์ถ่วงยังอยู่เหนือฐานกอง
- ใช้จำนวนและปกจาก `Book` records จริง

## Asset output contract

- isolated object; transparent RGBA หรือ code-native SVG
- ไม่มีห้อง พื้น แสงช่วงเวลา cast shadow ข้อความ หนังสือปลอม โลโก้ หรือลายน้ำ baked อยู่ใน asset
- crop ชิดโดยเหลือ safe margin 6–12px
- source PNG อย่างน้อย 2× display size; runtime WebP alpha
- ตรวจ alpha บนพื้น cream และ dark green ทุกครั้ง
- ใช้ชื่อ versioned และห้ามเขียนทับ candidate เก่า

## Mandatory negative prompt

`perfect bilateral symmetry, mirrored wood grain, repeated procedural texture, clean vector outline, uniform line weight, photorealistic material, polished 3D render, plastic surface, smooth airbrush gradient, dramatic studio light, wide-angle distortion, leaning verticals, warped shelves, fake books, readable text, logo, watermark, baked room background, cast shadow, checkerboard baked into pixels`

## Prompt template

เริ่ม prompt ทุกชิ้นด้วยบทบาท reference ให้ชัด แล้วใส่ข้อความนี้ก่อนรายละเอียดวัตถุ:

> Match the same handmade line grammar: broken dry charcoal-sepia contours with visibly varying pressure, sparse irregular cross-hatching, thin matte gouache that reveals paper grain, restrained muted palette, and small functional asymmetries. Avoid polished AI symmetry. Keep construction believable while making wear, spacing, edge wobble, and texture deliberately non-mirrored.

ปิด prompt ด้วย mandatory negative prompt และ output contract ด้านบนทุกครั้ง
