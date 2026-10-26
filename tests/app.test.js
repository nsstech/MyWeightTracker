const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const U = require('../weight-utils');

test('conversion helpers round-trip and normalize stones', () => {
  assert.ok(Math.abs(U.lbToKg(U.kgToLb(72.5)) - 72.5) < 1e-10);
  assert.deepEqual(U.kgToStonePounds(U.lbToKg(154)), { stones: 11, pounds: 0 });
  assert.equal(U.parseWeight('st', { stones: '11', pounds: '6' }).kg, U.lbToKg(160));
  assert.equal(U.parseWeight('st', { stones: '11', pounds: '14' }).error, 'Use whole stones and pounds from 0 to under 14.');
  assert.ok(U.parseWeight('kg', { kg: '0' }).error);
  assert.ok(U.parseWeight('kg', { kg: '1001' }).error);
  assert.equal(U.isValidDate('2026-02-29', '2026-10-26'), false);
  assert.equal(U.isValidDate('2026-10-27', '2026-10-26'), false);
  assert.equal(U.progress(80, 75, 70), 50);
  assert.equal(U.progress(70, 75, 80), 50);
});

class Element {
  constructor() { this._value = ''; this.textContent = ''; this.hidden = false; this.children = []; this.listeners = {}; this.dataset = {}; this.style = {}; this.attributes = {}; this.classList = { toggle() {} }; }
  get value() { return this._value; }
  set value(value) { this._value = String(value); }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  dispatch(type, event = {}) { this.listeners[type]?.({ preventDefault() {}, target: this, ...event }); }
  setAttribute(key, value) { this.attributes[key] = value; }
  append(...items) { this.children.push(...items); }
  prepend(item) { this.children.unshift(item); }
  replaceChildren(...items) { this.children = items; }
  remove() {}
  scrollIntoView() {}
  focus() {}
  closest() { return this; }
}

function createApp(storage = new Map()) {
  const ids = new Map();
  const names = ['notice','display-unit','entry-count','starting-weight','starting-sub','current-weight','current-sub','target-weight','target-sub','progress-title','progress-percent','progress-fill','progress-detail','entry-date','entry-kg','entry-lb','entry-st','entry-st-lb','target-kg','target-lb','target-st','target-st-lb','entry-conversion','target-conversion','entry-error','target-error','entry-title','entry-submit','cancel-edit','clear-target','export-csv','entry-form','target-form','history-list'];
  names.forEach(name => ids.set(name, new Element()));
  const tabs = ['kg','lb','st'].map(unit => { const el = new Element(); el.dataset.unit = unit; return el; });
  const groups = { entry: ['kg','lb','st'].map(unit => { const el = new Element(); el.dataset.for = unit; return el; }), target: ['kg','lb','st'].map(unit => { const el = new Element(); el.dataset.for = unit; return el; }) };
  const progress = new Element();
  const downloads = [];
  const blobs = new Map();
  const context = {
    window: { WeightUtils: U, confirm: () => true },
    document: { querySelector(selector) { if (selector.startsWith('#')) return ids.get(selector.slice(1)); if (selector === '.progress-track') return progress; if (selector === '.entry-panel') return new Element(); throw Error(selector); }, querySelectorAll(selector) { if (selector === '.unit-tab') return tabs; const match = selector.match(/^#(entry|target)-inputs \[data-for\]$/); if (match) return groups[match[1]]; throw Error(selector); }, createElement(tag) { const el = new Element(); if (tag === 'a') el.click = () => downloads.push({ filename: el.download, content: blobs.get(el.href).parts.join('') }); return el; }, body: { append() {} } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    crypto: { randomUUID: () => `id-${storage.size}-${Math.random()}` },
    Blob: class { constructor(parts) { this.parts = parts; } },
    URL: { createObjectURL(blob) { const url = `blob:test-${blobs.size}`; blobs.set(url, blob); return url; }, revokeObjectURL() {} },
    setTimeout: callback => callback(),
    Date, Math, Number, JSON, String,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), context);
  return { ids, tabs, storage, progress, downloads, saved: () => JSON.parse(storage.get('weightline.v1')) };
}

test('entry, target, unit preference, edit, and delete persist correctly', () => {
  const app = createApp();
  const el = name => app.ids.get(name);
  el('entry-kg').value = '80';
  el('entry-kg').dispatch('input');
  assert.match(el('entry-conversion').textContent, /176\.4 lb/);
  el('entry-form').dispatch('submit');
  assert.equal(app.saved().entries.length, 1);
  assert.equal(app.saved().entries[0].kg, 80);
  el('target-kg').value = '70';
  el('target-form').dispatch('submit');
  assert.equal(app.saved().targetKg, 70);
  app.tabs[1].dispatch('click');
  assert.equal(app.saved().unit, 'lb');
  assert.equal(el('target-lb').value, String(Number(U.kgToLb(70).toFixed(3))));
  el('entry-date').value = '2026-10-20';
  el('entry-lb').value = '165';
  el('entry-form').dispatch('submit');
  assert.equal(app.saved().entries.length, 2);
  const latest = app.saved().entries.find(e => e.date === '2026-10-20');
  assert.ok(Math.abs(latest.kg - U.lbToKg(165)) < 1e-9);
  assert.equal(el('progress-percent').textContent, '0%'); // Latest is by date, not insertion order.
  const row = el('history-list').children.find(row => row.children.at(-1)?.children?.[0]?.dataset?.id === latest.id);
  el('history-list').dispatch('click', { target: row.children.at(-1).children[0] });
  assert.equal(el('entry-title').textContent, 'Edit weight');
  el('entry-date').value = '2026-10-21';
  el('entry-lb').value = '160';
  el('entry-form').dispatch('submit');
  assert.equal(app.saved().entries.find(e => e.id === latest.id).date, '2026-10-21');
  assert.ok(Math.abs(app.saved().entries.find(e => e.id === latest.id).kg - U.lbToKg(160)) < 1e-9);
  const updatedRow = el('history-list').children.find(row => row.children.at(-1)?.children?.[0]?.dataset?.id === latest.id);
  el('history-list').dispatch('click', { target: updatedRow.children.at(-1).children[1] });
  assert.equal(app.saved().entries.length, 1);
  el('clear-target').dispatch('click');
  assert.equal(app.saved().targetKg, null);
});

test('invalid entry and future date do not save', () => {
  const app = createApp(); const el = name => app.ids.get(name);
  el('entry-kg').value = '-3'; el('entry-form').dispatch('submit');
  assert.match(el('entry-error').textContent, /greater than 0/);
  el('entry-kg').value = '75'; el('entry-date').value = '9999-01-01'; el('entry-form').dispatch('submit');
  assert.match(el('entry-error').textContent, /valid date/);
  assert.equal(app.storage.size, 0);
});

test('saved entries, target, and unit load after reopening', () => {
  const first = createApp(); const el = name => first.ids.get(name);
  el('entry-kg').value = '72.5'; el('entry-form').dispatch('submit');
  el('target-kg').value = '68'; el('target-form').dispatch('submit');
  first.tabs[2].dispatch('click');
  const reopened = createApp(first.storage);
  assert.equal(reopened.ids.get('entry-count').textContent, '1 entry');
  assert.equal(reopened.ids.get('target-weight').textContent, '68 kg');
  assert.equal(reopened.tabs[2].attributes['aria-pressed'], 'true');
});

test('stat unit choice updates cards and progress without changing stored kilograms', () => {
  const app = createApp(); const el = name => app.ids.get(name);
  el('entry-kg').value = '80'; el('entry-form').dispatch('submit');
  el('target-kg').value = '70'; el('target-form').dispatch('submit');
  assert.equal(el('current-weight').textContent, '80 kg');
  el('display-unit').value = 'lb'; el('display-unit').dispatch('change');
  assert.equal(el('current-weight').textContent, `${U.formatNumber(U.kgToLb(80))} lb`);
  assert.match(el('progress-title').textContent, /22 lb above target/);
  assert.match(el('progress-detail').textContent, /lb toward/);
  assert.equal(app.saved().displayUnit, 'lb');
  el('display-unit').value = 'st'; el('display-unit').dispatch('change');
  assert.equal(el('starting-weight').textContent, U.formatStone(80));
  assert.equal(el('target-weight').textContent, U.formatStone(70));
  assert.match(el('progress-title').textContent, /st .* lb above target/);
  assert.equal(app.saved().entries[0].kg, 80);
  const reopened = createApp(app.storage);
  assert.equal(reopened.ids.get('display-unit').value, 'st');
  assert.equal(reopened.ids.get('current-weight').textContent, U.formatStone(80));
});

test('history exports a UTF-8 CSV with canonical kilograms and converted values', () => {
  const app = createApp(); const el = name => app.ids.get(name);
  assert.equal(el('export-csv').disabled, true);
  el('export-csv').dispatch('click');
  assert.equal(app.downloads.length, 0);
  el('entry-kg').value = '72.5'; el('entry-form').dispatch('submit');
  assert.equal(el('export-csv').disabled, false);
  el('export-csv').dispatch('click');
  assert.equal(app.downloads.length, 1);
  assert.match(app.downloads[0].filename, /^my-weight-tracker-history-\d{4}-\d{2}-\d{2}\.csv$/);
  assert.equal(app.downloads[0].content, `\uFEFFDate,Kilograms,Pounds,Stones + pounds\r\n${app.saved().entries[0].date},72.5,${Number(U.kgToLb(72.5).toFixed(6))},${U.formatStone(72.5)}\r\n`);
});

