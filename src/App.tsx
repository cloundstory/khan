import { useEffect } from 'react';
import { useApp } from './store/useApp';
import Room from './screens/Room';
import BookSheet from './screens/BookSheet';
import SessionScreen from './screens/SessionScreen';
import Capture from './screens/Capture';
import Closing from './screens/Closing';
import AddBook from './screens/AddBook';
import Board from './screens/Board';
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
      {screen.name === 'room' && <Room />}
      {screen.name === 'book' && <BookSheet bookId={screen.bookId} />}
      {screen.name === 'capture' && <Capture bookId={screen.bookId} />}
      {screen.name === 'closing' && <Closing bookId={screen.bookId} />}
      {screen.name === 'board' && (
        <Board
          bookId={screen.bookId}
          fromSession={screen.fromSession}
          resumeOnBack={screen.resumeOnBack}
        />
      )}
      {screen.name === 'add' && <AddBook />}
      {screen.name === 'settings' && <Settings />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
