// The wind-down checklist as plain rules, so they can be tested without the app.
export type Item = { id: string; text: string };
export type Ticked = Record<string, boolean>;

export const DEFAULT_ITEMS: Item[] = [
  { id: 'screens', text: 'Screens away' },
  { id: 'tidy', text: 'Tidy one thing' },
  { id: 'tomorrow', text: "Write tomorrow's first step" },
  { id: 'teeth', text: 'Brush teeth' },
  { id: 'breathe', text: 'Three slow breaths' },
];

// A day key such as 2026-10-24, in local time
export const dayKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

export const doneCount = (items: Item[], ticked: Ticked): number => items.filter((i) => ticked[i.id]).length;

export const allDone = (items: Item[], ticked: Ticked): boolean => items.length > 0 && doneCount(items, ticked) === items.length;

// Ticks or unticks one item. The night is logged once, the first time the whole list is done.
export const toggle = (
  items: Item[],
  ticked: Ticked,
  id: string,
  logged: boolean
): { ticked: Ticked; logNight: boolean; logged: boolean } => {
  const next = { ...ticked, [id]: !ticked[id] };
  const complete = allDone(items, next);
  const logNight = complete && !logged;
  return { ticked: next, logNight, logged: logged || complete };
};

export const addItem = (items: Item[], text: string, now: number): Item[] => {
  const clean = text.trim();
  return clean ? [...items, { id: `i${now}`, text: clean }] : items;
};

export const removeItem = (items: Item[], id: string): Item[] => items.filter((i) => i.id !== id);

// The list for today: the ticks are kept only on the day they were made
export const ticksFor = (saved: { day?: string; ticked?: Ticked } | undefined, today: string): Ticked =>
  saved?.day === today ? saved.ticked ?? {} : {};
