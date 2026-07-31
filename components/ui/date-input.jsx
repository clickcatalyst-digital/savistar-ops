'use client';

import * as React from 'react';
import { Input } from './input';

// DD/MM/YYYY masked text input. value/onChange are ISO (YYYY-MM-DD) so every existing
// caller (todayISO(), DB columns) is unaffected — only the displayed text changes.
// ponytail: manual typing only, no calendar popup — add one if that's missed later.
function isoToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToIso(text) {
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dt = new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`);
  if (dt.getFullYear() != y || dt.getMonth() + 1 != mo || dt.getDate() != d) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function DateInput({ value, onChange, ...props }) {
  const [text, setText] = React.useState(isoToDisplay(value));
  React.useEffect(() => { setText(isoToDisplay(value)); }, [value]);

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length > 4 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    setText(formatted);
    const iso = displayToIso(formatted);
    if (iso) onChange(iso);
  }

  function handleBlur() {
    if (!displayToIso(text)) setText(isoToDisplay(value)); // revert incomplete/invalid entry
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="DD/MM/YYYY"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}
