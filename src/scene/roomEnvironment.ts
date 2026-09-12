/** The three approved painted room plates. */
export type SceneMode = 'master' | 'morning' | 'night';

/** `auto` follows the time of day; the other values are a saved manual choice. */
export type LampMode = 'auto' | 'on' | 'off';

export interface ClockAngles {
  hour: number;
  minute: number;
  second: number;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Maps local time to the approved A/B/C room plates. There is no location
 * lookup: the room always respects the reader's own clock.
 */
export function sceneModeForTime(date: Date): SceneMode {
  const minutes = minutesSinceMidnight(date);
  if (minutes >= 18 * 60 + 15 || minutes < 5 * 60 + 30) return 'night';
  if (minutes < 11 * 60) return 'morning';
  return 'master';
}

/** Cycle a preview through the approved plates in their visual order. */
export function nextSceneMode(mode: SceneMode): SceneMode {
  if (mode === 'morning') return 'master';
  if (mode === 'master') return 'night';
  return 'morning';
}

export function lampIsOn(mode: SceneMode, lampMode: LampMode): boolean {
  if (lampMode === 'on') return true;
  if (lampMode === 'off') return false;
  return mode === 'night';
}

/** SVG rotation angles whose zero points straight up at twelve o'clock. */
export function clockAngles(date: Date): ClockAngles {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours();
  return {
    second: seconds * 6,
    minute: minutes * 6 + seconds * 0.1,
    hour: (hours % 12) * 30 + minutes * 0.5,
  };
}
