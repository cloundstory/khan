import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import type { Book, BookStatus } from '../db/schema';
import { sampleBooks } from './study';
import './mobile-flow-lab.css';

type FlowScreen = 'home' | 'pile' | 'pile-detail' | 'shelf' | 'desk' | 'timer' | 'board' | 'wardrobe' | 'cats' | 'add' | 'settings';

const cats = [
  { id: 'black', name: 'หมึก', color: '#302c2c', note: 'ชอบนอนใกล้พรม' },
  { id: 'orange', name: 'ฟักทอง', color: '#b8714e', note: 'ตื่นเมื่อได้ยินเสียงเปิดหนังสือ' },
  { id: 'gray', name: 'หมอก', color: '#7b817d', note: 'ชอบนั่งมองหน้าต่าง' },
  { id: 'tuxedo', name: 'ถุงเท้า', color: '#2f3132', note: 'เดินสำรวจห้องตอนกลางคืน' },
  { id: 'calico', name: 'ลายจุด', color: '#a66e52', note: 'ชอบนอนบนผ้าห่ม' },
  { id: 'cream', name: 'ข้าวตัง', color: '#c8ae80', note: 'ชอบอยู่ข้างโต๊ะอ่าน' },
] as const;

const outfits = [
  { id: 'moss', name: 'ไหมพรมป่าสน', color: '#4f6255' },
  { id: 'rust', name: 'คาร์ดิแกนดินเผา', color: '#a35d43' },
  { id: 'navy', name: 'สเวตเตอร์กรมท่า', color: '#405568' },
  { id: 'oat', name: 'เสื้อถักสีข้าวโอ๊ต', color: '#b8a786' },
] as const;

export default function MobileFlowLab() {
  const [screen, setScreen] = useState<FlowScreen>('home');
  const [books, setBooks] = useState<Book[]>(() => sampleBooks(9));
  const [selectedId, setSelectedId] = useState('study-0');
  const [night, setNight] = useState(false);
  const [lampOn, setLampOn] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [catId, setCatId] = useState<string>(cats[0].id);
  const [outfitId, setOutfitId] = useState<string>(outfits[0].id);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = window.setInterval(() => {
      setElapsedSeconds((value) => {
        return value + 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const pileBooks = useMemo(() => books.filter((book) => book.status === 'pile'), [books]);
  const shelfBooks = useMemo(() => books.filter((book) => book.status === 'shelf'), [books]);
  const deskBook = books.find((book) => book.status === 'desk') ?? null;
  const selectedBook = books.find((book) => book.id === selectedId) ?? pileBooks[0] ?? null;
  const activeCat = cats.find((cat) => cat.id === catId) ?? cats[0];

  function moveBook(id: string, status: BookStatus) {
    setBooks((current) => current.map((book) => book.id === id ? {
      ...book,
      status,
      startedAt: status === 'desk' ? book.startedAt ?? Date.now() : book.startedAt,
      finishedAt: status === 'shelf' ? book.finishedAt ?? Date.now() : book.finishedAt,
      current: status === 'shelf' ? book.total ?? book.current : book.current,
    } : book));
  }

  function addBook() {
    const source = sampleBooks(1)[0];
    const book: Book = { ...source, id: `new-${Date.now()}`, title: 'หนังสือเล่มใหม่', author: 'เพิ่มจากกอง', status: 'pile', addedAt: Date.now() };
    setBooks((current) => [book, ...current]);
    setSelectedId(book.id);
    setScreen('pile');
  }

  function openBook(book: Book) {
    setSelectedId(book.id);
    setScreen(book.status === 'pile' ? 'pile-detail' : book.status === 'desk' ? 'desk' : 'shelf');
  }

  function goHome() {
    setTimerRunning(false);
    setScreen('home');
  }

  const clockText = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

  return (
    <main className={`mobile-flow${night ? ' is-night' : ''}${lampOn ? ' lamp-on' : ''}`}>
      <div className="mobile-flow__shell">
        <header className="mobile-flow__topbar">
          <div className="mobile-flow__brand"><span>ขั่น</span><small>A LIBRARY<br />FOR A SLOWER YOU</small></div>
          <button className="mobile-flow__settings" type="button" onClick={() => setScreen('settings')} aria-label="ตั้งค่า">⚙</button>
        </header>

        {screen === 'home' && <HomeScreen onPile={() => setScreen('pile')} onShelf={() => setScreen('shelf')} onDesk={() => setScreen('desk')} onTimer={() => { setElapsedSeconds(0); setTimerRunning(true); setScreen('timer'); }} onBoard={() => setScreen('board')} onWardrobe={() => setScreen('wardrobe')} onCats={() => setScreen('cats')} onNight={() => setNight((value) => !value)} onLamp={() => setLampOn((value) => !value)} night={night} lampOn={lampOn} activeCat={activeCat} pileCount={pileBooks.length} shelfCount={shelfBooks.length} deskBook={deskBook} />}
        {screen === 'pile' && <BookListScreen title="กองอยู่" subtitle={`${pileBooks.length} เล่มที่ยังรออ่าน`} books={pileBooks} onBack={goHome} onOpen={openBook} actionLabel="เลือกเล่ม" action={() => setScreen('add')} footerAction="เพิ่มหนังสือเข้ากอง" />}
        {screen === 'shelf' && <BookListScreen title="บนชั้น" subtitle={`${shelfBooks.length} เล่มที่อ่านจบแล้ว`} books={shelfBooks} onBack={goHome} onOpen={openBook} />}
        {screen === 'pile-detail' && selectedBook && <PileDetail book={selectedBook} onBack={() => setScreen('pile')} onStart={() => { moveBook(selectedBook.id, 'desk'); setElapsedSeconds(0); setTimerRunning(true); setScreen('timer'); }} onShelf={() => { moveBook(selectedBook.id, 'shelf'); setScreen('shelf'); }} />}
        {screen === 'desk' && <DeskScreen book={deskBook} onBack={goHome} onTimer={() => { setTimerRunning(true); setScreen('timer'); }} onBoard={() => setScreen('board')} onShelf={() => deskBook && (moveBook(deskBook.id, 'shelf'), setScreen('shelf'))} />}
        {screen === 'timer' && <TimerScreen book={deskBook} time={clockText} running={timerRunning} onBack={() => setScreen('desk')} onToggle={() => setTimerRunning((value) => !value)} onFinish={() => { setTimerRunning(false); setScreen('desk'); }} onOpenBoard={() => { setTimerRunning(false); setScreen('board'); }} />}
        {screen === 'board' && <BoardScreen onBack={() => setScreen(deskBook ? 'desk' : 'home')} />}
        {screen === 'wardrobe' && <WardrobeScreen selected={outfitId} onSelect={setOutfitId} onBack={goHome} />}
        {screen === 'cats' && <CatScreen selected={catId} onSelect={setCatId} onBack={goHome} />}
        {screen === 'add' && <AddScreen onBack={() => setScreen('pile')} onAdd={addBook} />}
        {screen === 'settings' && <SettingsScreen night={night} lampOn={lampOn} onNight={() => setNight((value) => !value)} onLamp={() => setLampOn((value) => !value)} onBack={goHome} />}
      </div>
    </main>
  );
}

function HomeScreen({ onPile, onShelf, onDesk, onTimer, onBoard, onWardrobe, onCats, onNight, onLamp, night, lampOn, activeCat, pileCount, shelfCount, deskBook }: { onPile: () => void; onShelf: () => void; onDesk: () => void; onTimer: () => void; onBoard: () => void; onWardrobe: () => void; onCats: () => void; onNight: () => void; onLamp: () => void; night: boolean; lampOn: boolean; activeCat: typeof cats[number]; pileCount: number; shelfCount: number; deskBook: Book | null }) {
  return <>
    <section className="mobile-flow__hero">
      <div className="mobile-flow__greeting"><span>วันนี้ค่อย ๆ อ่านก็พอ</span><strong>ห้องของคุณ</strong><small>{deskBook ? `กำลังอ่าน ${deskBook.title}` : 'เลือกสิ่งหนึ่งในห้องเพื่อเริ่มต้น'}</small></div>
      <div className="mobile-flow__scene">
        <img src={`${import.meta.env.BASE_URL}concept/home-v5.png`} alt="ห้องอ่านหนังสือวาดมือ" />
        <div className="mobile-flow__scene-wash" aria-hidden="true" />
        <button className="flow-hotspot flow-hotspot--pile" type="button" onClick={onPile} aria-label={`เปิดกองหนังสือ ${pileCount} เล่ม`}><span className="flow-hit-label">กองหนังสือ</span></button>
        <button className="flow-hotspot flow-hotspot--shelf" type="button" onClick={onShelf} aria-label={`เปิดชั้นหนังสือ ${shelfCount} เล่ม`}><span className="flow-hit-label">ชั้นหนังสือ</span></button>
        <button className="flow-hotspot flow-hotspot--desk" type="button" onClick={onDesk} aria-label={deskBook ? `เปิด progress ${deskBook.title}` : 'เปิดโต๊ะอ่านหนังสือ'}><span className="flow-hit-label">โต๊ะอ่าน</span></button>
        <button className="flow-hotspot flow-hotspot--sofa" type="button" onClick={onTimer} aria-label="เปิด timer ที่โซฟา"><span className="flow-hit-label">โซฟา</span></button>
        <button className="flow-hotspot flow-hotspot--board" type="button" onClick={onBoard} aria-label="เปิด evidence board"><span className="flow-hit-label">evidence board</span></button>
        <button className="flow-hotspot flow-hotspot--window" type="button" onClick={onNight} aria-label={night ? 'เปลี่ยนเป็นกลางวัน' : 'เปลี่ยนเป็นกลางคืน'}><span className="flow-hit-label">หน้าต่าง</span></button>
        <button className="flow-hotspot flow-hotspot--lamp" type="button" onClick={onLamp} aria-label={lampOn ? 'ปิดโคมไฟ' : 'เปิดโคมไฟ'}><span className="flow-hit-label">โคมไฟ</span></button>
        <button className="flow-hotspot flow-hotspot--character" type="button" onClick={onWardrobe} aria-label="แต่งตัวละคร"><span className="flow-hit-label">ตัวละคร</span></button>
        <button className="flow-hotspot flow-hotspot--cat" type="button" onClick={onCats} aria-label={`เปิดข้อมูลแมว ${activeCat.name}`}><span className="flow-hit-label">แมว</span></button>
        <div className={`flow-lamp-glow${lampOn ? ' is-on' : ''}`} aria-hidden="true" />
        <div className="flow-window-state" aria-hidden="true">{night ? '☾' : '☼'}</div>
      </div>
    </section>
  </>;
}

function BookListScreen({ title, subtitle, books, onBack, onOpen, action, actionLabel, footerAction }: { title: string; subtitle: string; books: Book[]; onBack: () => void; onOpen: (book: Book) => void; action?: () => void; actionLabel?: string; footerAction?: string }) {
  return <section className="mobile-flow__screen"><ScreenHeader title={title} subtitle={subtitle} onBack={onBack} /><div className="mobile-flow__book-list">{books.length ? books.map((book) => <BookRow key={book.id} book={book} onClick={() => onOpen(book)} />) : <EmptyState text="ยังไม่มีหนังสือในส่วนนี้" />}</div>{action && <button className="mobile-flow__primary" type="button" onClick={action}>＋ {footerAction ?? actionLabel}</button>}</section>;
}

function PileDetail({ book, onBack, onStart, onShelf }: { book: Book; onBack: () => void; onStart: () => void; onShelf: () => void }) {
  return <section className="mobile-flow__screen mobile-flow__detail"><ScreenHeader title="เลือกหนังสือ" subtitle="กองอยู่ · ยังไม่ได้เริ่มอ่านในแอป" onBack={onBack} /><div className="flow-detail__cover is-lifted" style={{ '--book-color': book.color } as CSSProperties}><img src={book.coverUrl} alt="" /><span>{book.title}</span></div><h2>{book.title}</h2><p>{book.author}</p><div className="flow-detail__actions"><button className="mobile-flow__primary" type="button" onClick={onStart}>เริ่มอ่าน</button><button className="mobile-flow__secondary" type="button" onClick={onShelf}>อ่านจบแล้ว · เก็บบนชั้น</button></div><p className="flow-detail__note">ถ้าอ่านเล่มนี้มาก่อนแล้ว สามารถข้าม timer ได้ทันที</p></section>;
}

function DeskScreen({ book, onBack, onTimer, onBoard, onShelf }: { book: Book | null; onBack: () => void; onTimer: () => void; onBoard: () => void; onShelf: () => void }) {
  return <section className="mobile-flow__screen"><ScreenHeader title="บนโต๊ะ" subtitle="หนังสือที่กำลังอ่าน" onBack={onBack} />{book ? <><BookRow book={book} onClick={() => undefined} large /><div className="flow-progress"><div><span>ความคืบหน้า</span><strong>28%</strong></div><div className="flow-progress__bar"><i style={{ width: '28%' }} /></div><small>อ่านต่อจากหน้าที่ 84</small></div><div className="flow-actions-grid"><button type="button" onClick={onTimer}>เริ่ม Timer</button><button type="button" onClick={onBoard}>เก็บเบาะแส</button><button type="button" onClick={onShelf}>อ่านจบแล้ว</button></div></> : <EmptyState text="ยังไม่มีหนังสือบนโต๊ะ" />}</section>;
}

function TimerScreen({ book, time, running, onBack, onToggle, onFinish, onOpenBoard }: { book: Book | null; time: string; running: boolean; onBack: () => void; onToggle: () => void; onFinish: () => void; onOpenBoard: () => void }) {
  const touchStartY = useRef<number | null>(null);
  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  }
  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = touchStartY.current;
    const end = event.changedTouches[0]?.clientY;
    touchStartY.current = null;
    if (start !== null && end !== undefined && start - end > 48) onOpenBoard();
  }
  return <section className="mobile-flow__screen mobile-flow__timer" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    <ScreenHeader title="เวลาของการอ่าน" subtitle={book?.title ?? 'เลือกหนังสือจากกองก่อน'} onBack={onBack} />
    <button className="flow-timer__circle" type="button" onClick={onToggle} aria-label={running ? 'พักเวลาอ่าน' : 'อ่านต่อ'}><span>{time}</span><small>{running ? 'กำลังอ่าน · แตะเพื่อพัก' : 'พักอยู่ · แตะเพื่ออ่านต่อ'}</small></button>
    <button className="mobile-flow__primary" type="button" onClick={onFinish}>จบ session</button>
    <div className="flow-sheet-handle" role="button" tabIndex={0} onClick={onOpenBoard} aria-label="เปิด evidence board"><i /><span>สไลด์ขึ้นเพื่อเปิด evidence board</span></div>
    <p className="flow-detail__note">เวลาจะเดินต่อเนื่องจนกดจบ session แตะตัวเลขเพื่อหยุดชั่วคราวเมื่อไม่ได้อ่าน</p>
  </section>;
}

function BoardScreen({ onBack }: { onBack: () => void }) {
  return <section className="mobile-flow__screen"><ScreenHeader title="Evidence board" subtitle="เบาะแสที่เก็บไว้ระหว่างอ่าน" onBack={onBack} /><div className="flow-board"><article><b>ประโยคที่หยุดคิด</b><span>“บางเรื่องต้องค่อย ๆ อ่าน”</span></article><article><b>ตัวละคร</b><span>กลับมาที่ห้องเดิมเสมอ</span></article><article><b>คำถาม</b><span>เรากำลังรออะไรอยู่?</span></article></div><button className="mobile-flow__primary" type="button">＋ เพิ่มกระดาษ</button></section>;
}

function WardrobeScreen({ selected, onSelect, onBack }: { selected: string; onSelect: (id: string) => void; onBack: () => void }) {
  return <section className="mobile-flow__screen"><ScreenHeader title="ตัวละคร" subtitle="เปลี่ยนเสื้อผ้าให้เข้ากับวันนี้" onBack={onBack} /><div className="flow-avatar-preview"><i style={{ background: outfits.find((item) => item.id === selected)?.color }} /><span>ตัวละครของคุณ</span></div><div className="flow-choice-list">{outfits.map((item) => <button className={item.id === selected ? 'is-selected' : ''} key={item.id} type="button" onClick={() => onSelect(item.id)}><i style={{ background: item.color }} /><span>{item.name}</span></button>)}</div></section>;
}

function CatScreen({ selected, onSelect, onBack }: { selected: string; onSelect: (id: string) => void; onBack: () => void }) {
  return <section className="mobile-flow__screen"><ScreenHeader title="แมวในห้อง" subtitle="เลือกเพื่อนร่วมมุมอ่าน" onBack={onBack} /><div className="flow-cat-grid">{cats.map((cat) => <button className={cat.id === selected ? 'is-selected' : ''} key={cat.id} type="button" onClick={() => onSelect(cat.id)}><i style={{ background: cat.color }} /><strong>{cat.name}</strong><span>{cat.note}</span></button>)}</div></section>;
}

function AddScreen({ onBack, onAdd }: { onBack: () => void; onAdd: () => void }) {
  return <section className="mobile-flow__screen"><ScreenHeader title="เพิ่มหนังสือ" subtitle="หนังสือใหม่จะเข้ากองเสมอ" onBack={onBack} /><div className="flow-add-card"><span>▣</span><strong>สแกนปกหรือกรอกข้อมูล</strong><p>ใน production จะเชื่อม camera scanner และปกจริงของผู้ใช้</p></div><button className="mobile-flow__primary" type="button" onClick={onAdd}>＋ เพิ่มหนังสือตัวอย่างเข้ากอง</button></section>;
}

function SettingsScreen({ night, lampOn, onNight, onLamp, onBack }: { night: boolean; lampOn: boolean; onNight: () => void; onLamp: () => void; onBack: () => void }) {
  return <section className="mobile-flow__screen"><ScreenHeader title="ตั้งค่า" subtitle="ปรับบรรยากาศของห้อง" onBack={onBack} /><div className="flow-settings"><button type="button" onClick={onNight}><span>ช่วงเวลา</span><strong>{night ? 'กลางคืน' : 'กลางวัน'}</strong><b>›</b></button><button type="button" onClick={onLamp}><span>โคมไฟ</span><strong>{lampOn ? 'เปิด' : 'ปิด'}</strong><b>›</b></button><div><span>การเคลื่อนไหว</span><strong>ปกติ</strong><small>รองรับ reduced motion ใน production</small></div></div></section>;
}

function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return <div className="mobile-flow__screen-header"><button type="button" onClick={onBack} aria-label="ย้อนกลับ">←</button><div><h1>{title}</h1><p>{subtitle}</p></div></div>;
}

function BookRow({ book, onClick, large = false }: { book: Book; onClick: () => void; large?: boolean }) {
  return <article className={`flow-book-row${large ? ' is-large' : ''}`}><button type="button" onClick={onClick} className="flow-book-row__main"><div className="flow-book-row__cover" style={{ '--book-color': book.color } as CSSProperties}>{book.coverUrl && <img src={book.coverUrl} alt="" />}<span>{book.title}</span></div><span className="flow-book-row__meta"><strong>{book.title}</strong><small>{book.author ?? 'ไม่ระบุผู้เขียน'}</small><em>{book.status === 'pile' ? 'รออ่าน' : book.status === 'desk' ? 'กำลังอ่าน' : 'อ่านจบแล้ว'}</em></span><b>›</b></button></article>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="flow-empty"><span>⌁</span><p>{text}</p></div>;
}
