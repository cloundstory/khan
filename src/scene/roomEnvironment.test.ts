import { describe, expect, it } from 'vitest';
import { clockAngles, lampIsOn, nextSceneMode, sceneModeForTime } from './roomEnvironment';

function localTime(hour: number, minute = 0, second = 0): Date {
  return new Date(2026, 8, 12, hour, minute, second);
}

describe('sceneModeForTime', () => {
  it('keeps night until dawn, then changes through the approved painted plates', () => {
    expect(sceneModeForTime(localTime(5, 29))).toBe('night');
    expect(sceneModeForTime(localTime(5, 30))).toBe('morning');
    expect(sceneModeForTime(localTime(10, 59))).toBe('morning');
    expect(sceneModeForTime(localTime(11, 0))).toBe('master');
    expect(sceneModeForTime(localTime(18, 14))).toBe('master');
    expect(sceneModeForTime(localTime(18, 15))).toBe('night');
  });
});

describe('lampIsOn', () => {
  it('follows night only in auto mode, while manual choices win', () => {
    expect(lampIsOn('night', 'auto')).toBe(true);
    expect(lampIsOn('master', 'auto')).toBe(false);
    expect(lampIsOn('night', 'off')).toBe(false);
    expect(lampIsOn('morning', 'on')).toBe(true);
  });
});

describe('clockAngles', () => {
  it('uses a smooth minute hand and the correct hour fraction', () => {
    expect(clockAngles(localTime(3, 30, 15))).toEqual({
      hour: 105,
      minute: 181.5,
      second: 90,
    });
  });
});

describe('nextSceneMode', () => {
  it('keeps the manual preview cycle predictable', () => {
    expect(nextSceneMode('morning')).toBe('master');
    expect(nextSceneMode('master')).toBe('night');
    expect(nextSceneMode('night')).toBe('morning');
  });
});
