(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WeightUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LB_PER_KG = 2.2046226218;
  const LB_PER_STONE = 14;
  const MAX_KG = 1000;

  function kgToLb(kg) { return kg * LB_PER_KG; }
  function lbToKg(lb) { return lb / LB_PER_KG; }
  function kgToStonePounds(kg) {
    const roundedPounds = Math.round(kgToLb(kg) * 10) / 10;
    let stones = Math.floor(roundedPounds / LB_PER_STONE);
    let pounds = Math.round((roundedPounds - stones * LB_PER_STONE) * 10) / 10;
    if (pounds >= LB_PER_STONE) { stones += 1; pounds = 0; }
    return { stones, pounds };
  }
  function stonePoundsToKg(stones, pounds) { return lbToKg(stones * LB_PER_STONE + pounds); }
  function formatNumber(value, digits = 1) {
    return Number(value.toFixed(digits)).toLocaleString('en', { maximumFractionDigits: digits });
  }
  function formatStone(kg) {
    const { stones, pounds } = kgToStonePounds(kg);
    return `${stones} st ${formatNumber(pounds)} lb`;
  }
  function isValidKg(kg) { return Number.isFinite(kg) && kg > 0 && kg <= MAX_KG; }
  function parseWeight(unit, values) {
    let kg;
    if (unit === 'kg' || unit === 'lb') {
      const raw = unit === 'kg' ? values.kg : values.lb;
      if (raw === '' || raw == null) return { error: 'Enter a weight.' };
      const value = Number(raw);
      if (!Number.isFinite(value)) return { error: 'Enter a valid number.' };
      kg = unit === 'kg' ? value : lbToKg(value);
    } else if (unit === 'st') {
      if (values.stones === '' || values.stones == null || values.pounds === '' || values.pounds == null) return { error: 'Enter both stones and pounds.' };
      const stones = Number(values.stones);
      const pounds = Number(values.pounds);
      if (!Number.isInteger(stones) || stones < 0 || !Number.isFinite(pounds) || pounds < 0 || pounds >= LB_PER_STONE) return { error: 'Use whole stones and pounds from 0 to under 14.' };
      kg = stonePoundsToKg(stones, pounds);
    } else return { error: 'Choose a weight unit.' };
    if (!isValidKg(kg)) return { error: 'Enter a weight greater than 0 and no more than 1,000 kg.' };
    return { kg };
  }
  function isValidDate(value, today) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return false;
    const date = new Date(`${value}T12:00:00`);
    return Number.isFinite(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value;
  }
  function progress(start, current, target) {
    const total = Math.abs(start - target);
    if (total < 1e-9) return current === target ? 100 : 0;
    const travelled = (start - current) * Math.sign(start - target);
    return Math.max(0, Math.min(100, (travelled / total) * 100));
  }
  return { LB_PER_KG, LB_PER_STONE, MAX_KG, kgToLb, lbToKg, kgToStonePounds, stonePoundsToKg, formatNumber, formatStone, isValidKg, parseWeight, isValidDate, progress };
});

