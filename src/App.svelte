<script lang="ts">
  import { onMount } from 'svelte';
  import { DEFAULT_ITEMS, addItem, allDone, dayKey, doneCount, itemText, removeItem, ticksFor, toggle, type Item, type Ticked } from './checklist';
  import { t, setLanguage, currentLanguage } from './i18n/index.svelte';
  import { paletteFrom, glassFrom, tintTextFrom, type Palette, type Glass } from './palette';
  import { offerTracker } from './tracker-offer';
  import { onPrefsChange } from './prefs-live';

  let plugin: any;
  let view = $state<'modal' | 'widget'>('modal');
  let palette = $state<Palette>(paletteFrom(undefined));
  let glass = $state<Glass>(glassFrom(undefined));
  let tintText = $state(tintTextFrom(undefined));
  let scale = $state(1);
  let items = $state<Item[]>(DEFAULT_ITEMS);
  let ticked = $state<Ticked>({});
  let nights = $state(0);
  let logged = $state(false);
  let ready = $state(false);
  let newItem = $state('');

  const count = $derived(doneCount(items, ticked));
  const complete = $derived(allDone(items, ticked));

  const applyNomieValues = () => {
    if (!plugin?.prefs) return;
    palette = paletteFrom(plugin.prefs);
    setLanguage(plugin.prefs?.language);
    glass = glassFrom(plugin.prefs);
    tintText = tintTextFrom(plugin.prefs);
    scale = plugin.prefs.fontScale || 1;
  };

  const save = () => plugin.storage.setItem('winddown', { items: $state.snapshot(items), ticked: $state.snapshot(ticked), day: dayKey(new Date()), nights, logged });

  const load = async () => {
    await plugin.storage.init();
    const saved = plugin.storage.getItem('winddown') || {};
    items = saved.items?.length ? saved.items : DEFAULT_ITEMS;
    nights = saved.nights || 0;
    ticked = ticksFor(saved, dayKey(new Date()));
    logged = saved.day === dayKey(new Date()) && !!saved.logged;
    ready = true;
  };

  const tap = async (id: string) => {
    const result = toggle(items, ticked, id, logged);
    ticked = result.ticked;
    if (result.logNight) {
      logged = true;
      nights += 1;
      plugin.createNote('Wind-down done: the whole evening list #sleep');
    }
    await save();
  };

  const add = async () => {
    items = addItem(items, newItem, Date.now());
    newItem = '';
    await save();
  };

  const remove = async (id: string) => {
    items = removeItem(items, id);
    await save();
  };

  const resetDay = async () => {
    ticked = {};
    logged = false;
    await save();
  };

  onMount(() => {
    plugin = new NomiePlugin({
      name: 'Nomie Wind-down',
      emoji: '🌙',
      description: 'A wind-down checklist for the evening. When the whole list is done, it goes into your timeline.',
      uses: ['createNote', 'confirm', 'getStorageItem', 'setStorageItem', 'getTrackable', 'openTrackableEditor'],
      version: '2.0',
      addToCaptureMenu: true,
      addToMoreMenu: true,
      addToWidgets: true,
    });
    onPrefsChange(plugin, () => applyNomieValues());
  plugin.onRegistered(async () => {
      applyNomieValues();
      await load();
    });
    plugin.onWidget(async () => {
      view = 'widget';
      applyNomieValues();
      if (!ready) await load();
    });
    plugin.onUIOpened(async () => {
      view = 'modal';
      applyNomieValues();
      offerTracker(plugin, { tag: 'sleep', label: t('trackerLabel'), emoji: '🌙', color: '#5856D6' });
      if (!ready) await load();
    });
  });
</script>

<div class="card" class:widget={view === 'widget'} style="--page: {palette.page}; --card: {palette.card}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --fill: {palette.fill}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --good: {palette.good}; --good-soft: {palette.goodSoft}; --tint-text: {tintText}; --glass-fill: {glass.fill}; --glass-edge: {glass.edge}; --glass-blur: {glass.blur}; --glass-shadow: {glass.shadow}; --scale: {scale};">
  {#if view === 'widget'}
    <div class="head">
      <span aria-hidden="true">🌙</span>
      <span>{count} / {items.length}</span>
      <span class="meta">{t('nightsShort', { n: nights, unit: nights === 1 ? t('nightOne') : t('nightMany') })}</span>
    </div>
    <ul class="compact">
      {#each items.filter((i) => !ticked[i.id]).slice(0, 3) as item (item.id)}
        <li><button class="tick" onclick={() => tap(item.id)}>○ {itemText(item)}</button></li>
      {:else}
        <li class="done">{t('allDoneTonight')}</li>
      {/each}
    </ul>
  {:else}
    <header class="top"><h1>{t('title')}</h1></header>
    <p class="muted">{t('line', { count, total: items.length, nights, unit: nights === 1 ? t('nightOne') : t('nightMany') })}</p>

    <section class="panel list">
      {#each items as item (item.id)}
        <div class="item">
          <button class="tick" class:on={ticked[item.id]} onclick={() => tap(item.id)} aria-pressed={!!ticked[item.id]}>
            <span class="box">{ticked[item.id] ? '✓' : ''}</span>
            <span class:struck={ticked[item.id]}>{itemText(item)}</span>
          </button>
          <button class="remove" aria-label={t('removeAria', { item: itemText(item) })} onclick={() => remove(item.id)}>×</button>
        </div>
      {/each}
    </section>

    {#if complete}
      <section class="panel done-banner">{t('wholeDone')}</section>
    {/if}

    <section class="panel add">
      <input class="input" placeholder={t('addPlaceholder')} bind:value={newItem} onkeydown={(e) => e.key === 'Enter' && add()} />
      <button class="primary" onclick={add}>{t('add')}</button>
    </section>
    <button class="ghost" onclick={resetDay}>{t('restart')}</button>
  {/if}
</div>

<style>
  /* the app's text: its iOS font stack, with the app's smoothing */
  :global(body) { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; -webkit-font-smoothing: antialiased; --ios-font-rounded: ui-rounded, -apple-system, system-ui, sans-serif; }
  /* the header is a Liquid Glass bar (D-glass): it stays at the top and the content scrolls under it */
  .top { position: sticky; top: 0; z-index: 2; margin: -16px -16px 8px; padding: 16px 16px 10px; background: var(--glass-fill); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--glass-edge); }
  .card { box-sizing: border-box; min-height: 100vh; padding: 16px; background: var(--page); color: var(--text); font-size: calc(16px * var(--scale)); line-height: 1.4; }
  .card.widget { min-height: 0; padding: 12px; font-size: calc(14px * var(--scale)); }
  h1 { margin: 0; font-size: calc(26px * var(--scale)); font-weight: 700; }
  .muted { margin: 4px 0; color: var(--muted); }
  .panel { padding: 8px 16px; border-radius: 16px; background: var(--card); margin-bottom: 12px; }
  .head { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .meta { margin-left: auto; color: var(--muted); }
  .compact { list-style: none; margin: 8px 0 0; padding: 0; }
  .compact li { padding: 4px 0; }
  .compact .done { color: var(--muted); }
  .item { display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--line); }
  .item:first-child { border-top: 0; }
  .tick { display: flex; align-items: center; gap: 12px; flex: 1; padding: 12px 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .box { width: 24px; height: 24px; border-radius: 7px; border: 2px solid var(--muted); display: inline-flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  .tick.on .box { background: var(--good); border-color: var(--good); color: #fff; }
  .struck { text-decoration: line-through; color: var(--muted); }
  .remove { border: 0; background: transparent; color: var(--muted); font-size: 20px; cursor: pointer; }
  .done-banner { background: var(--good-soft); color: var(--good); font-weight: 600; }
  .add { display: flex; gap: 8px; align-items: center; }
  .input { flex: 1; min-width: 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--page); color: var(--text); font: inherit; }
  .primary, .ghost { padding: 10px 14px; border-radius: 12px; font: inherit; font-weight: 600; cursor: pointer; border: 0; }
  .primary { background: var(--tint); color: var(--on-tint); }
  .ghost { background: var(--fill); color: var(--text); width: 100%; }
</style>
