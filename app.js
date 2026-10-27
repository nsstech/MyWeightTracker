(() => {
  'use strict';
  const U = window.WeightUtils;
  const STORAGE_KEY = 'weightline.v1';
  const $ = (selector) => document.querySelector(selector);
  const state = { entries: [], targetKg: null, unit: 'kg', displayUnit: 'kg', editingId: null };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const inputs = {
    entry: { kg: $('#entry-kg'), lb: $('#entry-lb'), stones: $('#entry-st'), pounds: $('#entry-st-lb') },
    target: { kg: $('#target-kg'), lb: $('#target-lb'), stones: $('#target-st'), pounds: $('#target-st-lb') }
  };

  function showNotice(message) { const el = $('#notice'); el.textContent = message; el.hidden = !message; }
  function showError(kind, message) { const el = $(`#${kind}-error`); el.textContent = message || ''; el.hidden = !message; }
  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (stored.unit === 'kg' || stored.unit === 'lb' || stored.unit === 'st') state.unit = stored.unit;
      if (stored.displayUnit === 'kg' || stored.displayUnit === 'lb' || stored.displayUnit === 'st') state.displayUnit = stored.displayUnit;
      if (U.isValidKg(stored.targetKg)) state.targetKg = stored.targetKg;
      if (Array.isArray(stored.entries)) state.entries = stored.entries.filter(e => e && typeof e.id === 'string' && U.isValidDate(e.date, today()) && U.isValidKg(e.kg)).map(e => ({ id: e.id, date: e.date, kg: e.kg, createdAt: Number.isFinite(e.createdAt) ? e.createdAt : 0 }));
    } catch { showNotice('Saved data could not be read. New entries can still be added.'); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: state.entries, targetKg: state.targetKg, unit: state.unit, displayUnit: state.displayUnit })); return true; }
    catch { showNotice('Could not save to this browser. Check that local storage is enabled and space is available.'); return false; }
  }
  function getValues(kind) { return Object.fromEntries(Object.entries(inputs[kind]).map(([key, input]) => [key, input.value.trim()])); }
  function setInputs(kind, kg) {
    const group = inputs[kind];
    if (kg == null) { Object.values(group).forEach(input => input.value = ''); return; }
    const stone = U.kgToStonePounds(kg);
    group.kg.value = Number(kg.toFixed(3));
    group.lb.value = Number(U.kgToLb(kg).toFixed(3));
    group.stones.value = stone.stones;
    group.pounds.value = stone.pounds;
  }
  function activeInput(kind) {
    const v = getValues(kind);
    return U.parseWeight(state.unit, v);
  }
  function renderConversions(kind) {
    const result = activeInput(kind);
    const el = $(`#${kind}-conversion`);
    if (result.error) { el.textContent = 'Enter a weight to see all units.'; return; }
    el.textContent = `${U.formatNumber(result.kg)} kg  ·  ${U.formatNumber(U.kgToLb(result.kg))} lb  ·  ${U.formatStone(result.kg)}`;
  }
  function switchUnit(unit) {
    if (unit === state.unit) return;
    for (const kind of ['entry', 'target']) {
      const result = activeInput(kind);
      if (!result.error) setInputs(kind, result.kg);
    }
    const previousUnit = state.unit;
    state.unit = unit;
    if (!save()) state.unit = previousUnit;
    renderUnit();
  }
  function renderUnit() {
    document.querySelectorAll('.unit-tab').forEach(button => { const active = button.dataset.unit === state.unit; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    for (const kind of ['entry', 'target']) {
      document.querySelectorAll(`#${kind}-inputs [data-for]`).forEach(el => el.hidden = el.dataset.for !== state.unit);
      renderConversions(kind);
    }
  }
  function sortedEntries() { return [...state.entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt); }
  function displayDate(iso) { return new Date(`${iso}T12:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function formatWeight(kg, unit = state.displayUnit) {
    if (unit === 'lb') return `${U.formatNumber(U.kgToLb(kg))} lb`;
    if (unit === 'st') return U.formatStone(kg);
    return `${U.formatNumber(kg)} kg`;
  }
  function switchDisplayUnit(unit) {
    if (!['kg', 'lb', 'st'].includes(unit) || unit === state.displayUnit) return;
    const previousUnit = state.displayUnit;
    state.displayUnit = unit;
    if (!save()) state.displayUnit = previousUnit;
    renderOverview();
  }
  function renderOverview() {
    const entries = sortedEntries();
    const latest = entries[0];
    const start = entries[entries.length - 1];
    $('#entry-count').textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
    $('#display-unit').value = state.displayUnit;
    $('#starting-weight').textContent = start ? formatWeight(start.kg) : '—';
    $('#starting-sub').textContent = start ? displayDate(start.date) : 'Add your first entry';
    $('#current-weight').textContent = latest ? formatWeight(latest.kg) : '—';
    $('#current-sub').textContent = latest ? displayDate(latest.date) : 'Your latest entry';
    $('#target-weight').textContent = state.targetKg == null ? '—' : formatWeight(state.targetKg);
    $('#target-sub').textContent = state.targetKg == null ? 'Set a target below' : ['kg', 'lb', 'st'].filter(unit => unit !== state.displayUnit).map(unit => formatWeight(state.targetKg, unit)).join(' · ');
    const bar = $('.progress-track');
    let percent = 0, title = 'Set a target to see your progress', detail = 'Your progress will appear after you add a weight and target.';
    if (state.targetKg != null && !latest) { title = 'Add a weight to begin'; detail = 'Your first entry will be your starting weight.'; }
    if (state.targetKg == null && latest) { title = 'Choose a target to begin'; detail = 'Your first entry is your starting weight.'; }
    if (state.targetKg != null && latest) {
      percent = U.progress(start.kg, latest.kg, state.targetKg);
      const remaining = Math.abs(latest.kg - state.targetKg);
      const reached = Math.abs(latest.kg - state.targetKg) < 0.05;
      title = reached ? 'You reached your target!' : `${formatWeight(remaining)} ${latest.kg > state.targetKg ? 'above' : 'below'} target`;
      detail = start.kg === state.targetKg ? 'Your starting weight matched your target.' : `From ${formatWeight(start.kg)} toward ${formatWeight(state.targetKg)}.`;
    }
    $('#progress-title').textContent = title;
    $('#progress-percent').textContent = state.targetKg != null && latest ? `${Math.round(percent)}%` : '—';
    $('#progress-fill').style.width = `${percent}%`;
    $('#progress-detail').textContent = detail;
    bar.setAttribute('aria-valuenow', String(Math.round(percent)));
  }
  function renderHistory() {
    const el = $('#history-list');
    el.replaceChildren();
    const entries = sortedEntries();
    $('#export-csv').disabled = entries.length === 0;
    if (!entries.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.innerHTML = '<span aria-hidden="true">↗</span><strong>Your journey starts here</strong><p>Add your first weight to build your history.</p>'; el.append(empty); return; }
    entries.forEach(entry => {
      const row = document.createElement('div'); row.className = 'history-row';
      const cells = [displayDate(entry.date), `${U.formatNumber(entry.kg)} kg`, `${U.formatNumber(U.kgToLb(entry.kg))} lb`, U.formatStone(entry.kg)];
      cells.forEach((value, index) => { const cell = document.createElement('span'); cell.className = index === 0 ? 'history-date' : 'history-value'; cell.textContent = value; if (index) { const label = document.createElement('small'); label.textContent = ['','Kilograms','Pounds','Stones + pounds'][index]; cell.prepend(label); } row.append(cell); });
      const actions = document.createElement('div'); actions.className = 'row-actions';
      for (const [action, label] of [['edit', 'Edit'], ['delete', 'Delete']]) { const button = document.createElement('button'); button.type = 'button'; button.className = 'row-button'; button.textContent = label; button.dataset.action = action; button.dataset.id = entry.id; button.setAttribute('aria-label', `${label} entry for ${displayDate(entry.date)}`); actions.append(button); }
      row.append(actions); el.append(row);
    });
  }
  function render() {
    renderUnit(); renderOverview(); renderHistory();
    $('#clear-target').hidden = state.targetKg == null;
  }
  function resetEntry() { state.editingId = null; $('#entry-title').textContent = 'Add a weight'; $('#entry-submit').textContent = 'Save weight'; $('#cancel-edit').hidden = true; $('#entry-date').value = today(); setInputs('entry', null); renderConversions('entry'); showError('entry', ''); }
  function startEdit(id) {
    const entry = state.entries.find(item => item.id === id); if (!entry) return;
    state.editingId = id; $('#entry-title').textContent = 'Edit weight'; $('#entry-submit').textContent = 'Update weight'; $('#cancel-edit').hidden = false; $('#entry-date').value = entry.date; setInputs('entry', entry.kg); renderConversions('entry'); showError('entry', ''); $('.entry-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#entry-date').focus({ preventScroll: true });
  }
  function submitEntry(event) {
    event.preventDefault(); showError('entry', '');
    const date = $('#entry-date').value;
    if (!U.isValidDate(date, today())) { showError('entry', 'Choose a valid date that is not in the future.'); return; }
    const result = activeInput('entry');
    if (result.error) { showError('entry', result.error); return; }
    const snapshot = state.entries.map(entry => ({ ...entry }));
    if (state.editingId) { const entry = state.entries.find(item => item.id === state.editingId); if (!entry) return; entry.date = date; entry.kg = result.kg; }
    else state.entries.push({ id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, date, kg: result.kg, createdAt: Date.now() });
    if (!save()) { state.entries = snapshot; render(); return; }
    showNotice(state.editingId ? 'Weight updated.' : 'Weight saved.'); resetEntry(); render();
  }
  function submitTarget(event) {
    event.preventDefault(); showError('target', '');
    const result = activeInput('target'); if (result.error) { showError('target', result.error); return; }
    const old = state.targetKg; state.targetKg = result.kg;
    if (!save()) { state.targetKg = old; return; }
    setInputs('target', state.targetKg); showNotice('Target saved.'); render();
  }
  function clearTarget() { const old = state.targetKg; state.targetKg = null; if (!save()) { state.targetKg = old; return; } setInputs('target', null); showError('target', ''); showNotice('Target removed.'); render(); }
  function resetApp() {
    if (!window.confirm('Reset My Weight Tracker? This permanently deletes all saved weight entries, target, and unit preferences from this browser. This cannot be undone.')) return;
    try { localStorage.removeItem(STORAGE_KEY); }
    catch { showNotice('Could not clear saved data from this browser. Check that local storage is enabled.'); return; }
    state.entries = [];
    state.targetKg = null;
    state.unit = 'kg';
    state.displayUnit = 'kg';
    resetEntry();
    setInputs('target', null);
    showError('target', '');
    render();
    showNotice('App reset. All saved data has been cleared.');
  }
  function exportHistory() {
    const entries = sortedEntries();
    if (!entries.length) return;
    const blob = new Blob(['\uFEFF', U.historyCsv(entries)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-weight-tracker-history-${today()}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function deleteEntry(id) {
    const entry = state.entries.find(item => item.id === id); if (!entry) return;
    if (!window.confirm(`Delete the weight entry for ${displayDate(entry.date)}?`)) return;
    const old = state.entries; state.entries = old.filter(item => item.id !== id);
    if (!save()) { state.entries = old; return; }
    if (state.editingId === id) resetEntry(); showNotice('Weight deleted.'); render();
  }
  load(); $('#entry-date').value = today(); $('#entry-date').max = today(); setInputs('target', state.targetKg); render();
  document.querySelectorAll('.unit-tab').forEach(button => button.addEventListener('click', () => switchUnit(button.dataset.unit)));
  $('#display-unit').addEventListener('change', event => switchDisplayUnit(event.target.value));
  for (const kind of ['entry', 'target']) Object.values(inputs[kind]).forEach(input => input.addEventListener('input', () => { showError(kind, ''); renderConversions(kind); }));
  $('#entry-form').addEventListener('submit', submitEntry);
  $('#target-form').addEventListener('submit', submitTarget);
  $('#cancel-edit').addEventListener('click', resetEntry);
  $('#clear-target').addEventListener('click', clearTarget);
  $('#export-csv').addEventListener('click', exportHistory);
  $('#reset-app').addEventListener('click', resetApp);
  $('#history-list').addEventListener('click', event => { const button = event.target.closest('button[data-action]'); if (!button) return; if (button.dataset.action === 'edit') startEdit(button.dataset.id); else deleteEntry(button.dataset.id); });
})();

