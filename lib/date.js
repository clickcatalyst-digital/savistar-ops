// lib/date.js — local-calendar-date ISO formatting.
// Never use `.toISOString().slice(0, 10)` for "today"/local dates: it converts through UTC
// first, which shifts the calendar day for any timezone that isn't UTC+0 (e.g. IST, UTC+5:30).
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function todayMonth() {
  return todayISO().slice(0, 7);
}
