import { useEffect } from 'react';
import { useApp } from './store/useApp';
import HomeScene from './screens/HomeScene';
import Room from './screens/Room';
import BookSheet from './screens/BookSheet';
import SessionScreen from './screens/SessionScreen';
import Capture from './screens/Capture';
import Closing from './screens/Closing';
import AddBook from './screens/AddBook';
import Board from './screens/Board';
import Profile from './screens/Profile';
import Settings from './screens/Settings';

export default function App() {
  const { screen, loading, active, refresh, go, toast } = useApp();

  useEffect(() => {
    refresh();
  }, [refresh]);

  // เปิดแอปมาแล้วมี session ค้างอยู่ (ปิดแท็บกลางคัน) → กลับเข้าหน้าอ่าน
  useEffect(() => {
    if (!loading && active && screen.name === 'room') {
      go({ name: 'session', bookId: active.bookId });
    }
    // ตั้งใจให้ทำครั้งเดียวตอนโหลดเสร็จ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) {
    return <div className="app"><div className="page" /></div>;
  }

  if (screen.name === 'session') {
    return (
      <>
        <SessionScreen bookId={screen.bookId} />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  return (
    <div className="app">
      {/* filter เส้นวาดมือใช้ร่วมทั้งแอป — ใส่ class "hand-line" ที่ svg/ไอคอนไหนก็ได้ */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <filter id="hand" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {screen.name === 'room' && <HomeScene />}
      {screen.name === 'browse' && <Room focus={screen.focus} />}
      {screen.name === 'book' && <BookSheet bookId={screen.bookId} />}
      {screen.name === 'capture' && <Capture bookId={screen.bookId} />}
      {screen.name === 'closing' && <Closing bookId={screen.bookId} />}
      {screen.name === 'board' && <Board bookId={screen.bookId} />}
      {screen.name === 'add' && <AddBook />}
      {screen.name === 'profile' && <Profile />}
      {screen.name === 'settings' && <Settings />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
