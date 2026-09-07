# คั่น (Khan) — Architecture v0.2

> "A bookshelf that remembers what you were thinking."
> ห้องหนึ่งห้อง หนังสือเดินทางผ่านสามที่: **กอง → โต๊ะ → ชั้น**

_v0.2 — 7 ก.ย. 2026: เพิ่มหลักการออกแบบ, ผลจากการศึกษาเรื่องนิสัยการอ่าน, ปรับ model เล็กน้อย (core เดิม)_

---

## 0. หลักการออกแบบ

**ห้องนี้ต้องซื่อสัตย์เท่าห้องจริง — ไม่เพิ่มอะไรที่ห้องจริงไม่มี ไม่ซ่อนอะไรที่ห้องจริงมี**

หลักข้อเดียวนี้ตัดสินหลายอย่าง:
- ไม่มี streak — ห้องจริงไม่นับวัน; streak ทำงานด้วยความกลัวขาด ซึ่งเป็นแรงจูงใจผิดประเภท
- ไม่มี notification — กองจริงไม่เคยเซ้าซี้ มันแค่มีฝุ่น
- ไม่มี "ปล่อยไป / archive" — หนังสือจริงไม่หายไปไหน มันแค่วางอยู่ตรงนั้น
- ไม่มี leaderboard, badge, confetti — รางวัลคือกองที่เตี้ยลงและชั้นที่เต็มขึ้น

**สิ่งที่ค้นพบจากการศึกษาการดอง** (ดู §10):
- ตัวฆ่าการอ่านไม่ใช่ความขี้เกียจ แต่คือ **เล่มเดียวที่ติดปิดทางเล่มอื่นทั้งหมด**
- นักอ่านตัวยงทิ้งหนังสือกลางทางตลอดเวลาโดยไม่รู้สึกผิด
- แรงจูงใจตกแน่นอน — คำถามคือ *กลับมาได้ง่ายแค่ไหน* ไม่ใช่เริ่มได้ง่ายแค่ไหน

ดังนั้น: **"วางกลับกอง" คือ feature ระดับหนึ่ง** เท่ากับ "หยิบขึ้นโต๊ะ" ไม่ใช่ทางออกฉุกเฉิน

---

## 1. Core loop

```
เพิ่มเล่ม + บอกว่าอยากรู้อะไร → กอง (pile)
         → ลองเปิดดู → โต๊ะ (desk)
             → อ่าน (session) — stopwatch เดินเงียบ ๆ
             → หยุด → กระดาษสรุป (capture) — ว่างได้
             → วางไว้ กลับมาวันหลัง → recovery card
             → ระหว่างนั้น: board + notes สะสม
             → ไม่ใช่เล่มนี้ → วางกลับกอง (แตะเดียว ไม่ถาม)
         → อ่านจบ + กระดาษปิด → ชั้น (shelf)
             → หยิบมาเปิด intent / notes / board / closing ได้ตลอด
```

---

## 2. Data model

ทุก entity มี `id` (string, uid), timestamp เป็น epoch ms (integer)
**Core 4 entity เหมือน v0.1** — เพิ่มเฉพาะ optional field ที่ทำเครื่องหมาย ★

### Book
```ts
{
  id: string
  title: string
  author?: string
  color: string             // hex — สีปกใน 3D และขอบการ์ดใน board
  unit: 'page' | 'percent'  // ★ ebook คิดเป็น % — ต้องมีตั้งแต่ v1 กัน migration
  total?: number            // integer — หน้าทั้งหมด หรือ 100 ถ้า percent
  current: number           // integer — cache จาก session ล่าสุด
  status: 'pile' | 'desk' | 'shelf'
  intent?: string           // ★ "อยากรู้อะไรจากเล่มนี้" — ถามตอนเพิ่ม ถามแบบ "อยาก" ไม่ใช่ "ควร"
  closingNote?: string      // ★ กระดาษปิดตอนขึ้นชั้น — คู่กับ intent = arc ของเล่ม
  addedAt: number
  startedAt?: number        // ครั้งแรกที่ pile → desk
  finishedAt?: number       // desk → shelf
}
```

### Session — หนึ่งครั้งที่นั่งอ่าน
```ts
{
  id: string
  bookId: string
  startedAt: number
  endedAt: number
  plannedMinutes?: number   // ★ optional แล้ว — default คือ stopwatch ไม่มีเป้า
  startPos: number          // integer (หน้า หรือ %)
  endPos: number
  note?: string             // กระดาษสรุป — หัวใจของ recovery
}
```

### Card — การ์ดบน evidence board
```ts
{
  id: string
  bookId: string            // board เป็นของเล่ม
  type: 'quote' | 'note' | 'character' | 'idea'
  content: string
  pos?: number              // ตำแหน่งในเล่ม
  x: number, y: number      // board-space
  fromSessionId?: string    // ★ ถ้าปักมาจาก session note — เชื่อมสองระบบโดยไม่รวม
  createdAt: number
}
```

### Thread — เชือกระหว่างการ์ด
```ts
{
  id: string
  bookId: string
  fromCardId: string
  toCardId: string
  tension: 0 | 1 | 2        // ตึง / ปกติ / หย่อน = ความมั่นใจ
}
```

### Settings (single record)
```ts
{ defaultMinutes?: number, schemaVersion: number }
```

### สิ่งที่ **ไม่เก็บ** (derive เอา)
- สถิติทั้งหมด → คำนวณจาก Session
- เล่มที่ "เปิดอยู่" บนโต๊ะ → เล่มที่มี session ล่าสุด
- ความลึกของ recovery card → `now - lastSession.endedAt`
- ฝุ่นบนเล่มในกอง → `now - addedAt`
- แสงในห้อง → `Date` จริง

---

## 3. Book lifecycle

```
pile ──(ลองเปิดดู)──▶ desk ──(อ่านจบ + กระดาษปิด)──▶ shelf
  ▲                    │                              │
  └──(วางกลับ: แตะเดียว)┘                              │
                       ◀────────(อ่านซ้ำ)──────────────┘
```

กฎ:
- **`desk → pile` ต้องไม่มี confirm ไม่มีคำถาม ไม่มีสีหน้า** — หนังสือลอยกลับพร้อม note และตำแหน่งที่อ่านถึง ทั้งหมดยังอยู่
- ปุ่ม `pile → desk` ใช้คำว่า "ลองเปิดดู" ไม่ใช่ "เริ่มอ่าน" — จุดยอมแพ้บ่อยที่สุดคือหน้า 50–100 การเริ่มต้นต้องรู้สึกเหมือนชิม ไม่ใช่สัญญา
- โต๊ะรับได้หลายเล่ม — **เล่มเดียวที่เปิดอยู่กลางโต๊ะ** (session ล่าสุด) ที่เหลือปิดซ้อนที่มุม
- `shelf → desk` (อ่านซ้ำ) ไม่ reset อะไร เพิ่ม session ต่อ; ถ้าอยากเริ่มจากหน้าแรก ให้ session แรกของรอบใหม่มี `startPos: 0`
- ลบเล่ม = ปุ่มธรรมดาใน settings ไม่มีพิธี (export ก่อนเสมอ)

---

## 4. Screens & navigation

3D room เป็น home เดียว ทุกอย่างอื่นเป็น overlay ซ้อนบนห้อง

| Screen | เข้าจาก | ทำอะไร |
|---|---|---|
| **Room** (3D) | เปิดแอป | กอง/โต๊ะ/ชั้น แสงตามเวลาจริง แตะเล่มเพื่อเปิด |
| **Book sheet** | แตะเล่ม | ต่างตาม status (ด้านล่าง) |
| **Session** | "อ่านต่อ" | stopwatch จอมืด ปุ่มเดียวคือหยุด (countdown เป็น option) |
| **Capture** | หยุด | กระดาษ: ถึงตรงไหน (default = ตำแหน่งเดิม แก้ได้) + คิดอะไรอยู่ (ว่างได้) |
| **Board** | จาก sheet | evidence board เต็มจอ กรองเล่มนี้อัตโนมัติ |
| **Add book** | + ในห้อง | ชื่อ ผู้เขียน สี unit total + **"อยากรู้อะไรจากเล่มนี้"** → ลอยลงกอง |
| **Closing** | "อ่านจบ" | กระดาษปิด: รู้สึกยังไง (ว่างได้) → ลอยขึ้นชั้น |
| **Settings** | เฟือง | export/import (merge), default timer, ลบเล่ม |

### Book sheet ตาม status
- **pile**: ปก + intent + "อยู่ในกองมา N วัน" + ปุ่มเดียว *ลองเปิดดู*
- **desk**: **recovery card อยู่บนสุด** (ดู §4.1) → อ่านต่อ / เปิด board / sessions / วางกลับกอง / อ่านจบ
- **shelf**: intent ↔ closingNote คู่กันบนสุด → notes เรียงตามตำแหน่ง → board → สถิติของเล่ม → อ่านซ้ำ

### 4.1 Recovery card — ลึกตามเวลาที่หายไป
| หายไป | แสดง |
|---|---|
| < 7 วัน | "N วันที่แล้ว · ถึง [pos] · [note ล่าสุด]" |
| 7–30 วัน | + trail: 3–5 note ล่าสุดเรียงเป็นเส้นทาง |
| > 30 วัน | + intent ตอนเพิ่มเล่ม: "ตอนนั้นอยากรู้ว่า…" |

นี่คือกลไกสร้างนิสัยที่แท้จริงของแอป — ลดต้นทุนการ*กลับมา* ไม่ใช่การเริ่ม

### 4.2 Session note → board
ทุก note ใน sessions list มีปุ่ม "ปักขึ้นบอร์ด" → สร้าง Card type `idea` พร้อม `fromSessionId`

---

## 5. 3D scene

หลักการ: **เงียบ ช้า ไม่ฉูดฉาด** แสงนิ่ง กล้องช้า ไม่มี particle

- Scene เดียว, 3 zone, กล้องเลื่อนระหว่าง zone
- หนังสือ = `BoxGeometry` + สีปก + ชื่อบนสัน (canvas texture) — low-poly
- **กอง**: ซ้อนไม่เป็นระเบียบเล็กน้อย เล่มเก่าอยู่ล่าง ฝุ่นตาม `addedAt` (subtle — ฝุ่นคือความจริง ไม่ใช่การลงโทษ)
- **โต๊ะ**: เล่มที่เปิดอยู่วางกลาง มีที่คั่น; เล่มอื่นปิดซ้อนมุมโต๊ะ
- **ชั้น**: เรียงตั้งตาม `finishedAt` เต็มแถวขึ้นแถวใหม่
- **แสงตามเวลาจริง**: เช้าแสงเข้าหน้าต่าง / บ่ายสว่าง / ค่ำเหลือโคมโต๊ะ — light color + angle จาก `Date` ต่อ series เดียวกับ ระหว่างทาง / ระหว่างเขา
- **Transition ลอย** ทุกการย้าย (กอง→โต๊ะ, โต๊ะ→กอง, โต๊ะ→ชั้น) 1–1.5 วินาที ease — ห้ามตัดข้าม นี่คือ moment ของความเป็นเจ้าของ และเป็น celebration เดียวที่แอปมี
- **First-run**: ห้องว่างมีแค่โคมโต๊ะเปิดอยู่ ไม่มี tutorial; เล่มแรกลอยลงกองเต็มรูปแบบ
- Interaction: raycast tap → highlight → sheet
- Performance: `InstancedMesh` เกิน ~50 เล่ม, `frameloop="demand"` ตอนนิ่ง

---

## 6. Tech stack

| ชั้น | เลือก | เพราะ |
|---|---|---|
| Build | **Vite** | เร็ว, PWA plugin พร้อม |
| UI | **React + TypeScript** | overlay เยอะ; TS กัน bug model |
| 3D | **React Three Fiber + drei** | รู้ Three.js อยู่แล้ว R3F แค่ทำให้คุยกับ React state ได้ |
| State | **Zustand** | เบา |
| Storage | **Dexie** (IndexedDB) | local-first, typed, migration ในตัว |
| PWA | **vite-plugin-pwa** | offline + install ไม่ผ่าน store |

ทางเลือกที่พิจารณาแล้ว: single-file HTML (scope เกิน), Flutter (3D ลำบาก — ถ้าอยากลง store ใช้ Capacitor ห่อ PWA), Svelte+Threlte (ecosystem เล็กกว่า)

ข้อจำกัดที่ยอมรับ: มือถือเก่าอาจช้า → **2D fallback** ตั้งแต่แรก; ไม่มี sync ใน v1 → export/import

---

## 7. Data safety

- ทุก write ผ่าน repository layer (`db/books.ts`, `db/sessions.ts`, …) ห้าม component เรียก Dexie ตรง
- Export JSON ปุ่มเดียว; import แบบ **merge** (ไม่ replace)
- `schemaVersion` ใน settings; migration ผ่าน Dexie `.version(n).upgrade()`
- ตำแหน่ง/นาที = integer เสมอ

---

## 8. Build phases

แต่ละ phase ต้อง **ใช้จริงได้** ก่อนขึ้น phase ถัดไป กอล์ฟเป็นผู้ใช้คนแรก

### Phase 1 — โต๊ะ (2D)
Book CRUD + intent, stopwatch, capture, recovery card 3 ระดับ, วางกลับกอง, list view ธรรมดา
**Done when:** อ่านจริง 1 เล่ม ≥ 5 session, **วางกลับกองอย่างน้อย 1 เล่มแล้วไม่รู้สึกแย่**, recovery card ช่วยได้จริง

### Phase 2 — ห้อง (3D)
Room scene, 3 zone, tap, transition ลอยทุกทิศ, แสงตามเวลา, first-run, 2D fallback
**Done when:** เปิดแอปแล้วอยากมองห้องเฉย ๆ

### Phase 3 — Board
Port v1 เข้า React (Verlet เดิม), ผูก bookId, ปุ่มปักจาก session note
**Done when:** เปิดจาก sheet ได้ กรองอัตโนมัติ ปักจาก note ได้

### Phase 4 — ชั้น + closing
Closing ritual, shelf archive (intent↔closing), per-book stats, overall stats (นาที/ตำแหน่ง — ไม่มี streak)

### Phase 5 — PWA polish
Offline, install, icon, splash, ทดสอบมือถือจริงหลายรุ่น

---

## 9. คำถามที่ปิดแล้ว / ยังเปิด

**ปิดแล้ว**
- บังคับ capture? → ไม่ เด้งขึ้นแต่ว่างได้
- Timer? → stopwatch default, countdown เป็น option
- ปก? → สีก่อน
- หลายเล่มบนโต๊ะ? → ไม่จำกัด แต่เล่มเดียวเปิดอยู่
- Streak? → ไม่มี
- Released? → ไม่มี — วางกลับกองแทน

**ยังเปิด**
1. Idea card ข้ามเล่ม / "shelf board" — v2
2. Anchor moment (Fogg) — ให้ผู้ใช้ตั้ง "หลัง X ฉันจะเปิดแอป" ไหม? งานวิจัยบอกผลเล็กและจางเร็ว ผมเอียงไปทาง**ไม่ทำ** เพราะขัดกับ "ไม่ notification" แต่ยังไม่ตัดขาด

---

## 10. อ้างอิงที่ใช้ตัดสินใจ

- Goodreads survey (2013): ~20% ของหนังสือถูกทิ้งกลางทาง; เหตุผลหลัก "ช้า น่าเบื่อ" 46%; จุดยอมแพ้ หน้า 50–100
- Lascar Publishing, "How to Finally Finish the Books You Start": เล่มเดียวที่ติดหยุดการอ่านทั้งหมด; นักอ่านตัวยงทิ้งหนังสือโดยไม่รู้สึกผิด
- Taleb, *The Black Swan*: antilibrary — เล่มที่ยังไม่อ่านมีค่ากว่าเล่มที่อ่านแล้ว
- tsundoku (積ん読): ในบริบทญี่ปุ่นไม่มีนัยลบ
- Sapolsky (ผ่าน Psychology Today): dopamine หลั่งตอนคาดหวัง ไม่ใช่ตอนได้รับ — ซื้อ = ความสุขเต็มที่แล้ว
- Fogg, *Tiny Habits*: Anchor → Tiny Behavior → Celebration; เลือก "อยาก" ไม่ใช่ "ควร"
- Implementation intentions (Gollwitzer et al.): ผลเล็ก (d ≈ .14–.31), อ่อนเมื่อความตั้งใจต่ำ, จางตามเวลา
