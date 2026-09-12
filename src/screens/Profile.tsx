import { useEffect, useMemo, useRef, useState } from 'react';
import type { Book } from '../db/schema';
import { progressRatio } from '../lib/format';
import { useCoverPhoto } from '../lib/useCoverPhoto';
import { formatReadingTime, readingMonth, readingStreak } from '../lib/profile';
import { openBookId } from '../lib/stats';
import { SCENE_CHARACTERS } from '../scene/characterManifest';
import { useApp } from '../store/useApp';

const WEEKDAYS = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];

function bookProgressLabel(book: Book): string {
  const progress = progressRatio(book);
  return progress == null ? 'On desk' : `${Math.round(progress * 100)}% complete · On desk`;
}

function CurrentBook({ book, onOpen }: { book: Book; onOpen: () => void }) {
  const coverPhoto = useCoverPhoto(book.id, book.hasCoverPhoto);
  const cover = coverPhoto ?? book.coverUrl;
  const progress = progressRatio(book);

  return (
    <button className="profile-current-card" type="button" onClick={onOpen}>
      <span className="profile-current-cover" style={{ '--cover': book.color } as React.CSSProperties}>
        {cover && <img src={cover} alt="" crossOrigin={coverPhoto ? undefined : 'anonymous'} />}
      </span>
      <span className="profile-current-copy">
        <strong>{book.title}</strong>
        <small>{bookProgressLabel(book)}</small>
        {progress != null && <i aria-hidden="true"><b style={{ width: `${Math.round(progress * 100)}%` }} /></i>}
      </span>
      <span className="profile-arrow" aria-hidden="true">→</span>
    </button>
  );
}

export default function Profile() {
  const {
    books,
    sessions,
    readerProfile,
    sceneCosmetics,
    go,
    saveReaderProfile,
  } = useApp();
  const [about, setAbout] = useState(readerProfile.about);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<number | undefined>();
  const saveVersion = useRef(0);
  const lastSavedAbout = useRef(readerProfile.about);
  const aboutRef = useRef(readerProfile.about);

  const desk = useMemo(() => books.filter((book) => book.status === 'desk'), [books]);
  const activeDeskBook = useMemo(() => {
    const openId = openBookId(desk, sessions);
    return desk.find((book) => book.id === openId) ?? desk[0];
  }, [desk, sessions]);
  const finished = useMemo(() => books.filter((book) => book.status === 'shelf').length, [books]);
  const calendar = useMemo(() => readingMonth(sessions), [sessions]);
  const streak = useMemo(() => readingStreak(sessions), [sessions]);
  const portrait = SCENE_CHARACTERS[sceneCosmetics.characterId].poses.window[0];

  useEffect(() => {
    const previousSaved = lastSavedAbout.current;
    // Do not replace a newer local keystroke when an older debounced write returns.
    if (aboutRef.current === previousSaved) {
      aboutRef.current = readerProfile.about;
      setAbout(readerProfile.about);
    }
    lastSavedAbout.current = readerProfile.about;
  }, [readerProfile.about]);

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
  }, []);

  async function persistAbout(value: string) {
    if (value === lastSavedAbout.current) return;
    const version = ++saveVersion.current;
    setSaveState('saving');
    await saveReaderProfile({ about: value });
    if (version !== saveVersion.current) return;
    lastSavedAbout.current = value;
    setSaveState('saved');
    window.setTimeout(() => {
      if (version === saveVersion.current) setSaveState('idle');
    }, 1250);
  }

  function changeAbout(value: string) {
    aboutRef.current = value;
    setAbout(value);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = undefined;
      void persistAbout(value);
    }, 550);
  }

  function saveAboutNow() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    void persistAbout(about);
  }

  function openEvidenceBoard() {
    if (activeDeskBook) return go({ name: 'board', bookId: activeDeskBook.id });
    go({ name: 'browse', focus: books.some((book) => book.status === 'pile') ? 'pile' : 'desk' });
  }

  return (
    <main className="page profile-page">
      <header className="profile-topbar">
        <button className="profile-topbar__button" type="button" onClick={() => go({ name: 'room' })} aria-label="Back to room">‹</button>
        <h1>Profile</h1>
        <button className="profile-settings-link" type="button" onClick={() => go({ name: 'settings' })}>Settings</button>
      </header>

      <section className="profile-identity" aria-label="Reader profile">
        <div className="profile-identity__copy">
          <h2>Reader 01</h2>
          <label htmlFor="profile-about">About me</label>
          <textarea
            id="profile-about"
            value={about}
            maxLength={360}
            rows={3}
            placeholder="Write something about yourself..."
            onChange={(event) => changeAbout(event.target.value)}
            onBlur={saveAboutNow}
          />
          <span className="profile-save-state" aria-live="polite">
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
          </span>
        </div>
        <div className="profile-thought-portrait" aria-hidden="true">
          <img src={import.meta.env.BASE_URL + portrait.src} alt="" />
        </div>
      </section>

      <section className="profile-section" aria-labelledby="current-reading-heading">
        <div className="profile-section__heading">
          <h2 id="current-reading-heading">Currently reading</h2>
          {activeDeskBook && <button type="button" onClick={() => go({ name: 'book', bookId: activeDeskBook.id })}>View details →</button>}
        </div>
        {activeDeskBook ? (
          <CurrentBook book={activeDeskBook} onOpen={() => go({ name: 'book', bookId: activeDeskBook.id })} />
        ) : (
          <button className="profile-empty-book" type="button" onClick={() => go({ name: 'browse', focus: 'pile' })}>
            <span>No book on your desk</span><b>Browse pile →</b>
          </button>
        )}
      </section>

      <section className="profile-section" aria-labelledby="reading-rhythm-heading">
        <div className="profile-section__heading">
          <h2 id="reading-rhythm-heading">Reading rhythm</h2>
          <span>{calendar.label}</span>
        </div>
        <div className="profile-rhythm-card">
          <strong>{streak} day streak</strong>
          <div className="profile-calendar" role="grid" aria-label={`Reading calendar for ${calendar.label}`}>
            {WEEKDAYS.map((day) => <span className="profile-calendar__weekday" key={day} role="columnheader">{day}</span>)}
            {Array.from({ length: calendar.leadingBlanks }, (_, index) => <span className="profile-calendar__blank" key={`blank-${index}`} aria-hidden="true" />)}
            {calendar.days.map((day) => (
              <span
                className={'profile-calendar__day' + (day.read ? ' is-read' : '') + (day.today ? ' is-today' : '') + (day.future ? ' is-future' : '')}
                key={day.key}
                role="gridcell"
                aria-label={`${day.key}${day.read ? ', read' : ''}`}
              >
                {day.day}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="profile-section" aria-labelledby="reading-record-heading">
        <div className="profile-section__heading">
          <h2 id="reading-record-heading">Reading record</h2>
          <span>All time</span>
        </div>
        <div className="profile-record">
          <div><strong>{String(finished).padStart(2, '0')}</strong><span>Finished</span></div>
          <div><strong>{String(sessions.length).padStart(2, '0')}</strong><span>Sessions</span></div>
          <div><strong>{formatReadingTime(sessions)}</strong><span>Reading time</span></div>
        </div>
      </section>

      <nav className="profile-shortcuts" aria-label="Profile shortcuts">
        <button type="button" onClick={() => go({ name: 'browse' })}>My library <b aria-hidden="true">→</b></button>
        <button type="button" onClick={openEvidenceBoard}>Evidence board <b aria-hidden="true">→</b></button>
      </nav>
    </main>
  );
}
