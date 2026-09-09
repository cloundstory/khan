# public/set — ภาพประกอบฉากห้อง (drop-in)

หย่อนไฟล์ `<name>.webp` (พื้นหลังโปร่งใส) ตามชื่อใน `src/scene/pieces.ts` แล้วมันจะขึ้นแทน placeholder SVG อัตโนมัติ:

chair · lamp · clock · board · plant-hang-a · plant-hang-b · plant-shelf · shelf · rug · cat
(+ book-a…d สำหรับ tile กอง — เฟสถัดไป)

วิธีสร้าง/สเปก: ดู `design/IMAGE_PROMPTS.md`
กล่องตำแหน่งจูนได้ที่ `src/scene/pieces.ts` (พิกัด viewBox 1000×720)
