import { useEffect, useState, type CSSProperties } from 'react';
import './ux-lab.css';

type Panel = 'character' | 'book' | null;

const outfits = [
  { id: 'moss', label: 'ไหมพรมป่าสน', color: '#4f6255', accent: '#d5c2a4' },
  { id: 'rust', label: 'คาร์ดิแกนดินเผา', color: '#a35d43', accent: '#e6d6bd' },
  { id: 'navy', label: 'สเวตเตอร์กรมท่า', color: '#405568', accent: '#c9b993' },
  { id: 'oat', label: 'เสื้อถักสีข้าวโอ๊ต', color: '#b8a786', accent: '#536455' },
  { id: 'plum', label: 'เสื้อคลุมพลัม', color: '#665061', accent: '#d8c5a8' },
] as const;

const hairs = [
  { id: 'dark', label: 'ผมเข้ม', color: '#302c2c' },
  { id: 'chestnut', label: 'ผมสีน้ำตาล', color: '#765342' },
  { id: 'silver', label: 'ผมสีเงิน', color: '#9a9487' },
] as const;

export default function UxLab() {
  const [panel, setPanel] = useState<Panel>(null);
  const [outfitIndex, setOutfitIndex] = useState(0);
  const [hairIndex, setHairIndex] = useState(0);
  const [lampOn, setLampOn] = useState(true);
  const [night, setNight] = useState(false);
  const [bookLifted, setBookLifted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const outfit = outfits[outfitIndex];
  const hair = hairs[hairIndex];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hours = now.getHours() % 12;
  const minuteAngle = now.getMinutes() * 6 + now.getSeconds() * 0.1;
  const hourAngle = hours * 30 + now.getMinutes() * 0.5;

  return (
    <main className={`ux-lab${night ? ' is-night' : ''}${lampOn ? ' lamp-on' : ''}`}>
      <header className="ux-lab__header">
        <div>
          <p className="ux-lab__eyebrow">คั่น · UX/UI mockup 01</p>
          <h1>ห้องที่ค่อย ๆ เป็นของคุณ</h1>
          <p>แตะตัวละครเพื่อแต่งตัว แตะหนังสือเพื่อเริ่มพิธีอ่าน</p>
        </div>
        <div className="ux-lab__status"><span className="ux-lab__status-dot" /> 2D interactive room</div>
      </header>

      <section className="ux-stage" aria-label="mockup ห้องอ่านหนังสือแบบโต้ตอบ">
        <img src={`${import.meta.env.BASE_URL}concept/home-v5.png`} alt="ห้องอ่านหนังสือวาดมือ" />
        <div className="ux-stage__night-wash" aria-hidden="true" />
        <div className="ux-stage__window" aria-hidden="true"><span>{night ? '☾' : '☼'}</span></div>
        <div className="ux-stage__lamp-glow" aria-hidden="true" />

        <button className="ux-hotspot ux-hotspot--window" type="button" onClick={() => setNight((value) => !value)} aria-label="เปลี่ยนกลางวันกลางคืน">
          <span>{night ? 'กลางคืน' : 'กลางวัน'}</span>
        </button>
        <button className={`ux-hotspot ux-hotspot--lamp${lampOn ? ' is-on' : ''}`} type="button" onClick={() => setLampOn((value) => !value)} aria-pressed={lampOn} aria-label="เปิดปิดโคมไฟ">
          <span>{lampOn ? 'ปิดไฟ' : 'เปิดไฟ'}</span>
        </button>

        <div className="ux-clock" aria-label={`เวลาปัจจุบัน ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`}>
          <i className="ux-clock__hand ux-clock__hand--hour" style={{ transform: `rotate(${hourAngle}deg)` }} />
          <i className="ux-clock__hand ux-clock__hand--minute" style={{ transform: `rotate(${minuteAngle}deg)` }} />
          <b />
        </div>

        <button
          className="ux-character"
          type="button"
          style={{ '--outfit': outfit.color, '--accent': outfit.accent, '--hair': hair.color } as CSSProperties}
          onClick={() => setPanel('character')}
          aria-label="เปิดตู้แต่งตัวละคร"
        >
          <span className="ux-character__hair" />
          <span className="ux-character__face" />
          <span className="ux-character__body" />
          <span className="ux-character__book" />
          <span className="ux-character__tag">แต่งตัว</span>
        </button>

        <button className={`ux-book-card${bookLifted ? ' is-lifted' : ''}`} type="button" onClick={() => { setBookLifted(true); setPanel('book'); }} aria-label="หยิบหนังสือจากกอง">
          <span className="ux-book-card__cover">THE<br />BLUEBIRD</span>
          <span className="ux-book-card__pages" />
          <span className="ux-book-card__tag">{bookLifted ? 'กำลังอ่าน' : 'แตะเพื่อหยิบ'}</span>
        </button>

        <button className="ux-board-hotspot" type="button" onClick={() => setPanel('book')} aria-label="เปิด evidence board"><span>evidence board</span></button>
        <div className="ux-stage__hint">แตะสิ่งของในห้องเพื่อเริ่ม interaction</div>

        <nav className="ux-nav" aria-label="เมนูหลัก">
          <button className="is-active" type="button"><span>⌂</span>ห้อง</button>
          <button type="button" onClick={() => setPanel('book')}><span>▤</span>หนังสือ</button>
          <button type="button" onClick={() => setPanel('character')}><span>♙</span>ตัวละคร</button>
          <button type="button"><span>⋯</span>เพิ่มเติม</button>
        </nav>
      </section>

      {panel === 'character' && (
        <aside className="ux-drawer" aria-label="แต่งตัวละคร">
          <button className="ux-drawer__close" type="button" onClick={() => setPanel(null)} aria-label="ปิดแผง">×</button>
          <p className="ux-lab__eyebrow">ตัวละครของคุณ</p>
          <h2>แต่งมุมอ่านให้เป็นตัวเอง</h2>
          <p className="ux-drawer__copy">เลือกชิ้นส่วนแยกกันได้ โดยท่านั่งและเส้นฐานยังคงที่ ทำให้ภาพไม่กระโดดเมื่อเปลี่ยนชุด</p>
          <h3>เสื้อผ้า</h3>
          <div className="ux-options">
            {outfits.map((item, index) => <button key={item.id} className={index === outfitIndex ? 'is-selected' : ''} type="button" onClick={() => setOutfitIndex(index)}><i style={{ background: item.color }} /><span>{item.label}</span></button>)}
          </div>
          <h3>ผม</h3>
          <div className="ux-options ux-options--hair">
            {hairs.map((item, index) => <button key={item.id} className={index === hairIndex ? 'is-selected' : ''} type="button" onClick={() => setHairIndex(index)}><i style={{ background: item.color }} /><span>{item.label}</span></button>)}
          </div>
          <button className="ux-drawer__done" type="button" onClick={() => setPanel(null)}>บันทึกลุคนี้</button>
        </aside>
      )}

      {panel === 'book' && (
        <aside className="ux-drawer ux-drawer--book" aria-label="รายละเอียดหนังสือ">
          <button className="ux-drawer__close" type="button" onClick={() => setPanel(null)} aria-label="ปิดแผง">×</button>
          <p className="ux-lab__eyebrow">หนังสือที่เลือก · กองอยู่</p>
          <div className="ux-book-preview"><span>THE<br />BLUEBIRD</span></div>
          <h2>The Bluebird</h2>
          <p className="ux-drawer__copy">หนังสือ 2D จะยกออกจากกองด้วยการเลื่อน โค้ง หมุนเล็กน้อย และมีเงาแยก เพื่อให้รู้สึกว่าหยิบได้จริงโดยไม่ต้องใช้โมเดล 3D</p>
          <button className="ux-drawer__done" type="button" onClick={() => { setBookLifted(false); setPanel(null); }}>วางกลับกอง</button>
        </aside>
      )}

      <section className="ux-explain">
        <div><span>01</span><strong>ภาพห้อง</strong><p>เป็นภาพ 2D แยกชั้น ไม่ต้องคำนวณ geometry ของห้องทุกครั้ง</p></div>
        <div><span>02</span><strong>หนังสือจริง</strong><p>ปกจาก Book record ถูกวาดเป็นภาพบนสัน ปก และหน้ากระดาษของหนังสือ 2D</p></div>
        <div><span>03</span><strong>การเคลื่อนไหว</strong><p>CSS/SVG เปลี่ยนตำแหน่ง หมุน ยก และเปิดแผงรายละเอียดตาม state</p></div>
      </section>
    </main>
  );
}
