import { describe, expect, it } from 'vitest';
import { DEFAULT_ITEMS, addItem, allDone, doneCount, removeItem, ticksFor, toggle } from '../checklist';

describe('the wind-down checklist', () => {
  it('counts the ticked items', () => {
    expect(doneCount(DEFAULT_ITEMS, { screens: true, teeth: true })).toBe(2);
  });

  it('logs the night once, when the whole list is done', () => {
    let state = { ticked: {}, logNight: false, logged: false };
    for (const item of DEFAULT_ITEMS.slice(0, -1)) {
      state = { ...toggle(DEFAULT_ITEMS, state.ticked, item.id, state.logged) };
    }
    expect(state.logNight).toBe(false);
    const last = toggle(DEFAULT_ITEMS, state.ticked, DEFAULT_ITEMS[DEFAULT_ITEMS.length - 1].id, state.logged);
    expect(last.logNight).toBe(true);
    expect(toggle(DEFAULT_ITEMS, last.ticked, 'screens', true).logNight).toBe(false);
  });

  it('unticking an item does not log anything', () => {
    const ticked = Object.fromEntries(DEFAULT_ITEMS.map((i) => [i.id, true]));
    expect(toggle(DEFAULT_ITEMS, ticked, 'teeth', false).logNight).toBe(false);
  });

  it('adds a trimmed item, and ignores an empty one', () => {
    expect(addItem(DEFAULT_ITEMS, '  Stretch  ', 5).at(-1)).toEqual({ id: 'i5', text: 'Stretch' });
    expect(addItem(DEFAULT_ITEMS, '   ', 5)).toBe(DEFAULT_ITEMS);
  });

  it('removes an item by id', () => {
    expect(removeItem(DEFAULT_ITEMS, 'teeth').some((i) => i.id === 'teeth')).toBe(false);
  });

  it('keeps the ticks only for the day they were made', () => {
    expect(ticksFor({ day: '2026-10-24', ticked: { teeth: true } }, '2026-10-24')).toEqual({ teeth: true });
    expect(ticksFor({ day: '2026-10-23', ticked: { teeth: true } }, '2026-10-24')).toEqual({});
    expect(allDone(DEFAULT_ITEMS, {})).toBe(false);
  });
});
